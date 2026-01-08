/**
 * MetricSample - A single metric sample (instant query result)
 */
export interface MetricSample {
  /** Labels including __name__ */
  metric: Record<string, string>;
  /** Metric value */
  value: number;
  /** Sample timestamp */
  timestamp: Date;
}

/**
 * MetricSeries - A time series of metric values (range query result)
 */
export interface MetricSeries {
  /** Labels including __name__ */
  metric: Record<string, string>;
  /** Time series values */
  values: Array<{ timestamp: Date; value: number }>;
}

/**
 * QueryResult - Result of a metric query
 */
export interface QueryResult {
  /** Result type from the query */
  resultType: 'vector' | 'matrix' | 'scalar' | 'string';
  /** Vector results (instant query) */
  samples?: MetricSample[];
  /** Matrix results (range query) */
  series?: MetricSeries[];
  /** Scalar value (scalar result type) */
  scalarValue?: number;
  /** String value (string result type) */
  stringValue?: string;
}
