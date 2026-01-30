"""Candlestick pattern recognition (placeholder for Phase 2)."""

import pandas as pd


def detect_patterns(df: pd.DataFrame) -> pd.DataFrame:
    """Detect candlestick patterns in OHLCV data.

    This is a Phase 2 feature. Currently returns basic candle type classification.
    """
    result = df.copy()

    body = df["close"] - df["open"]
    range_ = df["high"] - df["low"]

    # Basic candle classification
    result["candle_body_pct"] = (body.abs() / range_ * 100).round(1).fillna(0)
    result["candle_bullish"] = body > 0
    result["candle_doji"] = result["candle_body_pct"] < 10

    return result
