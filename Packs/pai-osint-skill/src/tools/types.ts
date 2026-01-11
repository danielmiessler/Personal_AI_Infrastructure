/**
 * Shared types and interfaces for OSINT image analysis tools
 */

export interface ToolWrapper<T = unknown> {
  name: string;
  version: string;
  isAvailable(): Promise<boolean>;
  process(input: ToolInput): Promise<ToolResult<T>>;
  batch?(inputs: ToolInput[]): Promise<ToolResult<T>[]>;
}

export type ToolInput = string | Buffer;

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    processingTimeMs: number;
    toolVersion: string;
  };
}

export interface ExifMetadata {
  // Basic metadata
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  mimeType?: string;

  // Camera/exif data
  make?: string;
  model?: string;
  software?: string;
  dateTimeOriginal?: string;
  dateTimeModified?: string;

  // Image properties
  imageWidth?: number;
  imageHeight?: number;
  orientation?: number;
  colorSpace?: string;

  // GPS data
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAltitude?: number;
  gpsDateTime?: string;

  // Other EXIF data
  iso?: number;
  aperture?: number;
  shutterSpeed?: string;
  focalLength?: number;
  flash?: string;

  // Raw EXIF data (fallback)
  rawExif?: Record<string, unknown>;
}

export interface OCRResult {
  text: string;
  confidence: number;
  lines: {
    text: string;
    confidence: number;
    boundingBox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }[];
}

export interface ImageHash {
  aHash?: string; // Average hash
  pHash?: string; // Perceptual hash
  dHash?: string; // Difference hash
  wHash?: string; // Wavelet hash
}

export interface ForensicResult {
  elaScore: number; // Error Level Analysis score (0-100)
  manipulationProbability: 'low' | 'medium' | 'high';
  anomalies: string[];
  qualityHistogram: number[];
  compressionRatio?: number;
}

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  channels: number;
  premultiplied: boolean;
  size: number;
}

export interface ProcessingOptions {
  includeRawExif?: boolean;
  ocrLanguage?: string;
  hashAlgorithms?: ('aHash' | 'pHash' | 'dHash' | 'wHash')[];
  elaQuality?: number;
}
