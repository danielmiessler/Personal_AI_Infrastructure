// ============================================================================
// pai-governance-guard — Canonical Hashing
// Deterministic JSON serialization + SHA-256
// Ported from verdict_logic/canonical.ts — zero dependencies
// ============================================================================

import { createHash } from "node:crypto";

/**
 * Stable JSON serialization with sorted keys (JCS-compatible).
 * Produces identical output for semantically equivalent objects
 * regardless of key insertion order.
 */
export function stableStringify(x: unknown): string {
  if (x === null) return "null";
  if (x === undefined) return "null";
  const t = typeof x;
  if (t === "string") return JSON.stringify(x);
  if (t === "boolean") return x ? "true" : "false";
  if (t === "number") return Number.isFinite(x as number) ? String(x) : JSON.stringify(x);
  if (t !== "object") return JSON.stringify(x);

  if (Array.isArray(x)) return "[" + x.map(stableStringify).join(",") + "]";

  const o = x as Record<string, unknown>;
  const keys = Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort();
  return (
    "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(o[k])).join(",") + "}"
  );
}

/**
 * SHA-256 hex digest of a UTF-8 string.
 * Uses Node built-in crypto — zero external dependencies.
 */
export function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/**
 * Canonical hash of any value: stableStringify then SHA-256.
 */
export function canonicalHash(x: unknown): string {
  return sha256Hex(stableStringify(x));
}
