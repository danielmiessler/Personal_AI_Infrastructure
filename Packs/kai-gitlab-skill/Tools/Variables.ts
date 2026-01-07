#!/usr/bin/env bun
/**
 * GitLab CI/CD Variables Tool
 * Manage project and group CI/CD variables
 *
 * Usage:
 *   bun run Variables.ts list <project>
 *   bun run Variables.ts get <project> <key>
 *   bun run Variables.ts create <project> <key> <value> [--protected] [--masked] [--environment "env"]
 *   bun run Variables.ts update <project> <key> <value> [--protected] [--masked] [--environment "env"]
 *   bun run Variables.ts delete <project> <key>
 *   bun run Variables.ts group-list <group>
 *   bun run Variables.ts group-get <group> <key>
 *   bun run Variables.ts group-create <group> <key> <value> [--protected] [--masked]
 *   bun run Variables.ts group-update <group> <key> <value> [--protected] [--masked]
 *   bun run Variables.ts group-delete <group> <key>
 */

import {
  gitlabFetch,
  gitlabFetchPaginated,
  encodeProjectPath,
  GitLabVariable,
  outputJson,
  outputError,
  parseArgs,
} from './Client.ts';

const USAGE = `Usage:
  bun run Variables.ts list <project>
  bun run Variables.ts get <project> <key>
  bun run Variables.ts create <project> <key> <value> [--protected] [--masked] [--environment "env"]
  bun run Variables.ts update <project> <key> <value> [--protected] [--masked] [--environment "env"]
  bun run Variables.ts delete <project> <key>
  bun run Variables.ts group-list <group>
  bun run Variables.ts group-get <group> <key>
  bun run Variables.ts group-create <group> <key> <value> [--protected] [--masked]
  bun run Variables.ts group-update <group> <key> <value> [--protected] [--masked]
  bun run Variables.ts group-delete <group> <key>

Arguments:
  <project>   Project ID (number) or path (group/project)
  <group>     Group ID (number) or path
  <key>       Variable key (name)
  <value>     Variable value

Note: Values with --masked must be at least 8 characters and match specific patterns.`;

/**
 * Format variable for output (hide actual values for security)
 */
function formatVariable(v: GitLabVariable, showValue = false) {
  return {
    key: v.key,
    value: showValue ? v.value : '***',
    variable_type: v.variable_type,
    protected: v.protected,
    masked: v.masked,
    environment_scope: v.environment_scope,
  };
}

/**
 * List project variables
 */
async function listVariables(project: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const variables = await gitlabFetchPaginated<GitLabVariable>(
    `/projects/${encoded}/variables`
  );

  outputJson({
    project,
    total: variables.length,
    variables: variables.map((v) => formatVariable(v)),
  });
}

/**
 * Get a project variable
 */
async function getVariable(project: string, key: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const v = await gitlabFetch<GitLabVariable>(
    `/projects/${encoded}/variables/${key}`
  );

  outputJson(formatVariable(v, true));
}

/**
 * Create a project variable
 */
async function createVariable(
  project: string,
  key: string,
  value: string,
  options: {
    protected?: boolean;
    masked?: boolean;
    environment?: string;
  }
): Promise<void> {
  const encoded = encodeProjectPath(project);
  const body: Record<string, unknown> = {
    key,
    value,
    variable_type: 'env_var',
    protected: options.protected || false,
    masked: options.masked || false,
    environment_scope: options.environment || '*',
  };

  const v = await gitlabFetch<GitLabVariable>(
    `/projects/${encoded}/variables`,
    {
      method: 'POST',
      body,
    }
  );

  outputJson({
    success: true,
    message: `Created variable '${v.key}'`,
    ...formatVariable(v),
  });
}

/**
 * Update a project variable
 */
async function updateVariable(
  project: string,
  key: string,
  value: string,
  options: {
    protected?: boolean;
    masked?: boolean;
    environment?: string;
  }
): Promise<void> {
  const encoded = encodeProjectPath(project);
  const body: Record<string, unknown> = { value };

  if (options.protected !== undefined) body.protected = options.protected;
  if (options.masked !== undefined) body.masked = options.masked;
  if (options.environment) body.environment_scope = options.environment;

  const v = await gitlabFetch<GitLabVariable>(
    `/projects/${encoded}/variables/${key}`,
    {
      method: 'PUT',
      body,
    }
  );

  outputJson({
    success: true,
    message: `Updated variable '${v.key}'`,
    ...formatVariable(v),
  });
}

/**
 * Delete a project variable
 */
async function deleteVariable(project: string, key: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  await gitlabFetch(
    `/projects/${encoded}/variables/${key}`,
    { method: 'DELETE' }
  );

  outputJson({
    success: true,
    message: `Deleted variable '${key}'`,
    project,
    key,
  });
}

/**
 * List group variables
 */
