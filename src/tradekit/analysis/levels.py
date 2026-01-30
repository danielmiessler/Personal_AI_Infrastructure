"""Support and resistance level detection."""

import numpy as np
import pandas as pd


def compute_pivot_points(high: float, low: float, close: float) -> dict[str, float]:
    """Compute standard pivot points from prior period H/L/C.

    Returns dict with keys: pivot, r1, r2, r3, s1, s2, s3.
    """
    pivot = (high + low + close) / 3
    r1 = 2 * pivot - low
    s1 = 2 * pivot - high
    r2 = pivot + (high - low)
    s2 = pivot - (high - low)
    r3 = high + 2 * (pivot - low)
    s3 = low - 2 * (high - pivot)

    return {
        "pivot": round(pivot, 2),
        "r1": round(r1, 2),
        "r2": round(r2, 2),
        "r3": round(r3, 2),
        "s1": round(s1, 2),
        "s2": round(s2, 2),
        "s3": round(s3, 2),
    }


def find_local_extremes(
    series: pd.Series, order: int = 5
) -> tuple[list[tuple[int, float]], list[tuple[int, float]]]:
    """Find local minima and maxima in a price series.

    Args:
        series: Price series (typically close prices).
        order: Number of points on each side to compare.

    Returns:
        Tuple of (peaks, troughs) where each is a list of (index_position, price).
    """
    values = series.values
    peaks = []
    troughs = []

    for i in range(order, len(values) - order):
        window = values[i - order : i + order + 1]
        if values[i] == np.max(window):
            peaks.append((i, float(values[i])))
        elif values[i] == np.min(window):
            troughs.append((i, float(values[i])))

    return peaks, troughs


def cluster_levels(
    levels: list[float], tolerance_pct: float = 1.0
) -> list[dict]:
    """Cluster nearby price levels into zones with strength scores.

    Args:
        levels: List of price levels (from peaks, troughs, pivots).
        tolerance_pct: Percentage tolerance for clustering.

    Returns:
        List of dicts with 'level', 'count' (strength), and 'type'.
    """
    if not levels:
        return []

    sorted_levels = sorted(levels)
    clusters: list[list[float]] = []
    current_cluster = [sorted_levels[0]]

    for price in sorted_levels[1:]:
        if abs(price - current_cluster[-1]) / current_cluster[-1] * 100 <= tolerance_pct:
            current_cluster.append(price)
        else:
            clusters.append(current_cluster)
            current_cluster = [price]
    clusters.append(current_cluster)

    return [
        {
            "level": round(sum(c) / len(c), 2),
            "strength": len(c),
        }
        for c in clusters
    ]


def find_support_resistance(
    df: pd.DataFrame, order: int = 5, tolerance_pct: float = 1.5
) -> dict[str, list[dict]]:
    """Find support and resistance levels from OHLCV data.

    Args:
        df: DataFrame with 'high', 'low', 'close' columns.
        order: Local extreme detection window size.
        tolerance_pct: Clustering tolerance.

    Returns:
        Dict with 'resistance' and 'support' lists, each containing
        dicts with 'level' and 'strength'.
    """
    peaks, troughs = find_local_extremes(df["close"], order=order)

    # Also include highs for resistance, lows for support
    high_peaks, _ = find_local_extremes(df["high"], order=order)
    _, low_troughs = find_local_extremes(df["low"], order=order)

    resistance_prices = [p for _, p in peaks] + [p for _, p in high_peaks]
    support_prices = [p for _, p in troughs] + [p for _, p in low_troughs]

    resistance = cluster_levels(resistance_prices, tolerance_pct)
    support = cluster_levels(support_prices, tolerance_pct)

    # Sort: resistance ascending, support descending
    resistance.sort(key=lambda x: x["level"])
    support.sort(key=lambda x: x["level"], reverse=True)

    return {"resistance": resistance, "support": support}


def get_nearest_levels(
    current_price: float,
    sr_levels: dict[str, list[dict]],
    n: int = 3,
) -> dict[str, list[dict]]:
    """Get the N nearest support and resistance levels to current price."""
    resistance_above = [
        r for r in sr_levels["resistance"] if r["level"] > current_price
    ][:n]

    support_below = [
        s for s in sr_levels["support"] if s["level"] < current_price
    ][:n]

    return {"resistance": resistance_above, "support": support_below}
