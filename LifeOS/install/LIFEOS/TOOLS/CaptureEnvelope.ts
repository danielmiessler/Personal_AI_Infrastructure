export interface CaptureTimestamps {
  captured_at: string;
  source_at?: string;
}

export interface CaptureEnvelope {
  source: string;
  channel: string;
  timestamps: CaptureTimestamps;
  valid_from?: string | null;
  valid_until?: string | null;
  session_id?: string | null;
  content: string;
}

/** Strip Cortex-private spans before any controlled persistence or processing. */
export function stripPrivateContent(input: string): string {
  // Any tag-like spelling that normalizes to an opening private boundary but
  // is not well-formed is an untrusted opener. Suppress it and the remainder.
  // This catches NUL/control/format insertion, full-width Unicode, and a lost
  // closing angle bracket without attempting permissive HTML recovery.
  let failClosedAt = input.length;
  for (let start = input.indexOf("<"); start >= 0; start = input.indexOf("<", start + 1)) {
    const close = input.indexOf(">", start + 1);
    const candidate = input.slice(start, close < 0 ? input.length : close + 1);
    const normalized = candidate.slice(1, close < 0 ? undefined : -1).normalize("NFKC").replace(/[\p{Cc}\p{Cf}\s]/gu, "").toLowerCase();
    const suspiciousOpener = normalized.startsWith("private");
    const wellFormed = /^<\s*private\b(?:\s+[^<>]*?)?\s*>$/iu.test(candidate);
    if (suspiciousOpener && !wellFormed) { failClosedAt = start; break; }
  }
  input = input.slice(0, failClosedAt);

  // Deliberately parse boundary tags instead of matching spans with a single
  // regex: nesting requires depth, and an unmatched opener must suppress the
  // remainder. Tag spelling is HTML-like and case-insensitive; harmless
  // whitespace and attributes cannot bypass the boundary.
  const tag = /<\s*(\/?)\s*private\b(?:\s+[^<>]*?)?\s*>/gi;
  let output = "";
  let cursor = 0;
  let depth = 0;
  let match: RegExpExecArray | null;

  while ((match = tag.exec(input)) !== null) {
    if (depth === 0) output += input.slice(cursor, match.index);
    if (match[1] === "/") {
      if (depth > 0) depth -= 1;
      // Orphan closes are control markup, not content: omit the tag while
      // preserving surrounding public text.
    } else {
      depth += 1;
    }
    cursor = match.index + match[0].length;
  }
  if (depth === 0) output += input.slice(cursor);
  return output;
}

export function createCaptureEnvelope(input: CaptureEnvelope): CaptureEnvelope {
  return { ...input, timestamps: { ...input.timestamps }, content: stripPrivateContent(input.content) };
}

/** The single source-neutral capture boundary: sanitize before any consumer sees bytes. */
export function ingestCaptureEnvelope<T>(input: CaptureEnvelope, consumer: (envelope: CaptureEnvelope) => T): T {
  return consumer(createCaptureEnvelope(input));
}

function parseBoundary(value: string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/** valid_from is inclusive; valid_until is exclusive. Invalid dates fail closed. */
export function isEnvelopeValidAt(envelope: CaptureEnvelope, at: Date = new Date()): boolean {
  const now = at.getTime();
  if (!Number.isFinite(now)) return false;
  const from = parseBoundary(envelope.valid_from);
  const until = parseBoundary(envelope.valid_until);
  if (Number.isNaN(from) || Number.isNaN(until)) return false;
  return (from === null || now >= from) && (until === null || now < until);
}

export function filterValidEnvelopes<T extends CaptureEnvelope>(envelopes: readonly T[], at: Date = new Date()): T[] {
  return envelopes.filter((envelope) => isEnvelopeValidAt(envelope, at));
}
