/**
 * Main exports for OSINT image analysis tools
 */

export { MetadataExtractor } from './metadata-extractor.js';
export { ImageProcessor } from './image-processor.js';
export { OCREngine } from './ocr-engine.js';
export { HashCalculator } from './hash-calculator.js';
export { ForensicAnalyzer } from './forensic-analyzer.js';

export type {
  ToolWrapper,
  ToolInput,
  ToolResult,
  ExifMetadata,
  OCRResult,
  ImageHash,
  ForensicResult,
  ImageInfo,
  ProcessingOptions,
} from './types.js';

export type { MetadataExtractorOptions } from './metadata-extractor.js';
export type { OCREngineOptions } from './ocr-engine.js';
export type { ForensicAnalyzerOptions } from './forensic-analyzer.js';
