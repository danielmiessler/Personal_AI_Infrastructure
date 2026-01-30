"""Rich terminal output for tradekit."""

import pandas as pd
from rich.console import Console
from rich.table import Table
from rich.text import Text

console = Console()


def _grade_color(grade: str) -> str:
    return {"A": "bold green", "B": "green", "C": "yellow", "F": "red"}.get(grade, "white")


def _gap_color(gap_pct: float) -> str:
    if gap_pct > 5:
        return "bold green"
    elif gap_pct > 0:
        return "green"
    elif gap_pct < -5:
        return "bold red"
    elif gap_pct < 0:
        return "red"
    return "white"


def _format_volume(vol: int | float) -> str:
    if pd.isna(vol) or vol == 0:
        return "-"
    if vol >= 1_000_000:
        return f"{vol / 1_000_000:.1f}M"
    if vol >= 1_000:
        return f"{vol / 1_000:.0f}K"
    return str(int(vol))


def print_scan_results(df: pd.DataFrame, title: str = "Pre-Market Scanner"):
    """Print scanner results as a rich table."""
    if df.empty:
        console.print(f"[yellow]{title}: No results found.[/yellow]")
        return

    table = Table(title=title, show_lines=False, pad_edge=True)
    table.add_column("#", style="dim", width=3)
    table.add_column("Ticker", style="bold cyan", width=8)
    table.add_column("Name", width=20, no_wrap=True)
    table.add_column("Price", justify="right", width=8)
    table.add_column("Gap%", justify="right", width=8)
    table.add_column("PreMkt Vol", justify="right", width=10)
    table.add_column("Avg Vol", justify="right", width=10)
    table.add_column("Float", justify="right", width=10)

    for i, row in df.iterrows():
        gap_pct = row.get("gap_pct", 0)
        gap_text = Text(f"{gap_pct:+.1f}%", style=_gap_color(gap_pct))

        price = row.get("pre_price") or row.get("price", 0)
        name = str(row.get("name", ""))[:20]
        float_shares = row.get("float_shares", 0)

        table.add_row(
            str(int(i) + 1),
            str(row.get("ticker", "")),
            name,
            f"${price:.2f}" if price else "-",
            gap_text,
            _format_volume(row.get("pre_volume", 0)),
            _format_volume(row.get("avg_volume", 0)),
            _format_volume(float_shares),
        )

    console.print(table)


def print_analysis(ticker: str, score: dict, levels: dict, quote: dict):
    """Print detailed analysis for a single ticker."""
    console.print()
    console.print(f"[bold cyan]═══ {ticker} Analysis ═══[/bold cyan]")
    console.print()

    # Quote info
    price = quote.get("price", 0)
    prev_close = quote.get("prev_close", 0)
    change = price - prev_close if price and prev_close else 0
    change_pct = (change / prev_close * 100) if prev_close else 0
    price_color = "green" if change >= 0 else "red"

    console.print(f"  Price: [{price_color}]${price:.2f} ({change_pct:+.1f}%)[/{price_color}]")
    console.print(f"  Volume: {_format_volume(quote.get('volume', 0))}  "
                  f"Avg: {_format_volume(quote.get('avg_volume', 0))}")
    console.print()

    # Scores
    grade = score.get("grade", "?")
    grade_style = _grade_color(grade)
    console.print(f"  [bold]Score:[/bold] [{grade_style}]{score.get('total', 0):.0f}/100 "
                  f"({grade})[/{grade_style}]")
    console.print(f"    Momentum: {score.get('momentum', 0):.0f}  "
                  f"Trend: {score.get('trend', 0):.0f}  "
                  f"Volume: {score.get('volume', 0):.0f}")
    console.print()

    # Support/Resistance
    if levels:
        resistance = levels.get("resistance", [])
        support = levels.get("support", [])

        if resistance:
            r_str = "  ".join(f"${r['level']:.2f}({r['strength']})" for r in resistance[:3])
            console.print(f"  [red]Resistance:[/red] {r_str}")
        if support:
            s_str = "  ".join(f"${s['level']:.2f}({s['strength']})" for s in support[:3])
            console.print(f"  [green]Support:[/green]    {s_str}")

    console.print()


def print_ranked_results(df: pd.DataFrame, title: str = "Ranked Candidates"):
    """Print ranked candidates with scores."""
    if df.empty:
        console.print(f"[yellow]{title}: No results.[/yellow]")
        return

    table = Table(title=title, show_lines=False, pad_edge=True)
    table.add_column("#", style="dim", width=3)
    table.add_column("Ticker", style="bold cyan", width=8)
    table.add_column("Price", justify="right", width=8)
    table.add_column("Score", justify="right", width=7)
    table.add_column("Grade", justify="center", width=5)
    table.add_column("Mom", justify="right", width=5)
    table.add_column("Trend", justify="right", width=5)
    table.add_column("Vol", justify="right", width=5)

    for i, row in df.iterrows():
        grade = row.get("grade", "?")
        grade_text = Text(grade, style=_grade_color(grade))

        table.add_row(
            str(int(i) + 1),
            str(row.get("ticker", "")),
            f"${row.get('price', 0):.2f}",
            f"{row.get('total', 0):.0f}",
            grade_text,
            f"{row.get('momentum', 0):.0f}",
            f"{row.get('trend', 0):.0f}",
            f"{row.get('volume', 0):.0f}",
        )

    console.print(table)
