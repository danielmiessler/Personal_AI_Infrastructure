/**
 * InstantQueryOptions - Options for instant (point-in-time) queries
 */
export interface InstantQueryOptions {
  /** Evaluation timestamp (default: now) */
  time?: Date;
  /** Query timeout in seconds */
  timeout?: number;
}

/**
 * RangeQueryOptions - Options for range queries
 */
export interface RangeQueryOptions {
  /** Range start time */
  start: Date;
  /** Range end time */
  end: Date;
  /** Resolution step in seconds */
  step: number;
  /** Query timeout in seconds */
  timeout?: number;
}

/**
 * MetricNamesOptions - Options for listing metric names
 */
export interface MetricNamesOptions {
  /** Label matchers to filter metrics (PromQL format) */
  match?: string[];
  /** Start time for filtering */
  start?: Date;
  /** End time for filtering */
  end?: Date;
  /** Maximum results to return */
  limit?: number;
}

/**
 * LabelValuesOptions - Options for listing label values
 */
export interface LabelValuesOptions {
  /** Label matchers to filter (PromQL format) */
  match?: string[];
  /** Start time for filtering */
  start?: Date;
  /** End time for filtering */
  end?: Date;
  /** Maximum results to return */
  limit?: number;
}
