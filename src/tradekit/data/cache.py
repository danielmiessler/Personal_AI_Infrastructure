"""Local data caching using Parquet files."""

import json
import logging
import time
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)


class DataCache:
    """TTL-based cache storing DataFrames as Parquet and metadata as JSON."""

    def __init__(self, cache_dir: Path | None = None):
        self.cache_dir = cache_dir or (Path.home() / ".tradekit" / "cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._meta_path = self.cache_dir / "_meta.json"
        self._meta = self._load_meta()

    def _load_meta(self) -> dict:
        if self._meta_path.exists():
            with open(self._meta_path) as f:
                return json.load(f)
        return {}

    def _save_meta(self):
        with open(self._meta_path, "w") as f:
            json.dump(self._meta, f, indent=2)

    def _cache_key(self, namespace: str, key: str) -> str:
        return f"{namespace}:{key}"

    def get(self, namespace: str, key: str, ttl_minutes: int = 5) -> pd.DataFrame | None:
        """Get cached DataFrame if not expired."""
        cache_key = self._cache_key(namespace, key)
        entry = self._meta.get(cache_key)
        if entry is None:
            return None

        elapsed = time.time() - entry["timestamp"]
        if elapsed > ttl_minutes * 60:
            return None

        parquet_path = self.cache_dir / entry["file"]
        if not parquet_path.exists():
            return None

        try:
            return pd.read_parquet(parquet_path)
        except Exception as e:
            logger.warning("Cache read failed for %s: %s", cache_key, e)
            return None

    def put(self, namespace: str, key: str, df: pd.DataFrame):
        """Store a DataFrame in cache."""
        cache_key = self._cache_key(namespace, key)
        filename = f"{namespace}_{key}.parquet".replace("/", "_").replace(":", "_")
        parquet_path = self.cache_dir / filename

        try:
            df.to_parquet(parquet_path)
            self._meta[cache_key] = {
                "file": filename,
                "timestamp": time.time(),
                "rows": len(df),
            }
            self._save_meta()
        except Exception as e:
            logger.warning("Cache write failed for %s: %s", cache_key, e)

    def clear(self, namespace: str | None = None):
        """Clear cache, optionally only for a specific namespace."""
        if namespace is None:
            for f in self.cache_dir.glob("*.parquet"):
                f.unlink()
            self._meta = {}
        else:
            keys_to_remove = [k for k in self._meta if k.startswith(f"{namespace}:")]
            for k in keys_to_remove:
                entry = self._meta.pop(k)
                parquet_path = self.cache_dir / entry["file"]
                parquet_path.unlink(missing_ok=True)
        self._save_meta()
