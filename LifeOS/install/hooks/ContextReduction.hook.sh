#!/bin/bash
# RTK auto-rewrite hook for Claude Code PreToolUse:Bash
# Transparently rewrites raw commands to their rtk equivalents to compress output.
#
# SCOPE (2026-07-13 shrink): rewrites ONLY git, gh, and the interceptor-screenshot
# redirect. The prior ~15-family table (cargo/vitest/npm/pnpm/pytest/go/docker/
# kubectl/prisma/ruff/mypy/tsc/eslint/prettier) was cut — none are this system's
# stack (bun/TS; note `bun test` was never even covered), so those rules were dead
# scaffolding. rtk's measured value here is git + gh output compression, which the
# principal runs constantly. rtk is an OPTIONAL dependency: without it on PATH this
# hook is an inert passthrough (guard below), never an error.
#
# INVARIANT (2026-06-10, do not regress): only rewrite when the rtk subcommand is a
# transparent passthrough to the SAME binary AND parse failure falls back to identical
# semantics. NEVER rewrite read-path commands whose stdout the model reasons over as
# evidence — search (rg/grep), file reads (cat/head), listings (ls/tree/find), diffs,
# HTTP (curl/wget), queries (psql/aws). rtk's parse-fail "runs raw" under a DIFFERENT
# binary there (rg→BSD grep → silent wrong-empty). Compress what the model WATCHES
# (VCS status, gh metadata); never what it READS. Incident: 2026-06-10 Vector ISA miss.

# Guards: skip silently if dependencies missing (rtk is optional — no rtk = no-op)
if ! command -v rtk &>/dev/null || ! command -v jq &>/dev/null; then
  exit 0
fi

set -euo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$CMD" ]; then
  exit 0
fi

# NOTE: no pipe/&& extraction happens — patterns below match against the WHOLE
# command string, anchored at its start. Compound commands only rewrite when the
# chain's first token matches a rule.
FIRST_CMD="$CMD"

# Skip if already using rtk
case "$FIRST_CMD" in
  rtk\ *|*/rtk\ *) exit 0 ;;
esac

# Skip commands with heredocs, variable assignments as the whole command, etc.
case "$FIRST_CMD" in
  *'<<'*) exit 0 ;;
esac

# Skip multi-line scripts — every rewrite rule below assumes single-line semantics
# (env-prefix detection, ^cmd anchors, sed substitution). Multi-line input causes
# byte-offset misalignment that corrupts the rewritten command.
case "$FIRST_CMD" in
  *$'\n'*) exit 0 ;;
esac

# Strip leading env var assignments for pattern matching
# e.g., "GIT_PAGER=cat git log" → match against "git log"
# but preserve them in the rewritten command for execution.
ENV_PREFIX=$(echo "$FIRST_CMD" | grep -oE '^([A-Za-z_][A-Za-z0-9_]*=[^ ]* +)+' || echo "")
if [ -n "$ENV_PREFIX" ]; then
  MATCH_CMD="${FIRST_CMD:${#ENV_PREFIX}}"
  CMD_BODY="${CMD:${#ENV_PREFIX}}"
else
  MATCH_CMD="$FIRST_CMD"
  CMD_BODY="$CMD"
fi

REWRITTEN=""

# --- Git commands (status-path only — see INVARIANT) ---
if echo "$MATCH_CMD" | grep -qE '^git[[:space:]]'; then
  GIT_SUBCMD=$(echo "$MATCH_CMD" | sed -E \
    -e 's/^git[[:space:]]+//' \
    -e 's/(-C|-c)[[:space:]]+[^[:space:]]+[[:space:]]*//g' \
    -e 's/--[a-z-]+=[^[:space:]]+[[:space:]]*//g' \
    -e 's/--(no-pager|no-optional-locks|bare|literal-pathspecs)[[:space:]]*//g' \
    -e 's/^[[:space:]]+//')
  case "$GIT_SUBCMD" in
    status|status\ *|diff|diff\ *|log|log\ *|add|add\ *|commit|commit\ *|push|push\ *|pull|pull\ *|branch|branch\ *|fetch|fetch\ *|stash|stash\ *|show|show\ *)
      REWRITTEN="${ENV_PREFIX}rtk $CMD_BODY"
      ;;
  esac

# --- GitHub CLI (pr/issue/run/api/release metadata — read-path bodies excluded) ---
elif echo "$MATCH_CMD" | grep -qE '^gh[[:space:]]+(pr|issue|run|api|release)([[:space:]]|$)'; then
  REWRITTEN="${ENV_PREFIX}$(echo "$CMD_BODY" | sed 's/^gh /rtk gh /')"

# --- Interceptor screenshot --save — redirect output to /tmp/pai-screenshots ---
# NOT a token rewrite: prevents stray interceptor-screenshot-*.jpg files from landing
# in the cwd (typically ~/.claude) when a subagent calls the command without the
# skill's `cd /tmp/pai-screenshots` prefix. Wraps the call in a subshell that chdirs
# first. Kept independent of rtk's compression role — it is the load-bearing piece.
elif echo "$MATCH_CMD" | grep -qE '^interceptor[[:space:]]+screenshot([[:space:]]|$)' && echo "$MATCH_CMD" | grep -qE -- '--save'; then
  REWRITTEN="${ENV_PREFIX}mkdir -p /tmp/pai-screenshots && ( cd /tmp/pai-screenshots && $CMD_BODY )"
fi

# If no rewrite needed, approve as-is
if [ -z "$REWRITTEN" ]; then
  exit 0
fi

# Build the updated tool_input with all original fields preserved, only command changed
ORIGINAL_INPUT=$(echo "$INPUT" | jq -c '.tool_input')
UPDATED_INPUT=$(echo "$ORIGINAL_INPUT" | jq --arg cmd "$REWRITTEN" '.command = $cmd')

# Output the rewrite instruction
# v2.1.77 COMPATIBILITY: "allow" here is correct — it approves the rewritten input.
# Since v2.1.77, "allow" no longer bypasses deny permission rules (security fix).
# This is fine because Bash is globally allowed in permissions.allow[].
# The "allow" + updatedInput pattern is the canonical way to rewrite tool input.
jq -n \
  --argjson updated "$UPDATED_INPUT" \
  '{
    "hookSpecificOutput": {
      "hookEventName": "PreToolUse",
      "permissionDecision": "allow",
      "permissionDecisionReason": "RTK auto-rewrite",
      "updatedInput": $updated
    }
  }'
