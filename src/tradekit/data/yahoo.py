"""Yahoo Finance data provider using yfinance."""

import logging

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)


class YahooProvider:
    """Fetch market data from Yahoo Finance via yfinance."""

    def get_quote(self, ticker: str) -> dict:
        """Get current quote including price, volume, change."""
        t = yf.Ticker(ticker)
        info = t.info or {}
        return {
            "ticker": ticker,
            "price": info.get("currentPrice") or info.get("regularMarketPrice", 0),
            "prev_close": info.get("previousClose", 0),
            "open": info.get("regularMarketOpen", 0),
            "high": info.get("regularMarketDayHigh", 0),
            "low": info.get("regularMarketDayLow", 0),
            "volume": info.get("regularMarketVolume", 0),
            "avg_volume": info.get("averageVolume", 0),
            "market_cap": info.get("marketCap", 0),
            "float_shares": info.get("floatShares", 0),
            "name": info.get("shortName", ticker),
        }

    def get_history(
        self, ticker: str, period: str = "3mo", interval: str = "1d"
    ) -> pd.DataFrame:
        """Get historical OHLCV data as a DataFrame."""
        t = yf.Ticker(ticker)
        df = t.history(period=period, interval=interval)
        if df.empty:
            logger.warning("No history data for %s", ticker)
            return df
        df.columns = [c.lower().replace(" ", "_") for c in df.columns]
        return df

    def get_premarket(self, ticker: str) -> dict:
        """Get pre-market quote data."""
        t = yf.Ticker(ticker)
        info = t.info or {}
        pre_price = info.get("preMarketPrice", 0) or 0
        prev_close = info.get("previousClose", 0) or 0
        gap_pct = ((pre_price - prev_close) / prev_close * 100) if prev_close else 0

        return {
            "ticker": ticker,
            "pre_price": pre_price,
            "prev_close": prev_close,
            "gap_pct": round(gap_pct, 2),
            "pre_volume": info.get("preMarketVolume", 0) or 0,
            "avg_volume": info.get("averageVolume", 0) or 0,
            "name": info.get("shortName", ticker),
            "market_cap": info.get("marketCap", 0),
            "float_shares": info.get("floatShares", 0),
        }

    def get_multiple_quotes(self, tickers: list[str]) -> list[dict]:
        """Fetch quotes for multiple tickers."""
        results = []
        for ticker in tickers:
            try:
                results.append(self.get_quote(ticker))
            except Exception as e:
                logger.warning("Failed to fetch %s: %s", ticker, e)
        return results

    def get_multiple_premarket(self, tickers: list[str]) -> list[dict]:
        """Fetch pre-market data for multiple tickers."""
        results = []
        for ticker in tickers:
            try:
                results.append(self.get_premarket(ticker))
            except Exception as e:
                logger.warning("Failed to fetch pre-market for %s: %s", ticker, e)
        return results
