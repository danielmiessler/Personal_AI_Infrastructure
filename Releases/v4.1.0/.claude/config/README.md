# PAI Configuration Files

This directory contains configuration data extracted from `settings.json` for easier maintenance.

## Files

- **`spinner-verbs.json`** — Custom loading verbs for the terminal spinner UI (424 entries). These are personality/flavor text shown while Claude thinks. Edit this file to add/remove/modify spinner verbs.

- **`spinner-tips.json`** — Tips shown in the spinner UI while Claude thinks (202 entries). These describe PAI features and capabilities. Edit this file to update tips.

## Why These Exist

Claude Code requires `spinnerVerbs` and `spinnerTipsOverride` to be inline in `settings.json`. These extracted files serve as the **canonical maintenance source** — easier to diff, review, and edit than hunting through a 1000+ line JSON file.

After editing these files, copy the arrays back into `settings.json` under their respective keys, or use a build step to automate the merge.

## Relationship to settings.json

- `config/spinner-verbs.json` → `settings.json > spinnerVerbs.verbs`
- `config/spinner-tips.json` → `settings.json > spinnerTipsOverride.tips`
