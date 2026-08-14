/**
 * Invariant — runtime assertion for impossible states in state-mutating code.
 *
 * Doctrine (OPERATIONAL_RULES § Code invariants): every function that mutates
 * persistent state asserts its invariants before writing. This helper is that
 * assert. It exists for "can't happen" programmer-error states, where a wrong
 * value would otherwise persist silently and corrupt every later read.
 *
 * Expected, operator-visible failures (bad input, lock contention, missing
 * file) keep their typed error returns. An InvariantViolation is never caught
 * and converted into a typed error — rethrow it and fail loud.
 *
 * @version 1.0.0
 */

export class InvariantViolation extends Error {
  constructor(message: string) {
    super(`INVARIANT VIOLATION: ${message}`);
    this.name = "InvariantViolation";
  }
}

/** Throws InvariantViolation when `condition` is falsy; narrows types when it passes. */
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new InvariantViolation(message);
}
