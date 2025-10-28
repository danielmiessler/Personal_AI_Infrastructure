# Raw Outputs Directory

This directory will contain monthly subdirectories with daily event files.

## Structure

```
raw-outputs/
├── 2025-01/
│   ├── 2025-01-01_all-events.jsonl
│   ├── 2025-01-02_all-events.jsonl
│   └── ...
├── 2025-02/
│   └── ...
```

## File Rotation

- **Daily files:** New file created each day (PST timezone)
- **Monthly directories:** Keeps files organized
- **No automatic cleanup:** Files persist until you delete them

## Storage Considerations

Event files grow over time. Monitor disk usage:

```bash
du -sh ~/.claude/history/raw-outputs/
```

To clean up old events:

```bash
# Delete events older than 30 days
find ~/.claude/history/raw-outputs/ -name "*_all-events.jsonl" -mtime +30 -delete
```

## Backup

These files contain your complete agent interaction history. Consider backing them up if you want to preserve this data:

```bash
# Backup to external drive
rsync -av ~/.claude/history/raw-outputs/ /Volumes/Backup/claude-events/
```
