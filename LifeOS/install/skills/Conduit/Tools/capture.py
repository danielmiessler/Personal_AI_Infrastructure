#!/usr/bin/env python3
"""
Conduit capture — Windows-native, deterministic current-state poll.

Runs enabled adapters once, appends one JSONL event per signal to
$HERMES_HOME/conduit/events.jsonl, and advances per-source watermarks. stdlib
only; no model calls; no network. Every adapter is fault-isolated so one failure
never blocks the others. Invoked by the `conduit-capture` cron every 2 minutes.

Usage:
    python capture.py            run one poll, append events
    python capture.py --status   print config + today's event count
"""
from __future__ import annotations

import ctypes
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


# ── Paths ────────────────────────────────────────────────────────────────────
def hermes_home() -> Path:
    return Path(os.environ.get("HERMES_HOME") or (Path.home() / ".hermes"))


CONDUIT_DIR = hermes_home() / "conduit"
EVENTS_PATH = CONDUIT_DIR / "events.jsonl"
CONFIG_PATH = CONDUIT_DIR / "config.json"
STATE_PATH = CONDUIT_DIR / "state.json"
SESSIONS_DIR = hermes_home() / "sessions"

DEFAULT_CONFIG = {
    "enabled": True,
    "pollIntervalSec": 120,
    "sources": {"appFocus": True, "git": True, "hermesSession": True},
    "repos": [],
    "retentionDays": 30,
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_json(path: Path, default: dict) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return dict(default)


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        CONDUIT_DIR.mkdir(parents=True, exist_ok=True)
        CONFIG_PATH.write_text(json.dumps(DEFAULT_CONFIG, indent=2), encoding="utf-8")
        return dict(DEFAULT_CONFIG)
    cfg = load_json(CONFIG_PATH, DEFAULT_CONFIG)
    # Shallow-merge defaults so a partial config never KeyErrors downstream.
    merged = dict(DEFAULT_CONFIG)
    merged.update(cfg)
    merged["sources"] = {**DEFAULT_CONFIG["sources"], **cfg.get("sources", {})}
    return merged


def read_state() -> dict:
    return load_json(STATE_PATH, {})


def write_state(patch: dict) -> None:
    state = read_state()
    state.update(patch)
    CONDUIT_DIR.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")


# ── Adapters (each fault-isolated by the caller) ─────────────────────────────
def capture_app_focus() -> list[dict]:
    """Foreground window title via ctypes/user32; PowerShell fallback. Empty = no focus."""
    title = ""
    try:
        user32 = ctypes.windll.user32
        hwnd = user32.GetForegroundWindow()
        if hwnd:
            length = user32.GetWindowTextLengthW(hwnd)
            if length > 0:
                buf = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buf, length + 1)
                title = buf.value.strip()
    except Exception:
        title = ""
    if not title:
        title = _app_focus_powershell()
    if not title:
        return []  # no window focused — never guess
    return [{"ts": now_iso(), "type": "app-focus", "source": "appFocus",
             "app": title, "detail": {"intervalSec": load_config()["pollIntervalSec"]}}]


def _app_focus_powershell() -> str:
    try:
        out = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command",
             "(Get-Process | Where-Object {$_.MainWindowTitle} | "
             "Sort-Object CPU -Descending | Select-Object -First 1).MainWindowTitle"],
            capture_output=True, text=True, timeout=8,
        )
        return (out.stdout or "").strip()
    except Exception:
        return ""


