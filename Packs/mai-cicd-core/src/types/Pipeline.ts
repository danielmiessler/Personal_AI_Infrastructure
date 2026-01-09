/**
 * Pipeline - Represents a CI/CD workflow definition
 */
export interface Pipeline {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Path to the workflow file (e.g., ".github/workflows/ci.yml") */
  path: string;
  /** Repository this pipeline belongs to */
  repo: string;
  /** Default branch for this pipeline */
  defaultBranch?: string;
  /** Additional provider-specific data */
  metadata?: Record<string, unknown>;
}
