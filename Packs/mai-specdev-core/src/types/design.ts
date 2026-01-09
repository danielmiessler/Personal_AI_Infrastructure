/**
 * Design Document Types
 *
 * Types for design documents that implement specifications.
 */

import type { InterfaceDefinition } from './spec.ts';

export type DesignStatus = 'draft' | 'review' | 'approved';

export interface DesignMetadata {
  title: string;
  version: string;
  specRef: string;
  date: string;
  author: string;
  status: DesignStatus;
}

export interface Component {
  name: string;
  description: string;
  type: 'service' | 'library' | 'module' | 'ui' | 'data';
  responsibilities: string[];
  dependencies: string[];
  interfaces: string[];
}

export interface DataFlowDiagram {
  description: string;
  nodes: DataFlowNode[];
  edges: DataFlowEdge[];
}

export interface DataFlowNode {
  id: string;
  name: string;
  type: 'source' | 'process' | 'store' | 'sink';
}

export interface DataFlowEdge {
  from: string;
  to: string;
  label: string;
  dataType?: string;
}

export interface TestStrategy {
  unitTests: {
    framework: string;
    coverage: number;
    patterns: string[];
  };
  integrationTests: {
    framework: string;
    scope: string[];
  };
  e2eTests?: {
    framework: string;
    scenarios: string[];
  };
}

export interface SecurityControl {
  id: string;
  name: string;
  type: 'preventive' | 'detective' | 'corrective';
  implementation: string;
  validation: string;
}

export interface DesignSections {
  componentIdentification: Component[];
  interfaceDefinitions: InterfaceDefinition[];
  dataFlow: DataFlowDiagram;
  testStrategy: TestStrategy;
  securityControls: SecurityControl[];
}

export interface DesignApproval {
  approver: string;
  date: string;
  comments?: string;
}

export interface DesignDocument {
  metadata: DesignMetadata;
  sections: DesignSections;
  approval?: DesignApproval;
}

/**
 * Create a new draft design document
 */
export function createDesignDocument(
  title: string,
  author: string,
  specRef: string
): DesignDocument {
  return {
    metadata: {
      title,
      version: '0.1.0',
      specRef,
      date: new Date().toISOString().split('T')[0],
      author,
      status: 'draft',
    },
    sections: {
      componentIdentification: [],
      interfaceDefinitions: [],
      dataFlow: {
        description: '',
        nodes: [],
        edges: [],
      },
      testStrategy: {
        unitTests: {
          framework: 'bun:test',
          coverage: 80,
          patterns: [],
        },
        integrationTests: {
          framework: 'bun:test',
          scope: [],
        },
      },
      securityControls: [],
    },
  };
}

/**
 * Validate design document has minimum required fields
 */
export function validateDesign(design: DesignDocument): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!design.metadata.title) {
    errors.push('Title is required');
  }
  if (!design.metadata.specRef) {
    errors.push('Spec reference is required');
  }
  if (design.sections.componentIdentification.length === 0) {
    errors.push('At least one component must be identified');
  }
  if (design.sections.securityControls.length === 0) {
    errors.push('Security controls must be defined');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Add a component to the design
 */
export function addComponent(design: DesignDocument, component: Component): DesignDocument {
  return {
    ...design,
    sections: {
      ...design.sections,
      componentIdentification: [...design.sections.componentIdentification, component],
    },
  };
}

/**
 * Approve a design document
 */
export function approveDesign(
  design: DesignDocument,
  approver: string,
  comments?: string
): DesignDocument {
  return {
    ...design,
    metadata: {
      ...design.metadata,
      status: 'approved',
    },
    approval: {
      approver,
      date: new Date().toISOString().split('T')[0],
      comments,
    },
  };
}
