#!/usr/bin/env python3
"""ISA HTML Mirror — deterministic ISA.md → ISA.html renderer.

Port of LifeOS ISARender.ts to Python stdlib.
Zero tokens, zero API calls, zero dependencies. The template HTML and CSS
are loaded from LifeOS/install/LIFEOS/TOOLS/ISARender/ and reused as-is.

Usage:
    python render.py <path-to-ISA.md>          # write ISA.html alongside
    python render.py <path-to-ISA.md> --stdout  # print to stdout
    python render.py <path-to-ISA.md> --output out.html
"""

import json
import os
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

# ── Paths ──
# render.py is at LifeOS/install/skills/ISA/Tools/render.py
# Templates live at LifeOS/install/LIFEOS/TOOLS/ISARender/
# parents: [Tools, ISA, skills, install, LifeOS] → parents[3] = install
SKILL_ROOT = Path(__file__).resolve().parents[3]  # LifeOS/install
TEMPLATE_DIR = SKILL_ROOT / "LIFEOS" / "TOOLS" / "ISARender"
TEMPLATE_HTML = TEMPLATE_DIR / "template.html"
TEMPLATE_CSS = TEMPLATE_DIR / "template.css"

# ── Section names in canonical order ──
SECTIONS = [
    "Problem", "Vision", "Out of Scope", "Principles", "Constraints",
    "Dependencies", "Goal", "Criteria", "Not yet specified", "Bridge Criteria",
    "Test Strategy", "Features", "Decisions", "Changelog", "Verification",
]


def parse_frontmatter(text: str) -> dict[str, str]:
    """Extract YAML frontmatter as a flat dict."""
    m = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return {}
    fm: dict[str, str] = {}
    for line in m.group(1).split("\n"):
        if ":" in line:
            key, _, val = line.partition(":")
            fm[key.strip()] = val.strip().strip("\"'")
    return fm


def parse_sections(body: str) -> dict[str, str]:
    """Split body into named sections."""
    result: dict[str, str] = {}
    current: str | None = None
    current_lines: list[str] = []

    for line in body.split("\n"):
        h2 = re.match(r"^## (.+)$", line)
        if h2:
            if current:
                result[current] = "\n".join(current_lines).strip()
            current = h2.group(1).strip()
            current_lines = []
        elif current is not None:
            current_lines.append(line)

    if current:
        result[current] = "\n".join(current_lines).strip()
    return result


def parse_iscs(criteria_text: str) -> list[dict]:
    """Parse ISC rows from the Criteria section.

    Supported checkbox states: [ ] pending, [x] passed, [-] tombstone.
    """
    iscs: list[dict] = []
    for line in criteria_text.split("\n"):
        m = re.match(r"- \[([ x-])\] (ISC-\d+(?:\.\d+)?):\s*(.*)", line)
        if not m:
            continue
        box = m.group(1)
        isc_id = m.group(2)
        text = m.group(3).strip()

        # Tombstone: checkbox is '-' OR text starts with [DROPPED
        if box == "-" or text.startswith("[DROPPED"):
            iscs.append({"id": isc_id, "text": text, "checked": False, "kind": "tombstone"})
            continue

        checked = box == "x"
        kind = "normal"
        if text.startswith("Anti:"):
            kind = "anti"
            text = text[5:].strip()
        elif text.startswith("Antecedent:"):
            kind = "antecedent"
            text = text[11:].strip()
        elif text.startswith("Bridge:"):
            kind = "bridge"
            text = text[7:].strip()

        iscs.append({"id": isc_id, "text": text, "checked": checked, "kind": kind})
    return iscs


def status_pill(isc: dict) -> str:
    """Render a status pill span for an ISC row."""
    kind = isc["kind"]
    checked = isc["checked"]

    if kind == "tombstone":
        return '<span class="pill drop">✕ DROP</span>'
    if kind == "anti":
        return '<span class="pill done">✓ DONE</span>' if checked else '<span class="pill anti">✕ ANTI</span>'
    if kind == "antecedent":
        return '<span class="pill done">✓ DONE</span>' if checked else '<span class="pill ante">◆ ANTE</span>'
    # normal / bridge
    if checked:
        return '<span class="pill done">✓ DONE</span>'
    return '<span class="pill open">○ OPEN</span>'