def capture_git(config: dict) -> list[dict]:
    repos = [r for r in config.get("repos", []) if isinstance(r, str)]
    if not repos:
        return []
    state = read_state()
    since = state.get("lastGitPollTs") or _fallback_since(config)
    events: list[dict] = []
    all_ok = True
    unit = "\x1f"  # ASCII unit separator — safe --pretty field delimiter
    for repo in repos:
        try:
            out = subprocess.run(
                ["git", "-C", repo, "log", f"--since={since}", "--no-merges",
                 f"--pretty=format:%H{unit}%s{unit}%aI"],
                capture_output=True, text=True, timeout=8,
            ).stdout.strip()
            if not out:
                continue
            for line in out.split("\n"):
                parts = line.split(unit)
                if len(parts) < 3 or not parts[0]:
                    continue
                sha, subject, author_date = parts[0], parts[1], parts[2]
                events.append({"ts": author_date or now_iso(), "type": "git-commit",
                               "source": "git", "repo": os.path.basename(repo.rstrip("/\\")),
                               "detail": {"sha": sha[:10], "subject": subject}})
        except Exception:
            all_ok = False  # keep scanning the rest, but do NOT advance the cursor
    # Advance only on a clean full scan, so a transient failure never skips commits.
    if all_ok:
        write_state({"lastGitPollTs": now_iso()})
    return events


def capture_hermes_session() -> list[dict]:
    """Hermes session activity since the last poll — replaces LifeOS claudeSession."""
    try:
        if not SESSIONS_DIR.exists():
            return []
        cursor = float(read_state().get("lastHermesMtime") or 0.0)
        latest = cursor
        count = 0
        last_slug = None
        for entry in sorted(SESSIONS_DIR.iterdir(), key=lambda p: p.name):
            try:
                if not entry.is_file():
                    continue
                mtime = entry.stat().st_mtime
            except Exception:
                continue
            if mtime <= cursor:
                continue
            count += 1
            last_slug = entry.stem
            if mtime > latest:
                latest = mtime
        if count == 0:
            return []
        write_state({"lastHermesMtime": latest})
        return [{"ts": now_iso(), "type": "hermes-session", "source": "hermesSession",
                 "detail": {"events": count, "lastSlug": last_slug}}]
    except Exception:
        return []


def _fallback_since(config: dict) -> str:
    # Two poll intervals back, so a first run isn't unbounded.
    from datetime import timedelta
    return (datetime.now(timezone.utc) - timedelta(seconds=config["pollIntervalSec"] * 2)).isoformat()


# ── Poll orchestration ───────────────────────────────────────────────────────
def append_events(events: list[dict]) -> None:
    if not events:
        return
    CONDUIT_DIR.mkdir(parents=True, exist_ok=True)
    with EVENTS_PATH.open("a", encoding="utf-8") as fh:
        for e in events:
            fh.write(json.dumps(e, ensure_ascii=False) + "\n")


def run_capture() -> int:
    config = load_config()
    if not config.get("enabled", True):
        return 0
    sources = config["sources"]
    runners = [
        (sources.get("appFocus", True), capture_app_focus, ()),
        (sources.get("git", True), capture_git, (config,)),
        (sources.get("hermesSession", True), capture_hermes_session, ()),
    ]
    collected: list[dict] = []
    for enabled, fn, fargs in runners:
        if not enabled:
            continue
        try:
            collected.extend(fn(*fargs))
        except Exception:
            pass  # one adapter down never aborts the poll
    append_events(collected)
    return len(collected)


def today_event_count() -> int:
    if not EVENTS_PATH.exists():
        return 0
    today = datetime.now(timezone.utc).date().isoformat()
    n = 0
    for line in EVENTS_PATH.read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("{") and today in line:
            n += 1
    return n


def do_status() -> None:
    config = load_config()
    enabled = ", ".join(k for k, v in config["sources"].items() if v) or "(none)"
    print("Conduit capture (Windows)")
    print(f"  enabled:      {config.get('enabled', True)}")
    print(f"  poll:         {config['pollIntervalSec']}s")
    print(f"  sources:      {enabled}")
    print(f"  repos:        {len(config.get('repos', []))}")
    print(f"  data root:    {CONDUIT_DIR}")
    print(f"  events today: {today_event_count()}")


if __name__ == "__main__":
    if "--status" in sys.argv:
        do_status()
    else:
        print(f"captured {run_capture()} event(s)")
