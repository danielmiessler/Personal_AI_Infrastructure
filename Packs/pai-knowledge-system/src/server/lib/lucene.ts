/**
 * Lucene Query Sanitization Utilities
 *
 * RediSearch (used by FalkorDB) uses Lucene query syntax which interprets
 * certain characters as special operators. When using these characters in
 * regular text (like group_ids with hyphens), they must be escaped to avoid
 * syntax errors.
 *
 * ## The Problem
 *
 * Graphiti's FalkorDB driver has a sanitize() method that replaces special
 * characters with whitespace for fulltext search. However, this sanitization
 * is NOT applied to group_ids in search queries. When a group_id like
 * "my-knowledge-base" is used, the hyphen is passed directly to RediSearch
 * and interpreted as a negation operator.
 *
 * Example: "pai-threat-intel" → RediSearch interprets as "pai AND NOT threat AND NOT intel"
 *
 * ## Special Characters
 *
 * | Character | Lucene Interpretation |
 * |-----------|----------------------|
 * | `-`       | Negation (NOT)       |
 * | `+`       | Required term (AND)  |
 * | `@`       | Field prefix         |
 * | `#`       | Tag field            |
 * | `* ?`     | Wildcards            |
 * | `"`       | Phrase query         |
 * | `( )`     | Grouping             |
 * | `{ } [ ]` | Range queries        |
 * | `~`       | Fuzzy/proximity      |
 * | `:`       | Field specifier      |
 * | `|`       | OR operator          |
 * | `&`       | AND operator         |
 * | `!`       | NOT operator         |
 * | `%`       | Fuzzy threshold      |
 * | `< > =`   | Comparison operators |
 * | `$`       | Variable reference   |
 * | `/`       | Regex delimiter      |
 *
 * ## Related Issues
 *
 * - RediSearch #2628: Can't search text with hyphens
 *   https://github.com/RediSearch/RediSearch/issues/2628
 *
 * - RediSearch #4092: Escaping filter values incomplete
 *   https://github.com/RediSearch/RediSearch/issues/4092
 *
 * - Graphiti #815: FalkorDB query syntax errors with pipe character
 *   https://github.com/getzep/graphiti/issues/815
 *
 * - Graphiti #1118: Fix forward slash character handling
 *   https://github.com/getzep/graphiti/pull/1118
 *
 * ## Our Workaround
 *
 * 1. For group_ids: Convert hyphens to underscores (sanitizeGroupId)
 * 2. For search queries: Escape special chars with backslash (sanitizeSearchQuery)
 *
 * @module lucene
 */

/**
 * Escape a value for safe use in Lucene queries
 *
 * This function wraps the value in double quotes and escapes any internal
 * special characters, ensuring the value is treated as a literal string
 * rather than as Lucene query syntax.
 *
 * Special characters in Lucene/RediSearch syntax:
 * + - && || ! ( ) { } [ ] ^ " ~ * ? : \ / @ # $ % < > =
 *
 * @param value - The value to escape (e.g., group_id, search term)
 * @returns The escaped value safe for use in Lucene queries
 *
 * @example
 * luceneSanitize("pai-threat-intel") // => '"pai-threat-intel"'
 * luceneSanitize('user "quoted" text') // => '"user \\"quoted\\" text"'
 */
