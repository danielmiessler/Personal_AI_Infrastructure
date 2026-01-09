/**
 * mai-project-core
 *
 * Core interfaces and utilities for the PAI Project Management methodology.
 * Provides types, templates, and utilities for managing projects of any type.
 *
 * @packageDocumentation
 */

// Type exports
export * from './types/index.ts';

// Template exports
export {
  loadTemplate,
  renderTemplate,
  formatGatesTable,
  generateClaudeMd,
  generateLocalMd,
  TEMPLATE_TYPES,
  type TemplateType,
  type TemplateVariables,
} from './templates/index.ts';

// Utility exports
export {
  formatDate,
  generateShortId,
  safeParseJson,
} from './utils/index.ts';
