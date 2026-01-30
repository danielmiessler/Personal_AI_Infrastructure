"""Technical indicators using the `ta` library."""

import pandas as pd
from ta.momentum import RSIIndicator, StochRSIIndicator, StochasticOscillator
from ta.trend import EMAIndicator, MACD, SMAIndicator
from ta.volatility import AverageTrueRange


def compute_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    """Compute RSI (Relative Strength Index)."""
    return RSIIndicator(close=close, window=period).rsi()


def compute_macd(
    close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9
) -> pd.DataFrame:
    """Compute MACD line, signal line, and histogram."""
    macd = MACD(close=close, window_fast=fast, window_slow=slow, window_sign=signal)
    return pd.DataFrame({
        "macd": macd.macd(),
        "macd_signal": macd.macd_signal(),
        "macd_histogram": macd.macd_diff(),
    })


def compute_stochastic(
    high: pd.Series,
    low: pd.Series,
    close: pd.Series,
    k_period: int = 14,
    d_period: int = 3,
) -> pd.DataFrame:
    """Compute Stochastic Oscillator (%K and %D)."""
    stoch = StochasticOscillator(
        high=high, low=low, close=close, window=k_period, smooth_window=d_period
    )
    return pd.DataFrame({
        "stoch_k": stoch.stoch(),
        "stoch_d": stoch.stoch_signal(),
    })


def compute_stoch_rsi(close: pd.Series, period: int = 14, d_period: int = 3) -> pd.DataFrame:
    """Compute Stochastic RSI."""
    stoch_rsi = StochRSIIndicator(close=close, window=period, smooth1=d_period, smooth2=d_period)
    return pd.DataFrame({
        "stoch_rsi_k": stoch_rsi.stochrsi_k(),
        "stoch_rsi_d": stoch_rsi.stochrsi_d(),
    })


def compute_moving_averages(close: pd.Series, configs: list[dict] | None = None) -> pd.DataFrame:
    """Compute multiple moving averages.

    Args:
        close: Price series.
        configs: List of dicts with 'period' and 'type' (ema or sma).
                 Defaults to 9 EMA, 20 EMA, 50 SMA, 200 SMA.
    """
    if configs is None:
        configs = [
            {"period": 9, "type": "ema"},
            {"period": 20, "type": "ema"},
            {"period": 50, "type": "sma"},
            {"period": 200, "type": "sma"},
        ]

    result = pd.DataFrame(index=close.index)
    for cfg in configs:
        period = cfg["period"]
        ma_type = cfg.get("type", "sma")
        col_name = f"{ma_type}_{period}"

        if ma_type == "ema":
            result[col_name] = EMAIndicator(close=close, window=period).ema_indicator()
        else:
            result[col_name] = SMAIndicator(close=close, window=period).sma_indicator()

    return result


def compute_rate_of_change(close: pd.Series, period: int = 10) -> pd.Series:
    """Compute Rate of Change (ROC)."""
    return close.pct_change(periods=period) * 100


def compute_atr(
    high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14
) -> pd.Series:
    """Compute Average True Range (ATR)."""
    return AverageTrueRange(high=high, low=low, close=close, window=period).average_true_range()


def compute_all_indicators(df: pd.DataFrame, presets: dict | None = None) -> pd.DataFrame:
    """Compute all standard indicators and merge onto the OHLCV DataFrame.

    Args:
        df: DataFrame with columns: open, high, low, close, volume.
        presets: Indicator parameter presets from config.

    Returns:
        Original DataFrame with indicator columns appended.
    """
    presets = presets or {}
    result = df.copy()

    rsi_cfg = presets.get("rsi", {})
    result["rsi"] = compute_rsi(df["close"], period=rsi_cfg.get("period", 14))

    macd_cfg = presets.get("macd", {})
    macd_df = compute_macd(
        df["close"],
        fast=macd_cfg.get("fast", 12),
        slow=macd_cfg.get("slow", 26),
        signal=macd_cfg.get("signal", 9),
    )
    result = pd.concat([result, macd_df], axis=1)

    stoch_cfg = presets.get("stochastic", {})
    stoch_df = compute_stochastic(
        df["high"],
        df["low"],
        df["close"],
        k_period=stoch_cfg.get("k_period", 14),
        d_period=stoch_cfg.get("d_period", 3),
    )
    result = pd.concat([result, stoch_df], axis=1)

    ma_configs = presets.get("moving_averages")
    ma_df = compute_moving_averages(df["close"], configs=ma_configs)
    result = pd.concat([result, ma_df], axis=1)

    result["roc_10"] = compute_rate_of_change(df["close"], period=10)

    result["atr"] = compute_atr(df["high"], df["low"], df["close"])
    # ATR as percentage of price for cross-ticker comparison
    result["atr_pct"] = (result["atr"] / df["close"] * 100).round(2)

    return result
