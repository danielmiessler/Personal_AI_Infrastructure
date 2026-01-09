/**
 * AuthType - Supported authentication resolution methods
 */
export type AuthType = 'keychain' | 'env' | 'file' | 'secretsManager';

/**
 * AuthReference - Reference to a credential that can be resolved at runtime
 *
 * Credentials are NEVER stored inline. Instead, configuration files contain
 * references that resolve to actual values at runtime.
 */
export interface AuthReference {
  /** Resolution method */
  type: AuthType;

  /** macOS Keychain service name (type: 'keychain') */
  service?: string;

  /** macOS Keychain account (type: 'keychain', defaults to 'claude-code') */
  account?: string;

  /** Environment variable name (type: 'env') */
  var?: string;

  /** File path containing the secret (type: 'file') */
  path?: string;

  /** Secrets manager key path (type: 'secretsManager') */
  key?: string;

  /** Secrets manager instance to use (type: 'secretsManager') */
  manager?: string;

  /** Fallback if primary resolution fails */
  fallback?: AuthReference;
}
