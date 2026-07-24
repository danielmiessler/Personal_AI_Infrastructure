# Amber · Capture

Preserve a raw idea forever in Hindsight, unconditionally, the instant it is caught. This is the write-ahead step — it never blocks on grading or routing.

## Input

A URL, a block of text, or a spoken/pasted note. Optionally: `source`, `content_kind`, `privacy_class`, `title`, `author`.

## Steps

1. **Build the capture record** conforming to the capture contract (see `SKILL.md`). Fill every required field:
   - `source` — where it came from (`manual` when the principal hands it over directly).
   - `external_id` — the input's own id, or the url hash when there is none.
   - `url` **or** `content` — at least one. Normalize the URL (strip `utm_*`, `fbclid`, fragment, trailing slash).
   - `captured_at` — the current ISO-8601 timestamp.
   - `content_kind` — infer from the thing (`article` / `video` / `tweet` / `paper` / `note` / `tool`); default `note` for raw text.
   - `privacy_class` — `public` unless the content is clearly personal; when unsure, `personal` (fail safe).
   - `title` / `author` — when known.

2. **Compute the dedup identity** = hash(normalized `url` + content hash), falling back to hash(`source` + `external_id`). This is the `capture_id`.

3. **Check idempotency.** `hindsight_recall` for `document_id: user:aron:amber:{capture_id}` (or the same capture_id in `cat:amber`). If it already exists, report "already preserved" and stop — a retry never duplicates.

4. **Preserve (the write-ahead).** `hindsight_retain`:
   - content: the full raw capture record (all fields) — retain the richest representation; do NOT pre-summarize.
   - tags: `cat:amber`, `source:amber_capture`, `content_kind:{kind}`, `privacy_class:{class}`.
   - `document_id: user:aron:amber:{capture_id}` (stable per capture).

5. **Verify the retain.** Confirm the provider returned success. Only then report "preserved". If the retain failed, say so — do not claim preservation from intent.

6. **Do not grade or route here.** Grading and routing are async (the Route workflow / the cron). Capture ends the moment preservation is verified.

## Output

`✅ Preserved in Amber — {content_kind}, {capture_id[:10]}, privacy:{class}. Grading deferred to the Route pass.`

If a duplicate: `↩ Already in Amber — {capture_id[:10]} (no new record).`
