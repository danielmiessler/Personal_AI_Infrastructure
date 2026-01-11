#!/usr/bin/env bun
/**
 * ImageAnalyzer.ts - Local image analysis toolkit for OSINT
 *
 * Wraps local tools (exiftool, ImageMagick, etc.) for comprehensive image analysis.
 *
 * Usage:
 *   bun run ImageAnalyzer.ts <image_path> [--json] [--full]
 *   bun run ImageAnalyzer.ts --check-deps
 *
 * Examples:
 *   bun run ImageAnalyzer.ts ./photo.jpg
 *   bun run ImageAnalyzer.ts ./photo.jpg --json
 *   bun run ImageAnalyzer.ts ./photo.jpg --full --json
 */

import { $ } from "bun";
import { existsSync } from "fs";
import { basename, extname } from "path";

// ============================================================================
// Types
// ============================================================================

interface ImageValidation {
  exists: boolean;
  mimeType: string;
  fileType: string;
  dimensions: { width: number; height: number } | null;
  fileSize: number;
  fileSizeHuman: string;
  isCorrupted: boolean;
  hashes: {
    md5: string;
    sha256: string;
  };
}

interface ExifData {
  camera: {
    make: string | null;
    model: string | null;
    software: string | null;
  };
  lens: {
    model: string | null;
    focalLength: string | null;
  };
  settings: {
    iso: string | null;
    aperture: string | null;
    shutterSpeed: string | null;
    flash: string | null;
  };
  gps: {
    latitude: number | null;
    longitude: number | null;
    altitude: string | null;
    timestamp: string | null;
  };
  datetime: {
    original: string | null;
    digitized: string | null;
    modified: string | null;
    timezone: string | null;
  };
  copyright: {
    artist: string | null;
    copyright: string | null;
    credit: string | null;
  };
  raw: Record<string, string>;
}

interface ColorAnalysis {
  colorSpace: string | null;
  depth: string | null;
  type: string | null;
  dominantColors: string[];
}

interface ForensicAnalysis {
  hasBeenEdited: boolean;
  editIndicators: string[];
  softwareHistory: string[];
  metadataConsistency: {
    isConsistent: boolean;
    issues: string[];
  };
}

interface ImageAnalysisResult {
  file: string;
  timestamp: string;
  validation: ImageValidation;
  exif: ExifData;
  colors: ColorAnalysis;
  forensics: ForensicAnalysis;
  warnings: string[];
  errors: string[];
}

// ============================================================================
// Dependency Checker
// ============================================================================

async function checkDependencies(): Promise<{
  available: string[];
  missing: string[];
}> {
  const deps = [
    { name: "exiftool", check: "exiftool -ver" },
    { name: "identify", check: "identify -version" },
    { name: "convert", check: "convert -version" },
    { name: "file", check: "file --version" },
    { name: "md5", check: "md5 -s test" },
    { name: "shasum", check: "shasum --version" },
  ];

  const available: string[] = [];
  const missing: string[] = [];

  for (const dep of deps) {
    try {
      await $`${dep.check.split(" ")[0]} ${dep.check.split(" ").slice(1)}`.quiet();
      available.push(dep.name);
    } catch {
      missing.push(dep.name);
    }
  }

  return { available, missing };
}

// ============================================================================
// Validation Tools
// ============================================================================

