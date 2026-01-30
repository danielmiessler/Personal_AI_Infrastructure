"""Volume analysis: VWAP, relative volume, volume profile."""

import numpy as np
import pandas as pd
from ta.volume import VolumeWeightedAveragePrice


def compute_vwap(
    high: pd.Series, low: pd.Series, close: pd.Series, volume: pd.Series
) -> pd.Series:
    """Compute VWAP (Volume Weighted Average Price)."""
    vwap = VolumeWeightedAveragePrice(high=high, low=low, close=close, volume=volume)
    return vwap.volume_weighted_average_price()


def compute_relative_volume(volume: pd.Series, lookback: int = 20) -> pd.Series:
    """Compute relative volume vs N-day average."""
    avg_vol = volume.rolling(window=lookback).mean()
    return volume / avg_vol


def compute_volume_profile(
    close: pd.Series, volume: pd.Series, bins: int = 20
) -> pd.DataFrame:
    """Compute a volume profile (price-at-volume histogram).

    Returns DataFrame with columns: price_level, volume, pct_of_total.
    """
    price_min = close.min()
    price_max = close.max()
    bin_edges = np.linspace(price_min, price_max, bins + 1)

    levels = []
    total_vol = volume.sum()

    for i in range(bins):
        low_edge = bin_edges[i]
        high_edge = bin_edges[i + 1]
        mask = (close >= low_edge) & (close < high_edge)
        vol_at_level = volume[mask].sum()
        mid_price = (low_edge + high_edge) / 2

        levels.append({
            "price_level": round(mid_price, 2),
            "volume": int(vol_at_level),
            "pct_of_total": round(vol_at_level / total_vol * 100, 2) if total_vol > 0 else 0,
        })

    return pd.DataFrame(levels).sort_values("volume", ascending=False).reset_index(drop=True)


def find_high_volume_nodes(
    close: pd.Series, volume: pd.Series, bins: int = 20, top_n: int = 3
) -> list[float]:
    """Find the top N high-volume price levels (HVN) from volume profile."""
    profile = compute_volume_profile(close, volume, bins)
    return profile.head(top_n)["price_level"].tolist()


def add_volume_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Add volume indicators to OHLCV DataFrame."""
    result = df.copy()
    result["vwap"] = compute_vwap(df["high"], df["low"], df["close"], df["volume"])
    result["relative_volume"] = compute_relative_volume(df["volume"])
    result["volume_sma_20"] = df["volume"].rolling(20).mean()
    return result
