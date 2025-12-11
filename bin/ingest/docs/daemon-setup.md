# Daemon Setup Guide

The `ingest watch` command runs continuously, polling Telegram for new messages. This guide shows how to run it as a background service.

## macOS (LaunchAgent)

The `install.sh` script automatically sets up a LaunchAgent. If you need to do it manually:

### Install

```bash
# Copy plist to LaunchAgents
cp bin/ingest/com.pai.ingest-watch.plist ~/Library/LaunchAgents/

# Edit paths in the plist (replace __PAI_DIR__ and __HOME__)
sed -i '' "s|__PAI_DIR__|$(pwd)|g" ~/Library/LaunchAgents/com.pai.ingest-watch.plist
sed -i '' "s|__HOME__|$HOME|g" ~/Library/LaunchAgents/com.pai.ingest-watch.plist

# Load the daemon
launchctl load ~/Library/LaunchAgents/com.pai.ingest-watch.plist
```

### Manage

```bash
# Check if running
launchctl list | grep pai

# Stop
launchctl unload ~/Library/LaunchAgents/com.pai.ingest-watch.plist

# Start
launchctl load ~/Library/LaunchAgents/com.pai.ingest-watch.plist

# View logs
tail -f /tmp/ingest-watch.log

# Remove completely
launchctl unload ~/Library/LaunchAgents/com.pai.ingest-watch.plist
rm ~/Library/LaunchAgents/com.pai.ingest-watch.plist
```

### Troubleshooting

```bash
# Check for errors
launchctl error system/com.pai.ingest-watch

# Force restart
launchctl kickstart -k gui/$(id -u)/com.pai.ingest-watch

# Debug: run manually first
cd bin/ingest && bun run ingest.ts watch --verbose
```

---

## Linux (systemd)

### Create Service File

```bash
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/pai-ingest.service << 'EOF'
[Unit]
Description=PAI Ingest Watch Daemon
After=network.target

[Service]
Type=simple
WorkingDirectory=%h/path/to/Personal_AI_Infrastructure/bin/ingest
ExecStart=/usr/bin/bun run ingest.ts watch
Restart=on-failure
RestartSec=10
Environment=HOME=%h
EnvironmentFile=%h/.config/fabric/.env

[Install]
WantedBy=default.target
EOF
```

### Manage

```bash
# Reload systemd
systemctl --user daemon-reload

# Enable (start on login)
systemctl --user enable pai-ingest

# Start now
systemctl --user start pai-ingest

# Check status
systemctl --user status pai-ingest

# View logs
journalctl --user -u pai-ingest -f

# Stop
systemctl --user stop pai-ingest

# Disable
systemctl --user disable pai-ingest
```

### Troubleshooting

```bash
# Check for errors
systemctl --user status pai-ingest

# Run manually to debug
cd ~/path/to/bin/ingest && bun run ingest.ts watch --verbose
```

---

## Docker

For containerized deployment:

```bash
cd bin/ingest/deployment

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Manual (Screen/tmux)

For quick testing or servers without systemd:

```bash
# Using screen
screen -S pai-ingest
cd bin/ingest && bun run ingest.ts watch
# Ctrl+A, D to detach

# Reconnect
screen -r pai-ingest

# Using tmux
tmux new -s pai-ingest
cd bin/ingest && bun run ingest.ts watch
# Ctrl+B, D to detach

# Reconnect
tmux attach -t pai-ingest
```

---

## Environment Variables

The daemon needs these environment variables (from `~/.config/fabric/.env`):

```bash
# Required
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=-100your_channel_id
OBSIDIAN_VAULT_PATH=~/Documents/your_vault

# Optional
OPENAI_API_KEY=sk-...              # For Vision AI, embeddings
TELEGRAM_OUTBOX_ID=-100...         # For notifications
INGEST_PROFILE=zettelkasten        # Processing profile
```

## Verifying the Daemon

```bash
# Check it's running
ingest status

# Send a test message to your Telegram channel
# Then check logs
tail -f /tmp/ingest-watch.log  # macOS
journalctl --user -u pai-ingest -f  # Linux
```

