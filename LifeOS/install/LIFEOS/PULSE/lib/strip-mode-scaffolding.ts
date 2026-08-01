/**
 * strip-mode-scaffolding.ts — Egress sanitizer for remote-channel chat surfaces.
 *
 * The LifeOS output format (banner, field prefixes, 🗣️ closer) is right for
 * the terminal; it is wrong for remote chat surfaces like iMessage, where the
 * principal sees the scaffolding ("═══ LifeOS ═══", "📃 CONTENT:",
 * "🗣️ <DA name>:") as visual noise interrupting a conversation.
 *
 * Two layers defend the chat surface:
 *
 *   Layer 1 (prevention) — the channel's own spawn appends a channel-specific
 *   directive to the system prompt, overriding the format contract for that
 *   turn. For iMessage that is the IMESSAGE_DIRECTIVE literal in
 *   `PULSE/modules/imessage.ts` (systemPrompt.append), which also sets
 *   LIFEOS_NOTIFICATION_CHANNEL=imessage so voice-emitting hooks stay quiet.
 *   No hook emits the directive — it lives with the channel that needs it.
 *
 *   Layer 2 (egress) — THIS file. Even with prevention in place the model can
 *   leak markers (format rules survive context compaction and are very
 *   strong). The sanitizer regex-strips known LifeOS scaffolding markers from
 *   outgoing text before send — stripping all known formatting when the
 *   format is wrong for the channel.
 *
 * The sanitizer is conservative — it only matches LifeOS's specific scaffolding
 * tokens, never arbitrary user prose. If the model emits no scaffolding (the
 * happy path under Layer 1) the function is a no-op.
 */

// Regex set — each pattern strips one class of scaffolding.
// Lines that match BANNER/PHASE_HEADER/BARE_MODE_LABEL are removed entirely.
// Lines that match FIELD_PREFIX/VOICE_PREFIX have only the prefix removed
// (the content after the prefix IS the message).

const BANNER_LINE = /^[ \t]*═══[\s\S]*?═══[ \t]*$/gm;
const PHASE_HEADER_LINE = /^[ \t]*━━━[^\n]*?━━━[ \t]*\d+\s*\/\s*\d+[ \t]*$/gm;
const BARE_MODE_LABEL_LINE = /^[ \t]*(MINIMAL|NATIVE|ALGORITHM)[ \t]*$/gm;
const FIELD_PREFIX = /^[ \t]*(?:📃|🔧|✅|📋|🗒️|🔄|🖊️|🧠|👁️|📋|🔨|⚡|📚|🔁)\s*[A-Z][A-Z _]*?:[ \t]*/gm;
const VOICE_PREFIX = /^[ \t]*🗣️\s+[A-Za-z][A-Za-z0-9_-]*:[ \t]*/gm;
// Backwards-compatibility: some emissions show "MINIMAL\n\n" (banner-as-label).
// Already handled by BARE_MODE_LABEL_LINE; multiline collapse below tidies the
// resulting blank lines.

/**
 * Strip LifeOS mode-template scaffolding from a string. Safe on text with no
 * scaffolding (no-op). Always returns a trimmed result with no more than one
 * consecutive blank line.
 */
export function stripModeScaffolding(text: string): string {
  if (!text) return text;

  let out = text;

  // Step 1: remove entire-line markers (banner, phase header, bare mode label).
  out = out.replace(BANNER_LINE, '');
  out = out.replace(PHASE_HEADER_LINE, '');
  out = out.replace(BARE_MODE_LABEL_LINE, '');

  // Step 2: strip prefix-only markers, preserving the content that follows.
  out = out.replace(FIELD_PREFIX, '');
  out = out.replace(VOICE_PREFIX, '');

  // Step 3: collapse runs of ≥2 blank lines into a single blank line, then
  // trim leading/trailing whitespace.
  out = out.replace(/\n{3,}/g, '\n\n').trim();

  return out;
}

/**
 * True when the string contains any LifeOS scaffolding marker. Useful for
 * telemetry — "did Layer 1 fail and Layer 2 catch it?"
 */
export function hasModeScaffolding(text: string): boolean {
  if (!text) return false;
  // Reset lastIndex on /g regexes before .test() to avoid stateful surprises.
  for (const re of [BANNER_LINE, PHASE_HEADER_LINE, BARE_MODE_LABEL_LINE, FIELD_PREFIX, VOICE_PREFIX]) {
    re.lastIndex = 0;
    if (re.test(text)) return true;
  }
  return false;
}
