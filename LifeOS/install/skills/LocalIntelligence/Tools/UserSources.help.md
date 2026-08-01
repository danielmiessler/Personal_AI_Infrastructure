# UserSources.ts

Deterministic user-configured sources for the digest. Not a CLI — imported by `Refresh.ts` on every run, before the AI fill.

## Config

`~/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/LocalIntelligence/sources.json`:

```json
{
  "sources": [
    { "section": "news", "name": "Local Paper", "type": "rss",
      "url": "https://example.com/feed", "max_items": 7 },
    { "section": "crime", "name": "City Crime API", "type": "json",
      "url": "https://example.org/api/crimes?days=2",
      "items_path": "items",
      "map": { "title": "{offense_type} — {location}", "date": "{reported_date}" },
      "link": "https://example.org", "title_case": true }
  ]
}
```

- `type: "rss"` handles RSS 2.0 and Atom.
- `type: "json"`: `items_path` dot-path to the array; `map.*` are `{field}` templates; `link` is fixed or templated per item.
- Missing config file = no user sources (silent, not an error). A failing source lands in `meta.errors`; it never blanks the digest.
- Merge semantics: user items prepend into the section, deduped by title; the section becomes `ok`, so ClaudeFill skips it.

The config lives under `LIFEOS/USER/**` (containment-deletion zone) — city-specific URLs never enter the public skill.
