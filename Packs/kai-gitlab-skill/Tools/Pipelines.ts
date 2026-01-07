#!/usr/bin/env bun
/**
 * GitLab Pipelines Tool
 * Manage CI/CD pipelines
 *
 * Usage:
 *   bun run Pipelines.ts list <project> [--ref "branch"] [--status running|pending|success|failed|canceled] [--limit <num>]
 *   bun run Pipelines.ts get <project> <pipeline_id>
 *   bun run Pipelines.ts create <project> --ref "branch" [--variables "KEY=value,KEY2=value2"]
 *   bun run Pipelines.ts retry <project> <pipeline_id>
 *   bun run Pipelines.ts cancel <project> <pipeline_id>
 *   bun run Pipelines.ts delete <project> <pipeline_id>
 */

import {
  gitlabFetch,
  gitlabFetchPaginated,
  encodeProjectPath,
  GitLabPipeline,
  outputJson,
  outputError,
  parseArgs,
} from './Client.ts';

const USAGE = `Usage:
  bun run Pipelines.ts list <project> [--ref "branch"] [--status running|pending|success|failed|canceled] [--limit <num>]
  bun run Pipelines.ts get <project> <pipeline_id>
  bun run Pipelines.ts create <project> --ref "branch" [--variables "KEY=value,KEY2=value2"]
  bun run Pipelines.ts retry <project> <pipeline_id>
  bun run Pipelines.ts cancel <project> <pipeline_id>
  bun run Pipelines.ts delete <project> <pipeline_id>

Arguments:
  <project>       Project ID (number) or path (group/project)
  <pipeline_id>   Pipeline ID (number)

Statuses: created, waiting_for_resource, preparing, pending, running, success, failed, canceled, skipped, manual, scheduled`;

interface PipelineDetail extends GitLabPipeline {
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
  queued_duration: number | null;
  coverage: string | null;
  user: {
    id: number;
    username: string;
    name: string;
  };
}

/**
 * Format pipeline for output
 */
function formatPipeline(p: GitLabPipeline) {
  return {
    id: p.id,
    iid: p.iid,
    status: p.status,
    ref: p.ref,
    sha: p.sha.substring(0, 8),
    source: p.source,
    created_at: p.created_at,
    updated_at: p.updated_at,
    web_url: p.web_url,
  };
}

/**
 * List pipelines
 */
async function listPipelines(
  project: string,
  options: {
    ref?: string;
    status?: string;
    limit?: number;
  }
): Promise<void> {
  const encoded = encodeProjectPath(project);
  const params: Record<string, string | number | boolean | undefined> = {
    order_by: 'id',
    sort: 'desc',
  };

  if (options.ref) params.ref = options.ref;
  if (options.status) params.status = options.status;

  const pipelines = await gitlabFetchPaginated<GitLabPipeline>(
    `/projects/${encoded}/pipelines`,
    { params },
    options.limit || 20
  );

  outputJson({
    project,
    total: pipelines.length,
    pipelines: pipelines.map(formatPipeline),
  });
}

/**
 * Get a single pipeline
 */
async function getPipeline(project: string, pipelineId: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const p = await gitlabFetch<PipelineDetail>(
    `/projects/${encoded}/pipelines/${pipelineId}`
  );

  outputJson({
    id: p.id,
    iid: p.iid,
    status: p.status,
    ref: p.ref,
    sha: p.sha,
    source: p.source,
    created_at: p.created_at,
    started_at: p.started_at,
    finished_at: p.finished_at,
    duration: p.duration,
    queued_duration: p.queued_duration,
    coverage: p.coverage,
    user: p.user ? {
      username: p.user.username,
      name: p.user.name,
    } : null,
    web_url: p.web_url,
  });
}

/**
 * Create a new pipeline
 */
async function createPipeline(
  project: string,
  options: {
    ref: string;
    variables?: string;
  }
): Promise<void> {
  if (!options.ref) {
    outputError('--ref is required for create');
  }

  const encoded = encodeProjectPath(project);
  const body: Record<string, unknown> = {
    ref: options.ref,
  };

  // Parse variables if provided (format: KEY=value,KEY2=value2)
  if (options.variables) {
    const vars = options.variables.split(',').map((v) => {
      const [key, ...valueParts] = v.split('=');
      return { key: key.trim(), value: valueParts.join('=').trim() };
    });
    body.variables = vars;
  }

  const p = await gitlabFetch<GitLabPipeline>(
    `/projects/${encoded}/pipeline`,
    {
      method: 'POST',
      body,
    }
  );

  outputJson({
    success: true,
    message: `Created pipeline #${p.id} on ${p.ref}`,
    ...formatPipeline(p),
  });
}

/**
 * Retry a pipeline
 */
async function retryPipeline(project: string, pipelineId: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const p = await gitlabFetch<GitLabPipeline>(
    `/projects/${encoded}/pipelines/${pipelineId}/retry`,
    { method: 'POST' }
  );

  outputJson({
    success: true,
    message: `Retried pipeline #${p.id}`,
    ...formatPipeline(p),
  });
}

/**
 * Cancel a pipeline
 */
async function cancelPipeline(project: string, pipelineId: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const p = await gitlabFetch<GitLabPipeline>(
    `/projects/${encoded}/pipelines/${pipelineId}/cancel`,
    { method: 'POST' }
  );

  outputJson({
    success: true,
    message: `Canceled pipeline #${p.id}`,
    id: p.id,
    status: p.status,
    web_url: p.web_url,
  });
}

/**
 * Delete a pipeline
 */
async function deletePipeline(project: string, pipelineId: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  // Get pipeline info first
  const p = await gitlabFetch<GitLabPipeline>(
    `/projects/${encoded}/pipelines/${pipelineId}`
  );

  await gitlabFetch(
    `/projects/${encoded}/pipelines/${pipelineId}`,
    { method: 'DELETE' }
  );

  outputJson({
    success: true,
    message: `Deleted pipeline #${p.id}`,
    id: p.id,
    ref: p.ref,
    status: p.status,
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
        await listPipelines(positional[1], {
          ref: flags.ref as string | undefined,
          status: flags.status as string | undefined,
          limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
        });
        break;

      case 'get':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and pipeline_id are required for get`);
        }
        await getPipeline(positional[1], positional[2]);
        break;

      case 'create':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: project is required for create`);
        }
        await createPipeline(positional[1], {
          ref: flags.ref as string,
          variables: flags.variables as string | undefined,
        });
        break;

      case 'retry':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and pipeline_id are required for retry`);
        }
        await retryPipeline(positional[1], positional[2]);
        break;

      case 'cancel':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and pipeline_id are required for cancel`);
        }
        await cancelPipeline(positional[1], positional[2]);
        break;

      case 'delete':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and pipeline_id are required for delete`);
        }
        await deletePipeline(positional[1], positional[2]);
        break;

      default:
        outputError(USAGE);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
