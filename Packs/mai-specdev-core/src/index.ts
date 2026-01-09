/**
 * mai-specdev-core
 *
 * Core types and templates for spec-first software development.
 * Provides document structures, quality gate configurations, and security checklists.
 *
 * @packageDocumentation
 */

// Type exports
export * from './types/index.ts';

// Template exports
export {
  getSpecTemplate,
  getDesignTemplate,
  renderSimpleTemplate,
  getBlankSpecMarkdown,
  getBlankDesignMarkdown,
} from './templates/index.ts';
