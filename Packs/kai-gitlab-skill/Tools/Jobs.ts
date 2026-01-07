#!/usr/bin/env bun
/**
 * GitLab Jobs Tool
 * Manage CI/CD jobs
 *
 * Usage:
 *   bun run Jobs.ts list <project> [--pipeline <id>] [--scope pending|running|failed|success|canceled|manual] [--limit <num>]
 *   bun run Jobs.ts get <project> <job_id>
 *   bun run Jobs.ts log <project> <job_id> [--tail <lines>]
 *   bun run Jobs.ts retry <project> <job_id>
 *   bun run Jobs.ts cancel <project> <job_id>
 *   bun run Jobs.ts play <project> <job_id>
 *   bun run Jobs.ts artifacts <project> <job_id> [--path "artifact/path"]
 */

import {
  gitlabFetch,
  gitlabFetchPaginated,
  encodeProjectPath,
  GitLabJob,
  outputJson,
  outputError,
  parseArgs,
} from './Client.ts';

const USAGE = `Usage:
  bun run Jobs.ts list <project> [--pipeline <id>] [--scope pending|running|failed|success|canceled|manual] [--limit <num>]
  bun run Jobs.ts get <project> <job_id>
  bun run Jobs.ts log <project> <job_id> [--tail <lines>]
  bun run Jobs.ts retry <project> <job_id>
  bun run Jobs.ts cancel <project> <job_id>
  bun run Jobs.ts play <project> <job_id>
  bun run Jobs.ts artifacts <project> <job_id> [--path "artifact/path"]

Arguments:
  <project>   Project ID (number) or path (group/project)
  <job_id>    Job ID (number)

Scopes: created, pending, running, failed, success, canceled, skipped, waiting_for_resource, manual`;

interface JobDetail extends GitLabJob {
  coverage: number | null;
  artifacts: Array<{ filename: string; size: number }>;
  artifacts_expire_at: string | null;
  tag_list: string[];
  user: {
    id: number;
    username: string;
    name: string;
  };
  runner: {
    id: number;
    description: string;
    ip_address: string;
    active: boolean;
    is_shared: boolean;
  } | null;
}

/**
 * Format job for output
 */
function formatJob(j: GitLabJob) {
  return {
    id: j.id,
    name: j.name,
    stage: j.stage,
    status: j.status,
    ref: j.ref,
    created_at: j.created_at,
    started_at: j.started_at,
    finished_at: j.finished_at,
    duration: j.duration,
    web_url: j.web_url,
  };
}

/**
 * List jobs
 */
async function listJobs(
  project: string,
  options: {
    pipeline?: string;
    scope?: string;
    limit?: number;
  }
): Promise<void> {
  const encoded = encodeProjectPath(project);
  let endpoint: string;
  const params: Record<string, string | number | boolean | undefined> = {};

  if (options.pipeline) {
    endpoint = `/projects/${encoded}/pipelines/${options.pipeline}/jobs`;
  } else {
    endpoint = `/projects/${encoded}/jobs`;
  }

  if (options.scope) params.scope = options.scope;

  const jobs = await gitlabFetchPaginated<GitLabJob>(
    endpoint,
    { params },
    options.limit || 20
  );

  outputJson({
    project,
    pipeline: options.pipeline,
    total: jobs.length,
    jobs: jobs.map(formatJob),
  });
}

/**
 * Get a single job
 */
async function getJob(project: string, jobId: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const j = await gitlabFetch<JobDetail>(
    `/projects/${encoded}/jobs/${jobId}`
  );

  outputJson({
    id: j.id,
    name: j.name,
    stage: j.stage,
    status: j.status,
    ref: j.ref,
    created_at: j.created_at,
    started_at: j.started_at,
    finished_at: j.finished_at,
    duration: j.duration,
    coverage: j.coverage,
    tags: j.tag_list,
    user: j.user ? {
      username: j.user.username,
      name: j.user.name,
    } : null,
    runner: j.runner ? {
      id: j.runner.id,
      description: j.runner.description,
      shared: j.runner.is_shared,
    } : null,
    artifacts: j.artifacts.map((a) => ({
      filename: a.filename,
      size: a.size,
    })),
    artifacts_expire_at: j.artifacts_expire_at,
    pipeline: j.pipeline,
    web_url: j.web_url,
  });
}

/**
 * Get job log/trace
 */
