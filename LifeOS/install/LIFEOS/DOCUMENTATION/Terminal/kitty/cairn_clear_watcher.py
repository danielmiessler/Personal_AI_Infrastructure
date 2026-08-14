# cairn_clear_watcher.py — clear the green "done" tab stamp when the tab is viewed.
#
# LifeOS hooks paint a tab cairn-green when a run completes (state file says
# 'completed'). Herdr-style done-cleared-on-view: the first time that window
# gains focus, drop the color stamp and consume the state file so it fires once.
# Title is left alone — the summary stays useful; the color is the "unread" bit.

import json
import os

STATE_DIR = os.path.expanduser('~/.claude/LIFEOS/MEMORY/STATE/tab-titles')


def on_focus_change(boss, window, data):
    if not data.get('focused'):
        return
    path = os.path.join(STATE_DIR, f'{window.id}.json')
    try:
        with open(path) as f:
            st = json.load(f)
    except Exception:
        return
    if st.get('state') != 'completed':
        return
    try:
        boss.call_remote_control(window, (
            'set-tab-color', f'--match=window_id:{window.id}',
            'active_bg=none', 'active_fg=none',
            'inactive_bg=none', 'inactive_fg=none',
        ))
    except Exception:
        return
    try:
        os.remove(path)
    except Exception:
        pass