export function luceneSanitize(value: string): string {
  if (!value) {
    return '""';
  }

  // Escape backslashes first (so we don't double-escape later)
  let escaped = value.replace(/\\/g, '\\\\');

  // Escape double quotes
  escaped = escaped.replace(/"/g, '\\"');

  // Wrap in double quotes to treat the entire value as a literal
  return `"${escaped}"`;
}

/**
 * Escape multiple values for safe use in Lucene queries
 *
 * @param values - Array of values to escape
 * @returns Array of escaped values
 *
 * @example
 * luceneSanitizeMany(["group-1", "group-2"]) // => ['"group-1"', '"group-2"']
 */
export function luceneSanitizeMany(values: string[]): string[] {
  return values.map(luceneSanitize);
}

/**
 * Check if a value contains special Lucene characters
 *
 * @param value - The value to check
 * @returns true if the value contains characters that need escaping
 *
 * @example
 * needsEscaping("pai-threat") // => true
 * needsEscaping("simple") // => false
 */
export function needsEscaping(value: string): boolean {
  // Special characters in Lucene/RediSearch syntax
  // Includes: + - & | ! ( ) { } [ ] ^ " ~ * ? : \ / @ # $ % < > =
  const specialChars = /[+\-&|!(){}\[\]^"~*?:\\/@#$%<>=]/;
  return specialChars.test(value);
}

/**
 * Sanitize a group_id value for use in queries
 *
 * This is a convenience function specifically for group_ids, which
 * commonly use hyphens (e.g., "pai-threat-intel", "pai-observability").
 *
 * IMPORTANT: group_ids are validated by Graphiti before reaching RediSearch.
 * The validation only allows alphanumeric characters, dashes, and underscores.
 * However, Graphiti has a bug where it uses unescaped group_ids in RediSearch
 * queries, causing hyphens to be interpreted as negation operators.
 *
 * WORKAROUND: This function automatically converts hyphens to underscores
 * to avoid the Graphiti RediSearch bug.
 *
 * @param groupId - The group_id to sanitize
 * @returns The sanitized group_id (hyphens → underscores)
 *
 * @example
 * sanitizeGroupId("pai-threat-intel") // => 'pai_threat_intel'
 * sanitizeGroupId("test_group") // => 'test_group' (unchanged)
 * sanitizeGroupId("invalid@group") // => 'invalid@group' (logs warning)
 */
export function sanitizeGroupId(groupId: string | undefined): string | undefined {
  if (groupId === undefined) {
    return undefined;
  }

  // Validate that group_id contains only allowed characters
  // Graphiti validation: [a-zA-Z0-9_-]
  const validGroupIdPattern = /^[a-zA-Z0-9_-]+$/;

  if (!validGroupIdPattern.test(groupId)) {
    console.warn(`[lucene] Invalid group_id "${groupId}" - must contain only alphanumeric, dashes, or underscores`);
    // Return as-is so Graphiti can provide proper error message
    return groupId;
  }

  // WORKAROUND: Convert hyphens to underscores to avoid Graphiti RediSearch bug
  // This prevents "pai-test-group" from being interpreted as "pai NOT test NOT group"
  const sanitized = groupId.replace(/-/g, '_');

  if (sanitized !== groupId) {
    console.log(`[lucene] Converted group_id "${groupId}" to "${sanitized}" (hyphens → underscores)`);
  }

  return sanitized;
}

/**
 * Sanitize an array of group_id values
 *
 * @param groupIds - Array of group_ids to sanitize
 * @returns Array of sanitized group_ids
 *
 * @example
 * sanitizeGroupIds(["group-1", "group-2"]) // => ['group-1', 'group-2']
 */
export function sanitizeGroupIds(groupIds: string[] | undefined): string[] | undefined {
  if (!groupIds || groupIds.length === 0) {
    return undefined;
  }
  // Map each group_id through sanitizeGroupId (which validates but doesn't quote)
  return groupIds.map(sanitizeGroupId).filter((id): id is string => id !== undefined);
}

/**
 * Sanitize a search query string for Lucene
 *
 * This function escapes special Lucene characters in search queries while
 * preserving the search intent. Unlike luceneSanitize(), which wraps the
 * entire value in quotes, this function escapes characters in-place to
 * allow for multi-word searches with AND/OR logic between words.
 *
 * @param query - The search query to sanitize
 * @returns The sanitized query string
 *
 * @example
 * sanitizeSearchQuery("pai-threat-intel") // => 'pai\\-threat\\-intel'
 * sanitizeSearchQuery("user's search") // => "user's search"
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) {
    return "";
  }

  // Escape special Lucene characters with backslash
  // Order matters: escape backslash first, then &&/||, then other characters
  let sanitized = query;

  // Escape backslash first
  sanitized = sanitized.replace(/\\/g, '\\\\');

  // Escape && and || before escaping individual & and |
  sanitized = sanitized.replace(/&&/g, '\\&\\&');
  sanitized = sanitized.replace(/\|\|/g, '\\|\\|');

  // Escape other special characters: + - & | ! ( ) { } [ ] ^ " ~ * ? : / @ # $ % < > =
  sanitized = sanitized.replace(/[+\-&|!(){}\[\]^"~*?:/@#$%<>=]/g, '\\$&');

  return sanitized;
}

