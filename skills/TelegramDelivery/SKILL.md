---
name: TelegramDelivery
description: Send files to user via Telegram bot. USE WHEN send file to Telegram OR share document OR deliver PDF OR send to user.
---

# TelegramDelivery

Send files to users via Telegram bot. Does ONE thing well (Unix philosophy).

**Scope:** File delivery only. Use the `Pdf` skill for PDF generation.

## CLI Tool

```bash
# Send any file to Telegram
bun run $PAI_DIR/skills/TelegramDelivery/Tools/SendToTelegram.ts -f <file> [-c "caption"] [-u user_id]
```

### Options

| Flag | Description |
|------|-------------|
| `-f, --file` | File to send (required) |
| `-c, --caption` | Message caption (optional) |
| `-u, --user` | Target user ID (default: TELEGRAM_ALLOWED_USERS first entry) |
| `--silent` | Don't notify user |
| `-h, --help` | Show help |

## Composability with Pdf Skill

This skill composes with the `Pdf` skill for document generation and delivery:

```bash
# Generate PDF with reportlab (see Pdf skill), then deliver
python3 /tmp/pdfenv/bin/python -c "
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

doc = SimpleDocTemplate('/tmp/report.pdf', pagesize=letter)
styles = getSampleStyleSheet()
doc.build([Paragraph('Hello World', styles['Title'])])
"

# Send via Telegram
bun run $PAI_DIR/skills/TelegramDelivery/Tools/SendToTelegram.ts -f /tmp/report.pdf -c "Your report"
```

## Prerequisites

**Before using this skill, ensure:**
- Telegram bot running: `~/.claude/voice/manage.sh telegram-status`
- `TELEGRAM_BOT_TOKEN` set in environment
- `TELEGRAM_ALLOWED_USERS` set (or use `--user` flag)

## History Capture

All operations logged to `~/.claude/history/telegram-delivery.jsonl`:

```jsonl
{"timestamp":"2026-01-06T...","session_id":"tg-123","event":"send","file":"report.pdf","user_id":390810213}
{"timestamp":"2026-01-06T...","session_id":"tg-123","event":"complete","message_id":789}
```

## Examples

**Example 1: Send a PDF**
```bash
bun run $PAI_DIR/skills/TelegramDelivery/Tools/SendToTelegram.ts -f /tmp/report.pdf -c "Your report"
```

**Example 2: Send any file type**
```bash
bun run $PAI_DIR/skills/TelegramDelivery/Tools/SendToTelegram.ts -f ~/screenshot.png -c "Screenshot"
```

**Example 3: Silent delivery**
```bash
bun run $PAI_DIR/skills/TelegramDelivery/Tools/SendToTelegram.ts -f notes.pdf --silent
```

## Related Skills

- **Pdf** - Knowledge skill for PDF generation using Python libraries (reportlab, pypdf, pdfplumber)
- **VoiceInterface** - Pattern reference for CLI tools and logging
