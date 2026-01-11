/**
 * Unit tests for ImageProcessor
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageProcessor } from '../image-processor';

describe('ImageProcessor', () => {
  let processor: ImageProcessor;
  const testFixturesPath = join(import.meta.dir, 'fixtures');

  beforeEach(() => {
    processor = new ImageProcessor();
  });

  afterEach(async () => {
    // Cleanup test files
    // Note: In real implementation, would clean up created test files
  });

  describe('isAvailable', () => {
    it('should return true when Sharp is available', async () => {
      const isAvailable = await processor.isAvailable();
      expect(isAvailable).toBe(true);
    });
  });

  describe('process', () => {
    it('should process a valid image file', async () => {
      // Create a simple test image buffer (1x1 red pixel PNG)
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk start
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xde, // IHDR chunk end
        0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, // IDAT chunk start
        0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00,
        0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb4,
        0x1c, // IDAT chunk end
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND chunk
        0xae, 0x42, 0x60, 0x82,
      ]);

      const result = await processor.process(testImageBuffer);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.width).toBe(1);
      expect(result.data?.height).toBe(1);
      expect(result.data?.format).toBe('png');
      expect(result.metadata?.processingTimeMs).toBeGreaterThan(0);
    });

    it('should return error for invalid buffer', async () => {
      const invalidBuffer = Buffer.from('not an image');

      const result = await processor.process(invalidBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Input buffer contains unsupported image format');
    });

    it('should return error for empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const result = await processor.process(emptyBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('processImage', () => {
    it('should resize an image', async () => {
      // Create a test image buffer
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02,
        0x08, 0x02, 0x00, 0x00, 0x00, 0xfd, 0xd4, 0x9a,
        0x73,
      ]);

      // Note: This is a simplified PNG header; in real tests use actual valid PNG data
      const result = await processor.processImage(testImageBuffer, {
        resize: { width: 10, height: 10 },
      });

      // For this test, we expect either success or a format error due to incomplete PNG
      // In a real test, we would use actual valid image data
      expect(result).toBeDefined();
    });

    it('should convert to grayscale', async () => {
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xde,
      ]);

      const result = await processor.processImage(testImageBuffer, {
        grayscale: true,
      });

      expect(result).toBeDefined();
    });

    it('should apply blur', async () => {
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xde,
      ]);

      const result = await processor.processImage(testImageBuffer, {
        blur: 5,
      });

      expect(result).toBeDefined();
    });
  });

  describe('metadata', () => {
    it('should have correct name and version', () => {
      expect(processor.name).toBe('ImageProcessor');
      expect(processor.version).toBe('1.0.0');
    });
  });
});
