/**
 * SecretValue - Wrapper for sensitive data that prevents accidental exposure
 *
 * This class ensures secrets are never accidentally logged, serialized to JSON,
 * or displayed in error messages. Use reveal() to explicitly access the value.
 */
export class SecretValue {
  private readonly value: string;

  constructor(value: string) {
    this.value = value;
  }

  /**
   * Explicitly reveal the secret value
   * Use this intentionally when you need the actual secret
   */
  reveal(): string {
    return this.value;
  }

  /**
   * Redact in string contexts (console.log, string concatenation)
   */
  toString(): string {
    return '[REDACTED]';
  }

  /**
   * Redact in Node.js/Bun inspect (console.log of objects)
   */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return '[REDACTED]';
  }

  /**
   * Redact in JSON serialization
   */
  toJSON(): string {
    return '[REDACTED]';
  }

  /**
   * Get the length of the secret without revealing it
   * Useful for validation without exposure
   */
  get length(): number {
    return this.value.length;
  }

  /**
   * Check if the secret is empty without revealing it
   */
  get isEmpty(): boolean {
    return this.value.length === 0;
  }
}