def render_iscs(iscs: list[dict]) -> str:
    """Render ISC rows as HTML."""
    rows = []
    for isc in iscs:
        kind_cls = f" {isc['kind']}" if isc["kind"] != "normal" else ""
        checked_cls = " passed" if isc["checked"] else " pending"
        pill = status_pill(isc)
        prefix = ""
        if isc["kind"] == "anti":
            prefix = "Anti: "
        elif isc["kind"] == "antecedent":
            prefix = "Antecedent: "
        elif isc["kind"] == "bridge":
            prefix = "Bridge: "
        rows.append(
            f'<div class="isc{checked_cls}{kind_cls}">'
            f'<span class="isc-id">{isc["id"]}</span>'
            f"{pill}"
            f'<span class="isc-text">{prefix}{isc["text"]}</span>'
            f"</div>"
        )
    return "\n".join(rows)


def build_sections_html(sections: dict[str, str], iscs: list[dict]) -> str:
    """Build the {{SECTIONS}} placeholder content."""
    parts = []
    for name in SECTIONS:
        if name not in sections:
            continue
        content = sections[name]
        slug = name.lower().replace(" ", "-")

        if name == "Criteria" and iscs:
            checked = sum(1 for i in iscs if i["checked"] and i["kind"] != "tombstone")
            total = sum(1 for i in iscs if i["kind"] != "tombstone")
            progress_line = f'<div class="progress-bar">progress: {checked}/{total}</div>\n'
            isc_html = render_iscs(iscs)
            parts.append(
                f'<div class="section section-{slug}">'
                f'<h2>{name}</h2>'
                f"{progress_line}"
                f'<div class="isc-list">{isc_html}</div>'
                f"</div>"
            )
        else:
            # Convert markdown tables to HTML tables
            html = _render_section_body(content)
            parts.append(f'<div class="section section-{slug}"><h2>{name}</h2>{html}</div>')

    return "\n".join(parts)


def _render_section_body(content: str) -> str:
    """Minimal markdown→HTML for section bodies: paragraphs, bullets, tables."""
    lines = content.split("\n")
    out: list[str] = []
    in_table = False
    table_rows: list[str] = []

    for line in lines:
        # Table detection
        if line.startswith("|") and line.rstrip().endswith("|"):
            if not in_table:
                in_table = True
                table_rows = []
            table_rows.append(line)
            continue
        elif in_table:
            # Flush table
            if table_rows:
                out.append(_render_table(table_rows))
            table_rows = []
            in_table = False

        # Bullets
        if re.match(r"^- ", line):
            out.append(f"<li>{line[2:]}</li>")
            continue
        # Code blocks
        if line.startswith("```"):
            out.append("<pre><code>" if "```" in line[3:] else "</code></pre>")
            continue
        # Empty line → paragraph break
        if not line.strip():
            if out and not out[-1].startswith("<"):
                out.append("</p>")
            continue
        # Regular text → paragraph
        if out and out[-1] == "</p>":
            out.append("<p>")
        out.append(line)

    if in_table and table_rows:
        out.append(_render_table(table_rows))
    return "\n".join(out)


def _render_table(rows: list[str]) -> str:
    """Convert pipe-table rows to HTML."""
    if len(rows) < 1:
        return ""
    html = "<table class=\"data\">"
    for i, row in enumerate(rows):
        tag = "th" if i == 0 or (i == 1 and re.match(r"^\|[\s\-:|]+\|$", row)) else "td"
        cells = [c.strip() for c in row.strip("|").split("|")]
        html += "<tr>" + "".join(f"<{tag}>{c}</{tag}>" for c in cells) + "</tr>"
    html += "</table>"
    return html


def build_phase_bar(fm: dict[str, str]) -> str:
    """Build the {{PHASE_BAR}} placeholder content."""
    phase = fm.get("phase", "observe").upper()
    effort = fm.get("effort", "standard")
    phases = ["OBSERVE", "THINK", "PLAN", "BUILD", "EXECUTE", "VERIFY", "LEARN", "COMPLETE"]
    pills = []
    for p in phases:
        active = " active" if p == phase else ""
        pills.append(f'<span class="phase-slot{active}">{p}</span>')
    bar = " → ".join(pills)
    return f'<div class="phase-bar">{bar}</div><div class="effort-badge">{effort}</div>'


