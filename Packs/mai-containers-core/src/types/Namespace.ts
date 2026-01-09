/**
 * Namespace/project definition
 */
export interface Namespace {
  /** Namespace name */
  name: string;

  /** Current status */
  status: NamespaceStatus;

  /** Labels for filtering/grouping */
  labels?: Record<string, string>;

  /** Annotations for metadata */
  annotations?: Record<string, string>;

  /** Creation timestamp */
  createdAt?: Date;
}

/**
 * Namespace status
 */
export type NamespaceStatus = 'active' | 'terminating';
