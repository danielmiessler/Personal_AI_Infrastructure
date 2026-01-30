"""Tests for configuration loading."""

from tradekit.config import Settings, get_settings


class TestConfig:
    def test_default_settings(self):
        s = Settings()
        assert s.screener.min_price == 2.0
        assert s.screener.max_results == 20
        assert s.data.yahoo_cache_ttl_minutes == 5

    def test_load_watchlists(self):
        s = get_settings()
        wl = s.load_watchlists()
        assert "default" in wl
        assert isinstance(wl["default"], list)

    def test_load_screener_presets(self):
        s = get_settings()
        presets = s.load_screener_presets()
        assert "premarket_gap" in presets

    def test_load_indicator_presets(self):
        s = get_settings()
        presets = s.load_indicator_presets()
        assert "rsi" in presets
        assert presets["rsi"]["period"] == 14
