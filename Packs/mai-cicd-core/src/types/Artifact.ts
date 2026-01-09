/**
 * Artifact - Represents a build artifact from a pipeline run
 */
export interface Artifact {
  /** Unique identifier */
  id: string;
  /** Run this artifact belongs to */
  runId: string;
  /** Artifact name */
  name: string;
  /** Size in bytes */
  sizeBytes: number;
  /** When the artifact was created */
  createdAt: Date;
  /** When the artifact expires */
  expiresAt?: Date;
  /** Direct download URL (if available) */
  downloadUrl?: string;
}
