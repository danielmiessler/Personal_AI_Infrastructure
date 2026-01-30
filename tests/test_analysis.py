"""Tests for the analysis engine."""

import numpy as np
import pandas as pd

from tradekit.analysis.indicators import (
    compute_all_indicators,
    compute_macd,
    compute_moving_averages,
    compute_rsi,
    compute_stochastic,
)
from tradekit.analysis.levels import (
    cluster_levels,
    compute_pivot_points,
    find_local_extremes,
    find_support_resistance,
)
from tradekit.analysis.scoring import compute_composite_score, score_momentum, score_trend
from tradekit.analysis.volume import compute_relative_volume, compute_volume_profile


def _make_ohlcv(n: int = 100, seed: int = 42) -> pd.DataFrame:
    """Create synthetic OHLCV data for testing."""
    rng = np.random.default_rng(seed)
    close = 100 + np.cumsum(rng.normal(0, 1, n))
    high = close + rng.uniform(0.5, 2, n)
    low = close - rng.uniform(0.5, 2, n)
    open_ = close + rng.normal(0, 0.5, n)
    volume = rng.integers(100_000, 1_000_000, n).astype(float)

    return pd.DataFrame({
        "open": open_,
        "high": high,
        "low": low,
        "close": close,
        "volume": volume,
    })


class TestIndicators:
    def test_rsi_range(self):
        df = _make_ohlcv()
        rsi = compute_rsi(df["close"])
        valid = rsi.dropna()
        assert (valid >= 0).all() and (valid <= 100).all()

    def test_macd_columns(self):
        df = _make_ohlcv()
        macd_df = compute_macd(df["close"])
        assert set(macd_df.columns) == {"macd", "macd_signal", "macd_histogram"}

    def test_stochastic_range(self):
        df = _make_ohlcv()
        stoch = compute_stochastic(df["high"], df["low"], df["close"])
        assert "stoch_k" in stoch.columns
        assert "stoch_d" in stoch.columns

    def test_moving_averages_default(self):
        df = _make_ohlcv()
        ma_df = compute_moving_averages(df["close"])
        assert "ema_9" in ma_df.columns
        assert "sma_200" in ma_df.columns

    def test_compute_all_indicators(self):
        df = _make_ohlcv()
        result = compute_all_indicators(df)
        assert "rsi" in result.columns
        assert "macd" in result.columns
        assert "ema_9" in result.columns
        assert "roc_10" in result.columns


class TestLevels:
    def test_pivot_points(self):
        pivots = compute_pivot_points(high=110, low=90, close=100)
        assert pivots["pivot"] == 100.0
        assert pivots["r1"] > pivots["pivot"]
        assert pivots["s1"] < pivots["pivot"]

    def test_find_local_extremes(self):
        # Create a series with obvious peaks and troughs
        values = [10, 20, 30, 20, 10, 20, 30, 40, 30, 20]
        s = pd.Series(values)
        peaks, troughs = find_local_extremes(s, order=2)
        assert len(peaks) > 0 or len(troughs) > 0

    def test_cluster_levels(self):
        levels = [100.0, 100.5, 101.0, 110.0, 110.5]
        clusters = cluster_levels(levels, tolerance_pct=1.5)
        assert len(clusters) == 2  # two clusters

    def test_find_support_resistance(self):
        df = _make_ohlcv(200)
        sr = find_support_resistance(df)
        assert "resistance" in sr
        assert "support" in sr


class TestScoring:
    def test_score_momentum_neutral(self):
        row = pd.Series({"rsi": 50, "macd_histogram": 0, "stoch_k": 50, "stoch_d": 50, "roc_10": 0})
        score = score_momentum(row)
        assert 0 <= score <= 100

    def test_score_trend_bullish(self):
        row = pd.Series({
            "close": 100,
            "ema_9": 99,
            "ema_20": 98,
            "sma_50": 95,
            "sma_200": 90,
        })
        score = score_trend(row)
        assert score > 50  # should be bullish

    def test_composite_score_structure(self):
        row = pd.Series({
            "close": 100,
            "rsi": 55,
            "macd_histogram": 0.5,
            "stoch_k": 60,
            "stoch_d": 55,
            "roc_10": 3.0,
            "ema_9": 99,
            "ema_20": 98,
            "sma_50": 95,
            "sma_200": 90,
            "relative_volume": 2.0,
            "vwap": 99,
        })
        result = compute_composite_score(row)
        assert "total" in result
        assert "grade" in result
        assert result["grade"] in ("A", "B", "C", "F")


class TestVolume:
    def test_relative_volume(self):
        volume = pd.Series([100_000] * 20 + [300_000])
        rvol = compute_relative_volume(volume)
        assert rvol.iloc[-1] > 2.5  # 3x average

    def test_volume_profile(self):
        df = _make_ohlcv()
        profile = compute_volume_profile(df["close"], df["volume"], bins=10)
        assert len(profile) == 10
        assert "price_level" in profile.columns
        assert "volume" in profile.columns
