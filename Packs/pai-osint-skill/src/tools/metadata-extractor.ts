/**
 * Metadata extraction tool using ExifTool
 */

import { spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { ToolWrapper, ToolResult, ExifMetadata, ToolInput } from './types.js';

export interface MetadataExtractorOptions {
  exifToolPath?: string;
  timeout?: number;
}

export class MetadataExtractor implements ToolWrapper<ExifMetadata> {
  readonly name = 'MetadataExtractor';
  readonly version = '1.0.0';

  private exifToolPath: string;
  private timeout: number;

  constructor(options: MetadataExtractorOptions = {}) {
    this.exifToolPath = options.exifToolPath || 'exiftool';
    this.timeout = options.timeout || 30000; // 30 seconds default
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.executeCommand('-ver');
      return true;
    } catch {
      return false;
    }
  }

  async process(input: ToolInput): Promise<ToolResult<ExifMetadata>> {
    const startTime = Date.now();

    try {
      if (typeof input !== 'string') {
        throw new Error('File path required for metadata extraction');
      }

      const exifData = await this.extractMetadata(input);
      const metadata = this.parseExifData(exifData);

      return {
        success: true,
        data: metadata,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          toolVersion: await this.getVersion(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          processingTimeMs: Date.now() - startTime,
          toolVersion: 'unknown',
        },
      };
    }
  }

  private async executeCommand(...args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const process = spawn(this.exifToolPath, args, {
        timeout: this.timeout,
      });

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`ExifTool failed (code ${code}): ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to execute ExifTool: ${error.message}`));
      });
    });
  }

  private async extractMetadata(filePath: string): Promise<string> {
    // Get EXIF data as JSON
    const args = [
      '-json',
      '-coordFormat', '%.6f', // GPS coordinates with 6 decimal places
      '-api', 'LargeFileSupport=1',
      filePath,
    ];

    return this.executeCommand(...args);
  }

  private parseExifData(jsonData: string): ExifMetadata {
    try {
      const parsed = JSON.parse(jsonData);
      const data = Array.isArray(parsed) ? parsed[0] : parsed;

      return {
        fileName: data.FileName as string | undefined,
        fileSize: data.FileSize ? parseInt(data.FileSize as string, 10) : undefined,
        fileType: data.FileType as string | undefined,
        mimeType: data.MIMEType as string | undefined,

        make: data.Make as string | undefined,
        model: data.Model as string | undefined,
        software: data.Software as string | undefined,
        dateTimeOriginal: data.DateTimeOriginal as string | undefined,
        dateTimeModified: data.FileModifyDate as string | undefined,

        imageWidth: data.ImageWidth ? parseInt(data.ImageWidth as string, 10) : undefined,
        imageHeight: data.ImageHeight ? parseInt(data.ImageHeight as string, 10) : undefined,
        orientation: data.Orientation ? parseInt(data.Orientation as string, 10) : undefined,
        colorSpace: data.ColorSpace as string | undefined,

        gpsLatitude: this.parseGPS(data.GPSLatitude, data.GPSLatitudeRef),
        gpsLongitude: this.parseGPS(data.GPSLongitude, data.GPSLongitudeRef),
        gpsAltitude: data.GPSAltitude ? parseFloat(data.GPSAltitude as string) : undefined,
        gpsDateTime: data.GPSDateTime as string | undefined,

        iso: data.ISO ? parseInt(data.ISO as string, 10) : undefined,
        aperture: data.Aperture ? parseFloat(data.Aperture as string) : undefined,
        shutterSpeed: data.ShutterSpeed as string | undefined,
        focalLength: data.FocalLength ? parseFloat(data.FocalLength as string) : undefined,
        flash: data.Flash as string | undefined,

        rawExif: data as Record<string, unknown>,
      };
    } catch (error) {
      throw new Error(`Failed to parse EXIF data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private parseGPS(coordinate: unknown, ref: unknown): number | undefined {
    if (!coordinate) return undefined;

    try {
      const coords = Array.isArray(coordinate) ? coordinate : String(coordinate).split(', ');
      let decimal = 0;

      if (Array.isArray(coords) && coords.length >= 3) {
        const [degrees, minutes, seconds] = coords.map((c) => parseFloat(String(c)));
        decimal = degrees + minutes / 60 + seconds / 3600;
      } else {
        decimal = parseFloat(String(coordinate));
      }

      // Apply hemisphere reference
      const hemisphere = String(ref || '').toUpperCase();
      if (hemisphere === 'S' || hemisphere === 'W') {
        decimal = -decimal;
      }

      return decimal;
    } catch {
      return undefined;
    }
  }

  private async getVersion(): Promise<string> {
    try {
      const output = await this.executeCommand('-ver');
      return output;
    } catch {
      return 'unknown';
    }
  }
}
