# GenerateSBOM Workflow

**Purpose:** Generate a Software Bill of Materials (SBOM) documenting all dependencies, their versions, and licenses for compliance and supply chain security.

**Triggers:** generate SBOM, create bill of materials, software inventory, list dependencies, compliance report, supply chain audit, export dependencies

---

## Steps

1. Identify the target directory (defaults to current working directory if not specified)
2. Determine desired output format (CycloneDX or SPDX)
3. Decide whether to include development dependencies
4. Run the SBOM generator:
```bash
bun run Tools/SbomGenerator.ts [path] --format=cyclonedx --output=sbom.json
```
5. Present summary of components found
6. Provide file for compliance submission or further analysis

---

## Examples

**Example 1: Basic SBOM generation**
```
User: "Generate an SBOM for this project"

Process:
1. Parse: path = ., format = cyclonedx (default)
2. Run: bun run Tools/SbomGenerator.ts . --format=cyclonedx --output=sbom.json
3. Return: SBOM file path with component count summary
```

**Example 2: SPDX format for compliance**
```
User: "I need an SPDX SBOM for our compliance audit"

Process:
1. Parse: path = ., format = spdx
2. Run: bun run Tools/SbomGenerator.ts . --format=spdx --output=sbom.spdx.json
3. Return: SPDX-formatted SBOM ready for compliance submission
```

**Example 3: Include dev dependencies**
```
User: "Create a full inventory including dev dependencies"

Process:
1. Parse: path = ., include-dev = true
2. Run: bun run Tools/SbomGenerator.ts . --format=cyclonedx --include-dev --output=sbom-full.json
3. Return: Complete SBOM with production and development dependencies
```

**Example 4: Multiple projects**
```
User: "Generate SBOMs for all projects in ~/src"

Process:
1. Parse: path = ~/src/*, iterate over subdirectories
2. Run: For each project with lock file:
   bun run Tools/SbomGenerator.ts ~/src/[project] --format=cyclonedx --output=~/src/[project]/sbom.json
3. Return: Summary of SBOMs generated per project
```

**Example 5: Specific output location**
```
User: "Generate an SBOM and save it to our compliance folder"

Process:
1. Parse: path = ., output = ./compliance/sbom.json
2. Run: bun run Tools/SbomGenerator.ts . --format=cyclonedx --output=./compliance/sbom.json
3. Return: Confirmation with file path
```

---

## Interpreting Results

### SBOM Contents

A generated SBOM includes:
- **Metadata:** Tool version, generation timestamp, document ID
- **Components:** Each dependency with:
  - Name and version
  - Package URL (purl) for unique identification
  - License information
  - Hashes (SHA256, SHA512 when available)
  - Direct vs transitive dependency indicator
- **Dependencies:** Dependency tree relationships

### Component Summary

After generation, expect a summary like:
```
SBOM Generated: sbom.json
Format: CycloneDX 1.5
Components: 247 total
  - Direct: 42
  - Transitive: 205
Licenses: MIT (180), Apache-2.0 (45), ISC (12), BSD-3-Clause (10)
```

### Format Comparison

| Feature | CycloneDX | SPDX |
|---------|-----------|------|
| Primary use | Security/DevSecOps | Legal/Compliance |
| Vulnerability linking | Native VEX support | Via external docs |
| License detail | Good | Excellent |
| Government compliance | Accepted | Often required |
| Tool ecosystem | Growing rapidly | Mature |

**Recommendation:** Use CycloneDX for security workflows, SPDX for legal/compliance requirements.

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Generate SBOM

on:
  release:
    types: [published]
  push:
    branches: [main]
    paths:
      - 'package.json'
      - 'package-lock.json'
      - 'pnpm-lock.yaml'
      - 'yarn.lock'
      - 'requirements.txt'
      - 'poetry.lock'
      - 'Cargo.lock'
      - 'go.sum'

jobs:
  generate-sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Generate SBOM
        run: |
          bun run Tools/SbomGenerator.ts . \
            --format=cyclonedx \
            --output=sbom.json

      - name: Upload SBOM artifact
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.json

      - name: Attach SBOM to release
        if: github.event_name == 'release'
        uses: softprops/action-gh-release@v1
        with:
          files: sbom.json
```

### GitLab CI

```yaml
generate-sbom:
  stage: build
  script:
    - bun run Tools/SbomGenerator.ts . --format=cyclonedx --output=sbom.json
  artifacts:
    paths:
      - sbom.json
    expire_in: 1 year
  rules:
    - if: $CI_COMMIT_TAG
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      changes:
        - package.json
        - '*lock*'
```

### Compliance Automation

For federal/regulated environments requiring SBOM submission:

```yaml
compliance-sbom:
  stage: compliance
  script:
    - bun run Tools/SbomGenerator.ts . --format=spdx --output=sbom.spdx.json
    - |
      curl -X POST https://compliance-portal.example.gov/api/sbom \
        -H "Authorization: Bearer $COMPLIANCE_TOKEN" \
        -F "sbom=@sbom.spdx.json" \
        -F "project=$CI_PROJECT_NAME" \
        -F "version=$CI_COMMIT_TAG"
  rules:
    - if: $CI_COMMIT_TAG
```

---

## Supported Package Managers

| Manager | Lock File | License Detection | Hash Verification |
|---------|-----------|-------------------|-------------------|
| npm | package-lock.json | Yes (via registry) | SHA512 |
| pnpm | pnpm-lock.yaml | Yes | SHA512 |
| yarn | yarn.lock | Yes | SHA512 (v2+) |
| pip | requirements.txt | Limited | No |
| poetry | poetry.lock | Yes | SHA256 |
| cargo | Cargo.lock | Yes (via crates.io) | SHA256 |
| go | go.sum | Yes (via pkg.go.dev) | SHA256 |

---

## Compliance Context

### Executive Order 14028

US federal contractors must provide SBOMs for software sold to government agencies. Key requirements:
- Machine-readable format (CycloneDX or SPDX)
- Include all components (direct and transitive)
- Update with each release
- Provide within 30 days of request

### License Compliance

SBOMs help identify license obligations:
- **Permissive (MIT, Apache, BSD):** Generally safe for commercial use
- **Copyleft (GPL, AGPL):** May require source disclosure
- **Proprietary:** Check terms carefully

Flag for review: Any component with GPL/AGPL/LGPL in non-open-source projects.

---

## Error Handling

| Exit Code | Meaning | Response |
|-----------|---------|----------|
| 0 | SBOM generated successfully | Provide file path and summary |
| 1 | Partial generation (some packages failed) | Report warnings, provide partial SBOM |
| 2 | Tool error (no lock file, invalid format) | Diagnose and report error |

### Common Errors

- **No lock file found** - Run package manager install first
- **Unsupported format** - Use 'cyclonedx' or 'spdx' only
- **Output path not writable** - Check directory permissions
- **Registry timeout** - License lookup requires network; retry or use cached data
- **Mixed package managers** - Generates separate SBOMs; consider consolidating

### Handling Monorepos

For monorepos with multiple package managers:
```bash
# Generate per-workspace
for dir in packages/*/; do
  bun run Tools/SbomGenerator.ts "$dir" --format=cyclonedx --output="${dir}sbom.json"
done

# Or combine into single SBOM
bun run Tools/SbomGenerator.ts . --format=cyclonedx --output=sbom-combined.json
```
