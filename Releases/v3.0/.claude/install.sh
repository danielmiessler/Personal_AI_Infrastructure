#!/usr/bin/env bash
# PAI Installer v3.0 — Entry Point
# Forwards to the full installer in PAI-Install/
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/PAI-Install/install.sh" "$@"
