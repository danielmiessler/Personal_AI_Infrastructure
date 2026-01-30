"""Markdown report generation."""

from pathlib import Path

import pandas as pd

from tradekit.config import now_et


def generate_scan_report(df: pd.DataFrame, title: str = "Pre-Market Scan") -> str:
    """Generate a Markdown report from scanner results."""
    now = now_et().strftime("%Y-%m-%d %I:%M %p ET")
    lines = [f"# {title}", f"*Generated: {now}*", ""]

    if df.empty:
        lines.append("No candidates found.")
        return "\n".join(lines)

    # Summary table
    lines.append("| # | Ticker | Price | Gap% | PreMkt Vol | Avg Vol |")
    lines.append("|---|--------|------:|-----:|-----------:|--------:|")

    for i, row in df.iterrows():
        gap = row.get("gap_pct", 0)
        price = row.get("pre_price") or row.get("price", 0)
        lines.append(
            f"| {int(i) + 1} "
            f"| **{row.get('ticker', '')}** "
            f"| ${price:.2f} "
            f"| {gap:+.1f}% "
            f"| {_fmt_vol(row.get('pre_volume', 0))} "
            f"| {_fmt_vol(row.get('avg_volume', 0))} |"
        )

    return "\n".join(lines)


def generate_analysis_report(
    ticker: str, score: dict, levels: dict, quote: dict
) -> str:
    """Generate Markdown analysis for a single ticker."""
    lines = [
        f"## {ticker} — {quote.get('name', '')}",
        "",
        f"**Price:** ${quote.get('price', 0):.2f}  ",
        f"**Volume:** {_fmt_vol(quote.get('volume', 0))} "
        f"(avg: {_fmt_vol(quote.get('avg_volume', 0))})",
        "",
        f"### Score: {score.get('total', 0):.0f}/100 ({score.get('grade', '?')})",
        f"- Momentum: {score.get('momentum', 0):.0f}",
        f"- Trend: {score.get('trend', 0):.0f}",
        f"- Volume: {score.get('volume', 0):.0f}",
        "",
    ]

    # Levels
    resistance = levels.get("resistance", [])
    support = levels.get("support", [])
    if resistance or support:
        lines.append("### Key Levels")
        if resistance:
            for r in resistance[:3]:
                lines.append(f"- **R** ${r['level']:.2f} (strength: {r['strength']})")
        if support:
            for s in support[:3]:
                lines.append(f"- **S** ${s['level']:.2f} (strength: {s['strength']})")
        lines.append("")

    return "\n".join(lines)


def generate_daily_report(
    scan_df: pd.DataFrame,
    ranked_df: pd.DataFrame | None = None,
) -> str:
    """Generate a full daily report combining scan and ranking results."""
    now = now_et().strftime("%Y-%m-%d")
    lines = [f"# Daily Trading Report — {now}", ""]

    lines.append(generate_scan_report(scan_df, title="Pre-Market Candidates"))
    lines.append("")

    if ranked_df is not None and not ranked_df.empty:
        lines.append("## Ranked by Score")
        lines.append("")
        lines.append("| # | Ticker | Score | Grade | Momentum | Trend | Volume |")
        lines.append("|---|--------|------:|:-----:|---------:|------:|-------:|")
        for i, row in ranked_df.iterrows():
            lines.append(
                f"| {int(i) + 1} "
                f"| **{row.get('ticker', '')}** "
                f"| {row.get('total', 0):.0f} "
                f"| {row.get('grade', '?')} "
                f"| {row.get('momentum', 0):.0f} "
                f"| {row.get('trend', 0):.0f} "
                f"| {row.get('volume', 0):.0f} |"
            )
        lines.append("")

    return "\n".join(lines)


def save_report(content: str, output_dir: Path | None = None, filename: str = "") -> Path:
    """Save a Markdown report to disk."""
    if output_dir is None:
        output_dir = Path.cwd() / "reports" / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    if not filename:
        filename = f"report_{now_et().strftime('%Y%m%d_%H%M')}.md"

    path = output_dir / filename
    path.write_text(content)
    return path


def _fmt_vol(vol: int | float) -> str:
    if pd.isna(vol) or vol == 0:
        return "-"
    if vol >= 1_000_000:
        return f"{vol / 1_000_000:.1f}M"
    if vol >= 1_000:
        return f"{vol / 1_000:.0f}K"
    return str(int(vol))
