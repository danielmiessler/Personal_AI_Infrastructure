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

# Finviz only accepts these exact price thresholds
_PRICE_THRESHOLDS = [1, 2, 3, 4, 5, 7, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100]

_VOLUME_OPTIONS = {
    50_000: "Over 50K",
    100_000: "Over 100K",
    200_000: "Over 200K",
    300_000: "Over 300K",
    400_000: "Over 400K",
    500_000: "Over 500K",
    750_000: "Over 750K",
    1_000_000: "Over 1M",
    2_000_000: "Over 2M",
}


def _nearest_price_over(price: float) -> str:
    """Map a price to the nearest valid Finviz 'Over $X' filter."""
    # Find the largest threshold <= the requested price
    valid = [t for t in _PRICE_THRESHOLDS if t <= price]
    threshold = valid[-1] if valid else _PRICE_THRESHOLDS[0]
    return f"Over ${threshold}"


def _nearest_volume_over(volume: int) -> str:
    """Map a volume to the nearest valid Finviz volume filter."""
    thresholds = sorted(_VOLUME_OPTIONS.keys())
    valid = [t for t in thresholds if t <= volume]
    threshold = valid[-1] if valid else thresholds[0]
    return _VOLUME_OPTIONS[threshold]


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
        if min_price is not None:
            filters_dict["Price"] = _nearest_price_over(min_price)

        if min_volume is not None:
            filters_dict["Average Volume"] = _nearest_volume_over(min_volume)

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
