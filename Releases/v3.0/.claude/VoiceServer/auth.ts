/**
 * Authentication module for WebSocket bearer token auth.
 *
 * Generates a cryptographically secure random token on module load.
 * Token is printed to server log only and never exposed via API endpoints.
 */

import { randomBytes, timingSafeEqual } from "crypto";

// Generate a cryptographically secure URL-safe token on module load.
// 32 bytes = 43 URL-safe base64 characters (well above minimum security threshold).
export const AUTH_TOKEN: string = randomBytes(32).toString('base64url');

/**
 * Validate a bearer token against the server's auth token.
 *
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param token - The token to validate. Can be null or undefined.
 * @returns True if token matches, False otherwise.
 */
export function validateToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string' || token.length === 0) {
    return false;
  }

  // Convert both strings to buffers for timing-safe comparison
  const tokenBuffer = Buffer.from(token);
  const authBuffer = Buffer.from(AUTH_TOKEN);

  // Lengths must match for timingSafeEqual
  if (tokenBuffer.length !== authBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenBuffer, authBuffer);
}

/**
 * Log the auth token to console for operator use.
 */
export function logToken(): void {
  console.log("=".repeat(60));
  console.log("WebSocket Auth Token (use this to connect browser player):");
  console.log(`  ${AUTH_TOKEN}`);
  console.log("=".repeat(60));
}
