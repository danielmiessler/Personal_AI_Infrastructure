#!/usr/bin/env python3
"""Freshness check — A-F grade report for TELOS and identity files.

Reads file mtimes, applies staleness thresholds, outputs A-F grades.
Zero dependencies beyond Python stdlib. No model, no network, no API.

Usage:
    python check.py              # JSON output
    python check.py --text       # human-readable output
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# ── Thresholds (days) ──
# These mirror the LifeOS FreshnessSystem thresholds, adapted for Hermes.
# Per-file thresholds keyed by filename stem (lowercase).
THRESHOLDS: dict[str, int] = {
    # TELOS files
    "status": 14,
    "challenges": 14,
    "goals": 30,
    "strategies": 30,
    "tasks": 30,
    "projects": 30,
    "ideas": 90,
    "learned": 90,
    "lessons": 90,
    "predictions": 90,
    "reconciliation": 90,
    "updates": 90,
    "wrong": 365,
    "traumas": 365,
    "mission": 90,
    "beliefs": 90,
    "frames": 90,
    "wisdom": 90,
    "models": 90,
    "narratives": 90,
    "books": 180,
    "movies": 180,
    "problems": 90,
    # Identity files
    "telos": 30,
    "telos_hooks": 90,
    "telos_interview": 90,
    "readme": 365,
    # SOUL.md fallback
    "soul": 180,
}

# ── Default threshold for files not in the map ──
DEFAULT_THRESHOLD = 90


def freshness_pct(age_days: float, threshold_days: int) -> float:
    """Return 0–100 freshness percentage. 100 = just reviewed, 0 = at or past threshold."""
    if threshold_days <= 0:
        return 100.0
    return max(0.0, 100.0 - (age_days / threshold_days) * 100.0)


def freshness_grade(age_days: float, threshold_days: int) -> str:
    """A = ≤25% threshold, B = ≤50%, C = ≤75%, D = ≤100%, F = overdue."""
    pct = freshness_pct(age_days, threshold_days)
    if pct >= 75:
        return "A"
    if pct >= 50:
        return "B"
    if pct >= 25:
        return "C"
    if pct > 0:
        return "D"
    return "F"


def aggregate_grade(grades: list[str]) -> str:
    """GPA-style mean of letter grades."""
    if not grades:
        return "F"
    gpa = {"A": 4, "B": 3, "C": 2, "D": 1, "F": 0}
    avg = sum(gpa[g] for g in grades) / len(grades)
    if avg >= 3.5:
        return "A"
    if avg >= 2.5:
        return "B"
    if avg >= 1.5:
        return "C"
    if avg >= 0.5:
        return "D"
    return "F"


def check_freshness(
    telos_dir: str | None = None,
    soul_path: str | None = None,
) -> dict:
    """Scan TELOS files and SOUL.md, return freshness report."""
    now = datetime.now(timezone.utc)
    files: list[dict] = []

    # TELOS directory
    if telos_dir:
        telos = Path(telos_dir)
        if telos.is_dir():
            for f in sorted(telos.iterdir()):
                if f.is_file() and f.suffix == ".md":
                    stem = f.stem.lower()
                    threshold = THRESHOLDS.get(stem, DEFAULT_THRESHOLD)
                    mtime = f.stat().st_mtime
                    age_days = (now.timestamp() - mtime) / 86400.0
                    grade = freshness_grade(age_days, threshold)
                    pct = freshness_pct(age_days, threshold)
                    files.append({
                        "slug": stem,
                        "path": str(f),
                        "age_days": round(age_days, 1),
                        "threshold_days": threshold,
                        "pct": round(pct, 1),
                        "grade": grade,
                        "stale": grade == "F",
                    })

    # SOUL.md
    if soul_path:
        soul = Path(soul_path)
        if soul.is_file():
            threshold = THRESHOLDS.get("soul", 180)
            mtime = soul.stat().st_mtime
            age_days = (now.timestamp() - mtime) / 86400.0
            grade = freshness_grade(age_days, threshold)
            pct = freshness_pct(age_days, threshold)
            files.append({
                "slug": "soul",
                "path": str(soul),
                "age_days": round(age_days, 1),
                "threshold_days": threshold,
                "pct": round(pct, 1),
                "grade": grade,
                "stale": grade == "F",
            })

    grades = [f["grade"] for f in files]
    overall_grade = aggregate_grade(grades)
    if files:
        overall_pct = round(sum(f["pct"] for f in files) / len(files), 1)
    else:
        overall_pct = 0.0

    return {
        "overall_grade": overall_grade,
        "overall_pct": overall_pct,
        "total": len(files),
        "fresh_count": sum(1 for f in files if f["grade"] in ("A", "B")),
        "stale_count": sum(1 for f in files if f["stale"]),
        "most_stale": max(files, key=lambda f: f["age_days"])["slug"] if files else None,
        "files": files,
    }


def main() -> None:
    text_mode = "--text" in sys.argv

    telos_dir = os.environ.get("TELOS_DIR", "E:/Dropbox/ARON BIJL MSC/TELOS")
    hermes_home = os.environ.get("HERMES_HOME", os.path.expanduser("~/.hermes"))
    soul_path = os.path.join(hermes_home, "SOUL.md")

    report = check_freshness(telos_dir=telos_dir, soul_path=soul_path)

    if text_mode:
        print(f"Freshness: {report['overall_grade']} ({report['overall_pct']:.0f}%)")
        print(f"  {report['total']} files, {report['fresh_count']} fresh, {report['stale_count']} stale")
        if report["most_stale"]:
            print(f"  most stale: {report['most_stale']}")
        print()
        for f in report["files"]:
            flag = "⚠" if f["stale"] else " "
            print(f"  {flag} {f['grade']}  {f['slug']:<25} {f['age_days']:>5.0f}d / {f['threshold_days']}d")
    else:
        print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
