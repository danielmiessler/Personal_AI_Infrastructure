/**
 * Forensic image analysis tool for manipulation detection
 * Uses Error Level Analysis (ELA) and other techniques
 */

import Sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { ToolWrapper, ToolResult, ForensicResult, ToolInput } from './types.js';

export interface ForensicAnalyzerOptions {
  elaQuality?: number;
  elaScale?: number;
}

export class ForensicAnalyzer implements ToolWrapper<ForensicResult> {
  readonly name = 'ForensicAnalyzer';
  readonly version = '1.0.0';

  private elaQuality: number;
  private elaScale: number;

  constructor(options: ForensicAnalyzerOptions = {}) {
    this.elaQuality = options.elaQuality || 85;
    this.elaScale = options.elaScale || 10;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await Sharp.version();
      return true;
    } catch {
      return false;
    }
  }

  async process(input: ToolInput): Promise<ToolResult<ForensicResult>> {
    const startTime = Date.now();

    try {
      const buffer = typeof input === 'string' ? await readFile(input) : input;

      const elaScore = await this.calculateELAScore(buffer);
      const anomalies = this.detectAnomalies(buffer);
      const qualityHistogram = await this.calculateQualityHistogram(buffer);
      const manipulationProbability = this.calculateManipulationProbability(elaScore, anomalies);

      const result: ForensicResult = {
        elaScore,
        manipulationProbability,
        anomalies,
        qualityHistogram,
      };

      return {
        success: true,
        data: result,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          toolVersion: Sharp.versions,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          processingTimeMs: Date.now() - startTime,
          toolVersion: Sharp.versions,
        },
      };
    }
  }

  /**
   * Calculate Error Level Analysis (ELA) score
   * Higher scores indicate potential manipulation
   */
  private async calculateELAScore(buffer: Buffer): Promise<number> {
    try {
      const original = Sharp(buffer);
      const { width, height } = await original.metadata();

      if (!width || !height) {
        throw new Error('Invalid image dimensions');
      }

      // Save image at known quality
      const recompressed = await original
        .jpeg({ quality: this.elaQuality })
        .toBuffer();

      // Calculate difference
      const originalData = await original.raw().toBuffer();
      const recompressedData = await Sharp(recompressed)
        .resize(width, height)
        .raw()
        .toBuffer();

      // Calculate mean squared error
      let totalError = 0;
      const pixelCount = originalData.length;

      for (let i = 0; i < pixelCount; i++) {
        const diff = originalData[i] - recompressedData[i];
        totalError += diff * diff;
      }

      const mse = totalError / pixelCount;
      const elaScore = Math.min(100, Math.sqrt(mse) * this.elaScale);

      return elaScore;
    } catch {
      return 0;
    }
  }

  /**
   * Detect various anomalies in the image
   */
  private async detectAnomalies(buffer: Buffer): Promise<string[]> {
    const anomalies: string[] = [];

    try {
      const metadata = await Sharp(buffer).metadata();

      // Check for inconsistent metadata
      if (metadata.orientation && metadata.orientation > 1) {
        anomalies.push('Image has EXIF orientation tag - may be rotated');
      }

      // Check for suspicious dimensions
      if (metadata.width && metadata.height) {
        const aspectRatio = metadata.width / metadata.height;
        if (aspectRatio > 10 || aspectRatio < 0.1) {
          anomalies.push('Unusual aspect ratio detected');
        }
      }

      // Check for color space inconsistencies
      if (metadata.space === 'b-w') {
        anomalies.push('Image is in grayscale but may have been color');
      }

      // Check for compression artifacts
      const histogram = await this.calculateQualityHistogram(buffer);
      const spikeThreshold = 50;
      const spikes = histogram.filter((v) => v > spikeThreshold);

      if (spikes.length > 3) {
        anomalies.push('Multiple histogram spikes detected - possible recompression');
      }

      // Check for inconsistent quality regions
      const elaMap = await this.calculateELAMap(buffer);
      const elaVariance = this.calculateVariance(elaMap);

      if (elaVariance > 1000) {
        anomalies.push('High variance in error levels - possible localized editing');
      }

      return anomalies;
    } catch {
      return [];
    }
  }

  /**
   * Calculate quality histogram for compression analysis
   */
  private async calculateQualityHistogram(buffer: Buffer): Promise<number[]> {
    try {
      const { data } = await Sharp(buffer)
        .resize(256, 256, { fit: 'fill' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const histogram = new Array(256).fill(0);

      for (let i = 0; i < data.length; i += 3) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        histogram[Math.floor(avg)]++;
      }

      return histogram;
    } catch {
      return new Array(256).fill(0);
    }
  }

  /**
   * Calculate ELA map for spatial analysis
   */
  private async calculateELAMap(buffer: Buffer): Promise<number[]> {
    try {
      const original = Sharp(buffer);
      const { width, height } = await original.metadata();

      if (!width || !height) {
        return [];
      }

      const recompressed = await original
        .jpeg({ quality: this.elaQuality })
        .toBuffer();

      const originalData = await original.raw().toBuffer();
      const recompressedData = await Sharp(recompressed)
        .resize(width, height)
        .raw()
        .toBuffer();

      const elaMap: number[] = [];

      // Calculate ELA for 8x8 blocks
      const blockSize = 8;
      for (let y = 0; y < height - blockSize; y += blockSize) {
        for (let x = 0; x < width - blockSize; x += blockSize) {
          let blockError = 0;

          for (let by = 0; by < blockSize; by++) {
            for (let bx = 0; bx < blockSize; bx++) {
              const idx = ((y + by) * width + (x + bx)) * 3;
              const diff = Math.abs(originalData[idx] - recompressedData[idx]);
              blockError += diff;
            }
          }

          elaMap.push(blockError / (blockSize * blockSize));
        }
      }

      return elaMap;
    } catch {
      return [];
    }
  }

  /**
   * Calculate variance of array
   */
  private calculateVariance(data: number[]): number {
    if (data.length === 0) return 0;

    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + (val - mean) ** 2, 0) / data.length;

    return variance;
  }

  /**
   * Calculate manipulation probability based on ELA score and anomalies
   */
  private calculateManipulationProbability(
    elaScore: number,
    anomalies: string[],
  ): 'low' | 'medium' | 'high' {
    // ELA score thresholds (empirical)
    const elaHighThreshold = 50;
    const elaMediumThreshold = 25;

    // Anomaly count thresholds
    const anomalyHighThreshold = 3;
    const anomalyMediumThreshold = 1;

    if (elaScore >= elaHighThreshold || anomalies.length >= anomalyHighThreshold) {
      return 'high';
    }

    if (elaScore >= elaMediumThreshold || anomalies.length >= anomalyMediumThreshold) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Generate ELA visualization image
   */
  async generateELAVisualization(input: ToolInput): Promise<ToolResult<Buffer>> {
    const startTime = Date.now();

    try {
      const buffer = typeof input === 'string' ? await readFile(input) : input;

      const original = Sharp(buffer);
      const { width, height } = await original.metadata();

      if (!width || !height) {
        throw new Error('Invalid image dimensions');
      }

      const recompressed = await original
        .jpeg({ quality: this.elaQuality })
        .toBuffer();

      const originalData = await original.raw().toBuffer();
      const recompressedData = await Sharp(recompressed)
        .resize(width, height)
        .raw()
        .toBuffer();

      // Create ELA visualization (enhanced differences)
      const elaData = Buffer.alloc(originalData.length);

      for (let i = 0; i < originalData.length; i++) {
        const diff = Math.abs(originalData[i] - recompressedData[i]);
        // Amplify differences for visualization
        elaData[i] = Math.min(255, diff * 5);
      }

      const elaImage = await Sharp(elaData, {
        raw: { width, height, channels: 3 },
      })
        .jpeg()
        .toBuffer();

      return {
        success: true,
        data: elaImage,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          toolVersion: Sharp.versions,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          processingTimeMs: Date.now() - startTime,
          toolVersion: Sharp.versions,
        },
      };
    }
  }
}
