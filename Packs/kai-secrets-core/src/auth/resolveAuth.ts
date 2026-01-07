import { $ } from 'bun';
import type { AuthReference } from './AuthReference.ts';
import { AuthenticationError, ConfigurationError } from '../utils/errors.ts';

/**
 * Resolve an AuthReference to its actual credential value
 *
 * Walks the fallback chain until a value is found or all options are exhausted.
 *
 * @param ref - The auth reference to resolve
 * @returns The resolved credential value
 * @throws AuthenticationError if resolution fails and no fallback succeeds
 */
export async function resolveAuth(ref: AuthReference): Promise<string> {
  try {
    switch (ref.type) {
      case 'keychain':
        return await resolveKeychain(ref);
      case 'env':
        return resolveEnv(ref);
      case 'file':
        return await resolveFile(ref);
      case 'secretsManager':
        return await resolveSecretsManager(ref);
      default:
        throw new ConfigurationError(`Unknown auth type: ${(ref as AuthReference).type}`);
    }
  } catch (error) {
    // If there's a fallback, try it
    if (ref.fallback) {
      return resolveAuth(ref.fallback);
    }
    // No fallback, propagate the error
    throw error;
  }
}

/**
 * Resolve credential from macOS Keychain
 */
async function resolveKeychain(ref: AuthReference): Promise<string> {
  const service = ref.service;
  const account = ref.account || 'claude-code';

  if (!service) {
    throw new ConfigurationError('Keychain auth requires "service" field');
  }

  try {
    const result = await $`security find-generic-password -s ${service} -a ${account} -w`.quiet();

    if (result.exitCode !== 0) {
      throw new AuthenticationError(
        `Keychain entry not found: service="${service}" account="${account}"`
      );
    }

    const value = result.stdout.toString().trim();
    if (!value) {
      throw new AuthenticationError(
        `Keychain entry is empty: service="${service}" account="${account}"`
      );
    }

    return value;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError(
      `Failed to access keychain: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Resolve credential from environment variable
 */
function resolveEnv(ref: AuthReference): string {
  const varName = ref.var;

  if (!varName) {
    throw new ConfigurationError('Env auth requires "var" field');
  }

  const value = process.env[varName];
  if (!value) {
    throw new AuthenticationError(`Environment variable not set: ${varName}`);
  }

  return value;
}

/**
 * Resolve credential from file
 */
async function resolveFile(ref: AuthReference): Promise<string> {
  const filePath = ref.path;

  if (!filePath) {
    throw new ConfigurationError('File auth requires "path" field');
  }

  try {
    const file = Bun.file(filePath);
    const exists = await file.exists();

    if (!exists) {
      throw new AuthenticationError(`Credential file not found: ${filePath}`);
    }

    const content = await file.text();
    const value = content.trim();

    if (!value) {
      throw new AuthenticationError(`Credential file is empty: ${filePath}`);
    }

    return value;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError(
      `Failed to read credential file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Resolve credential from a secrets manager
 * Note: This is a placeholder - actual implementation would depend on the secrets manager
 */
async function resolveSecretsManager(ref: AuthReference): Promise<string> {
  const key = ref.key;
  const manager = ref.manager || 'default';

  if (!key) {
    throw new ConfigurationError('Secrets manager auth requires "key" field');
  }

  // TODO: Implement actual secrets manager integration
  // This would typically call an external secrets manager API
  throw new AuthenticationError(
    `Secrets manager "${manager}" not implemented. Use keychain, env, or file auth instead.`
  );
}