def render(isa_path: Path) -> str:
    """Render ISA.md → HTML string."""
    text = isa_path.read_text(encoding="utf-8")
    fm = parse_frontmatter(text)

    # Split frontmatter from body
    body = re.sub(r"^---\n.*?\n---\n?", "", text, count=1, flags=re.DOTALL)
    sections = parse_sections(body)
    iscs = parse_iscs(sections.get("Criteria", ""))

    # Load templates
    css = TEMPLATE_CSS.read_text(encoding="utf-8") if TEMPLATE_CSS.exists() else ""
    template = TEMPLATE_HTML.read_text(encoding="utf-8") if TEMPLATE_HTML.exists() else "<html><body>{{SECTIONS}}</body></html>"

    now = datetime.now().strftime("%Y-%m-%d %H:%M UTC")

    # Build template values
    task = fm.get("task", isa_path.stem)
    slug_val = fm.get("slug", "")
    phase = fm.get("phase", "observe").upper()
    effort = fm.get("effort", "standard")
    updated = fm.get("updated", now)
    hero_goal = fm.get("principal_stated_goal", "")
    mode = fm.get("mode", "")

    # Phase bar
    phases = ["OBSERVE", "THINK", "PLAN", "BUILD", "EXECUTE", "VERIFY", "LEARN", "COMPLETE"]
    pills = []
    for p in phases:
        active = " active" if p == phase else ""
        pills.append(f'<span class="phase-slot{active}">{p}</span>')
    phase_bar = " → ".join(pills)

    # Hero badges
    badges = []
    if phase:
        badges.append(f'<span class="badge-phase">{phase}</span>')
    if effort:
        badges.append(f'<span class="badge-effort">{effort}</span>')
    if mode:
        badges.append(f'<span class="badge-mode">{mode}</span>')
    hero_badges = " ".join(badges)

    # Progress rail (classes match template.css: .rail, .fill, .text, .num)
    checked = sum(1 for i in iscs if i["checked"] and i["kind"] != "tombstone")
    total = sum(1 for i in iscs if i["kind"] != "tombstone")
    pct = round(checked / total * 100) if total else 0
    progress_rail = (
        f'<div class="progress-rail">'
        f'<div class="rail"><div class="fill" style="width:{pct}%"></div></div>'
        f'<div class="text"><span class="num">{checked}</span>/{total}</div>'
        f"</div>"
    )

    # TOC
    toc_items = []
    for name in SECTIONS:
        if name in sections:
            slug = name.lower().replace(" ", "-")
            toc_items.append(f'<li><a href="#section-{slug}">{name}</a></li>')
    toc = "\n".join(toc_items)

    # Sections HTML
    sections_html = build_sections_html(sections, iscs)

    # Fill template
    html = template
    html = html.replace("{{TITLE}}", task)
    html = html.replace("{{TASK}}", task)
    html = html.replace("{{CSS}}", f"<style>{css}</style>")
    html = html.replace("{{BRAND_LOGO_B64}}", "")
    html = html.replace("{{EFFORT_DISPLAY}}", effort)
    html = html.replace("{{SLUG}}", slug_val)
    html = html.replace("{{UPDATED}}", updated)
    html = html.replace("{{HERO_BADGES}}", hero_badges)
    html = html.replace("{{PROGRESS_RAIL}}", progress_rail)
    html = html.replace("{{HERO_CALLOUT}}", f'<div class="hero-callout">{hero_goal}</div>' if hero_goal else "")
    html = html.replace("{{PHASE_BAR}}", phase_bar)
    html = html.replace("{{TOC}}", toc)
    html = html.replace("{{WARNINGS}}", "")
    html = html.replace("{{SECTIONS}}", sections_html)
    html = html.replace("{{FOOTER_LEFT}}", slug_val)
    html = html.replace("{{RENDERED_AT}}", now)

    return html


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python render.py <path-to-ISA.md> [--stdout] [--output out.html]", file=sys.stderr)
        sys.exit(1)

    isa_path = Path(sys.argv[1]).resolve()
    if not isa_path.exists():
        print(f"ISA file not found: {isa_path}", file=sys.stderr)
        sys.exit(1)

    html = render(isa_path)

    if "--stdout" in sys.argv:
        print(html)
        return

    output_arg = None
    for i, arg in enumerate(sys.argv):
        if arg == "--output" and i + 1 < len(sys.argv):
            output_arg = sys.argv[i + 1]
            break

    if output_arg:
        out_path = Path(output_arg)
    else:
        out_path = isa_path.parent / "ISA.html"

    # Atomic write
    tmp = out_path.with_suffix(out_path.suffix + ".tmp")
    tmp.write_text(html, encoding="utf-8")
    tmp.replace(out_path)
    print(f"Rendered: {out_path}")


if __name__ == "__main__":
    main()
