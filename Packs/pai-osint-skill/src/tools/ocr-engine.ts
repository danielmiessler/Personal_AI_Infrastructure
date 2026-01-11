/**
 * OCR (Optical Character Recognition) engine using Tesseract.js
 */

import { createWorker } from 'tesseract.js';
import { readFile } from 'node:fs/promises';
import { ToolWrapper, ToolResult, OCRResult, ToolInput } from './types.js';

export interface OCREngineOptions {
  language?: string;
  logger?: (message: unknown) => void;
}

export class OCREngine implements ToolWrapper<OCRResult> {
  readonly name = 'OCREngine';
  readonly version = '1.0.0';

  private language: string;
  private logger?: (message: unknown) => void;
  private worker: Awaited<ReturnType<typeof createWorker>> | null = null;

  constructor(options: OCREngineOptions = {}) {
    this.language = options.language || 'eng';
    this.logger = options.logger || (() => {}); // Provide no-op logger if not specified
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Tesseract.js is pure JavaScript, so it should always be available
      // We'll verify by checking if we can create a worker
      const worker = await createWorker(this.language, 1, {
        logger: this.logger ? (m) => this.logger!(m) : undefined,
      });
      await worker.terminate();
      return true;
    } catch {
      return false;
    }
  }

  async process(input: ToolInput): Promise<ToolResult<OCRResult>> {
    const startTime = Date.now();

    try {
      const buffer = typeof input === 'string' ? await readFile(input) : input;

      // Create worker if not already created
      if (!this.worker) {
        this.worker = await createWorker(this.language, 1, {
          logger: this.logger,
        });
      }

      // Perform recognition
      const { data } = await this.worker.recognize(buffer);

      const result: OCRResult = {
        text: data.text,
        confidence: data.confidence,
        lines: data.lines.map((line) => ({
          text: line.text,
          confidence: line.confidence,
          boundingBox: {
            x0: line.bbox.x0,
            y0: line.bbox.y0,
            x1: line.bbox.x1,
            y1: line.bbox.y1,
          },
        })),
      };

      return {
        success: true,
        data: result,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          toolVersion: '1.0.0', // Tesseract.js version would go here
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          processingTimeMs: Date.now() - startTime,
          toolVersion: '1.0.0',
        },
      };
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Extract text with bounding boxes for each word
   */
  async extractWords(input: ToolInput): Promise<ToolResult<Array<{
    text: string;
    confidence: number;
    boundingBox: { x0: number; y0: number; x1: number; y1: number };
  }>>> {
    const startTime = Date.now();

    try {
      const buffer = typeof input === 'string' ? await readFile(input) : input;

      if (!this.worker) {
        this.worker = await createWorker(this.language, 1, {
          logger: this.logger,
        });
      }

      const { data } = await this.worker.recognize(buffer);

      const words = data.words.map((word) => ({
        text: word.text,
        confidence: word.confidence,
        boundingBox: {
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1,
        },
      }));

      return {
        success: true,
        data: words,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          toolVersion: '1.0.0',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          processingTimeMs: Date.now() - startTime,
          toolVersion: '1.0.0',
        },
      };
    }
  }
}
