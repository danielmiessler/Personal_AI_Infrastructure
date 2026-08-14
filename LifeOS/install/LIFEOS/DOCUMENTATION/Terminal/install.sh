#!/usr/bin/env bash
# Helm — a fully rigged kitty terminal: live tab bar, modal mux mode, sessions, theme.
# Ships with LifeOS. Run it from this directory; it clones nothing and needs no network
# beyond Homebrew. Upstream kitty is installed unmodified — Helm is a config layer, not a fork.
set -euo pipefail

HELM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Deliberately NOT XDG_CONFIG_HOME-aware: kitty.conf, the watchers, and DeckBar.ts all
# reference ~/.config/kitty by absolute path, so linking anywhere else would satisfy kitty
# while every helper inside the config silently dangled.
KITTY_CONF_DIR="$HOME/.config/kitty"

echo "⎈ Helm install"

# 1. kitty + font. A kitty installed outside brew (direct download) is fine — we only
#    shell out to brew when kitty is genuinely absent, so a non-brew install is not clobbered.
if [[ "$(uname)" == "Darwin" ]]; then
  if ! command -v kitty >/dev/null && [[ ! -d /Applications/kitty.app ]]; then
    command -v brew >/dev/null || { echo "Homebrew required (or install kitty yourself): https://brew.sh"; exit 1; }
    brew install --cask kitty
  fi
  if command -v brew >/dev/null && ! brew list --cask font-hack-nerd-font &>/dev/null; then
    brew install --cask font-hack-nerd-font || echo "  note: font install failed — install a Nerd Font yourself for the icons"
  fi
else
  command -v kitty >/dev/null || { echo "Install kitty first: https://sw.kovidgoyal.net/kitty/"; exit 1; }
fi

# 2. Back up whatever is already there — real directory OR an existing symlink (a dotfiles
#    manager's pointer counts; losing it silently would be rude) — then link Helm's config in.
#    The link points into the LifeOS tree, so a LifeOS update updates Helm too.
mkdir -p "$(dirname "$KITTY_CONF_DIR")"
if [[ -L "$KITTY_CONF_DIR" ]]; then
  PREVIOUS="$(readlink "$KITTY_CONF_DIR")"
  if [[ "$PREVIOUS" != "$HELM_DIR/kitty" ]]; then
    echo "  existing kitty config symlink pointed at: $PREVIOUS"
    echo "    (replacing the link only — nothing at that path is touched)"
  fi
elif [[ -e "$KITTY_CONF_DIR" ]]; then
  BACKUP="$KITTY_CONF_DIR.pre-helm.$(date +%Y%m%d%H%M%S)"
  mv "$KITTY_CONF_DIR" "$BACKUP"
  echo "  existing config backed up → $BACKUP"
fi
ln -sfn "$HELM_DIR/kitty" "$KITTY_CONF_DIR"
echo "  config linked: $KITTY_CONF_DIR → $HELM_DIR/kitty"

# 3. macOS app wrapper so it lives in Spotlight/Dock as "Helm".
#    The kitty path is resolved now rather than assumed, so a non-/Applications install works.
if [[ "$(uname)" == "Darwin" ]]; then
  if [[ -x /Applications/kitty.app/Contents/MacOS/kitty ]]; then
    KITTY_BIN=/Applications/kitty.app/Contents/MacOS/kitty
  else
    KITTY_BIN="$(command -v kitty || true)"
  fi
  if [[ -n "$KITTY_BIN" ]]; then
    APP="$HOME/Applications/Helm.app"
    mkdir -p "$APP/Contents/MacOS"
    cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Helm</string>
  <key>CFBundleIdentifier</key><string>io.helm.terminal</string>
  <key>CFBundleExecutable</key><string>helm</string>
</dict></plist>
PLIST
    # %q quotes the path: resolving via `command -v` means it can now contain spaces.
    printf '#!/usr/bin/env bash\nexec %q "$@"\n' "$KITTY_BIN" > "$APP/Contents/MacOS/helm"
    chmod +x "$APP/Contents/MacOS/helm"
    echo "  Helm.app created in ~/Applications (default app icon)"
  else
    echo "  note: kitty binary not found — skipping the Helm.app wrapper"
  fi
fi

# 4. helm command on PATH (doctor/update); bun optional but recommended for TabBar/DeckBar
HELM_ON_PATH=1
if command -v helm >/dev/null && [[ "$(command -v helm)" != "$HOME/.local/bin/helm" ]]; then
  echo "  ⚠ another 'helm' is already on your PATH ($(command -v helm)) — likely Kubernetes Helm."
  echo "    Skipping the PATH link. Run this one directly: $HELM_DIR/bin/helm"
  HELM_ON_PATH=0
elif [[ -e "$HOME/.local/bin/helm" && ! -L "$HOME/.local/bin/helm" ]]; then
  # A real file already sits at the exact path we'd link — a Kubernetes Helm installed
  # here is common, and ln -sfn would destroy it silently. Never clobber a real binary.
  echo "  ⚠ a real file already exists at ~/.local/bin/helm — leaving it alone."
  echo "    Run this one directly: $HELM_DIR/bin/helm"
  HELM_ON_PATH=0
else
  mkdir -p "$HOME/.local/bin"
  # An existing symlink here survives as a file but changes what `helm` MEANS, so say so
  # rather than repointing in silence — same courtesy the config-link step extends.
  if [[ -L "$HOME/.local/bin/helm" ]]; then
    PREV_HELM="$(readlink "$HOME/.local/bin/helm")"
    [[ "$PREV_HELM" != "$HELM_DIR/bin/helm" ]] && echo "  note: ~/.local/bin/helm pointed at $PREV_HELM — repointing it at Helm"
  fi
  ln -sfn "$HELM_DIR/bin/helm" "$HOME/.local/bin/helm"
  case ":$PATH:" in
    *":$HOME/.local/bin:"*) ;;
    *) echo "  ⚠ ~/.local/bin is not on your PATH — add it, or run $HELM_DIR/bin/helm directly"
       HELM_ON_PATH=0 ;;
  esac
fi
command -v bun >/dev/null || echo "  note: install bun (https://bun.sh) to enable the live tab bar + session picker"

if [[ "$HELM_ON_PATH" == "1" ]]; then
  echo "✓ Done. Launch Helm.app (or kitty). 'helm doctor' checks the install."
else
  echo "✓ Done. Launch Helm.app (or kitty). Check the install with: $HELM_DIR/bin/helm doctor"
fi
