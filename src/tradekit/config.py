"""Settings and configuration management for tradekit."""

from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import yaml
from pydantic import Field
from pydantic_settings import BaseSettings

ET = ZoneInfo("America/New_York")


def now_et() -> datetime:
    """Get current time in US Eastern."""
    return datetime.now(ET)


def _project_root() -> Path:
    """Walk up from this file to find the project root (where pyproject.toml lives)."""
    p = Path(__file__).resolve().parent
    while p != p.parent:
        if (p / "pyproject.toml").exists():
            return p
        p = p.parent
    return Path.cwd()


PROJECT_ROOT = _project_root()


class DataSettings(BaseSettings):
    alphavantage_api_key: str = ""
    massive_api_key: str = ""
    yahoo_cache_ttl_minutes: int = 5
    finviz_cache_ttl_minutes: int = 10
    cache_dir: Path = Path.home() / ".tradekit" / "cache"


class ScreenerSettings(BaseSettings):
    min_gap_pct: float = 2.0
    min_premarket_volume: int = 200_000
    min_price: float = 2.0
    max_price: float = 200.0
    min_avg_volume: int = 500_000
    max_results: int = 20


class AlertSettings(BaseSettings):
    slack_webhook_url: str = ""
    smtp_host: str = ""
    smtp_user: str = ""
    smtp_password: str = ""
    alert_score_threshold: int = 75


class Settings(BaseSettings):
    model_config = {
        "env_file": str(PROJECT_ROOT / ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    data: DataSettings = Field(default_factory=DataSettings)
    screener: ScreenerSettings = Field(default_factory=ScreenerSettings)
    alerts: AlertSettings = Field(default_factory=AlertSettings)
    config_dir: Path = PROJECT_ROOT / "config"
    data_source: str = "yahoo"
    massive_mcp_package: str = "git+https://github.com/anthropics/mcp_massive@v0.6.0"

    def load_watchlists(self) -> dict[str, list[str]]:
        path = self.config_dir / "watchlists.yaml"
        if not path.exists():
            return {"default": []}
        with open(path) as f:
            data = yaml.safe_load(f) or {}
        # Normalize: ensure all values are lists
        return {k: (v if isinstance(v, list) else []) for k, v in data.items()}

    def load_screener_presets(self) -> dict:
        path = self.config_dir / "screener.yaml"
        if not path.exists():
            return {}
        with open(path) as f:
            return yaml.safe_load(f) or {}

    def load_indicator_presets(self) -> dict:
        path = self.config_dir / "indicators.yaml"
        if not path.exists():
            return {}
        with open(path) as f:
            return yaml.safe_load(f) or {}


def get_settings() -> Settings:
    return Settings()
