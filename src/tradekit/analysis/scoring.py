"""Composite scoring engine for ranking trade setups."""

import pandas as pd


def score_momentum(row: pd.Series) -> float:
    """Score momentum indicators (0-100).

    Factors: RSI position, MACD histogram direction, Stochastic position, ROC.
    """
    score = 50.0  # neutral baseline

    # RSI: favor 40-60 range (consolidation ready to move), penalize extremes
    rsi = row.get("rsi", 50)
    if pd.notna(rsi):
        if 40 <= rsi <= 60:
            score += 15  # consolidating, could break either way
        elif 30 <= rsi < 40:
            score += 20  # oversold bounce potential
        elif rsi < 30:
            score += 10  # deeply oversold, risky but bouncy
        elif 60 < rsi <= 70:
            score += 10  # strong momentum, not yet overbought
        elif rsi > 70:
            score -= 10  # overbought, risk of pullback

    # MACD histogram: positive and rising is bullish
    hist = row.get("macd_histogram", 0)
    if pd.notna(hist):
        if hist > 0:
            score += 15
        else:
            score -= 10

    # Stochastic: bullish crossover zone
    stoch_k = row.get("stoch_k", 50)
    stoch_d = row.get("stoch_d", 50)
    if pd.notna(stoch_k) and pd.notna(stoch_d):
        if stoch_k > stoch_d and stoch_k < 80:
            score += 10  # bullish crossover, not overbought
        elif stoch_k < stoch_d and stoch_k > 20:
            score -= 5

    # ROC: positive momentum
    roc = row.get("roc_10", 0)
    if pd.notna(roc):
        if roc > 5:
            score += 10
        elif roc > 0:
            score += 5
        elif roc < -5:
            score -= 10

    return max(0, min(100, score))


def score_trend(row: pd.Series) -> float:
    """Score trend strength (0-100).

    Factors: Price vs moving averages, MA alignment.
    """
    score = 50.0
    close = row.get("close", 0)
    if not close or pd.isna(close):
        return score

    # Price above key MAs is bullish
    for ma_col in ["ema_9", "ema_20", "sma_50", "sma_200"]:
        ma_val = row.get(ma_col)
        if pd.notna(ma_val) and ma_val > 0:
            if close > ma_val:
                score += 5
            else:
                score -= 5

    # EMA 9 > EMA 20 > SMA 50 alignment (strong uptrend)
    ema9 = row.get("ema_9")
    ema20 = row.get("ema_20")
    sma50 = row.get("sma_50")
    if all(pd.notna(v) for v in [ema9, ema20, sma50]):
        if ema9 > ema20 > sma50:
            score += 15  # bullish alignment
        elif ema9 < ema20 < sma50:
            score -= 10  # bearish alignment

    return max(0, min(100, score))


def score_volume(row: pd.Series) -> float:
    """Score volume characteristics (0-100).

    Factors: Relative volume, price vs VWAP.
    """
    score = 50.0

    # Relative volume: higher = more interest
    rvol = row.get("relative_volume")
    if pd.notna(rvol):
        if rvol > 3.0:
            score += 25
        elif rvol > 2.0:
            score += 20
        elif rvol > 1.5:
            score += 10
        elif rvol < 0.5:
            score -= 15

    # Price vs VWAP
    close = row.get("close", 0)
    vwap = row.get("vwap")
    if pd.notna(vwap) and vwap > 0 and close:
        if close > vwap:
            score += 10  # trading above VWAP
        else:
            score -= 5

    return max(0, min(100, score))


def compute_composite_score(
    row: pd.Series, weights: dict[str, float] | None = None
) -> dict:
    """Compute composite score with sub-scores.

    Args:
        row: Series with all indicator values.
        weights: Dict with keys 'momentum', 'trend', 'volume'.

    Returns:
        Dict with 'total', 'momentum', 'trend', 'volume', 'grade'.
    """
    if weights is None:
        weights = {"momentum": 0.35, "trend": 0.35, "volume": 0.30}

    momentum = score_momentum(row)
    trend = score_trend(row)
    volume = score_volume(row)

    total = (
        momentum * weights.get("momentum", 0.35)
        + trend * weights.get("trend", 0.35)
        + volume * weights.get("volume", 0.30)
    )
    total = round(total, 1)

    # Grade: A (80+), B (65-79), C (50-64), F (<50)
    if total >= 80:
        grade = "A"
    elif total >= 65:
        grade = "B"
    elif total >= 50:
        grade = "C"
    else:
        grade = "F"

    return {
        "total": total,
        "momentum": round(momentum, 1),
        "trend": round(trend, 1),
        "volume": round(volume, 1),
        "grade": grade,
    }


def score_dataframe(df: pd.DataFrame, weights: dict[str, float] | None = None) -> pd.DataFrame:
    """Score all rows in a DataFrame and add score columns.

    The DataFrame should already have indicator columns computed.
    """
    scores = df.apply(lambda row: compute_composite_score(row, weights), axis=1)
    score_df = pd.DataFrame(scores.tolist(), index=df.index)
    score_df.columns = [f"score_{c}" for c in score_df.columns]
    return pd.concat([df, score_df], axis=1)
