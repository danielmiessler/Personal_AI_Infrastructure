#!/usr/bin/env bun
/**
 * IoC Extractor - Indicator of Compromise extraction tool
 *
 * Extracts various types of IoCs from text including:
 * - IPv4/IPv6 addresses (including defanged)
 * - Domains (including defanged)
 * - URLs (including hxxp defanging)
 * - Email addresses (including defanged)
 * - Hashes (MD5, SHA1, SHA256, SHA512)
 * - CVE identifiers
 * - MITRE ATT&CK IDs
 */

// ============================================================================
// Types
// ============================================================================

export type IoCType =
  | 'ipv4'
  | 'ipv6'
  | 'domain'
  | 'url'
  | 'email'
  | 'md5'
  | 'sha1'
  | 'sha256'
  | 'sha512'
  | 'cve'
  | 'mitre_attack';

export interface IoCResult {
  extracted_at: string;
  source: string;
  total_iocs: number;
  iocs: {
    ipv4: string[];
    ipv6: string[];
    domain: string[];
    url: string[];
    email: string[];
    md5: string[];
    sha1: string[];
    sha256: string[];
    sha512: string[];
    cve: string[];
    mitre_attack: string[];
  };
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// ============================================================================
// Regex Patterns
// ============================================================================

const PATTERNS = {
  // IPv4 - handles defanged variants like 192[.]168[.]1[.]1
  ipv4: /(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\[\.\]|\(\.\)|\.)){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/gi,

  // IPv6 - full and compressed forms
  ipv6: /(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(?:ffff(?::0{1,4})?:)?(?:(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9])\.){3}(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9])|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9])\.){3}(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9]))/gi,

  // Domain - handles defanged variants like evil[.]com
  domain: /(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\[\.\]|\(\.\)|\.)+)+(?:[a-zA-Z]{2,})/gi,

  // URL - handles hxxp:// and hxxps:// defanging
  url: /(?:h[xX]{2}ps?|https?):\/\/(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\[\.\]|\(\.\)|\.)+)+[a-zA-Z]{2,}(?::\d{1,5})?(?:\/[^\s]*)?/gi,

  // Email - handles [@] and [at] defanging
  email: /[a-zA-Z0-9._%+-]+(?:\[@\]|\[at\]|@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\[\.\]|\(\.\)|\.)+[a-zA-Z]{2,}/gi,

  // MD5 - 32 hex chars
  md5: /\b[a-fA-F0-9]{32}\b/g,

  // SHA1 - 40 hex chars
  sha1: /\b[a-fA-F0-9]{40}\b/g,

  // SHA256 - 64 hex chars
  sha256: /\b[a-fA-F0-9]{64}\b/g,

  // SHA512 - 128 hex chars
  sha512: /\b[a-fA-F0-9]{128}\b/g,

  // CVE - CVE-YYYY-NNNNN format
  cve: /CVE-\d{4}-\d{4,}/gi,

  // MITRE ATT&CK IDs - T#### and TA####
  mitre_attack: /\b(?:T\d{4}(?:\.\d{3})?|TA\d{4})\b/gi,
};

// Private IP ranges for validation
const PRIVATE_IP_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' },
  { start: '0.0.0.0', end: '0.255.255.255' },
];

// Reserved/special TLDs that should not be treated as valid domains
const INVALID_TLDS = ['local', 'localhost', 'invalid', 'test', 'example'];

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Convert defanged text to real (refang)
 */
export function refang(text: string): string {
  return text
    // Refang dots
    .replace(/\[\.\]/g, '.')
    .replace(/\(\.\)/g, '.')
    // Refang URLs
    .replace(/hxxp/gi, 'http')
    .replace(/hXXp/gi, 'http')
    // Refang email
    .replace(/\[@\]/g, '@')
    .replace(/\[at\]/gi, '@');
}

/**
 * Convert real text to defanged
 */
export function defang(text: string): string {
  // First defang URLs (must do before dots)
  let result = text.replace(/https?/gi, (match) => {
    return match.toLowerCase() === 'https' ? 'hxxps' : 'hxxp';
  });

  // Defang email @ symbols
  result = result.replace(/@/g, '[@]');

  // Defang dots in domains/IPs (but not in paths after /)
  // This is a simplified approach - defang all dots
  result = result.replace(/\./g, '[.]');

  return result;
}

/**
 * Convert an IP address to a number for comparison
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * Check if an IPv4 address is in a private range
 */
