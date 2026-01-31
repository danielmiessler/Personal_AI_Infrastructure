"""Backtest data provider — reads historical CSV data from Massive S3-compatible flat files."""

import gzip
import io
import logging
import os
from datetime import datetime, timedelta
from pathlib import Path

import boto3
import pandas as pd

from tradekit.config import get_settings

logger = logging.getLogger(__name__)

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


def _trading_days(start: datetime, end: datetime) -> list[datetime]:
    """Generate weekday dates between start and end (inclusive)."""
    days = []
    current = start
    while current <= end:
        if current.weekday() < 5:  # Mon-Fri
            days.append(current)
        current += timedelta(days=1)
    return days


class BacktestProvider:
    """Fetch historical OHLCV data from Massive S3-compatible flat file storage.

    This provider is for backtesting only. get_quote() and get_premarket()
    raise NotImplementedError since flat files contain historical day aggregates.
    """

    def __init__(self):
        settings = get_settings()
        access_key = settings.data.backtest_access_key or os.environ.get(
            "BACKTEST_ACCESS_KEY", ""
        )
        secret_key = settings.data.backtest_secret_key or os.environ.get(
            "BACKTEST_SECRET_KEY", ""
        )
        if not access_key or not secret_key:
            raise ValueError(
                "BACKTEST_ACCESS_KEY and BACKTEST_SECRET_KEY are required. "
                "Set them in .env or as environment variables."
            )

        self._bucket = settings.data.backtest_bucket
        self._endpoint = settings.data.backtest_endpoint
        self._cache_dir = settings.data.cache_dir / "flatfiles"
        self._cache_dir.mkdir(parents=True, exist_ok=True)

        self._s3 = boto3.client(
            "s3",
            endpoint_url=self._endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )

    def _s3_key(self, date: datetime) -> str:
        """Build the S3 object key for a given date."""
        y, m, ymd = date.strftime("%Y"), date.strftime("%m"), date.strftime("%Y-%m-%d")
        return f"us_stocks_sip/day_aggs_v1/{y}/{m}/{ymd}.csv.gz"

    def _cache_path(self, date: datetime) -> Path:
        """Local cache path for a date's CSV.gz file."""
        y, m, ymd = date.strftime("%Y"), date.strftime("%m"), date.strftime("%Y-%m-%d")
        return self._cache_dir / y / m / f"{ymd}.csv.gz"

    def _fetch_day(self, date: datetime) -> pd.DataFrame | None:
        """Download (or read from cache) a single day's CSV.gz and return as DataFrame."""
        cache_path = self._cache_path(date)

        if cache_path.exists():
            logger.debug("Cache hit: %s", cache_path)
            with gzip.open(cache_path, "rt") as f:
                return pd.read_csv(f)

        key = self._s3_key(date)
        logger.debug("Downloading s3://%s/%s", self._bucket, key)
        try:
            response = self._s3.get_object(Bucket=self._bucket, Key=key)
            raw = response["Body"].read()
        except self._s3.exceptions.NoSuchKey:
            logger.debug("No data for %s (holiday or weekend)", date.strftime("%Y-%m-%d"))
            return None
        except Exception as e:
            logger.warning("Failed to fetch %s: %s", key, e)
            return None

        # Cache locally
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_bytes(raw)

        with gzip.open(io.BytesIO(raw), "rt") as f:
            return pd.read_csv(f)

    def get_history(
        self, ticker: str, period: str = "3mo", interval: str = "1d"
    ) -> pd.DataFrame:
        """Get historical OHLCV data for a ticker from S3 flat files."""
        delta = _PERIOD_MAP.get(period, timedelta(days=90))
        end = datetime.now()
        start = end - delta

        ticker = ticker.upper()
        frames = []

        for day in _trading_days(start, end):
            df = self._fetch_day(day)
            if df is None:
                continue
            # Filter to requested ticker
            day_data = df[df["ticker"] == ticker]
            if day_data.empty:
                continue
            frames.append(day_data)

        if not frames:
            logger.warning("No backtest data for %s in period %s", ticker, period)
            return pd.DataFrame()

        result = pd.concat(frames, ignore_index=True)

        # Columns already match standard OHLCV names from the CSV

        # Parse window_start as datetime index
        if "window_start" in result.columns:
            result["date"] = pd.to_datetime(result["window_start"], unit="ns")
            result = result.set_index("date")

        keep = [c for c in ["open", "high", "low", "close", "volume"] if c in result.columns]
        return result[keep]

    def get_quote(self, ticker: str) -> dict:
        raise NotImplementedError("BacktestProvider does not support live quotes.")

    def get_premarket(self, ticker: str) -> dict:
        raise NotImplementedError("BacktestProvider does not support pre-market data.")

    def get_multiple_quotes(self, tickers: list[str]) -> list[dict]:
        raise NotImplementedError("BacktestProvider does not support live quotes.")

    def get_multiple_premarket(self, tickers: list[str]) -> list[dict]:
        raise NotImplementedError("BacktestProvider does not support pre-market data.")
