#!/usr/bin/env python3
"""
Conduit rollup — deterministic daily record from raw events. PURE aggregation:
events -> record, no model, no network in the compute path. Idempotent (running
twice on the same day produces the same files). The single external write is the
Hindsight retain at the end. Invoked by the `conduit-rollup` cron daily.

Usage:
    python rollup.py [YYYY-MM-DD]   build + persist + retain the day (default: today)
    python rollup.py --today        print today's live distribution (not persisted)
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

CONDUIT_VERSION = "1.0.0-hermes"


def hermes_home() -> Path:
    return Path(os.environ.get("HERMES_HOME") or (Path.home() / ".hermes"))


CONDUIT_DIR = hermes_home() / "conduit"
EVENTS_PATH = CONDUIT_DIR / "events.jsonl"
CONFIG_PATH = CONDUIT_DIR / "config.json"
DAILY_DIR = CONDUIT_DIR / "daily"
RETAIN_QUEUE = CONDUIT_DIR / "retain-queue.jsonl"

# Static creation/consumption map — data, not logic. Edit to taste. Windows-aware.
CREATION = ["terminal", "powershell", "cmd", "windows terminal", "code", "cursor",
            "visual studio", "vscode", "nvim", "vim", "neovim", "zed", "sublime",
            "obsidian", "notion", "figma", "photoshop", "davinci", "ableton",
            "hermes", "git", "excel"]
CONSUMPTION = ["chrome", "edge", "firefox", "brave", "arc", "opera",
               "mail", "outlook", "thunderbird",
               "slack", "discord", "telegram", "whatsapp", "signal", "teams",
               "twitter", "youtube", "reddit", "instagram", "tiktok", "netflix", "news"]


def classify_app(app: str) -> str:
    a = (app or "").strip().lower()
    if not a:
        return "neutral"
    if any(k == a or k in a for k in CREATION):
        return "creation"
    if any(k == a or k in a for k in CONSUMPTION):
        return "consumption"
    return "neutral"


def load_config() -> dict:
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"pollIntervalSec": 120}


def read_day_events(date: str) -> list[dict]:
    if not EVENTS_PATH.exists():
        return []
    events = []
    for line in EVENTS_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            e = json.loads(line)
        except Exception:
            continue
        if str(e.get("ts", "")).startswith(date):
            events.append(e)
    return events


def build_daily_record(date: str, events: list[dict], poll_interval_sec: int) -> dict:
    """Pure: events -> DailyRecord. One app-focus event = one poll interval of its app."""
    per_app_sec: dict[str, float] = {}
    per_repo_commits: dict[str, int] = {}
    seen_sha: set[str] = set()
    commits = 0
    sessions = 0
    for e in events:
        etype = e.get("type")
        if etype == "app-focus" and e.get("app"):
            sec = e.get("detail", {}).get("intervalSec") or poll_interval_sec
            per_app_sec[e["app"]] = per_app_sec.get(e["app"], 0) + float(sec)
        elif etype == "git-commit":
            sha = (e.get("detail", {}).get("sha")) or f"{e.get('repo')}:{e.get('ts')}"
            if sha in seen_sha:
                continue
            seen_sha.add(sha)
            commits += 1
            repo = e.get("repo", "?")
            per_repo_commits[repo] = per_repo_commits.get(repo, 0) + 1
        elif etype == "hermes-session":
            sessions += 1

    blocks = sorted(
        ({"label": label, "kind": classify_app(label), "minutes": round(sec / 60, 1)}
         for label, sec in per_app_sec.items()),
        key=lambda b: b["minutes"], reverse=True,
    )
    kind_sum = lambda k: round(sum(b["minutes"] for b in blocks if b["kind"] == k), 1)
    return {
        "date": date,
        "conduitVersion": CONDUIT_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "totalMinutes": round(sum(b["minutes"] for b in blocks), 1),
        "creationMinutes": kind_sum("creation"),
        "consumptionMinutes": kind_sum("consumption"),
        "neutralMinutes": kind_sum("neutral"),
        "blocks": blocks,
        "commits": commits,
        "commitsByRepo": per_repo_commits,
        "sessions": sessions,
        "narrative": None,   # v2 model seam
        "telosTags": {},     # v2 TELOS-scoring seam
    }


def render_markdown(r: dict) -> str:
    def hm(m: float) -> str:
        return f"{int(m // 60)}h {round(m % 60)}m"
    denom = r["creationMinutes"] + r["consumptionMinutes"]
    ratio = round(r["creationMinutes"] / denom * 100) if denom > 0 else 0
    rows = "\n".join(f"| {b['label']} | {b['kind']} | {hm(b['minutes'])} |" for b in r["blocks"][:20])
    repos = ", ".join(f"{k} ({v})" for k, v in r["commitsByRepo"].items()) or "—"
    return (f"# Conduit — {r['date']}\n\n"
            f"> Deterministic daily record · Conduit v{r['conduitVersion']} · generated {r['generatedAt']}\n\n"
            f"- **Tracked time:** {hm(r['totalMinutes'])}\n"
            f"- **Creation:** {hm(r['creationMinutes'])} · **Consumption:** {hm(r['consumptionMinutes'])} · **Neutral:** {hm(r['neutralMinutes'])}\n"
            f"- **Creation ratio:** {ratio}% (creation / (creation + consumption))\n"
            f"- **Commits:** {r['commits']} ({repos}) · **Hermes sessions:** {r['sessions']}\n\n"
            f"## Where the time went\n\n| App | Kind | Time |\n|-----|------|------|\n"
            f"{rows or '| _(no app-focus events)_ | | |'}\n")


def write_daily_record(r: dict) -> dict:
    DAILY_DIR.mkdir(parents=True, exist_ok=True)
    md_path = DAILY_DIR / f"{r['date']}.md"
    json_path = DAILY_DIR / f"{r['date']}.json"
    md_path.write_text(render_markdown(r), encoding="utf-8")   # overwrite = idempotent
    json_path.write_text(json.dumps(r, indent=2), encoding="utf-8")
    return {"md": str(md_path), "json": str(json_path)}


def retain_to_hindsight(r: dict, md: str) -> None:
    """The one external write. Shell out to the hermes CLI; on any failure, durably
    queue the request so the daily record is never lost from memory."""
    doc_id = f"user:aron:conduit:daily:{r['date']}"
    tags = ["cat:conduit", "source:conduit_daily"]
    try:
        res = subprocess.run(
            ["hermes", "memory", "retain", "--document-id", doc_id,
             "--tags", ",".join(tags), "--file", md],
            capture_output=True, text=True, timeout=30,
        )
        if res.returncode == 0:
            print(f"retained {doc_id} to Hindsight")
            return
    except Exception:
        pass
    CONDUIT_DIR.mkdir(parents=True, exist_ok=True)
    with RETAIN_QUEUE.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps({"document_id": doc_id, "tags": tags, "file": md}) + "\n")
    print(f"queued retain for {doc_id} (hermes CLI unavailable) → {RETAIN_QUEUE}")


if __name__ == "__main__":
    poll = int(load_config().get("pollIntervalSec", 120))
    if "--today" in sys.argv:
        date = datetime.now(timezone.utc).date().isoformat()
        print(render_markdown(build_daily_record(date, read_day_events(date), poll)))
    else:
        date = next((a for a in sys.argv[1:] if not a.startswith("--")),
                    datetime.now(timezone.utc).date().isoformat())
        record = build_daily_record(date, read_day_events(date), poll)
        paths = write_daily_record(record)
        retain_to_hindsight(record, paths["md"])
        print(f"Rolled up {date} → {paths['md']}")