async function validateImage(imagePath: string): Promise<ImageValidation> {
  const result: ImageValidation = {
    exists: false,
    mimeType: "",
    fileType: "",
    dimensions: null,
    fileSize: 0,
    fileSizeHuman: "",
    isCorrupted: false,
    hashes: { md5: "", sha256: "" },
  };

  // Check existence
  result.exists = existsSync(imagePath);
  if (!result.exists) {
    return result;
  }

  // Get file size
  const stat = Bun.file(imagePath);
  result.fileSize = stat.size;
  result.fileSizeHuman = formatBytes(stat.size);

  // Get MIME type
  try {
    const mimeOutput = await $`file --mime-type -b ${imagePath}`.text();
    result.mimeType = mimeOutput.trim();
  } catch (e) {
    result.mimeType = "unknown";
  }

  // Get file type description
  try {
    const typeOutput = await $`file -b ${imagePath}`.text();
    result.fileType = typeOutput.trim();
  } catch (e) {
    result.fileType = "unknown";
  }

  // Get dimensions using ImageMagick identify
  try {
    const identifyOutput = await $`identify -format "%w %h" ${imagePath}`.text();
    const [width, height] = identifyOutput.trim().split(" ").map(Number);
    if (width && height) {
      result.dimensions = { width, height };
    }
  } catch (e) {
    // Try with exiftool as fallback
    try {
      const exifOutput =
        await $`exiftool -ImageWidth -ImageHeight -s -s -s ${imagePath}`.text();
      const lines = exifOutput.trim().split("\n");
      if (lines.length >= 2) {
        result.dimensions = {
          width: parseInt(lines[0]) || 0,
          height: parseInt(lines[1]) || 0,
        };
      }
    } catch {
      // Dimensions unavailable
    }
  }

  // Check for corruption
  try {
    await $`identify -regard-warnings ${imagePath}`.quiet();
    result.isCorrupted = false;
  } catch {
    result.isCorrupted = true;
  }

  // Calculate hashes
  try {
    const md5Output = await $`md5 -q ${imagePath}`.text();
    result.hashes.md5 = md5Output.trim();
  } catch {
    try {
      // Linux fallback
      const md5Output = await $`md5sum ${imagePath}`.text();
      result.hashes.md5 = md5Output.split(" ")[0];
    } catch {
      result.hashes.md5 = "unavailable";
    }
  }

  try {
    const shaOutput = await $`shasum -a 256 ${imagePath}`.text();
    result.hashes.sha256 = shaOutput.split(" ")[0];
  } catch {
    result.hashes.sha256 = "unavailable";
  }

  return result;
}

// ============================================================================
// EXIF Extraction
// ============================================================================

async function extractExif(imagePath: string): Promise<ExifData> {
  const exif: ExifData = {
    camera: { make: null, model: null, software: null },
    lens: { model: null, focalLength: null },
    settings: { iso: null, aperture: null, shutterSpeed: null, flash: null },
    gps: { latitude: null, longitude: null, altitude: null, timestamp: null },
    datetime: { original: null, digitized: null, modified: null, timezone: null },
    copyright: { artist: null, copyright: null, credit: null },
    raw: {},
  };

  try {
    // Get JSON output from exiftool
    const output = await $`exiftool -json -a -G1 ${imagePath}`.text();
    const data = JSON.parse(output)[0];

    // Camera info
    exif.camera.make = data["EXIF:Make"] || data["Make"] || null;
    exif.camera.model = data["EXIF:Model"] || data["Model"] || null;
    exif.camera.software = data["EXIF:Software"] || data["Software"] || null;

    // Lens info
    exif.lens.model = data["EXIF:LensModel"] || data["LensModel"] || null;
    exif.lens.focalLength =
      data["EXIF:FocalLength"] || data["FocalLength"] || null;

    // Settings
    exif.settings.iso = data["EXIF:ISO"] || data["ISO"] || null;
    exif.settings.aperture =
      data["EXIF:FNumber"] || data["FNumber"] || data["Aperture"] || null;
    exif.settings.shutterSpeed =
      data["EXIF:ExposureTime"] ||
      data["ExposureTime"] ||
      data["ShutterSpeed"] ||
      null;
    exif.settings.flash = data["EXIF:Flash"] || data["Flash"] || null;

    // GPS
    const gpsLat =
      data["EXIF:GPSLatitude"] ||
      data["GPS:GPSLatitude"] ||
      data["GPSLatitude"];
    const gpsLon =
      data["EXIF:GPSLongitude"] ||
      data["GPS:GPSLongitude"] ||
      data["GPSLongitude"];
    const gpsLatRef =
      data["EXIF:GPSLatitudeRef"] ||
      data["GPS:GPSLatitudeRef"] ||
      data["GPSLatitudeRef"];
    const gpsLonRef =
      data["EXIF:GPSLongitudeRef"] ||
      data["GPS:GPSLongitudeRef"] ||
      data["GPSLongitudeRef"];

    if (gpsLat && gpsLon) {
      exif.gps.latitude = parseGPSCoordinate(gpsLat, gpsLatRef);
      exif.gps.longitude = parseGPSCoordinate(gpsLon, gpsLonRef);
    }

    exif.gps.altitude =
      data["EXIF:GPSAltitude"] ||
      data["GPS:GPSAltitude"] ||
      data["GPSAltitude"] ||
      null;
    exif.gps.timestamp =
      data["EXIF:GPSTimeStamp"] ||
      data["GPS:GPSTimeStamp"] ||
      data["GPSDateTime"] ||
      null;

    // Datetime
    exif.datetime.original =
      data["EXIF:DateTimeOriginal"] || data["DateTimeOriginal"] || null;
    exif.datetime.digitized =
      data["EXIF:CreateDate"] || data["CreateDate"] || null;
    exif.datetime.modified =
      data["EXIF:ModifyDate"] || data["ModifyDate"] || data["FileModifyDate"] || null;
    exif.datetime.timezone =
      data["EXIF:OffsetTime"] || data["OffsetTime"] || null;

    // Copyright
    exif.copyright.artist = data["EXIF:Artist"] || data["Artist"] || null;
    exif.copyright.copyright =
      data["EXIF:Copyright"] || data["Copyright"] || null;
    exif.copyright.credit =
      data["IPTC:Credit"] || data["XMP:Credit"] || data["Credit"] || null;

    // Store raw data for full analysis
    exif.raw = data;
  } catch (e) {
    // exiftool not available or failed
  }

  return exif;
}

