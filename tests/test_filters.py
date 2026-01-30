"""Tests for screener filters."""

import pandas as pd

from tradekit.screener.filters import (
    apply_filters,
    avg_volume_filter,
    build_filter_chain,
    gap_filter,
    price_filter,
    volume_filter,
)


def _make_candidates() -> pd.DataFrame:
    return pd.DataFrame([
        {"ticker": "AAA", "pre_price": 10.0, "gap_pct": 5.0, "pre_volume": 500_000, "avg_volume": 1_000_000},
        {"ticker": "BBB", "pre_price": 3.0, "gap_pct": 2.0, "pre_volume": 100_000, "avg_volume": 200_000},
        {"ticker": "CCC", "pre_price": 50.0, "gap_pct": 8.0, "pre_volume": 1_000_000, "avg_volume": 5_000_000},
        {"ticker": "DDD", "pre_price": 1.0, "gap_pct": 15.0, "pre_volume": 50_000, "avg_volume": 50_000},
    ])


class TestFilters:
    def test_price_filter(self):
        df = _make_candidates()
        result = price_filter(min_price=5.0, max_price=100.0)(df)
        assert set(result["ticker"]) == {"AAA", "CCC"}

    def test_volume_filter(self):
        df = _make_candidates()
        result = volume_filter(min_volume=200_000)(df)
        assert "AAA" in result["ticker"].values
        assert "DDD" not in result["ticker"].values

    def test_gap_filter(self):
        df = _make_candidates()
        result = gap_filter(min_gap_pct=5.0)(df)
        assert set(result["ticker"]) == {"AAA", "CCC", "DDD"}

    def test_avg_volume_filter(self):
        df = _make_candidates()
        result = avg_volume_filter(min_avg_volume=500_000)(df)
        assert "AAA" in result["ticker"].values
        assert "BBB" not in result["ticker"].values

    def test_apply_filters_chain(self):
        df = _make_candidates()
        filters = [
            price_filter(min_price=5.0),
            gap_filter(min_gap_pct=3.0),
        ]
        result = apply_filters(df, filters)
        assert set(result["ticker"]) == {"AAA", "CCC"}

    def test_build_filter_chain(self):
        config = {"min_price": 5.0, "max_price": 100.0, "min_gap_pct": 3.0}
        chain = build_filter_chain(config)
        assert len(chain) == 2  # price + gap
