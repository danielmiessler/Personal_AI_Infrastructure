#!/usr/bin/env bun
/**
 * GitLab Pipeline Schedules Tool
 * Manage scheduled pipelines
 *
 * Usage:
 *   bun run Schedules.ts list <project>
 *   bun run Schedules.ts get <project> <schedule_id>
 *   bun run Schedules.ts create <project> "description" --ref "branch" --cron "0 1 * * *" [--timezone "UTC"] [--active]
 *   bun run Schedules.ts update <project> <schedule_id> [--description "..."] [--ref "..."] [--cron "..."] [--timezone "..."] [--active] [--inactive]
 *   bun run Schedules.ts delete <project> <schedule_id>
 *   bun run Schedules.ts run <project> <schedule_id>
 *   bun run Schedules.ts variables <project> <schedule_id>
 *   bun run Schedules.ts set-variable <project> <schedule_id> <key> <value>
 *   bun run Schedules.ts delete-variable <project> <schedule_id> <key>
 */

import {
  gitlabFetch,
  gitlabFetchPaginated,
  encodeProjectPath,
  GitLabSchedule,
  outputJson,
  outputError,
  parseArgs,
} from './Client.ts';

const USAGE = `Usage:
  bun run Schedules.ts list <project>
  bun run Schedules.ts get <project> <schedule_id>
  bun run Schedules.ts create <project> "description" --ref "branch" --cron "0 1 * * *" [--timezone "UTC"] [--active]
  bun run Schedules.ts update <project> <schedule_id> [--description "..."] [--ref "..."] [--cron "..."] [--timezone "..."] [--active] [--inactive]
  bun run Schedules.ts delete <project> <schedule_id>
  bun run Schedules.ts run <project> <schedule_id>
  bun run Schedules.ts variables <project> <schedule_id>
  bun run Schedules.ts set-variable <project> <schedule_id> <key> <value>
  bun run Schedules.ts delete-variable <project> <schedule_id> <key>

Arguments:
  <project>       Project ID (number) or path (group/project)
  <schedule_id>   Schedule ID (number)

Cron Format: minute hour day month weekday (e.g., "0 1 * * *" = daily at 1am)`;

interface ScheduleVariable {
  key: string;
  value: string;
  variable_type: string;
}

interface ScheduleDetail extends GitLabSchedule {
  variables: ScheduleVariable[];
  last_pipeline: {
    id: number;
    sha: string;
    ref: string;
    status: string;
  } | null;
}

/**
 * Format schedule for output
 */
function formatSchedule(s: GitLabSchedule) {
  return {
    id: s.id,
    description: s.description,
    ref: s.ref,
    cron: s.cron,
    cron_timezone: s.cron_timezone,
    next_run_at: s.next_run_at,
    active: s.active,
    owner: s.owner.username,
    created_at: s.created_at,
    updated_at: s.updated_at,
  };
}

/**
 * List pipeline schedules
 */
async function listSchedules(project: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const schedules = await gitlabFetchPaginated<GitLabSchedule>(
    `/projects/${encoded}/pipeline_schedules`
  );

  outputJson({
    project,
    total: schedules.length,
    schedules: schedules.map(formatSchedule),
  });
}

/**
 * Get a single schedule
 */
async function getSchedule(project: string, scheduleId: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const s = await gitlabFetch<ScheduleDetail>(
    `/projects/${encoded}/pipeline_schedules/${scheduleId}`
  );

  outputJson({
    ...formatSchedule(s),
    variables: s.variables.map((v) => ({
      key: v.key,
      value: v.value,
      type: v.variable_type,
    })),
    last_pipeline: s.last_pipeline ? {
      id: s.last_pipeline.id,
      status: s.last_pipeline.status,
      ref: s.last_pipeline.ref,
      sha: s.last_pipeline.sha.substring(0, 8),
    } : null,
  });
}

/**
 * Create a pipeline schedule
 */
async function createSchedule(
  project: string,
  description: string,
  options: {
    ref: string;
    cron: string;
    timezone?: string;
    active?: boolean;
  }
): Promise<void> {
  if (!options.ref) {
    outputError('--ref is required for create');
  }
  if (!options.cron) {
    outputError('--cron is required for create');
  }

  const encoded = encodeProjectPath(project);
  const body: Record<string, unknown> = {
    description,
    ref: options.ref,
    cron: options.cron,
    cron_timezone: options.timezone || 'UTC',
    active: options.active !== false,
  };

  const s = await gitlabFetch<GitLabSchedule>(
    `/projects/${encoded}/pipeline_schedules`,
    {
      method: 'POST',
      body,
    }
  );

  outputJson({
    success: true,
    message: `Created schedule '${s.description}'`,
    ...formatSchedule(s),
  });
}

/**
 * Update a pipeline schedule
 */
