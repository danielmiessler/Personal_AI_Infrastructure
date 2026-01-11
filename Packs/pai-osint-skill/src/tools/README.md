# OSINT Image Analysis Tools

Local-first tool wrappers for OSINT image analysis and forensic investigation.

## Installation

### System Dependencies

#### macOS
```bash
# Essential: ExifTool for metadata extraction
brew install exiftool

# Optional: Additional tools
brew install imagemagick  # Image processing
brew install binwalk      # Steganography detection
```

#### Linux (Debian/Ubuntu)
```bash
# Essential: ExifTool for metadata extraction
sudo apt-get install libimage-exiftool-perl

# Optional: Additional tools
sudo apt-get install imagemagick binwalk
```

#### Windows
```bash
# Using Chocolatey
choco install exiftool

# Or download from: https://exiftool.org/
```

### Node.js Dependencies

```bash
# Install all dependencies
bun install
```

## Verification

### Verify System Dependencies

```bash
# Check ExifTool
exiftool -ver
# Expected output: 13.45 or higher

# Check ImageMagick (if installed)
convert -version
```

### Verify Node.js Dependencies

```bash
# Run test suite
bun test

# Run individual test suites
bun test ./tests/metadata-extractor.test.ts
bun test ./tests/image-processor.test.ts
bun test ./tests/ocr-engine.test.ts
bun test ./tests/hash-calculator.test.ts
bun test ./tests/forensic-analyzer.test.ts
```

## Usage

```typescript
import {
  MetadataExtractor,
  ImageProcessor,
  OCREngine,
  HashCalculator,
  ForensicAnalyzer,
} from '@pai-osint/image-tools';

// Metadata extraction
const extractor = new MetadataExtractor();
const metadata = await extractor.process('/path/to/image.jpg');
console.log(metadata.data);

// Image processing
const processor = new ImageProcessor();
const info = await processor.process('/path/to/image.jpg');
console.log(info.data);

// OCR text extraction
const ocr = new OCREngine();
const text = await ocr.process('/path/to/image.jpg');
console.log(text.data?.text);

# Perceptual hashing for similarity detection
const hasher = new HashCalculator();
const hashes = await hasher.process('/path/to/image.jpg');
console.log(hashes.data);

# Forensic analysis
const forensic = new ForensicAnalyzer();
const analysis = await forensic.process('/path/to/image.jpg');
console.log(analysis.data?.manipulationProbability);
```

## Tool Requirements

### Tier 1: Essential (Must Have)
- **ExifTool** - Metadata extraction (EXIF, GPS, camera data)
- **Sharp** - High-performance image processing
- **Node.js/Bun** - Runtime environment

### Tier 2: Enhanced (Should Have)
- **Tesseract.js** - OCR text extraction
- **Image hashing implementations** - Duplicate detection

### Tier 3: Advanced (Nice to Have)
- **Binwalk** - Steganography detection
- **ImageMagick** - Advanced image operations
- **TensorFlow.js** - Object detection (future)

## API Documentation

### MetadataExtractor
Extracts comprehensive EXIF, GPS, and image metadata.

```typescript
const extractor = new MetadataExtractor({
  exifToolPath: 'exiftool',  // Path to ExifTool binary
  timeout: 30000,             // 30 second timeout
});

const result = await extractor.process('/path/to/image.jpg');
// Returns: ToolResult<ExifMetadata>
```

### ImageProcessor
Provides image processing capabilities.

```typescript
const processor = new ImageProcessor();

const result = await processor.processImage(buffer, {
  resize: { width: 800, height: 600 },
  grayscale: true,
  blur: 5,
  quality: 85,
});
```

### OCREngine
Extracts text from images using OCR.

```typescript
const ocr = new OCREngine({
  language: 'eng',  // Default: English
});

const result = await ocr.process('/path/to/image.jpg');
// Returns: ToolResult<OCRResult>

// Extract individual words
const words = await ocr.extractWords('/path/to/image.jpg');
```

### HashCalculator
Calculates perceptual hashes for similarity detection.

```typescript
const hasher = new HashCalculator();
const result = await hasher.process('/path/to/image.jpg');
// Returns: ToolResult<ImageHash>

// Compare hashes
const distance = HashCalculator.hammingDistance(hash1, hash2);
const isSimilar = HashCalculator.areSimilar(hash1, hash2, threshold = 5);
```

### ForensicAnalyzer
Performs forensic analysis to detect manipulation.

```typescript
const analyzer = new ForensicAnalyzer({
  elaQuality: 85,   // Quality for ELA comparison
  elaScale: 10,     // Scaling factor for ELA score
});

const result = await analyzer.process('/path/to/image.jpg');
// Returns: ToolResult<ForensicResult>

// Generate ELA visualization
const elaImage = await analyzer.generateELAVisualization('/path/to/image.jpg');
```

## Testing

### Run All Tests
```bash
bun test
```

### Run Specific Test Suite
```bash
bun test ./tests/metadata-extractor.test.ts
```

### Watch Mode
```bash
bun test --watch
```

### Test Coverage
All tool wrappers include comprehensive unit tests covering:
- Tool availability checks
- Input validation
- Success scenarios
- Error handling
- Edge cases

## Performance Considerations

- **ExifTool**: Spawns child processes, batch operations recommended
- **Sharp**: High performance, uses native code
- **Tesseract.js**: First run downloads language data (~5MB)
- **Hash calculations**: CPU-intensive for large images

## Security & Privacy

- All tools run locally by default
- No image data uploaded to external services
- Sensitive metadata never leaves your system
- Suitable for processing confidential or restricted images

## Legal & Ethical Considerations

⚠️ **Important**: These tools are for authorized OSINT investigations only.

- Ensure legal authorization before analyzing images
- Respect privacy and data protection laws (GDPR, CCPA)
- Follow platform Terms of Service
- Obtain proper consent for facial recognition
- Document chain of custody for investigations
- Practice responsible disclosure

## Troubleshooting

### ExifTool Not Found
```bash
# macOS
brew install exiftool

# Verify installation
exiftool -ver
```

### Sharp Installation Issues
```bash
# Clear bun cache and reinstall
rm -rf node_modules bun.lockb
bun install
```

### Tesseract.js Slow First Run
First run downloads language data. Subsequent runs are faster.

### Memory Issues with Large Images
Process images in batches or resize before analysis.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT License - See [LICENSE](../../LICENSE) for details.
