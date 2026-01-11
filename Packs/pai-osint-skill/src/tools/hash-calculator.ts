/**
 * Perceptual hash calculator for image similarity detection
 */

import Sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { ToolWrapper, ToolResult, ImageHash, ToolInput } from './types.js';

export class HashCalculator implements ToolWrapper<ImageHash> {
  readonly name = 'HashCalculator';
  readonly version = '1.0.0';

  private hashSize = 8;

  async isAvailable(): Promise<boolean> {
    try {
      await Sharp.version();
      return true;
    } catch {
      return false;
    }
  }

  async process(input: ToolInput): Promise<ToolResult<ImageHash>> {
    const startTime = Date.now();

    try {
      const buffer = typeof input === 'string' ? await readFile(input) : input;

      const hashes: ImageHash = {
        aHash: await this.calculateAHash(buffer),
        pHash: await this.calculatePHash(buffer),
        dHash: await this.calculateDHash(buffer),
        wHash: await this.calculateWHash(buffer),
      };

      return {
        success: true,
        data: hashes,
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
   * Average Hash (aHash) - simplest and fastest
   */
  private async calculateAHash(buffer: Buffer): Promise<string> {
    // Resize to 8x8 grayscale
    const { data } = await Sharp(buffer)
      .resize(this.hashSize, this.hashSize)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Calculate average
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    const avg = sum / data.length;

    // Generate hash based on comparison to average
    let hash = 0n;
    for (let i = 0; i < data.length; i++) {
      if (data[i] > avg) {
        hash |= 1n << BigInt(i);
      }
    }

    return hash.toString(16).padStart(16, '0');
  }

  /**
   * Perceptual Hash (pHash) - uses DCT for better perceptual similarity
   */
  private async calculatePHash(buffer: Buffer): Promise<string> {
    // Resize to 32x32 and convert to grayscale
    const { data } = await Sharp(buffer)
      .resize(32, 32)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Perform DCT (simplified version)
    const dct = this.performDCT(data, 32, 32);

    // Extract low-frequency 8x8 block
    const lowFreq: number[] = [];
    for (let y = 0; y < this.hashSize; y++) {
      for (let x = 0; x < this.hashSize; x++) {
        lowFreq.push(dct[y * 32 + x]);
      }
    }

    // Calculate average of low-frequency block (excluding DC component)
    let sum = 0;
    for (let i = 1; i < lowFreq.length; i++) {
      sum += lowFreq[i];
    }
    const avg = sum / (lowFreq.length - 1);

    // Generate hash
    let hash = 0n;
    for (let i = 1; i < lowFreq.length; i++) {
      if (lowFreq[i] > avg) {
        hash |= 1n << BigInt(i - 1);
      }
    }

    return hash.toString(16).padStart(16, '0');
  }

  /**
   * Difference Hash (dHash) - compares adjacent pixels
   */
  private async calculateDHash(buffer: Buffer): Promise<string> {
    // Resize to 9x8 grayscale (one pixel wider for gradient calculation)
    const { data } = await Sharp(buffer)
      .resize(9, this.hashSize)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Compare adjacent pixels
    let hash = 0n;
    let bitIndex = 0;

    for (let y = 0; y < this.hashSize; y++) {
      for (let x = 0; x < this.hashSize; x++) {
        const left = data[y * 9 + x];
        const right = data[y * 9 + x + 1];

        if (left > right) {
          hash |= 1n << BigInt(bitIndex);
        }
        bitIndex++;
      }
    }

    return hash.toString(16).padStart(16, '0');
  }

  /**
   * Wavelet Hash (wHash) - uses Haar wavelet transform
   */
  private async calculateWHash(buffer: Buffer): Promise<string> {
    // Resize to larger size for better wavelet analysis
    const size = 32;
    const { data } = await Sharp(buffer)
      .resize(size, size)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Normalize to 0-1 range
    const normalized = new Float64Array(data.length);
    for (let i = 0; i < data.length; i++) {
      normalized[i] = data[i] / 255;
    }

    // Perform Haar wavelet transform
    const wavelet = this.haarWavelet2D(normalized, size);

    // Extract low-frequency coefficients
    const lowFreq: number[] = [];
    for (let y = 0; y < this.hashSize; y++) {
      for (let x = 0; x < this.hashSize; x++) {
        lowFreq.push(wavelet[y * size + x]);
      }
    }

    // Calculate median
    const sorted = [...lowFreq].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // Generate hash
    let hash = 0n;
    for (let i = 0; i < lowFreq.length; i++) {
      if (lowFreq[i] > median) {
        hash |= 1n << BigInt(i);
      }
    }

    return hash.toString(16).padStart(16, '0');
  }

  /**
   * Simplified 2D DCT (Discrete Cosine Transform)
   */
  private performDCT(data: Buffer, width: number, height: number): Float64Array {
    const size = width * height;
    const result = new Float64Array(size);
    const sqrtN = Math.sqrt(width * height);

    for (let u = 0; u < height; u++) {
      for (let v = 0; v < width; v++) {
        let sum = 0;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const pixel = data[y * width + x];
            const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
            const cv = v === 0 ? 1 / Math.sqrt(2) : 1;

            sum += cu * cv * pixel * Math.cos((2 * x + 1) * v * Math.PI / (2 * width)) *
                   Math.cos((2 * y + 1) * u * Math.PI / (2 * height));
          }
        }

        result[u * width + v] = sum / (2 * sqrtN);
      }
    }

    return result;
  }

  /**
   * 2D Haar Wavelet Transform
   */
  private haarWavelet2D(data: Float64Array, size: number): Float64Array {
    const result = new Float64Array(data);

    // Transform rows
    for (let y = 0; y < size; y++) {
      const row = result.slice(y * size, (y + 1) * size);
      const transformed = this.haarWavelet1D(row);
      for (let x = 0; x < size; x++) {
        result[y * size + x] = transformed[x];
      }
    }

    // Transform columns
    for (let x = 0; x < size; x++) {
      const col: number[] = [];
      for (let y = 0; y < size; y++) {
        col.push(result[y * size + x]);
      }
      const transformed = this.haarWavelet1D(col);
      for (let y = 0; y < size; y++) {
        result[y * size + x] = transformed[y];
      }
    }

    return result;
  }

  /**
   * 1D Haar Wavelet Transform
   */
  private haarWavelet1D(data: number[]): number[] {
    const result = [...data];
    const length = data.length;

    while (length > 1) {
      const half = length / 2;
      const temp = [...result];

      for (let i = 0; i < half; i++) {
        result[i] = (temp[2 * i] + temp[2 * i + 1]) / Math.sqrt(2);
        result[half + i] = (temp[2 * i] - temp[2 * i + 1]) / Math.sqrt(2);
      }
    }

    return result;
  }

  /**
   * Calculate Hamming distance between two hashes
   */
  static hammingDistance(hash1: string, hash2: string): number {
    const n1 = BigInt('0x' + hash1);
    const n2 = BigInt('0x' + hash2);
    const xor = n1 ^ n2;

    let distance = 0;
    let bits = xor;
    while (bits > 0n) {
      distance += Number(bits & 1n);
      bits >>= 1n;
    }

    return distance;
  }

  /**
   * Check if two images are similar based on hash distance
   */
  static areSimilar(hash1: string, hash2: string, threshold = 5): boolean {
    return HashCalculator.hammingDistance(hash1, hash2) <= threshold;
  }
}