function parseGPSCoordinate(
  coord: string | number,
  ref: string | undefined
): number | null {
  if (typeof coord === "number") {
    return ref === "S" || ref === "W" ? -coord : coord;
  }

  // Parse DMS format: "37 deg 46' 29.88" N"
  const dmsMatch = coord.match(
    /(\d+)\s*deg\s*(\d+)'\s*([\d.]+)"\s*([NSEW])?/i
  );
  if (dmsMatch) {
    const deg = parseFloat(dmsMatch[1]);
    const min = parseFloat(dmsMatch[2]);
    const sec = parseFloat(dmsMatch[3]);
    const direction = dmsMatch[4] || ref;
    let decimal = deg + min / 60 + sec / 3600;
    if (direction === "S" || direction === "W") {
      decimal = -decimal;
    }
    return decimal;
  }

  // Try parsing as decimal
  const decimal = parseFloat(coord);
  if (!isNaN(decimal)) {
    return ref === "S" || ref === "W" ? -decimal : decimal;
  }

  return null;
}

// ============================================================================
// Color Analysis
// ============================================================================

async function analyzeColors(imagePath: string): Promise<ColorAnalysis> {
  const colors: ColorAnalysis = {
    colorSpace: null,
    depth: null,
    type: null,
    dominantColors: [],
  };

  try {
    // Get color info from ImageMagick
    const output =
      await $`identify -verbose ${imagePath} | grep -E "(Colorspace|Depth|Type):"`
        .text();
    const lines = output.trim().split("\n");

    for (const line of lines) {
      if (line.includes("Colorspace:")) {
        colors.colorSpace = line.split(":")[1]?.trim() || null;
      } else if (line.includes("Depth:")) {
        colors.depth = line.split(":")[1]?.trim() || null;
      } else if (line.includes("Type:")) {
        colors.type = line.split(":")[1]?.trim() || null;
      }
    }

    // Get dominant colors (top 5)
    try {
      const colorOutput =
        await $`convert ${imagePath} -colors 5 -format "%c" histogram:info:-`
          .text();
      const colorLines = colorOutput.trim().split("\n");
      colors.dominantColors = colorLines
        .slice(0, 5)
        .map((line) => {
          const hexMatch = line.match(/#[0-9A-Fa-f]{6}/);
          return hexMatch ? hexMatch[0] : line.trim().substring(0, 30);
        })
        .filter(Boolean);
    } catch {
      // Dominant color extraction failed
    }
  } catch {
    // ImageMagick not available
  }

  return colors;
}

// ============================================================================
// Forensic Analysis
// ============================================================================

async function analyzeForensics(
  imagePath: string,
  exif: ExifData
): Promise<ForensicAnalysis> {
  const forensics: ForensicAnalysis = {
    hasBeenEdited: false,
    editIndicators: [],
    softwareHistory: [],
    metadataConsistency: {
      isConsistent: true,
      issues: [],
    },
  };

  // Check for editing software indicators
  const editingSoftware = [
    "photoshop",
    "gimp",
    "lightroom",
    "affinity",
    "pixelmator",
    "snapseed",
    "vsco",
    "instagram",
    "facetune",
    "meitu",
  ];

  if (exif.camera.software) {
    const softwareLower = exif.camera.software.toLowerCase();
    forensics.softwareHistory.push(exif.camera.software);

    for (const editor of editingSoftware) {
      if (softwareLower.includes(editor)) {
        forensics.hasBeenEdited = true;
        forensics.editIndicators.push(`Edited with ${exif.camera.software}`);
      }
    }
  }

  // Check EXIF history tags
  if (exif.raw) {
    const historyKeys = Object.keys(exif.raw).filter(
      (k) =>
        k.toLowerCase().includes("history") ||
        k.toLowerCase().includes("creatortool") ||
        k.toLowerCase().includes("derivedFrom")
    );

    for (const key of historyKeys) {
      const value = exif.raw[key];
      if (value) {
        forensics.softwareHistory.push(`${key}: ${value}`);
        forensics.hasBeenEdited = true;
        forensics.editIndicators.push(`Processing history found: ${key}`);
      }
    }
  }

  // Check metadata consistency
  if (exif.datetime.original && exif.datetime.modified) {
    const original = new Date(
      exif.datetime.original.replace(/:/g, "-").replace(" ", "T")
    );
    const modified = new Date(
      exif.datetime.modified.replace(/:/g, "-").replace(" ", "T")
    );

    if (modified > original) {
      forensics.metadataConsistency.issues.push(
        `File modified after original capture (${exif.datetime.original} -> ${exif.datetime.modified})`
      );
      forensics.hasBeenEdited = true;
    }
  }

  // Check for stripped metadata (suspicious)
  const hasCamera = exif.camera.make || exif.camera.model;
  const hasDatetime = exif.datetime.original;
  const ext = extname(imagePath).toLowerCase();

  if ([".jpg", ".jpeg"].includes(ext) && !hasCamera && !hasDatetime) {
    forensics.metadataConsistency.issues.push(
      "JPEG with stripped EXIF metadata (common in screenshots, social media, or deliberate removal)"
    );
  }

  forensics.metadataConsistency.isConsistent =
    forensics.metadataConsistency.issues.length === 0;

  return forensics;
}

// ============================================================================
// Helpers
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatReport(result: ImageAnalysisResult): string {
  const lines: string[] = [];

  lines.push("📋 IMAGE ANALYSIS REPORT");
  lines.push("━".repeat(50));
  lines.push("");
  lines.push(`🎯 FILE: ${basename(result.file)}`);
  lines.push(`📅 ANALYZED: ${result.timestamp}`);
  lines.push("");

  // Validation
  lines.push("📊 FILE INFO:");
  lines.push(`   • Type: ${result.validation.mimeType}`);
  lines.push(`   • Size: ${result.validation.fileSizeHuman}`);
  if (result.validation.dimensions) {
    lines.push(
      `   • Dimensions: ${result.validation.dimensions.width} x ${result.validation.dimensions.height}`
    );
  }
  lines.push(`   • Corrupted: ${result.validation.isCorrupted ? "YES ⚠️" : "No"}`);
  lines.push("");

  // Hashes
  lines.push("🔑 HASHES:");
  lines.push(`   • MD5: ${result.validation.hashes.md5}`);
  lines.push(`   • SHA256: ${result.validation.hashes.sha256.substring(0, 32)}...`);
  lines.push("");

  // Camera
  if (result.exif.camera.make || result.exif.camera.model) {
    lines.push("📷 CAMERA:");
    if (result.exif.camera.make) lines.push(`   • Make: ${result.exif.camera.make}`);
    if (result.exif.camera.model) lines.push(`   • Model: ${result.exif.camera.model}`);
    if (result.exif.camera.software)
      lines.push(`   • Software: ${result.exif.camera.software}`);
    if (result.exif.lens.model) lines.push(`   • Lens: ${result.exif.lens.model}`);
    lines.push("");
  }

  // Settings
  if (result.exif.settings.iso || result.exif.settings.aperture) {
    lines.push("⚙️ SETTINGS:");
    if (result.exif.settings.iso) lines.push(`   • ISO: ${result.exif.settings.iso}`);
    if (result.exif.settings.aperture)
      lines.push(`   • Aperture: ${result.exif.settings.aperture}`);
    if (result.exif.settings.shutterSpeed)
      lines.push(`   • Shutter: ${result.exif.settings.shutterSpeed}`);
    if (result.exif.settings.flash) lines.push(`   • Flash: ${result.exif.settings.flash}`);
    lines.push("");
  }

  // GPS
  if (result.exif.gps.latitude !== null && result.exif.gps.longitude !== null) {
    lines.push("📍 LOCATION:");
    lines.push(
      `   • GPS: ${result.exif.gps.latitude.toFixed(6)}, ${result.exif.gps.longitude.toFixed(6)}`
    );
    lines.push(
      `   • Maps: https://www.google.com/maps?q=${result.exif.gps.latitude},${result.exif.gps.longitude}`
    );
    if (result.exif.gps.altitude) lines.push(`   • Altitude: ${result.exif.gps.altitude}`);
    lines.push("");
  }

  // Datetime
  if (result.exif.datetime.original) {
    lines.push("⏰ TEMPORAL:");
    lines.push(`   • Captured: ${result.exif.datetime.original}`);
    if (result.exif.datetime.modified)
      lines.push(`   • Modified: ${result.exif.datetime.modified}`);
    if (result.exif.datetime.timezone)
      lines.push(`   • Timezone: ${result.exif.datetime.timezone}`);
    lines.push("");
  }

  // Copyright
  if (result.exif.copyright.artist || result.exif.copyright.copyright) {
    lines.push("©️ COPYRIGHT:");
    if (result.exif.copyright.artist)
      lines.push(`   • Artist: ${result.exif.copyright.artist}`);
    if (result.exif.copyright.copyright)
      lines.push(`   • Copyright: ${result.exif.copyright.copyright}`);
    lines.push("");
  }

  // Colors
  if (result.colors.colorSpace) {
    lines.push("🎨 COLOR INFO:");
    lines.push(`   • Color Space: ${result.colors.colorSpace}`);
    if (result.colors.depth) lines.push(`   • Depth: ${result.colors.depth}`);
    if (result.colors.dominantColors.length > 0) {
      lines.push(`   • Dominant: ${result.colors.dominantColors.slice(0, 3).join(", ")}`);
    }
    lines.push("");
  }

  // Forensics
  lines.push("🔬 FORENSICS:");
  lines.push(`   • Edited: ${result.forensics.hasBeenEdited ? "YES" : "No evidence"}`);
  if (result.forensics.editIndicators.length > 0) {
    for (const indicator of result.forensics.editIndicators) {
      lines.push(`   • ${indicator}`);
    }
  }
  if (!result.forensics.metadataConsistency.isConsistent) {
    lines.push("   • Consistency Issues:");
    for (const issue of result.forensics.metadataConsistency.issues) {
      lines.push(`     ⚠️ ${issue}`);
    }
  }
  lines.push("");

  // Warnings
  if (result.warnings.length > 0) {
    lines.push("⚠️ WARNINGS:");
    for (const warning of result.warnings) {
      lines.push(`   • ${warning}`);
    }
    lines.push("");
  }

  lines.push("━".repeat(50));

  return lines.join("\n");
}

// ============================================================================
// Main Analysis Function
// ============================================================================

async function analyzeImage(
  imagePath: string,
  options: { full?: boolean } = {}
): Promise<ImageAnalysisResult> {
  const result: ImageAnalysisResult = {
    file: imagePath,
    timestamp: new Date().toISOString(),
    validation: await validateImage(imagePath),
    exif: {
      camera: { make: null, model: null, software: null },
      lens: { model: null, focalLength: null },
      settings: { iso: null, aperture: null, shutterSpeed: null, flash: null },
      gps: { latitude: null, longitude: null, altitude: null, timestamp: null },
      datetime: { original: null, digitized: null, modified: null, timezone: null },
      copyright: { artist: null, copyright: null, credit: null },
      raw: {},
    },
    colors: { colorSpace: null, depth: null, type: null, dominantColors: [] },
    forensics: {
      hasBeenEdited: false,
      editIndicators: [],
      softwareHistory: [],
      metadataConsistency: { isConsistent: true, issues: [] },
    },
    warnings: [],
    errors: [],
  };

  if (!result.validation.exists) {
    result.errors.push(`File not found: ${imagePath}`);
    return result;
  }

  if (result.validation.isCorrupted) {
    result.warnings.push("Image file may be corrupted");
  }

  // Extract EXIF
  result.exif = await extractExif(imagePath);

  // Analyze colors
  result.colors = await analyzeColors(imagePath);

  // Forensic analysis
  result.forensics = await analyzeForensics(imagePath, result.exif);

  // Add privacy warnings
  if (result.exif.gps.latitude !== null) {
    result.warnings.push("GPS location data present - privacy concern");
  }

  return result;
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ImageAnalyzer.ts - Local image analysis toolkit for OSINT

Usage:
  bun run ImageAnalyzer.ts <image_path> [options]
  bun run ImageAnalyzer.ts --check-deps

Options:
  --json       Output as JSON
  --full       Include raw EXIF data in output
  --check-deps Check available local tools
  --help, -h   Show this help

Examples:
  bun run ImageAnalyzer.ts ./photo.jpg
  bun run ImageAnalyzer.ts ./photo.jpg --json
  bun run ImageAnalyzer.ts ./photo.jpg --full --json
`);
    process.exit(0);
  }

  if (args.includes("--check-deps")) {
    console.log("Checking local tool dependencies...\n");
    const deps = await checkDependencies();

    console.log("✅ Available:");
    for (const dep of deps.available) {
      console.log(`   • ${dep}`);
    }

    if (deps.missing.length > 0) {
      console.log("\n❌ Missing:");
      for (const dep of deps.missing) {
        console.log(`   • ${dep}`);
      }
      console.log("\nInstall missing tools:");
      console.log("  brew install exiftool imagemagick");
    } else {
      console.log("\n✅ All dependencies available!");
    }
    process.exit(0);
  }

  const imagePath = args.find((a) => !a.startsWith("--"));
  const jsonOutput = args.includes("--json");
  const fullOutput = args.includes("--full");

  if (!imagePath) {
    console.error("Error: No image path provided");
    console.error("Usage: bun run ImageAnalyzer.ts <image_path>");
    process.exit(1);
  }

  const result = await analyzeImage(imagePath, { full: fullOutput });

  if (jsonOutput) {
    // Remove raw data if not full output
    if (!fullOutput) {
      result.exif.raw = {};
    }
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatReport(result));
  }
}

// Export for use as module
export { analyzeImage, checkDependencies, validateImage, extractExif };
export type { ImageAnalysisResult, ExifData, ImageValidation };

// Run CLI if executed directly
main().catch(console.error);
