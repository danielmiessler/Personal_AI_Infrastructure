"""Multi-factor ranking for screener results."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import pandas as pd

from tradekit.analysis.indicators import compute_all_indicators
from tradekit.analysis.scoring import compute_composite_score
from tradekit.analysis.volume import add_volume_indicators
from tradekit.data.yahoo import YahooProvider

if TYPE_CHECKING:
    from typing import Any

logger = logging.getLogger(__name__)


def rank_candidates(
    tickers: list[str],
    weights: dict[str, float] | None = None,
    indicator_presets: dict | None = None,
    provider: Any = None,
) -> pd.DataFrame:
    """Fetch data and rank tickers by composite score.

    Args:
        tickers: List of ticker symbols.
        weights: Scoring weights for momentum/trend/volume.
        indicator_presets: TA indicator parameter overrides.

    Returns:
        DataFrame with one row per ticker, sorted by score descending.
    """
    if provider is None:
        provider = YahooProvider()
    results = []

    for ticker in tickers:
        try:
            df = provider.get_history(ticker, period="3mo", interval="1d")
            if df.empty or len(df) < 20:
                logger.warning("Insufficient data for %s (%d rows)", ticker, len(df))
                continue

            df = compute_all_indicators(df, presets=indicator_presets)
            df = add_volume_indicators(df)

            # Score the most recent row
            latest = df.iloc[-1]
            score = compute_composite_score(latest, weights)

            quote = provider.get_quote(ticker)
            results.append({
                "ticker": ticker,
                "name": quote.get("name", ticker),
                "price": quote.get("price", latest.get("close", 0)),
                "volume": quote.get("volume", 0),
                "avg_volume": quote.get("avg_volume", 0),
                **score,
            })
        except Exception as e:
            logger.warning("Failed to rank %s: %s", ticker, e)

    if not results:
        return pd.DataFrame()

    ranked = pd.DataFrame(results)
    ranked = ranked.sort_values("total", ascending=False).reset_index(drop=True)
    return ranked
