/**
 * strip-mode-scaffolding.ts — Egress sanitizer for remote-channel chat surfaces.
 *
 * LifeOS CLAUDE.md constitutionally requires every assistant response to use one
 * of three mode templates (MINIMAL/NATIVE/ALGORITHM). That contract is right
 * for the terminal; it is wrong for Telegram and iMessage, where the principal
 * sees the mode banner ("MINIMAL", "═══ LifeOS ═══", "📃 CONTENT:", "🗣️ {{DA_NAME}}:")
 * as visual noise interrupting a conversation.
 *
 * Two layers defend the chat surface:
 *
 *   Layer 1 (prevention) — each channel bridge (modules/telegram.ts,
 *   modules/imessage.ts) appends a channel-specific directive
 *   (TELEGRAM_DIRECTIVE / IMESSAGE_DIRECTIVE) to the session's system prompt,
 *   telling the model this surface uses plain prose, not the mode templates.
 *
 *   Layer 2 (egress) — THIS file. Even with prevention in place the model can
 *   leak markers (CLAUDE.md mode-template rules survive context compaction
 *   and are very strong). The sanitizer regex-strips known LifeOS scaffolding
 *   markers from outgoing text before bot.api.sendMessage / sendVoice. Pattern
 *   matches Nous Research's `hermes-agent` `_strip_mdv2()` fallback —
 *   stripping all known formatting when the format is wrong for the channel.
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
