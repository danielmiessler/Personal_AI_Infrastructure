/**
 * Writer exports for mai-project-system
 */

export type {
  LocalMdOptions,
} from './local-md.ts';

export {
  writeLocalMd,
  readLocalMd,
  localMdExists,
  generateResumeInstructions,
  buildLocalMdOptions,
} from './local-md.ts';
