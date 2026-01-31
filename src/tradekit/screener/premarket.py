"""Pre-market gap and volume scanner — the core morning workflow module."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import pandas as pd

from tradekit.config import Settings
from tradekit.data.finviz import FinvizProvider
from tradekit.data.yahoo import YahooProvider
from tradekit.screener.filters import apply_filters, build_filter_chain

if TYPE_CHECKING:
    from typing import Any

logger = logging.getLogger(__name__)


def scan_premarket(
    settings: Settings | None = None,
    preset: str = "premarket_gap",
    provider: Any = None,
) -> pd.DataFrame:
    """Run the pre-market scanner.

    1. Pull top gainers from Finviz for initial candidate list.
    2. Enrich with Yahoo pre-market data (gap %, volume, float).
    3. Apply configurable filters.
    4. Return filtered, sorted candidates.

    Args:
        settings: App settings. Uses defaults if None.
        preset: Name of screener preset from config/screener.yaml.

    Returns:
        DataFrame of pre-market candidates sorted by gap%.
    """
    if settings is None:
        settings = Settings()

    presets = settings.load_screener_presets()
    filter_config = presets.get(preset, {})

    # Step 1: Get initial candidates from Finviz
    finviz = FinvizProvider()
    logger.info("Fetching top gainers from Finviz...")
    finviz_df = finviz.get_top_gainers(
        min_price=filter_config.get("min_price", settings.screener.min_price)
    )

    # Extract tickers from Finviz results
    tickers: list[str] = []
    if not finviz_df.empty and "Ticker" in finviz_df.columns:
        tickers = finviz_df["Ticker"].tolist()
    elif not finviz_df.empty:
        # Try lowercase column name
        for col in finviz_df.columns:
            if col.lower() == "ticker":
                tickers = finviz_df[col].tolist()
                break

    if not tickers:
        logger.warning("No candidates found from Finviz screener")
        return pd.DataFrame()

    logger.info("Found %d Finviz candidates, enriching with market data...", len(tickers))

    # Step 2: Enrich with pre-market data from the chosen provider
    if provider is None:
        provider = YahooProvider()
    premarket_data = provider.get_multiple_premarket(tickers)

    if not premarket_data:
        logger.warning("No pre-market data retrieved")
        return pd.DataFrame()

    df = pd.DataFrame(premarket_data)

    # Step 3: Apply filters
    filters = build_filter_chain(filter_config)
    df = apply_filters(df, filters)

    if df.empty:
        logger.info("No candidates passed filters")
        return df

    # Step 4: Sort by absolute gap percentage
    df = df.sort_values("gap_pct", key=abs, ascending=False).reset_index(drop=True)

    max_results = filter_config.get("max_results", settings.screener.max_results)
    return df.head(max_results)


def scan_watchlist(
    settings: Settings | None = None,
    watchlist_name: str = "default",
    provider: Any = None,
) -> pd.DataFrame:
    """Scan watchlist tickers for pre-market activity.

    Args:
        settings: App settings.
        watchlist_name: Which watchlist to scan.

    Returns:
        DataFrame of watchlist tickers with pre-market data.
    """
    if settings is None:
        settings = Settings()

    watchlists = settings.load_watchlists()
    tickers = watchlists.get(watchlist_name, [])

    if not tickers:
        logger.warning("Watchlist '%s' is empty or not found", watchlist_name)
        return pd.DataFrame()

    if provider is None:
        provider = YahooProvider()
    premarket_data = provider.get_multiple_premarket(tickers)

    if not premarket_data:
        return pd.DataFrame()

    df = pd.DataFrame(premarket_data)
    df = df.sort_values("gap_pct", key=abs, ascending=False).reset_index(drop=True)
    return df
