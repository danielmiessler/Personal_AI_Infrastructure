/**
 * Spec Document Types
 *
 * Types for specification documents in spec-first development.
 */

export type SpecStatus = 'draft' | 'review' | 'approved' | 'superseded';

export interface SpecMetadata {
  title: string;
  version: string;
  date: string;
  author: string;
  status: SpecStatus;
}

export interface InterfaceDefinition {
  name: string;
  type: 'api' | 'event' | 'data' | 'ui';
  description: string;
  contract?: ApiContract | EventContract;
}

export interface ApiContract {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  request: {
    params?: Record<string, string>;
    body?: unknown;
    headers?: Record<string, string>;
  };
  response: {
    success: unknown;
    errors: Array<{ code: number; message: string }>;
  };
  security: {
    authentication: 'none' | 'bearer' | 'api-key' | 'oauth';
    authorization?: string[];
    rateLimit?: number;
  };
}

export interface EventContract {
  eventName: string;
  payload: unknown;
  publisher: string;
  subscribers: string[];
}

export interface SpecSections {
  problemStatement: string;
  successCriteria: string[];
  constraints: string[];
  approach: string;
  interfaces: InterfaceDefinition[];
  securityImplications: string[];
  openQuestions: string[];
}

export interface SpecApproval {
  approver: string;
  date: string;
  comments?: string;
}

export interface SpecDocument {
  metadata: SpecMetadata;
  sections: SpecSections;
  approval?: SpecApproval;
}

/**
 * Create a new draft spec document
 */
export function createSpecDocument(
  title: string,
  author: string,
  problemStatement: string
): SpecDocument {
  return {
    metadata: {
      title,
      version: '0.1.0',
      date: new Date().toISOString().split('T')[0],
      author,
      status: 'draft',
    },
    sections: {
      problemStatement,
      successCriteria: [],
      constraints: [],
      approach: '',
      interfaces: [],
      securityImplications: [],
      openQuestions: [],
    },
  };
}

/**
 * Validate spec document has minimum required fields
 */
export function validateSpec(spec: SpecDocument): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!spec.metadata.title) {
    errors.push('Title is required');
  }
  if (!spec.sections.problemStatement) {
    errors.push('Problem statement is required');
  }
  if (spec.sections.successCriteria.length === 0) {
    errors.push('At least one success criterion is required');
  }
  if (!spec.sections.approach) {
    errors.push('Approach is required');
  }
  if (spec.sections.securityImplications.length === 0) {
    errors.push('Security implications must be documented');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Update spec status
 */
export function updateSpecStatus(spec: SpecDocument, status: SpecStatus): SpecDocument {
  return {
    ...spec,
    metadata: {
      ...spec.metadata,
      status,
    },
  };
}

/**
 * Approve a spec document
 */
export function approveSpec(
  spec: SpecDocument,
  approver: string,
  comments?: string
): SpecDocument {
  return {
    ...spec,
    metadata: {
      ...spec.metadata,
      status: 'approved',
    },
    approval: {
      approver,
      date: new Date().toISOString().split('T')[0],
      comments,
    },
  };
}