function isPrivateIP(ip: string): boolean {
  const ipNum = ipToNumber(ip);
  return PRIVATE_IP_RANGES.some(range => {
    const startNum = ipToNumber(range.start);
    const endNum = ipToNumber(range.end);
    return ipNum >= startNum && ipNum <= endNum;
  });
}

/**
 * Validate an IoC based on its type
 */
export function validateIoC(type: IoCType, value: string): ValidationResult {
  // First refang the value for validation
  const refangedValue = refang(value);

  switch (type) {
    case 'ipv4': {
      // Check format
      const parts = refangedValue.split('.');
      if (parts.length !== 4) {
        return { valid: false, reason: 'Invalid IPv4 format' };
      }
      for (const part of parts) {
        const num = parseInt(part, 10);
        if (isNaN(num) || num < 0 || num > 255) {
          return { valid: false, reason: 'Invalid octet value' };
        }
      }
      // Check if private
      if (isPrivateIP(refangedValue)) {
        return { valid: true, reason: 'Private IP address' };
      }
      return { valid: true };
    }

    case 'ipv6': {
      // Basic IPv6 validation
      const ipv6Regex = /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|::1)$/i;
      if (!ipv6Regex.test(refangedValue)) {
        return { valid: false, reason: 'Invalid IPv6 format' };
      }
      // Check for loopback
      if (refangedValue === '::1') {
        return { valid: true, reason: 'Loopback address' };
      }
      return { valid: true };
    }

    case 'domain': {
      // Check for invalid TLDs
      const tld = refangedValue.split('.').pop()?.toLowerCase();
      if (tld && INVALID_TLDS.includes(tld)) {
        return { valid: false, reason: `Invalid TLD: ${tld}` };
      }
      // Basic domain format check
      const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
      if (!domainRegex.test(refangedValue)) {
        return { valid: false, reason: 'Invalid domain format' };
      }
      return { valid: true };
    }

    case 'url': {
      try {
        new URL(refangedValue);
        return { valid: true };
      } catch {
        return { valid: false, reason: 'Invalid URL format' };
      }
    }

    case 'email': {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(refangedValue)) {
        return { valid: false, reason: 'Invalid email format' };
      }
      return { valid: true };
    }

    case 'md5': {
      if (!/^[a-fA-F0-9]{32}$/.test(refangedValue)) {
        return { valid: false, reason: 'Invalid MD5 hash length' };
      }
      // Check for obviously invalid hashes (all same char)
      if (/^(.)\1+$/.test(refangedValue)) {
        return { valid: false, reason: 'Invalid hash (repeated character)' };
      }
      return { valid: true };
    }

    case 'sha1': {
      if (!/^[a-fA-F0-9]{40}$/.test(refangedValue)) {
        return { valid: false, reason: 'Invalid SHA1 hash length' };
      }
      if (/^(.)\1+$/.test(refangedValue)) {
        return { valid: false, reason: 'Invalid hash (repeated character)' };
      }
      return { valid: true };
    }

    case 'sha256': {
      if (!/^[a-fA-F0-9]{64}$/.test(refangedValue)) {
        return { valid: false, reason: 'Invalid SHA256 hash length' };
      }
      if (/^(.)\1+$/.test(refangedValue)) {
        return { valid: false, reason: 'Invalid hash (repeated character)' };
      }
      return { valid: true };
    }

    case 'sha512': {
      if (!/^[a-fA-F0-9]{128}$/.test(refangedValue)) {
        return { valid: false, reason: 'Invalid SHA512 hash length' };
      }
      if (/^(.)\1+$/.test(refangedValue)) {
        return { valid: false, reason: 'Invalid hash (repeated character)' };
      }
      return { valid: true };
    }

    case 'cve': {
      const cveRegex = /^CVE-\d{4}-\d{4,}$/i;
      if (!cveRegex.test(refangedValue)) {
        return { valid: false, reason: 'Invalid CVE format' };
      }
      // Check year range (1999 to current year + 1)
      const year = parseInt(refangedValue.split('-')[1], 10);
      const currentYear = new Date().getFullYear();
      if (year < 1999 || year > currentYear + 1) {
        return { valid: false, reason: `Invalid CVE year: ${year}` };
      }
      return { valid: true };
    }

    case 'mitre_attack': {
      const attackRegex = /^(?:T\d{4}(?:\.\d{3})?|TA\d{4})$/i;
      if (!attackRegex.test(refangedValue)) {
        return { valid: false, reason: 'Invalid MITRE ATT&CK ID format' };
      }
      return { valid: true };
    }

    default:
      return { valid: false, reason: 'Unknown IoC type' };
  }
}

/**
 * Extract all IoCs from text
 */
