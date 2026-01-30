"""Abstract data provider interface."""

from typing import Protocol

import pandas as pd


class DataProvider(Protocol):
    """Protocol for market data providers."""

    def get_quote(self, ticker: str) -> dict:
        """Get current quote for a ticker."""
        ...

    def get_history(
        self, ticker: str, period: str = "3mo", interval: str = "1d"
    ) -> pd.DataFrame:
        """Get historical OHLCV data."""
        ...

    def get_premarket(self, ticker: str) -> dict:
        """Get pre-market quote data."""
        ...
