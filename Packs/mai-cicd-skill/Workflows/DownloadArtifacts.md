# DownloadArtifacts Workflow

**Purpose:** List and download build artifacts from pipeline runs.

**Triggers:** "get build artifact", "download output", "get test coverage", "download build", "fetch artifacts", "get the binary", "download report"

---

## Steps

1. **Identify the target run**
   - If run ID provided, use directly
   - If "latest" or no run specified, find most recent successful run
   - If specific artifact name mentioned, may need to search runs

2. **List available artifacts**
   ```bash
   bun run Tools/artifacts.ts <repo> <run-id> [--format table|json]
   ```

3. **Identify desired artifact**
   - Match by name if user specified
   - If multiple artifacts, list and ask for selection
   - If only one artifact, proceed with download

4. **Download the artifact**
   ```bash
   bun run Tools/artifacts.ts <repo> <run-id> --download <artifact-id> [--output <path>]
   ```

5. **Confirm download and provide location**
   - Report file size and location
   - Note if artifact is a zip that may need extraction

---

## Examples

**Example 1: Download test coverage report**
```
User: "Get the test coverage report"

Process:
1. Find recent successful run:
   bun run Tools/runs.ts owner/repo --limit 5
   (Find first completed/success run)

2. List artifacts:
   bun run Tools/artifacts.ts owner/repo abc12345

   Output:
   ID                  Size        Name
   ----------------------------------------------------------------------
   art123              245KB       coverage-report
   art456              1.2MB       build-output
   art789              89KB        test-results

3. Match by name: "coverage-report" matches user request

4. Download:
   bun run Tools/artifacts.ts owner/repo abc12345 --download art123 --output ./coverage-report.zip

5. Return: "Downloaded coverage-report.zip (245KB) to ./coverage-report.zip"
```

**Example 2: List artifacts from specific run**
```
User: "What artifacts are in run def67890?"

Process:
1. List artifacts: bun run Tools/artifacts.ts owner/repo def67890
2. Return: Formatted artifact list

Output:
Artifacts for run def67890:

ID                  Size        Name
----------------------------------------------------------------------
art111              2.4MB       linux-binary
art222              2.1MB       macos-binary
art333              2.8MB       windows-binary
art444              156KB       checksums
```

**Example 3: Download to specific path**
```
User: "Download the binary to ~/Downloads/app"

Process:
1. Find run with binary artifact
2. List artifacts to find binary
3. Download: bun run Tools/artifacts.ts owner/repo <run-id> --download <artifact-id> --output ~/Downloads/app
4. Return: Confirmation with full path
```

**Example 4: Get latest build output**
```
User: "Download the latest build"

Process:
1. Find latest successful run:
   bun run Tools/runs.ts owner/repo --limit 1
   (Or first successful if latest failed)

2. List artifacts:
   bun run Tools/artifacts.ts owner/repo <run-id>

3. If single artifact: download it
   If multiple: show list and ask user to select

4. Download selected artifact
5. Return: Download confirmation
```

**Example 5: Multiple artifacts download**
```
User: "Download all the binaries"

Process:
1. List artifacts: bun run Tools/artifacts.ts owner/repo <run-id>
2. Identify all binary artifacts (linux, macos, windows)
3. Download each:
   bun run Tools/artifacts.ts owner/repo <run-id> --download art111 --output ./linux-binary.zip
   bun run Tools/artifacts.ts owner/repo <run-id> --download art222 --output ./macos-binary.zip
   bun run Tools/artifacts.ts owner/repo <run-id> --download art333 --output ./windows-binary.zip
4. Return: List of downloaded files with sizes
```

**Example 6: JSON format for scripting**
```
User: "List artifacts as JSON"

Process:
1. Run: bun run Tools/artifacts.ts owner/repo <run-id> --format json
2. Return: Raw JSON array

Output:
[
  {
    "id": "art123",
    "name": "coverage-report",
    "sizeBytes": 250880
  },
  ...
]
```

---

## Error Handling

- **No artifacts found** -> Run may not have produced artifacts, or they expired
- **Artifact expired** -> GitHub artifacts expire after 90 days by default
- **Run not found** -> Verify run ID
- **Artifact not found** -> List available artifacts and ask user to select
- **Download path invalid** -> Verify output directory exists
- **Disk space insufficient** -> Check artifact size before download

---

## Notes

- Artifacts are typically zip files; user may need to extract after download
- Default output path uses the artifact name if --output not specified
- Artifact retention varies by CI provider and repository settings:
  - GitHub Actions: 90 days default, configurable
  - GitLab CI: varies by tier and configuration
- Large artifacts may take time to download
- Common artifact types:
  - Build outputs: binaries, libraries, packages
  - Test results: coverage reports, test logs, screenshots
  - Documentation: generated docs, API specs
  - Security: SBOM, scan results
- To find artifacts from a specific branch or commit, first filter runs then list artifacts