export function extractIoCs(text: string, source: string = 'input'): IoCResult {
  const result: IoCResult = {
    extracted_at: new Date().toISOString(),
    source,
    total_iocs: 0,
    iocs: {
      ipv4: [],
      ipv6: [],
      domain: [],
      url: [],
      email: [],
      md5: [],
      sha1: [],
      sha256: [],
      sha512: [],
      cve: [],
      mitre_attack: [],
    },
  };

  // Helper to add unique values
  const addUnique = (arr: string[], value: string) => {
    const normalized = value.toLowerCase();
    if (!arr.some(v => v.toLowerCase() === normalized)) {
      arr.push(value);
    }
  };

  // Extract URLs first (to avoid extracting domains from URLs)
  const urls = text.match(PATTERNS.url) || [];
  urls.forEach(url => addUnique(result.iocs.url, url));

  // Extract emails (before domains to avoid extracting domain part)
  const emails = text.match(PATTERNS.email) || [];
  emails.forEach(email => addUnique(result.iocs.email, email));

  // Extract domains (filter out those already in URLs/emails)
  const domains = text.match(PATTERNS.domain) || [];
  domains.forEach(domain => {
    // Skip if domain is part of a URL or email
    const refangedDomain = refang(domain).toLowerCase();
    const isInUrl = result.iocs.url.some(url =>
      refang(url).toLowerCase().includes(refangedDomain)
    );
    const isInEmail = result.iocs.email.some(email =>
      refang(email).toLowerCase().includes(refangedDomain)
    );
    if (!isInUrl && !isInEmail) {
      addUnique(result.iocs.domain, domain);
    }
  });

  // Extract IPv4 addresses
  const ipv4s = text.match(PATTERNS.ipv4) || [];
  ipv4s.forEach(ip => addUnique(result.iocs.ipv4, ip));

  // Extract IPv6 addresses
  const ipv6s = text.match(PATTERNS.ipv6) || [];
  ipv6s.forEach(ip => addUnique(result.iocs.ipv6, ip));

  // Extract hashes (in order of length to avoid duplicates)
  // SHA512 first (128 chars)
  const sha512s = text.match(PATTERNS.sha512) || [];
  sha512s.forEach(hash => addUnique(result.iocs.sha512, hash.toLowerCase()));

  // SHA256 (64 chars) - exclude if already in SHA512
  const sha256s = text.match(PATTERNS.sha256) || [];
  sha256s.forEach(hash => {
    const lowerHash = hash.toLowerCase();
    const isInSha512 = result.iocs.sha512.some(h => h.includes(lowerHash));
    if (!isInSha512) {
      addUnique(result.iocs.sha256, lowerHash);
    }
  });

  // SHA1 (40 chars) - exclude if already in longer hashes
  const sha1s = text.match(PATTERNS.sha1) || [];
  sha1s.forEach(hash => {
    const lowerHash = hash.toLowerCase();
    const isInLonger = result.iocs.sha512.some(h => h.includes(lowerHash)) ||
                       result.iocs.sha256.some(h => h.includes(lowerHash));
    if (!isInLonger) {
      addUnique(result.iocs.sha1, lowerHash);
    }
  });

  // MD5 (32 chars) - exclude if already in longer hashes
  const md5s = text.match(PATTERNS.md5) || [];
  md5s.forEach(hash => {
    const lowerHash = hash.toLowerCase();
    const isInLonger = result.iocs.sha512.some(h => h.includes(lowerHash)) ||
                       result.iocs.sha256.some(h => h.includes(lowerHash)) ||
                       result.iocs.sha1.some(h => h.includes(lowerHash));
    if (!isInLonger) {
      addUnique(result.iocs.md5, lowerHash);
    }
  });

  // Extract CVEs
  const cves = text.match(PATTERNS.cve) || [];
  cves.forEach(cve => addUnique(result.iocs.cve, cve.toUpperCase()));

  // Extract MITRE ATT&CK IDs
  const attackIds = text.match(PATTERNS.mitre_attack) || [];
  attackIds.forEach(id => addUnique(result.iocs.mitre_attack, id.toUpperCase()));

  // Calculate total
  result.total_iocs = Object.values(result.iocs).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return result;
}

/**
 * Format output as CSV
 */
function formatCsv(result: IoCResult): string {
  const lines: string[] = ['type,value'];

  for (const [type, values] of Object.entries(result.iocs)) {
    for (const value of values) {
      lines.push(`${type},"${value}"`);
    }
  }

  return lines.join('\n');
}

/**
 * Format output as table
 */
