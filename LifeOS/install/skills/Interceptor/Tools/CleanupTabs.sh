#!/usr/bin/env bash
# CleanupTabs.sh — post-run tab hygiene for the pinned Interceptor test context.
#
# Closes leftover tabs that Interceptor opened in the TEST profile so the
# operator never looks over at a window with 50 stale tabs. Safety mirrors
# Tools/Capture.sh:
#   - Operates ONLY on INTERCEPTOR_TEST_CONTEXT_ID from preferences.env.
#     Never falls back to Default, never touches INTERCEPTOR_WORKING_PROFILE_IDS.
#   - Every command carries --context explicitly.
#   - Always keeps the active tab (also keeps the window alive).
#
# Usage:
#   CleanupTabs.sh                       Close all non-active tabs in the test context
#   CleanupTabs.sh --dry-run             Show what would close, close nothing
#   CleanupTabs.sh --keep-url <substr>   Also keep tabs whose URL contains <substr> (repeatable)
#   CleanupTabs.sh --threshold <n>       Only clean when tab count exceeds <n> (default 1 = always clean)
#
# Exit codes: 0 cleaned or nothing to do (incl. context not connected — post-run
# hygiene must never fail the run); 2 usage; 7 pinned target is a working/Default
# profile; 8 test context unset.

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Preferences live in USER customizations, same as every sibling tool (Capture.sh,
# PreflightIsolation.sh, EnsureTestProfile.sh, LaunchTestProfile.sh). Reading the
# skill-local copy first meant this script could see a different pinned context
# than the gate that authorizes it — and on a stock install, where the skill ships
# only preferences.env.example, no context at all (exit 8 on every run).
# public issue #1802, @catchingknives
PREFS="${HOME}/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/Interceptor/preferences.env"
[[ -f "$PREFS" ]] || PREFS="$SKILL_DIR/preferences.env"

DRY_RUN=0
THRESHOLD=1
KEEP_URLS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --keep-url) KEEP_URLS+=("${2:?--keep-url needs a value}"); shift 2 ;;
    --threshold) THRESHOLD="${2:?--threshold needs a number}"; shift 2 ;;
    -h|--help) sed -n '2,22p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "CleanupTabs.sh: unknown arg '$1'" >&2; exit 2 ;;
  esac
done

# --- 1. resolve pinned test context (never Default) ---
[[ -f "$PREFS" ]] && source "$PREFS"
CTX="${INTERCEPTOR_TEST_CONTEXT_ID:-}"
if [[ -z "$CTX" ]]; then
  echo "CleanupTabs.sh: INTERCEPTOR_TEST_CONTEXT_ID unset in $PREFS — refusing (no default-to-Default)." >&2
  exit 8
fi
# The deny-list is documented comma-separated (preferences.env.example) and parsed
# that way by PreflightIsolation.sh and Capture.sh, but was split here on whitespace
# only: the documented value arrived as a single token, never matched, and this
# guard — the only one on this path, since CleanupTabs does not call the preflight —
# failed open. Test the whole value and both splits, a superset of either earlier
# parse, so this can only ever add a refusal. The Default name check mirrors the
# siblings and the exit-7 contract in this script's own header.
# public issue #1802, @catchingknives
deny_hit=""
if printf '%s\n' "$CTX" | grep -qiE '(^|[^a-z])default([^a-z]|$)'; then
  deny_hit="name matches Default"
fi
deny_raw="$(printf '%s' "${INTERCEPTOR_WORKING_PROFILE_IDS:-}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
if [[ -z "$deny_hit" && -n "$deny_raw" ]]; then
  [[ "$deny_raw" == "$CTX" ]] && deny_hit="matches deny-list entry ($deny_raw)"
  for sep in ',' $', \t'; do
    [[ -n "$deny_hit" ]] && break
    IFS="$sep" read -ra deny_ids <<< "$deny_raw"
    for deny in "${deny_ids[@]:-}"; do
      deny="$(printf '%s' "$deny" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
      [[ -z "$deny" ]] && continue
      if [[ "$CTX" == "$deny" ]]; then
        deny_hit="matches deny-list entry ($deny)"
        break
      fi
    done
  done
fi
if [[ -n "$deny_hit" ]]; then
  echo "CleanupTabs.sh: pinned context $CTX is a denied Default/working profile ($deny_hit) — refusing." >&2
  exit 7
fi

# --- 2. confirm the pinned context is live; if not, nothing to clean ---
contexts_now="$(interceptor contexts 2>&1 || true)"
if ! printf '%s\n' "$contexts_now" | grep -v '→ contexts' | grep -qxF "$CTX"; then
  echo "CleanupTabs.sh: test context not connected — nothing to clean."
  exit 0
fi

# --- 3. list tabs in the test context only ---
tabs_raw="$(interceptor tabs --context "$CTX" 2>&1 | grep -v '→ tab_list' || true)"
total="$(printf '%s\n' "$tabs_raw" | grep -c '[0-9]' || true)"
if [[ "$total" -le "$THRESHOLD" ]]; then
  echo "CleanupTabs.sh: $total tab(s) open (threshold $THRESHOLD) — nothing to clean."
  exit 0
fi

# --- 4. decide keep/close: keep active tab (*) and any --keep-url match ---
closed=0 kept=0
while IFS= read -r line; do
  [[ -z "${line// /}" ]] && continue
  # format: '  <id>  <url>  <title>' with '*' prefix on the active tab
  active=0
  [[ "$line" == \** ]] && active=1
  stripped="${line#\*}"; stripped="${stripped#"${stripped%%[![:space:]]*}"}"
  tab_id="${stripped%%[[:space:]]*}"
  rest="${stripped#"$tab_id"}"; rest="${rest#"${rest%%[![:space:]]*}"}"
  url="${rest%%[[:space:]]*}"
  [[ "$tab_id" =~ ^[0-9]+$ ]] || continue

  keep=$active
  for pat in "${KEEP_URLS[@]:-}"; do
    [[ -n "$pat" && "$url" == *"$pat"* ]] && keep=1
  done

  if [[ "$keep" -eq 1 ]]; then
    kept=$((kept + 1))
    continue
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "would close: $tab_id  $url"
    closed=$((closed + 1))
  else
    if interceptor tab close "$tab_id" --context "$CTX" >/dev/null 2>&1; then
      closed=$((closed + 1))
    else
      echo "CleanupTabs.sh: failed to close tab $tab_id ($url) — skipping." >&2
    fi
  fi
done <<< "$tabs_raw"

verb="closed"; [[ "$DRY_RUN" -eq 1 ]] && verb="would close"
echo "CleanupTabs.sh: $verb $closed tab(s), kept $kept (context $CTX)."
exit 0