async function listGroupVariables(group: string): Promise<void> {
  const encoded = encodeProjectPath(group);

  const variables = await gitlabFetchPaginated<GitLabVariable>(
    `/groups/${encoded}/variables`
  );

  outputJson({
    group,
    total: variables.length,
    variables: variables.map((v) => formatVariable(v)),
  });
}

/**
 * Get a group variable
 */
async function getGroupVariable(group: string, key: string): Promise<void> {
  const encoded = encodeProjectPath(group);

  const v = await gitlabFetch<GitLabVariable>(
    `/groups/${encoded}/variables/${key}`
  );

  outputJson(formatVariable(v, true));
}

/**
 * Create a group variable
 */
async function createGroupVariable(
  group: string,
  key: string,
  value: string,
  options: {
    protected?: boolean;
    masked?: boolean;
  }
): Promise<void> {
  const encoded = encodeProjectPath(group);
  const body: Record<string, unknown> = {
    key,
    value,
    variable_type: 'env_var',
    protected: options.protected || false,
    masked: options.masked || false,
  };

  const v = await gitlabFetch<GitLabVariable>(
    `/groups/${encoded}/variables`,
    {
      method: 'POST',
      body,
    }
  );

  outputJson({
    success: true,
    message: `Created group variable '${v.key}'`,
    ...formatVariable(v),
  });
}

/**
 * Update a group variable
 */
async function updateGroupVariable(
  group: string,
  key: string,
  value: string,
  options: {
    protected?: boolean;
    masked?: boolean;
  }
): Promise<void> {
  const encoded = encodeProjectPath(group);
  const body: Record<string, unknown> = { value };

  if (options.protected !== undefined) body.protected = options.protected;
  if (options.masked !== undefined) body.masked = options.masked;

  const v = await gitlabFetch<GitLabVariable>(
    `/groups/${encoded}/variables/${key}`,
    {
      method: 'PUT',
      body,
    }
  );

  outputJson({
    success: true,
    message: `Updated group variable '${v.key}'`,
    ...formatVariable(v),
  });
}

/**
 * Delete a group variable
 */
async function deleteGroupVariable(group: string, key: string): Promise<void> {
  const encoded = encodeProjectPath(group);

  await gitlabFetch(
    `/groups/${encoded}/variables/${key}`,
    { method: 'DELETE' }
  );

  outputJson({
    success: true,
    message: `Deleted group variable '${key}'`,
    group,
    key,
  });
}

async function main() {
  const args = process.argv.slice(2);
  const { positional, flags } = parseArgs(args);
  const command = positional[0];

  try {
    switch (command) {
      case 'list':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: project is required for list`);
        }
        await listVariables(positional[1]);
        break;

      case 'get':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and key are required for get`);
        }
        await getVariable(positional[1], positional[2]);
        break;

      case 'create':
        if (!positional[1] || !positional[2] || !positional[3]) {
          outputError(`${USAGE}\n\nError: project, key, and value are required for create`);
        }
        await createVariable(positional[1], positional[2], positional[3], {
          protected: flags.protected === true,
          masked: flags.masked === true,
          environment: flags.environment as string | undefined,
        });
        break;

      case 'update':
        if (!positional[1] || !positional[2] || !positional[3]) {
          outputError(`${USAGE}\n\nError: project, key, and value are required for update`);
        }
        await updateVariable(positional[1], positional[2], positional[3], {
          protected: flags.protected !== undefined ? flags.protected === true : undefined,
          masked: flags.masked !== undefined ? flags.masked === true : undefined,
          environment: flags.environment as string | undefined,
        });
        break;

      case 'delete':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and key are required for delete`);
        }
        await deleteVariable(positional[1], positional[2]);
        break;

      case 'group-list':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: group is required for group-list`);
        }
        await listGroupVariables(positional[1]);
        break;

      case 'group-get':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: group and key are required for group-get`);
        }
        await getGroupVariable(positional[1], positional[2]);
        break;

      case 'group-create':
        if (!positional[1] || !positional[2] || !positional[3]) {
          outputError(`${USAGE}\n\nError: group, key, and value are required for group-create`);
        }
        await createGroupVariable(positional[1], positional[2], positional[3], {
          protected: flags.protected === true,
          masked: flags.masked === true,
        });
        break;

      case 'group-update':
        if (!positional[1] || !positional[2] || !positional[3]) {
          outputError(`${USAGE}\n\nError: group, key, and value are required for group-update`);
        }
        await updateGroupVariable(positional[1], positional[2], positional[3], {
          protected: flags.protected !== undefined ? flags.protected === true : undefined,
          masked: flags.masked !== undefined ? flags.masked === true : undefined,
        });
        break;

      case 'group-delete':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: group and key are required for group-delete`);
        }
        await deleteGroupVariable(positional[1], positional[2]);
        break;

      default:
        outputError(USAGE);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