function formatTable(result: IoCResult): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push(`IoC Extraction Report`);
  lines.push(`Extracted at: ${result.extracted_at}`);
  lines.push(`Source: ${result.source}`);
  lines.push(`Total IoCs: ${result.total_iocs}`);
  lines.push('='.repeat(80));

  for (const [type, values] of Object.entries(result.iocs)) {
    if (values.length > 0) {
      lines.push(`\n[${type.toUpperCase()}] (${values.length})`);
      lines.push('-'.repeat(40));
      for (const value of values) {
        lines.push(`  ${value}`);
      }
    }
  }

  lines.push('\n' + '='.repeat(80));

  return lines.join('\n');
}

/**
 * Format output based on format type
 */
function formatOutput(result: IoCResult, format: string, shouldRefang: boolean): string {
  // Optionally refang all values
  if (shouldRefang) {
    for (const type of Object.keys(result.iocs) as (keyof typeof result.iocs)[]) {
      result.iocs[type] = result.iocs[type].map(refang);
    }
  }

  switch (format) {
    case 'json':
      return JSON.stringify(result, null, 2);
    case 'csv':
      return formatCsv(result);
    case 'table':
      return formatTable(result);
    default:
      return JSON.stringify(result, null, 2);
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
IoC Extractor - Extract Indicators of Compromise from text

Usage:
  bun run IoCExtractor.ts <input_file_or_text>
  bun run IoCExtractor.ts --stdin          # Read from stdin
  bun run IoCExtractor.ts --refang         # Convert defanged to real
  bun run IoCExtractor.ts --validate       # Validate extracted IoCs
  bun run IoCExtractor.ts --format <type>  # Output format: json|csv|table

Options:
  --stdin      Read input from stdin
  --refang     Convert defanged IoCs to their real form
  --validate   Validate each extracted IoC
  --format     Output format (json, csv, table). Default: json
  --help, -h   Show this help message

Examples:
  bun run IoCExtractor.ts report.txt
  bun run IoCExtractor.ts "Check 192[.]168[.]1[.]1 and evil[.]com"
  cat report.txt | bun run IoCExtractor.ts --stdin --format table
  bun run IoCExtractor.ts report.txt --refang --validate
`);
    process.exit(0);
  }

  // Parse arguments
  let inputText = '';
  let source = 'input';
  let format = 'json';
  let shouldRefang = false;
  let shouldValidate = false;
  let readFromStdin = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--stdin') {
      readFromStdin = true;
    } else if (arg === '--refang') {
      shouldRefang = true;
    } else if (arg === '--validate') {
      shouldValidate = true;
    } else if (arg === '--format') {
      format = args[++i] || 'json';
      if (!['json', 'csv', 'table'].includes(format)) {
        console.error(`Invalid format: ${format}. Use json, csv, or table.`);
        process.exit(1);
      }
    } else if (!arg.startsWith('--')) {
      // Check if it's a file or text
      const file = Bun.file(arg);
      if (await file.exists()) {
        inputText = await file.text();
        source = arg;
      } else {
        // Treat as direct text input
        inputText = arg;
        source = 'text_input';
      }
    }
  }

  // Read from stdin if requested
  if (readFromStdin) {
    const chunks: string[] = [];
    const reader = Bun.stdin.stream().getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(new TextDecoder().decode(value));
    }

    inputText = chunks.join('');
    source = 'stdin';
  }

  if (!inputText) {
    console.error('No input provided. Use --help for usage information.');
    process.exit(1);
  }

  // Extract IoCs
  const result = extractIoCs(inputText, source);

  // Validate if requested
  if (shouldValidate) {
    const validatedResult: IoCResult = {
      ...result,
      iocs: {
        ipv4: [],
        ipv6: [],
        domain: [],
        url: [],
        email: [],
        md5: [],
        sha1: [],
        sha256: [],
        sha512: [],
        cve: [],
        mitre_attack: [],
      },
    };

    for (const [type, values] of Object.entries(result.iocs)) {
      for (const value of values) {
        const validation = validateIoC(type as IoCType, value);
        if (validation.valid) {
          validatedResult.iocs[type as keyof typeof validatedResult.iocs].push(value);
        }
      }
    }

    validatedResult.total_iocs = Object.values(validatedResult.iocs).reduce(
      (sum, arr) => sum + arr.length,
      0
    );

    console.log(formatOutput(validatedResult, format, shouldRefang));
  } else {
    console.log(formatOutput(result, format, shouldRefang));
  }
}

// Run CLI if this is the main module
if (import.meta.main) {
  main().catch(console.error);
}