async function getJobLog(
  project: string,
  jobId: string,
  options: { tail?: number }
): Promise<void> {
  const encoded = encodeProjectPath(project);
  const token = (await import('./Client.ts')).getToken();

  // Fetch raw log text
  const baseUrl = (await import('./Client.ts')).getBaseUrl();
  const url = `${baseUrl}/projects/${encoded}/jobs/${jobId}/trace`;

  const response = await fetch(url, {
    headers: {
      'PRIVATE-TOKEN': await token,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitLab API error (${response.status}): ${error}`);
  }

  let log = await response.text();

  // Optionally tail the log
  if (options.tail) {
    const lines = log.split('\n');
    log = lines.slice(-options.tail).join('\n');
  }

  outputJson({
    project,
    job_id: jobId,
    tail: options.tail,
    log,
  });
}

/**
 * Retry a job
 */
async function retryJob(project: string, jobId: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const j = await gitlabFetch<GitLabJob>(
    `/projects/${encoded}/jobs/${jobId}/retry`,
    { method: 'POST' }
  );

  outputJson({
    success: true,
    message: `Retried job '${j.name}' (new ID: ${j.id})`,
    ...formatJob(j),
  });
}

/**
 * Cancel a job
 */
async function cancelJob(project: string, jobId: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const j = await gitlabFetch<GitLabJob>(
    `/projects/${encoded}/jobs/${jobId}/cancel`,
    { method: 'POST' }
  );

  outputJson({
    success: true,
    message: `Canceled job '${j.name}'`,
    id: j.id,
    name: j.name,
    status: j.status,
    web_url: j.web_url,
  });
}

/**
 * Play (trigger) a manual job
 */
async function playJob(project: string, jobId: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const j = await gitlabFetch<GitLabJob>(
    `/projects/${encoded}/jobs/${jobId}/play`,
    { method: 'POST' }
  );

  outputJson({
    success: true,
    message: `Started job '${j.name}'`,
    ...formatJob(j),
  });
}

/**
 * List or download job artifacts
 */
async function getArtifacts(
  project: string,
  jobId: string,
  options: { path?: string }
): Promise<void> {
  const encoded = encodeProjectPath(project);

  if (options.path) {
    // Get specific artifact file
    const encodedPath = encodeURIComponent(options.path);
    const baseUrl = (await import('./Client.ts')).getBaseUrl();
    const token = await (await import('./Client.ts')).getToken();
    const url = `${baseUrl}/projects/${encoded}/jobs/${jobId}/artifacts/${encodedPath}`;

    const response = await fetch(url, {
      headers: {
        'PRIVATE-TOKEN': token,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitLab API error (${response.status}): ${error}`);
    }

    const content = await response.text();

    outputJson({
      project,
      job_id: jobId,
      artifact_path: options.path,
      content,
    });
  } else {
    // List artifacts metadata
    const j = await gitlabFetch<JobDetail>(
      `/projects/${encoded}/jobs/${jobId}`
    );

    outputJson({
      project,
      job_id: jobId,
      artifacts: j.artifacts.map((a) => ({
        filename: a.filename,
        size: a.size,
      })),
      artifacts_expire_at: j.artifacts_expire_at,
      download_url: `${(await import('./Client.ts')).getBaseUrl()}/projects/${encoded}/jobs/${jobId}/artifacts`,
    });
  }
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
        await listJobs(positional[1], {
          pipeline: flags.pipeline as string | undefined,
          scope: flags.scope as string | undefined,
          limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
        });
        break;

      case 'get':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and job_id are required for get`);
        }
        await getJob(positional[1], positional[2]);
        break;

      case 'log':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and job_id are required for log`);
        }
        await getJobLog(positional[1], positional[2], {
          tail: flags.tail ? parseInt(flags.tail as string, 10) : undefined,
        });
        break;

      case 'retry':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and job_id are required for retry`);
        }
        await retryJob(positional[1], positional[2]);
        break;

      case 'cancel':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and job_id are required for cancel`);
        }
        await cancelJob(positional[1], positional[2]);
        break;

      case 'play':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and job_id are required for play`);
        }
        await playJob(positional[1], positional[2]);
        break;

      case 'artifacts':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and job_id are required for artifacts`);
        }
        await getArtifacts(positional[1], positional[2], {
          path: flags.path as string | undefined,
        });
        break;

      default:
        outputError(USAGE);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