async function updateSchedule(
  project: string,
  scheduleId: string,
  options: {
    description?: string;
    ref?: string;
    cron?: string;
    timezone?: string;
    active?: boolean;
  }
): Promise<void> {
  const encoded = encodeProjectPath(project);
  const body: Record<string, unknown> = {};

  if (options.description) body.description = options.description;
  if (options.ref) body.ref = options.ref;
  if (options.cron) body.cron = options.cron;
  if (options.timezone) body.cron_timezone = options.timezone;
  if (options.active !== undefined) body.active = options.active;

  if (Object.keys(body).length === 0) {
    outputError('At least one field must be provided to update');
  }

  const s = await gitlabFetch<GitLabSchedule>(
    `/projects/${encoded}/pipeline_schedules/${scheduleId}`,
    {
      method: 'PUT',
      body,
    }
  );

  outputJson({
    success: true,
    message: `Updated schedule '${s.description}'`,
    ...formatSchedule(s),
  });
}

/**
 * Delete a pipeline schedule
 */
async function deleteSchedule(project: string, scheduleId: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  // Get schedule info first
  const s = await gitlabFetch<GitLabSchedule>(
    `/projects/${encoded}/pipeline_schedules/${scheduleId}`
  );

  await gitlabFetch(
    `/projects/${encoded}/pipeline_schedules/${scheduleId}`,
    { method: 'DELETE' }
  );

  outputJson({
    success: true,
    message: `Deleted schedule '${s.description}'`,
    id: s.id,
    description: s.description,
  });
}

/**
 * Run a schedule immediately
 */
async function runSchedule(project: string, scheduleId: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const result = await gitlabFetch<{ message: string }>(
    `/projects/${encoded}/pipeline_schedules/${scheduleId}/play`,
    { method: 'POST' }
  );

  outputJson({
    success: true,
    message: result.message || `Triggered schedule ${scheduleId}`,
    schedule_id: scheduleId,
  });
}

/**
 * List schedule variables
 */
async function listVariables(project: string, scheduleId: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const s = await gitlabFetch<ScheduleDetail>(
    `/projects/${encoded}/pipeline_schedules/${scheduleId}`
  );

  outputJson({
    project,
    schedule_id: scheduleId,
    schedule_description: s.description,
    variables: s.variables.map((v) => ({
      key: v.key,
      value: v.value,
      type: v.variable_type,
    })),
  });
}

/**
 * Set a schedule variable
 */
async function setVariable(
  project: string,
  scheduleId: string,
  key: string,
  value: string
): Promise<void> {
  const encoded = encodeProjectPath(project);

  // Try to create first, then update if it exists
  try {
    await gitlabFetch(
      `/projects/${encoded}/pipeline_schedules/${scheduleId}/variables`,
      {
        method: 'POST',
        body: { key, value },
      }
    );

    outputJson({
      success: true,
      message: `Created variable '${key}'`,
      schedule_id: scheduleId,
      key,
      value,
    });
  } catch (error) {
    // If variable exists, update it
    if (error instanceof Error && error.message.includes('400')) {
      await gitlabFetch(
        `/projects/${encoded}/pipeline_schedules/${scheduleId}/variables/${key}`,
        {
          method: 'PUT',
          body: { value },
        }
      );

      outputJson({
        success: true,
        message: `Updated variable '${key}'`,
        schedule_id: scheduleId,
        key,
        value,
      });
    } else {
      throw error;
    }
  }
}

/**
 * Delete a schedule variable
 */
async function deleteVariable(
  project: string,
  scheduleId: string,
  key: string
): Promise<void> {
  const encoded = encodeProjectPath(project);

  await gitlabFetch(
    `/projects/${encoded}/pipeline_schedules/${scheduleId}/variables/${key}`,
    { method: 'DELETE' }
  );

  outputJson({
    success: true,
    message: `Deleted variable '${key}'`,
    schedule_id: scheduleId,
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
        await listSchedules(positional[1]);
        break;

      case 'get':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and schedule_id are required for get`);
        }
        await getSchedule(positional[1], positional[2]);
        break;

      case 'create':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and description are required for create`);
        }
        await createSchedule(positional[1], positional[2], {
          ref: flags.ref as string,
          cron: flags.cron as string,
          timezone: flags.timezone as string | undefined,
          active: flags.active === true,
        });
        break;

      case 'update':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and schedule_id are required for update`);
        }
        await updateSchedule(positional[1], positional[2], {
          description: flags.description as string | undefined,
          ref: flags.ref as string | undefined,
          cron: flags.cron as string | undefined,
          timezone: flags.timezone as string | undefined,
          active: flags.active === true ? true : flags.inactive === true ? false : undefined,
        });
        break;

      case 'delete':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and schedule_id are required for delete`);
        }
        await deleteSchedule(positional[1], positional[2]);
        break;

      case 'run':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and schedule_id are required for run`);
        }
        await runSchedule(positional[1], positional[2]);
        break;

      case 'variables':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and schedule_id are required for variables`);
        }
        await listVariables(positional[1], positional[2]);
        break;

      case 'set-variable':
        if (!positional[1] || !positional[2] || !positional[3] || !positional[4]) {
          outputError(`${USAGE}\n\nError: project, schedule_id, key, and value are required for set-variable`);
        }
        await setVariable(positional[1], positional[2], positional[3], positional[4]);
        break;

      case 'delete-variable':
        if (!positional[1] || !positional[2] || !positional[3]) {
          outputError(`${USAGE}\n\nError: project, schedule_id, and key are required for delete-variable`);
        }
        await deleteVariable(positional[1], positional[2], positional[3]);
        break;

      default:
        outputError(USAGE);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
