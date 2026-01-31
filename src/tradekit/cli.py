"""CLI entry point for tradekit."""

import logging
import sys

import click
from rich.console import Console

from tradekit.config import get_settings, now_et

console = Console()
logger = logging.getLogger("tradekit")

source_option = click.option(
    "--source",
    type=click.Choice(["yahoo", "massive"], case_sensitive=False),
    default=None,
    help="Data source: yahoo (default) or massive.",
)


def get_provider(source: str | None = None):
    """Return the appropriate data provider based on source name."""
    settings = get_settings()
    source = source or settings.data_source
    if source == "massive":
        from tradekit.data.massive import MassiveProvider

        return MassiveProvider()
    else:
        from tradekit.data.yahoo import YahooProvider

        return YahooProvider()


def _market_session() -> str:
    """Return a description of the current market session in ET."""
    t = now_et()
    hour, minute = t.hour, t.minute
    mins = hour * 60 + minute

    if mins < 4 * 60:
        return "Overnight (market closed)"
    elif mins < 9 * 60 + 30:
        return "Pre-market"
    elif mins < 16 * 60:
        return "Market open"
    elif mins < 20 * 60:
        return "After-hours"
    else:
        return "Overnight (market closed)"


@click.group()
@click.option("-v", "--verbose", is_flag=True, help="Enable verbose logging.")
def cli(verbose: bool):
    """tradekit — Pre-market screening and technical analysis toolkit."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stderr,
    )
    et = now_et()
    console.print(f"[dim]{et.strftime('%a %b %d, %I:%M %p')} ET — {_market_session()}[/dim]")


@cli.command()
@click.option("--preset", default="premarket_gap", help="Screener preset name.")
@click.option("--min-gap", type=float, default=None, help="Override minimum gap %.")
@click.option("--min-volume", type=int, default=None, help="Override minimum pre-market volume.")
@click.option("--max-price", type=float, default=None, help="Override maximum price.")
@source_option
def scan(
    preset: str, min_gap: float | None, min_volume: int | None,
    max_price: float | None, source: str | None,
):
    """Run the pre-market stock scanner."""
    from tradekit.reports.terminal import print_scan_results
    from tradekit.screener.premarket import scan_premarket

    settings = get_settings()
    provider = get_provider(source)

    # Apply CLI overrides to screener settings
    if min_gap is not None:
        settings.screener.min_gap_pct = min_gap
    if min_volume is not None:
        settings.screener.min_premarket_volume = min_volume
    if max_price is not None:
        settings.screener.max_price = max_price

    console.print("[bold]Running pre-market scan...[/bold]")
    df = scan_premarket(settings=settings, preset=preset, provider=provider)
    print_scan_results(df)

    if not df.empty:
        tickers = df["ticker"].tolist()
        console.print(f"\n[dim]Tickers: {', '.join(tickers)}[/dim]")


@cli.command()
@click.argument("ticker")
@click.option("--period", default="3mo", help="History period (e.g. 1mo, 3mo, 6mo, 1y).")
@source_option
def analyze(ticker: str, period: str, source: str | None):
    """Run deep technical analysis on a ticker."""
    from tradekit.analysis.indicators import compute_all_indicators
    from tradekit.analysis.levels import find_support_resistance, get_nearest_levels
    from tradekit.analysis.scoring import compute_composite_score
    from tradekit.analysis.volume import add_volume_indicators
    from tradekit.reports.terminal import print_analysis

    settings = get_settings()
    presets = settings.load_indicator_presets()
    provider = get_provider(source)

    ticker = ticker.upper()
    console.print(f"[bold]Analyzing {ticker}...[/bold]")

    # Fetch data
    quote = provider.get_quote(ticker)
    df = provider.get_history(ticker, period=period)
    if df.empty:
        console.print(f"[red]No data available for {ticker}[/red]")
        return

    # Compute indicators
    df = compute_all_indicators(df, presets=presets)
    df = add_volume_indicators(df)

    # Score
    latest = df.iloc[-1]
    score = compute_composite_score(latest, presets.get("scoring_weights"))

    # Levels
    sr_levels = find_support_resistance(df)
    current_price = quote.get("price", latest.get("close", 0))
    nearest = get_nearest_levels(current_price, sr_levels)

    print_analysis(ticker, score, nearest, quote)

    # Print RVOL and ATR prominently
    console.print("[bold]Volatility & Volume:[/bold]")
    rvol = latest.get("relative_volume")
    if rvol is not None:
        rvol_style = "bold green" if rvol >= 2.0 else "green" if rvol >= 1.5 else "yellow" if rvol >= 1.0 else "red"
        console.print(f"  RVOL: [{rvol_style}]{rvol:.2f}x[/{rvol_style}]", end="")
        if rvol >= 3.0:
            console.print("  [bold magenta]EXTREME[/bold magenta]")
        elif rvol >= 2.0:
            console.print("  [bold green]HIGH[/bold green]")
        elif rvol >= 1.5:
            console.print("  [green]ABOVE AVG[/green]")
        elif rvol >= 1.0:
            console.print("  [yellow]NORMAL[/yellow]")
        else:
            console.print("  [red]BELOW AVG[/red]")

    atr = latest.get("atr")
    atr_pct = latest.get("atr_pct")
    if atr is not None:
        console.print(f"  ATR(14): ${atr:.2f}  ({atr_pct:.1f}% of price)")

    vwap = latest.get("vwap")
    if vwap is not None:
        current = quote.get("price", latest.get("close", 0))
        vwap_dist = ((current - vwap) / vwap * 100) if vwap else 0
        vwap_style = "green" if vwap_dist > 0 else "red"
        console.print(f"  VWAP: ${vwap:.2f}  [{vwap_style}]({vwap_dist:+.1f}%)[/{vwap_style}]")

    console.print()

    # Print indicator snapshot
    console.print("[bold]Indicator Snapshot:[/bold]")
    rsi = latest.get("rsi")
    if rsi is not None:
        rsi_style = "red" if rsi > 70 else "green" if rsi < 30 else "white"
        console.print(f"  RSI(14): [{rsi_style}]{rsi:.1f}[/{rsi_style}]")

    macd_h = latest.get("macd_histogram")
    if macd_h is not None:
        macd_style = "green" if macd_h > 0 else "red"
        console.print(f"  MACD Hist: [{macd_style}]{macd_h:.3f}[/{macd_style}]")

    stoch_k = latest.get("stoch_k")
    stoch_d = latest.get("stoch_d")
    if stoch_k is not None:
        console.print(f"  Stochastic: %K={stoch_k:.1f}  %D={stoch_d:.1f}")

    console.print()


@cli.command()
@click.argument("ticker")
@click.option("--period", default="3mo", help="History period for level detection.")
@source_option
def levels(ticker: str, period: str, source: str | None):
    """Show support and resistance levels for a ticker."""
    from tradekit.analysis.levels import find_support_resistance, get_nearest_levels
    from tradekit.analysis.volume import find_high_volume_nodes

    provider = get_provider(source)
    ticker = ticker.upper()

    console.print(f"[bold]Support/Resistance for {ticker}...[/bold]")
    quote = provider.get_quote(ticker)
    df = provider.get_history(ticker, period=period)

    if df.empty:
        console.print(f"[red]No data for {ticker}[/red]")
        return

    sr = find_support_resistance(df)
    current_price = quote.get("price", df["close"].iloc[-1])
    nearest = get_nearest_levels(current_price, sr)

    console.print(f"\n  Current: [bold]${current_price:.2f}[/bold]\n")

    for r in nearest.get("resistance", []):
        dist = (r["level"] - current_price) / current_price * 100
        console.print(f"  [red]R ${r['level']:.2f}[/red]  (+{dist:.1f}%)  strength: {r['strength']}")

    console.print(f"  [bold cyan]→ ${current_price:.2f}[/bold cyan]")

    for s in nearest.get("support", []):
        dist = (current_price - s["level"]) / current_price * 100
        console.print(f"  [green]S ${s['level']:.2f}[/green]  (-{dist:.1f}%)  strength: {s['strength']}")

    # High volume nodes
    hvn = find_high_volume_nodes(df["close"], df["volume"])
    if hvn:
        console.print(f"\n  [yellow]High Volume Nodes:[/yellow] " + "  ".join(f"${p:.2f}" for p in hvn))

    console.print()


@cli.command()
@click.option("--name", default="default", help="Watchlist name from config.")
@source_option
def watchlist(name: str, source: str | None):
    """Review watchlist tickers with pre-market data."""
    from tradekit.reports.terminal import print_scan_results
    from tradekit.screener.premarket import scan_watchlist

    settings = get_settings()
    provider = get_provider(source)
    console.print(f"[bold]Scanning watchlist '{name}'...[/bold]")

    df = scan_watchlist(settings=settings, watchlist_name=name, provider=provider)
    print_scan_results(df, title=f"Watchlist: {name}")


@cli.command()
@click.option("--preset", default="premarket_gap", help="Screener preset.")
@click.option("--top-n", default=5, help="Number of top picks to analyze in detail.")
@source_option
def morning(preset: str, top_n: int, source: str | None):
    """Full morning pre-market workflow: scan + analyze top picks."""
    from tradekit.analysis.indicators import compute_all_indicators
    from tradekit.analysis.levels import find_support_resistance, get_nearest_levels
    from tradekit.analysis.scoring import compute_composite_score
    from tradekit.analysis.volume import add_volume_indicators
    from tradekit.reports.terminal import print_analysis, print_scan_results
    from tradekit.screener.premarket import scan_premarket

    settings = get_settings()
    presets = settings.load_indicator_presets()
    provider = get_provider(source)

    # Step 1: Scan
    console.print("[bold]Step 1: Pre-Market Scan[/bold]")
    scan_df = scan_premarket(settings=settings, preset=preset, provider=provider)
    print_scan_results(scan_df)

    if scan_df.empty:
        console.print("[yellow]No candidates found. Check back closer to market open.[/yellow]")
        return

    # Step 2: Analyze top picks
    tickers = scan_df["ticker"].tolist()[:top_n]
    console.print(f"\n[bold]Step 2: Analyzing Top {len(tickers)} Picks[/bold]")

    for ticker in tickers:
        try:
            quote = provider.get_quote(ticker)
            df = provider.get_history(ticker, period="3mo")
            if df.empty:
                console.print(f"[yellow]  Skipping {ticker} — no data[/yellow]")
                continue

            df = compute_all_indicators(df, presets=presets)
            df = add_volume_indicators(df)
            latest = df.iloc[-1]
            score = compute_composite_score(latest, presets.get("scoring_weights"))

            sr = find_support_resistance(df)
            price = quote.get("price", latest.get("close", 0))
            nearest = get_nearest_levels(price, sr)

            print_analysis(ticker, score, nearest, quote)
        except Exception as e:
            console.print(f"[red]  Error analyzing {ticker}: {e}[/red]")

    console.print("[bold green]Morning workflow complete.[/bold green]")


@cli.command()
@click.option("--preset", default="premarket_gap", help="Screener preset.")
@click.option("--output-dir", default=None, help="Report output directory.")
@source_option
def report(preset: str, output_dir: str | None, source: str | None):
    """Generate and save a daily report."""
    from pathlib import Path

    from tradekit.reports.markdown import generate_daily_report, save_report
    from tradekit.screener.premarket import scan_premarket
    from tradekit.screener.ranking import rank_candidates

    settings = get_settings()
    provider = get_provider(source)

    console.print("[bold]Generating daily report...[/bold]")

    scan_df = scan_premarket(settings=settings, preset=preset, provider=provider)

    ranked_df = None
    if not scan_df.empty:
        tickers = scan_df["ticker"].tolist()[:10]
        console.print(f"  Ranking top {len(tickers)} candidates...")
        presets = settings.load_indicator_presets()
        ranked_df = rank_candidates(
            tickers,
            weights=presets.get("scoring_weights"),
            indicator_presets=presets,
            provider=provider,
        )

    content = generate_daily_report(scan_df, ranked_df)
    out_dir = Path(output_dir) if output_dir else None
    path = save_report(content, output_dir=out_dir)

    console.print(f"[green]Report saved: {path}[/green]")
    console.print(content)
