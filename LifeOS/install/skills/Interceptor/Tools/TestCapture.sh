#!/usr/bin/env bash
# Focused falsifier for Capture.sh's saved-screenshot contract.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CAPTURE="$SCRIPT_DIR/Capture.sh"
TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/interceptor-capture-test.XXXXXX")"
FAKE_HOME="$TEST_ROOT/home"
FAKE_BIN="$TEST_ROOT/bin"
FAKE_EXTENSION="$TEST_ROOT/extension"
CALL_LOG="$TEST_ROOT/interceptor.calls"

cleanup() {
    rm -rf -- "$TEST_ROOT"
}
trap cleanup EXIT HUP INT TERM

mkdir -p "$FAKE_HOME/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/Interceptor" \
    "$FAKE_BIN" "$FAKE_EXTENSION"

cat > "$FAKE_HOME/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/Interceptor/preferences.env" <<EOF
export PATH="$FAKE_BIN:\$PATH"
INTERCEPTOR_TEST_CONTEXT_ID="interceptor-test"
INTERCEPTOR_WORKING_PROFILE_IDS="working-profile"
EOF

cat > "$FAKE_EXTENSION/manifest.json" <<'EOF'
{"manifest_version":3,"name":"Interceptor test fixture","version":"0.23.30"}
EOF

cat > "$FAKE_BIN/magick" <<'EOF'
#!/usr/bin/env bash
printf '0.1'
EOF

cat > "$FAKE_BIN/interceptor" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$INTERCEPTOR_TEST_CALL_LOG"

case "${1:-}" in
    --version)
        printf 'interceptor 0.23.30 (test, 2026-09-01)\n'
        exit 0
        ;;
    contexts)
        printf '[test] → contexts\ninterceptor-test\n'
        exit 0
        ;;
    open)
        exit 0
        ;;
esac

if [ "${1:-}" = "--json" ] && [ "${2:-}" = "screenshot" ]; then
    for arg in "$@"; do
        if [ "$arg" = "--out" ]; then
            printf "unknown flag '--out' for 'screenshot'\n" >&2
            exit 64
        fi
    done
    printf '%s\n' "$*" | grep -Eq '(^| )--save( |$)'
    if [ "${INTERCEPTOR_TEST_FAIL_CAPTURE:-0}" = "1" ]; then
        printf 'simulated capture failure\n' >&2
        exit 1
    fi
    fixture="$PWD/capture.png"
    printf 'saved-screenshot-fixture\n' > "$fixture"
    printf '{"success":true,"data":{"filePath":"%s"}}\n' "$fixture"
    exit 0
fi

printf 'unexpected interceptor invocation: %s\n' "$*" >&2
exit 65
EOF

chmod +x "$FAKE_BIN/interceptor" "$FAKE_BIN/magick"

FINAL="$TEST_ROOT/final/screenshot.png"
mkdir -p "$(dirname "$FINAL")"
FINAL="$(CDPATH='' cd -P -- "$(dirname "$FINAL")" && pwd -P)/$(basename "$FINAL")"

saved="$({
    HOME="$FAKE_HOME" \
    INTERCEPTOR_EXT_DIR="$FAKE_EXTENSION" \
    INTERCEPTOR_TEST_CALL_LOG="$CALL_LOG" \
    INTERCEPTOR_CAPTURE_INTERCEPTOR_BIN="$FAKE_BIN/interceptor" \
    bash "$CAPTURE" --current --out "$FINAL"
} 2> "$TEST_ROOT/capture.stderr")"

[ "$saved" = "$FINAL" ]
[ -f "$FINAL" ] && [ ! -L "$FINAL" ]
[ "$(cat "$FINAL")" = "saved-screenshot-fixture" ]
grep -Eq '^--json screenshot .*--save' "$CALL_LOG"
if grep -Eq '^--json screenshot .*--out' "$CALL_LOG"; then
    echo "TestCapture: wrapper passed obsolete --out to screenshot" >&2
    exit 1
fi

printf 'preserve-existing-artifact\n' > "$FINAL"
if HOME="$FAKE_HOME" \
    INTERCEPTOR_EXT_DIR="$FAKE_EXTENSION" \
    INTERCEPTOR_TEST_CALL_LOG="$CALL_LOG" \
    INTERCEPTOR_TEST_FAIL_CAPTURE=1 \
    INTERCEPTOR_CAPTURE_INTERCEPTOR_BIN="$FAKE_BIN/interceptor" \
    bash "$CAPTURE" --current --out "$FINAL" \
    > "$TEST_ROOT/failed.stdout" 2> "$TEST_ROOT/failed.stderr"; then
    echo "TestCapture: simulated failed capture unexpectedly succeeded" >&2
    exit 1
fi
[ "$(cat "$FINAL")" = "preserve-existing-artifact" ]

printf 'INTERCEPTOR_CAPTURE_SAVE_OK\n'
