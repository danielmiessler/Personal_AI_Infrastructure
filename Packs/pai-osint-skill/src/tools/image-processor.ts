/**
 * Image processing tool using Sharp
 */

import Sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { ToolWrapper, ToolResult, ImageInfo, ToolInput } from './types.js';

export class ImageProcessor implements ToolWrapper<ImageInfo> {
  readonly name = 'ImageProcessor';
  readonly version = '1.0.0';

  async isAvailable(): Promise<boolean> {
    try {
      // Sharp is available if we can access its version property
      const version = Sharp.versions;
      return !!version;
    } catch {
      return false;
    }
  }

  async process(input: ToolInput): Promise<ToolResult<ImageInfo>> {
    const startTime = Date.now();

    try {
      const buffer = typeof input === 'string' ? await readFile(input) : input;
      const metadata = await Sharp(buffer).metadata();

      const info: ImageInfo = {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        channels: metadata.channels || 0,
        premultiplied: metadata.premultiplied || false,
        size: buffer.length,
      };

      return {
        success: true,
        data: info,
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

  async processImage(input: ToolInput, operations: {
    resize?: { width: number; height: number };
    grayscale?: boolean;
    blur?: number;
    sharpen?: boolean;
    quality?: number;
  } = {}): Promise<ToolResult<Buffer>> {
    const startTime = Date.now();

    try {
      const buffer = typeof input === 'string' ? await readFile(input) : input;
      let image = Sharp(buffer);

      if (operations.resize) {
        image = image.resize(operations.resize.width, operations.resize.height);
      }

      if (operations.grayscale) {
        image = image.grayscale();
      }

      if (operations.blur) {
        image = image.blur(operations.blur);
      }

      if (operations.sharpen) {
        image = image.sharpen();
      }

      if (operations.quality !== undefined) {
        switch (this.getImageFormat(buffer)) {
          case 'jpeg':
            image = image.jpeg({ quality: operations.quality });
            break;
          case 'png':
            image = image.png({ quality: operations.quality });
            break;
          case 'webp':
            image = image.webp({ quality: operations.quality });
            break;
        }
      }

      const processedBuffer = await image.toBuffer();

      return {
        success: true,
        data: processedBuffer,
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

  private getImageFormat(buffer: Buffer): string {
    const metadata = Sharp(buffer).metadata();
    return metadata.then((m) => m.format || 'jpeg').catch(() => 'jpeg');
  }
}
