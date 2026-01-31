"""Massive MCP data provider — fetches market data via the mcp_massive MCP server."""

import asyncio
import json
import logging
import os
from datetime import datetime, timedelta

import pandas as pd
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from tradekit.config import get_settings

logger = logging.getLogger(__name__)

# Map yfinance-style period strings to timedelta
_PERIOD_MAP = {
    "1d": timedelta(days=1),
    "5d": timedelta(days=5),
    "1mo": timedelta(days=30),
    "3mo": timedelta(days=90),
    "6mo": timedelta(days=180),
    "1y": timedelta(days=365),
    "2y": timedelta(days=730),
    "5y": timedelta(days=1825),
}

# Map yfinance-style interval strings to Massive timespan + multiplier
_INTERVAL_MAP = {
    "1m": (1, "minute"),
    "5m": (5, "minute"),
    "15m": (15, "minute"),
    "30m": (30, "minute"),
    "1h": (1, "hour"),
    "1d": (1, "day"),
    "1wk": (1, "week"),
    "1mo": (1, "month"),
}


class MassiveProvider:
    """Fetch market data from the Massive MCP server.

    Uses the MCP Python SDK to communicate with the mcp_massive server
    over stdio. The server is spawned as a subprocess on first use.
    """

    def __init__(self):
        settings = get_settings()
        self._api_key = settings.data.massive_api_key or os.environ.get("MASSIVE_API_KEY", "")
        self._package = settings.massive_mcp_package
        if not self._api_key:
            raise ValueError(
                "MASSIVE_API_KEY is required. Set it in .env or as an environment variable."
            )

    def _server_params(self) -> StdioServerParameters:
        return StdioServerParameters(
            command="uvx",
            args=["--from", self._package, "mcp_massive"],
            env={**os.environ, "MASSIVE_API_KEY": self._api_key},
        )

    async def _call_tool(self, tool_name: str, arguments: dict) -> dict:
        """Spawn the MCP server, call a single tool, and return parsed JSON."""
        async with stdio_client(self._server_params()) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool(tool_name, arguments=arguments)
                # result.content is a list of content blocks; first one has text
                text = result.content[0].text
                return json.loads(text)

    async def _call_tools_batch(self, calls: list[tuple[str, dict]]) -> list[dict]:
        """Spawn the MCP server once, call multiple tools, return list of parsed results."""
        async with stdio_client(self._server_params()) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                results = []
                for tool_name, arguments in calls:
                    result = await session.call_tool(tool_name, arguments=arguments)
                    text = result.content[0].text
                    results.append(json.loads(text))
                return results

    def _run(self, coro):
        """Run an async coroutine synchronously."""
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            # We're inside an existing event loop; create a new one in a thread
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, coro).result()
        else:
            return asyncio.run(coro)

    def get_quote(self, ticker: str) -> dict:
        """Get current quote data from Massive snapshot + previous close."""
        results = self._run(
            self._call_tools_batch([
                ("get_snapshot_ticker", {"market_type": "stocks", "ticker": ticker}),
                ("get_previous_close_agg", {"ticker": ticker}),
            ])
        )
        snap = results[0]
        prev = results[1]

        # Navigate snapshot structure
        ticker_data = snap.get("ticker", snap)
        day = ticker_data.get("day", {})
        prev_day = ticker_data.get("prevDay", {})

        prev_close = prev.get("results", [{}])[0].get("c", prev_day.get("c", 0))
        price = day.get("c", 0) or ticker_data.get("lastTrade", {}).get("p", 0)

        return {
            "ticker": ticker,
            "price": price,
            "prev_close": prev_close,
            "open": day.get("o", 0),
            "high": day.get("h", 0),
            "low": day.get("l", 0),
            "volume": day.get("v", 0),
            "avg_volume": 0,  # not directly available from snapshot
            "market_cap": 0,
            "float_shares": 0,
            "name": ticker_data.get("name", ticker),
        }

    def get_history(
        self, ticker: str, period: str = "3mo", interval: str = "1d"
    ) -> pd.DataFrame:
        """Get historical OHLCV data as a DataFrame."""
        delta = _PERIOD_MAP.get(period, timedelta(days=90))
        multiplier, timespan = _INTERVAL_MAP.get(interval, (1, "day"))

        to_date = datetime.now()
        from_date = to_date - delta

        data = self._run(
            self._call_tool(
                "list_aggs",
                {
                    "ticker": ticker,
                    "multiplier": multiplier,
                    "timespan": timespan,
                    "from_": from_date.strftime("%Y-%m-%d"),
                    "to": to_date.strftime("%Y-%m-%d"),
                    "limit": 50000,
                },
            )
        )

        bars = data.get("results", [])
        if not bars:
            logger.warning("No history data for %s from Massive", ticker)
            return pd.DataFrame()

        df = pd.DataFrame(bars)
        # Massive returns: o, h, l, c, v, t (timestamp ms), vw, n
        rename = {"o": "open", "h": "high", "l": "low", "c": "close", "v": "volume"}
        df = df.rename(columns=rename)

        if "t" in df.columns:
            df["date"] = pd.to_datetime(df["t"], unit="ms")
            df = df.set_index("date")

        # Keep only OHLCV columns that exist
        keep = [c for c in ["open", "high", "low", "close", "volume"] if c in df.columns]
        df = df[keep]
        return df

    def get_premarket(self, ticker: str) -> dict:
        """Get pre-market quote data from Massive snapshot."""
        snap = self._run(
            self._call_tool(
                "get_snapshot_ticker", {"market_type": "stocks", "ticker": ticker}
            )
        )

        ticker_data = snap.get("ticker", snap)
        session = ticker_data.get("session", {})
        prev_day = ticker_data.get("prevDay", {})

        pre_price = session.get("price", 0) or session.get("close", 0)
        prev_close = prev_day.get("c", 0)
        gap_pct = ((pre_price - prev_close) / prev_close * 100) if prev_close else 0

        return {
            "ticker": ticker,
            "pre_price": pre_price,
            "prev_close": prev_close,
            "gap_pct": round(gap_pct, 2),
            "pre_volume": session.get("volume", 0),
            "avg_volume": 0,
            "name": ticker_data.get("name", ticker),
            "market_cap": 0,
            "float_shares": 0,
        }

    def get_multiple_quotes(self, tickers: list[str]) -> list[dict]:
        """Fetch quotes for multiple tickers."""
        results = []
        for ticker in tickers:
            try:
                results.append(self.get_quote(ticker))
            except Exception as e:
                logger.warning("Failed to fetch %s from Massive: %s", ticker, e)
        return results

    def get_multiple_premarket(self, tickers: list[str]) -> list[dict]:
        """Fetch pre-market data for multiple tickers."""
        results = []
        for ticker in tickers:
            try:
                results.append(self.get_premarket(ticker))
            except Exception as e:
                logger.warning("Failed to fetch pre-market for %s from Massive: %s", ticker, e)
        return results
