/**
 * TargetHealth - Health status of a scrape target
 */
export type TargetHealth = 'up' | 'down' | 'unknown';

/**
 * Target - A monitored scrape target/endpoint
 */
export interface Target {
  /** Scrape endpoint URL */
  endpoint: string;
  /** Job name */
  job: string;
  /** Instance label */
  instance: string;
  /** Current health status */
  health: TargetHealth;
  /** All target labels */
  labels: Record<string, string>;
  /** Last successful scrape timestamp */
  lastScrape?: Date;
  /** Last scrape duration in seconds */
  lastScrapeDuration?: number;
  /** Last scrape error message (if any) */
  lastError?: string;
}

/**
 * TargetQuery - Query options for listing targets
 */
export interface TargetQuery {
  /** Filter by job name */
  job?: string;
  /** Filter by health status */
  health?: TargetHealth | TargetHealth[];
  /** Maximum results */
  limit?: number;
}
