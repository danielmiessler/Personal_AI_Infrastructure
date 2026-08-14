# tab_refit_watcher.py — keep the LEFT-edge tab bar hugging the widest title.
#
# kitty's vertical bar reserves a fixed column with no auto-fit, and TabBar.ts
# only computes the fit when one of its commands runs — so titles that grow or
# shrink between commands get clipped against a stale width. This watcher
# re-runs `TabBar.ts refit` whenever any tab title changes (or a window
# closes, which can shrink the widest title); refit itself re-applies only if
# the computed width actually moved, so most events are cheap no-ops.
#
# The widest-title check here is a change DETECTOR only (Python len, code
# points) — TabBar.ts owns the authoritative width math. kitty attaches
# watchers at window creation, so windows opened before this file was
# registered in kitty.conf don't fire it; new tabs do.

import json
import os
import subprocess

STATE_FILE = os.path.expanduser('~/.cache/kitty-tabbar-state.json')
TABBAR = os.path.expanduser('~/.config/kitty/TabBar.ts')

_last_widest = None


def _bun():
    for p in ('/opt/homebrew/bin/bun',
              os.path.expanduser('~/.bun/bin/bun'),
              '/usr/local/bin/bun'):
        if os.path.exists(p):
            return p
    return 'bun'


def _left_bar_active():
    try:
        with open(STATE_FILE) as f:
            st = json.load(f)
        return st.get('edge') == 'left' and st.get('mode') == 'normal'
    except Exception:
        return False


def _widest(boss):
    try:
        return max(
            (len(getattr(t, 'title', None) or getattr(t, 'name', '') or '')
             for t in boss.all_tabs),
            default=0,
        )
    except Exception:
        return None  # unknown → always refit; TabBar.ts no-ops if unneeded


def _refit(boss, force=False):
    global _last_widest
    if not _left_bar_active():
        return
    w = _widest(boss)
    if not force and w is not None and w == _last_widest:
        return
    _last_widest = w
    try:
        cmd = [_bun(), TABBAR, 'refit']
        if force:
            cmd.append('force')
        subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
    except Exception:
        pass


# One forced apply per kitty instance: this module reloads on kitty restart,
# so the flag resets exactly when the live options revert to kitty.conf while
# the state file still claims appliedW is live. The first title change after
# startup re-applies unconditionally; every later one uses the cheap guard.
_healed_this_instance = False


def on_title_change(boss, window, data):
    global _healed_this_instance
    force = not _healed_this_instance
    _healed_this_instance = True
    _refit(boss, force=force)


def on_close(boss, window, data):
    # The dying window may still be in all_tabs here, so skip the guard.
    _refit(boss, force=True)
