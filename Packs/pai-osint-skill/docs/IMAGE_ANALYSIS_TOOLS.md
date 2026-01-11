# OSINT Image Analysis - Tool Requirements

## Overview
This document outlines the required tools for a local-first OSINT image analysis toolkit, organized by priority and implementation tier.

## Tier 1: Essential Tools (Must Have)

### Metadata Extraction
- **ExifTool** (v13.45+)
  - Purpose: Comprehensive EXIF/GPS/IPTC/XMP metadata extraction
  - Install: `brew install exiftool` (macOS), `apt install libimage-exiftool-perl` (Linux)
  - License: Open source (GPL/Artistic)
  - Interface: CLI with JSON output support

### Image Processing
- **Sharp** (Node.js/Bun library)
  - Purpose: High-performance image processing and basic metadata
  - Install: `bun add sharp`
  - License: Apache-2.0
  - Interface: Node.js/Bun library

### File Operations
- **ImageMagick** (optional fallback)
  - Purpose: Batch processing, format conversion
  - Install: `brew install imagemagick` (macOS)
  - License: Apache-2.0
  - Interface: CLI

## Tier 2: Enhanced Tools (Should Have)

### OCR Capabilities
- **Tesseract.js**
  - Purpose: Text extraction from images
  - Install: `bun add tesseract.js`
  - License: Apache-2.0
  - Interface: Node.js/Bun library

### Perceptual Hashing
- **Sharp** with custom implementations
  - Purpose: Duplicate detection (aHash, pHash, dHash)
  - Algorithms: Implement in TypeScript
  - License: Custom implementation

### Image Forensics
- **ELA (Error Level Analysis)** implementation
  - Purpose: Detect image manipulation
  - Implementation: Custom TypeScript using Sharp
  - Method: Save at different quality levels, compare differences

## Tier 3: Advanced Tools (Nice to Have)

### Steganography Detection
- **Binwalk**
  - Purpose: Detect embedded files/data
  - Install: `brew install binwalk` (macOS), `apt install binwalk` (Linux)
  - License: MIT
  - Interface: CLI

### Object Detection
- **TensorFlow.js** or **ONNX Runtime**
  - Purpose: Object detection and classification
  - Install: `bun add @tensorflow/tensorflowjs` or `bun add onnxruntime-node`
  - License: Apache-2.0
  - Interface: Node.js library

### Reverse Image Search
- **Self-hosted vector search** (future)
  - Milvus or FAISS for local similarity search
  - Requires: Python or Docker setup

## System Requirements

### Development Environment
- **Runtime:** Bun 1.0+
- **Language:** TypeScript 5.0+
- **Package Manager:** Bun
- **Testing:** Bun's built-in test runner

### External Dependencies
- ExifTool CLI (must be in PATH)
- Optional: ImageMagick CLI
- Optional: Binwalk CLI

## Tool Wrapper Architecture

### Core Components

```typescript
// Tool interfaces and implementations
src/tools/
├── types.ts              # Shared interfaces and types
├── metadata-extractor.ts # ExifTool wrapper
├── image-processor.ts    # Sharp-based operations
├── ocr-engine.ts         # Tesseract.js wrapper
├── hash-calculator.ts    # Perceptual hashing
├── forensic-analyzer.ts  # ELA and manipulation detection
└── index.ts              # Main exports

// Tests
tests/
├── metadata-extractor.test.ts
├── image-processor.test.ts
├── ocr-engine.test.ts
├── hash-calculator.test.ts
├── forensic-analyzer.test.ts
└── fixtures/             # Test images
```

### API Design

All tools follow a consistent interface:

```typescript
interface ToolWrapper {
  name: string;
  version: string;
  isAvailable(): Promise<boolean>;
  process(input: string | Buffer): Promise<Result>;
  batch?(inputs: string[]): Promise<Result[]>;
}
```

## Installation Commands

### macOS
```bash
# Essential tools
brew install exiftool

# Optional enhancements
brew install imagemagick binwalk

# Node/Bun dependencies
bun install
```

### Linux (Debian/Ubuntu)
```bash
# Essential tools
sudo apt-get install libimage-exiftool-perl

# Optional enhancements
sudo apt-get install imagemagick binwalk

# Node/Bun dependencies
bun install
```

## Testing Strategy

### Unit Test Coverage
- Tool availability checks
- Input validation
- Successful operation scenarios
- Error handling
- Edge cases (corrupt files, missing metadata)

### Test Fixtures
- Sample images with EXIF data
- Images without metadata
- Corrupted images
- Images with text (for OCR)
- Known manipulated images (for forensics)

### Mock Strategy
- Mock CLI tool executions for unit tests
- Use integration tests for actual tool validation
- Provide fixtures for consistent testing

## Success Criteria

1. All essential tools (Tier 1) are wrapped and tested
2. Unit test coverage > 80%
3. All tests pass consistently
4. Clear error messages for missing tools
5. Type-safe implementations with TypeScript
6. Comprehensive documentation for each tool

## Future Enhancements

- Integration with Python ML libraries via child processes
- Docker container for consistent tool availability
- Plugin system for adding new analyzers
- Web UI for batch analysis
- Report generation (HTML, PDF, JSON)
