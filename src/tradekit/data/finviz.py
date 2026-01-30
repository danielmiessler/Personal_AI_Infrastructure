"""Finviz screener data provider."""

import logging

import pandas as pd
from finvizfinance.screener.overview import Overview

logger = logging.getLogger(__name__)

# Finviz filter mappings
SIGNAL_MAP = {
    "top_gainers": "Top Gainers",
    "new_high": "New High",
    "most_volatile": "Most Volatile",
    "most_active": "Most Active",
    "unusual_volume": "Unusual Volume",
    "overbought": "Overbought",
    "oversold": "Oversold",
}


class FinvizProvider:
    """Fetch screener data from Finviz."""

    def screen(
        self,
        signal: str = "",
        min_price: float | None = None,
        max_price: float | None = None,
        min_volume: int | None = None,
        min_market_cap: str | None = None,
    ) -> pd.DataFrame:
        """Run a Finviz screener query and return results as DataFrame.

        Args:
            signal: One of the SIGNAL_MAP keys, or empty for custom filters.
            min_price: Minimum stock price.
            max_price: Maximum stock price.
            min_volume: Minimum average volume.
            min_market_cap: e.g. "+Small (over $300mln)" or "+Mid (over $2bln)".

        Returns:
            DataFrame with columns: No., Ticker, Company, Sector, Industry,
            Country, Market Cap, P/E, Price, Change, Volume.
        """
        screener = Overview()

        filters_dict: dict[str, str] = {}
        if min_price is not None and max_price is not None:
            filters_dict["Price"] = f"Over ${min_price}"
        elif min_price is not None:
            filters_dict["Price"] = f"Over ${min_price}"

        if min_volume is not None:
            filters_dict["Average Volume"] = f"Over {min_volume // 1000}K"

        if min_market_cap:
            filters_dict["Market Cap."] = min_market_cap

        if filters_dict:
            screener.set_filter(filters_dict=filters_dict)

        if signal and signal in SIGNAL_MAP:
            screener.set_filter(signal=SIGNAL_MAP[signal])

        try:
            df = screener.screener_view()
            if df is None or df.empty:
                return pd.DataFrame()
            return df
        except Exception as e:
            logger.warning("Finviz screener failed: %s", e)
            return pd.DataFrame()

    def get_top_gainers(self, min_price: float = 5.0) -> pd.DataFrame:
        """Get today's top gaining stocks."""
        return self.screen(signal="top_gainers", min_price=min_price)

    def get_unusual_volume(self, min_price: float = 5.0) -> pd.DataFrame:
        """Get stocks with unusual volume."""
        return self.screen(signal="unusual_volume", min_price=min_price)

    def get_most_active(self, min_price: float = 5.0) -> pd.DataFrame:
        """Get most actively traded stocks."""
        return self.screen(signal="most_active", min_price=min_price)
