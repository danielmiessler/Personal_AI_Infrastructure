/**
 * Project - Project state and configuration types
 */

import type { Task, TaskList } from './task.ts';
import type { Gate } from './gate.ts';
import { createGatesForProject, getCurrentPhase as getPhaseFromGates } from './gate.ts';
import type { Budget, PhysicalBudget, SoftwareBudget } from './budget.ts';

export type ProjectType = 'software' | 'physical' | 'documentation' | 'infrastructure';

export type ProjectPhase = 'SPEC' | 'DESIGN' | 'BUILD' | 'VERIFY' | 'COMPLETE';

export interface ProjectIdentity {
  name: string;
  type: ProjectType;
  owner: string;
  description?: string;
  repository?: string;
  createdAt: string;         // ISO timestamp
  updatedAt: string;         // ISO timestamp
}

export interface ProjectState {
  identity: ProjectIdentity;
  phase: ProjectPhase;
  gates: Gate[];
  tasks?: TaskList;
  budget?: Budget;
}

export interface SoftwareProjectState extends ProjectState {
  identity: ProjectIdentity & { type: 'software' };
  budget?: SoftwareBudget;
  stack?: {
    language?: string;
    runtime?: string;
    packageManager?: string;
    framework?: string;
  };
  spec?: {
    path: string;
    approved: boolean;
    approvedAt?: string;
  };
  design?: {
    path: string;
    approved: boolean;
    approvedAt?: string;
  };
}

export interface PhysicalProjectState extends ProjectState {
  identity: ProjectIdentity & { type: 'physical' };
  budget?: PhysicalBudget;
  materials?: Array<{
    name: string;
    quantity: number;
    unit: string;
    acquired: boolean;
  }>;
  tools?: Array<{
    name: string;
    owned: boolean;
    notes?: string;
  }>;
}

export interface DocumentationProjectState extends ProjectState {
  identity: ProjectIdentity & { type: 'documentation' };
  outline?: {
    path: string;
    approved: boolean;
  };
  drafts?: Array<{
    version: string;
    path: string;
    status: 'draft' | 'review' | 'approved';
  }>;
}

export interface InfrastructureProjectState extends ProjectState {
  identity: ProjectIdentity & { type: 'infrastructure' };
  budget?: SoftwareBudget;
  environments?: Array<{
    name: string;
    status: 'planned' | 'deploying' | 'active' | 'deprecated';
  }>;
  rollbackPlan?: {
    path: string;
    tested: boolean;
  };
}

/**
 * Create initial project state
 */
export function createProjectState(
  name: string,
  type: ProjectType,
  owner: string,
  description?: string
): ProjectState {
  const now = new Date().toISOString();

  return {
    identity: {
      name,
      type,
      owner,
      description,
      createdAt: now,
      updatedAt: now,
    },
    phase: 'SPEC',
    gates: createGatesForProject(type),
  };
}

/**
 * Update project phase based on gates
 */
export function updateProjectPhase(state: ProjectState): ProjectState {
  const phase = getPhaseFromGates(state.gates) as ProjectPhase;

  return {
    ...state,
    phase,
    identity: {
      ...state.identity,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Project state file name
 */
export const PROJECT_STATE_FILE = 'project-state.yaml';

/**
 * Serialize project state to YAML-compatible object
 */
export function serializeProjectState(state: ProjectState): Record<string, unknown> {
  return {
    version: '1.0',
    identity: state.identity,
    phase: state.phase,
    gates: state.gates.map(g => ({
      id: g.id,
      name: g.name,
      status: g.status,
      approver: g.approver,
      approvedAt: g.approvedAt,
      comments: g.comments,
    })),
    budget: state.budget,
    tasks: state.tasks ? {
      projectId: state.tasks.projectId,
      progress: state.tasks.progress,
      taskCount: state.tasks.tasks.length,
    } : undefined,
  };
}
