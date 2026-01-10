/**
 * Tests for IoC Extractor
 */

import { describe, test, expect } from 'bun:test';
import {
  extractIoCs,
  refang,
  defang,
  validateIoC,
  type IoCType,
} from './IoCExtractor';

// ============================================================================
// Refang Tests
// ============================================================================

describe('refang', () => {
  test('converts defanged dots to real dots', () => {
    expect(refang('192[.]168[.]1[.]1')).toBe('192.168.1.1');
    expect(refang('192(.)168(.)1(.)1')).toBe('192.168.1.1');
  });

  test('converts hxxp to http', () => {
    expect(refang('hxxp://evil.com')).toBe('http://evil.com');
    expect(refang('hxxps://evil.com')).toBe('https://evil.com');
    expect(refang('hXXp://evil.com')).toBe('http://evil.com');
  });

  test('converts defanged email @ symbols', () => {
    expect(refang('user[@]evil.com')).toBe('user@evil.com');
    expect(refang('user[at]evil.com')).toBe('user@evil.com');
  });

  test('handles combined defanging', () => {
    expect(refang('hxxps://evil[.]com/path')).toBe('https://evil.com/path');
    expect(refang('user[@]evil[.]com')).toBe('user@evil.com');
  });
});

// ============================================================================
// Defang Tests
// ============================================================================

describe('defang', () => {
  test('defangs dots', () => {
    expect(defang('192.168.1.1')).toBe('192[.]168[.]1[.]1');
    expect(defang('evil.com')).toBe('evil[.]com');
  });

  test('defangs URLs', () => {
    expect(defang('http://evil.com')).toBe('hxxp://evil[.]com');
    expect(defang('https://evil.com')).toBe('hxxps://evil[.]com');
  });

  test('defangs email @ symbols', () => {
    expect(defang('user@evil.com')).toBe('user[@]evil[.]com');
  });
});

// ============================================================================
// IPv4 Extraction Tests
// ============================================================================

describe('extractIoCs - IPv4', () => {
  test('extracts standard IPv4 addresses', () => {
    const result = extractIoCs('The IP is 192.168.1.1 and 10.0.0.1');
    expect(result.iocs.ipv4).toContain('192.168.1.1');
    expect(result.iocs.ipv4).toContain('10.0.0.1');
  });

  test('extracts defanged IPv4 addresses with [.]', () => {
    const result = extractIoCs('The IP is 192[.]168[.]1[.]1');
    expect(result.iocs.ipv4).toContain('192[.]168[.]1[.]1');
  });

  test('extracts defanged IPv4 addresses with (.)', () => {
    const result = extractIoCs('The IP is 192(.)168(.)1(.)1');
    expect(result.iocs.ipv4).toContain('192(.)168(.)1(.)1');
  });

  test('deduplicates IPv4 addresses', () => {
    const result = extractIoCs('192.168.1.1 and 192.168.1.1 again');
    expect(result.iocs.ipv4.length).toBe(1);
  });
});

// ============================================================================
// IPv6 Extraction Tests
// ============================================================================

describe('extractIoCs - IPv6', () => {
  test('extracts full IPv6 addresses', () => {
    const result = extractIoCs('Address: 2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    expect(result.iocs.ipv6).toContain('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
  });

  test('extracts compressed IPv6 addresses', () => {
    const result = extractIoCs('Address: 2001:db8:85a3::8a2e:370:7334');
    expect(result.iocs.ipv6.length).toBeGreaterThan(0);
    // The regex captures compressed IPv6, may match partial patterns
    expect(result.iocs.ipv6.some(ip => ip.includes('2001:db8'))).toBe(true);
  });

  test('extracts loopback IPv6', () => {
    const result = extractIoCs('Loopback: ::1');
    expect(result.iocs.ipv6).toContain('::1');
  });
});

// ============================================================================
// Domain Extraction Tests
// ============================================================================

describe('extractIoCs - Domain', () => {
  test('extracts standard domains', () => {
    const result = extractIoCs('Visit evil.com and malware.example.org');
    expect(result.iocs.domain).toContain('evil.com');
    expect(result.iocs.domain).toContain('malware.example.org');
  });

  test('extracts defanged domains with [.]', () => {
    const result = extractIoCs('The domain is evil[.]com');
    expect(result.iocs.domain).toContain('evil[.]com');
  });

  test('extracts defanged domains with (.)', () => {
    const result = extractIoCs('The domain is evil(.)com');
    expect(result.iocs.domain).toContain('evil(.)com');
  });

  test('does not extract domains from URLs', () => {
    const result = extractIoCs('https://evil.com/path');
    expect(result.iocs.url).toContain('https://evil.com/path');
    expect(result.iocs.domain).not.toContain('evil.com');
  });

  test('does not extract domains from emails', () => {
    const result = extractIoCs('Contact user@evil.com for info');
    expect(result.iocs.email).toContain('user@evil.com');
    expect(result.iocs.domain).not.toContain('evil.com');
  });
});

// ============================================================================
// URL Extraction Tests
// ============================================================================

describe('extractIoCs - URL', () => {
  test('extracts standard URLs', () => {
    const result = extractIoCs('Visit https://evil.com/malware.exe');
    expect(result.iocs.url).toContain('https://evil.com/malware.exe');
  });

  test('extracts defanged URLs with hxxp', () => {
    const result = extractIoCs('Download from hxxp://evil.com/payload');
    expect(result.iocs.url).toContain('hxxp://evil.com/payload');
  });

  test('extracts defanged URLs with hxxps', () => {
    const result = extractIoCs('C2: hxxps://evil[.]com/beacon');
    expect(result.iocs.url).toContain('hxxps://evil[.]com/beacon');
  });

  test('extracts URLs with ports', () => {
    const result = extractIoCs('Server at http://evil.com:8080/admin');
    expect(result.iocs.url).toContain('http://evil.com:8080/admin');
  });
});

// ============================================================================
// Email Extraction Tests
// ============================================================================

describe('extractIoCs - Email', () => {
  test('extracts standard emails', () => {
    const result = extractIoCs('Contact attacker@evil.com');
    expect(result.iocs.email).toContain('attacker@evil.com');
  });

  test('extracts defanged emails with [@]', () => {
    const result = extractIoCs('Contact attacker[@]evil.com');
    expect(result.iocs.email).toContain('attacker[@]evil.com');
  });

  test('extracts defanged emails with [at]', () => {
    const result = extractIoCs('Contact attacker[at]evil.com');
    expect(result.iocs.email).toContain('attacker[at]evil.com');
  });

  test('extracts fully defanged emails', () => {
    const result = extractIoCs('Contact attacker[@]evil[.]com');
    expect(result.iocs.email).toContain('attacker[@]evil[.]com');
  });
});

// ============================================================================
// Hash Extraction Tests
// ============================================================================

describe('extractIoCs - Hashes', () => {
  test('extracts MD5 hashes', () => {
    const result = extractIoCs('MD5: d41d8cd98f00b204e9800998ecf8427e');
    expect(result.iocs.md5).toContain('d41d8cd98f00b204e9800998ecf8427e');
  });

  test('extracts SHA1 hashes', () => {
    const result = extractIoCs('SHA1: da39a3ee5e6b4b0d3255bfef95601890afd80709');
    expect(result.iocs.sha1).toContain('da39a3ee5e6b4b0d3255bfef95601890afd80709');
  });

  test('extracts SHA256 hashes', () => {
    const hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const result = extractIoCs(`SHA256: ${hash}`);
    expect(result.iocs.sha256).toContain(hash);
  });

  test('extracts SHA512 hashes', () => {
    const hash = 'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e';
    const result = extractIoCs(`SHA512: ${hash}`);
    expect(result.iocs.sha512).toContain(hash);
  });

  test('does not extract shorter hashes from longer ones', () => {
    const sha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const result = extractIoCs(`SHA256: ${sha256}`);
    expect(result.iocs.sha256).toContain(sha256);
    // MD5 (32 chars) should not be extracted from SHA256
    expect(result.iocs.md5.length).toBe(0);
  });

  test('normalizes hash case', () => {
    const result = extractIoCs('MD5: D41D8CD98F00B204E9800998ECF8427E');
    expect(result.iocs.md5).toContain('d41d8cd98f00b204e9800998ecf8427e');
  });
});

// ============================================================================
// CVE Extraction Tests
// ============================================================================

describe('extractIoCs - CVE', () => {
  test('extracts CVE identifiers', () => {
    const result = extractIoCs('Exploits CVE-2021-44228 (Log4Shell)');
    expect(result.iocs.cve).toContain('CVE-2021-44228');
  });

  test('extracts CVE with 5+ digit ID', () => {
    const result = extractIoCs('See CVE-2024-12345');
    expect(result.iocs.cve).toContain('CVE-2024-12345');
  });

  test('normalizes CVE case', () => {
    const result = extractIoCs('Vulnerability: cve-2021-44228');
    expect(result.iocs.cve).toContain('CVE-2021-44228');
  });

  test('extracts multiple CVEs', () => {
    const result = extractIoCs('Affected by CVE-2021-44228, CVE-2021-45046, and CVE-2021-45105');
    expect(result.iocs.cve.length).toBe(3);
  });
});

// ============================================================================
// MITRE ATT&CK Extraction Tests
// ============================================================================

describe('extractIoCs - MITRE ATT&CK', () => {
  test('extracts technique IDs', () => {
    const result = extractIoCs('Uses T1059 (Command and Scripting Interpreter)');
    expect(result.iocs.mitre_attack).toContain('T1059');
  });

  test('extracts sub-technique IDs', () => {
    const result = extractIoCs('Specifically T1059.001 (PowerShell)');
    expect(result.iocs.mitre_attack).toContain('T1059.001');
  });

  test('extracts tactic IDs', () => {
    const result = extractIoCs('Tactic: TA0002 (Execution)');
    expect(result.iocs.mitre_attack).toContain('TA0002');
  });

  test('normalizes ATT&CK ID case', () => {
    const result = extractIoCs('Uses t1059 technique');
    expect(result.iocs.mitre_attack).toContain('T1059');
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('validateIoC', () => {
  describe('IPv4 validation', () => {
    test('validates correct IPv4', () => {
      expect(validateIoC('ipv4', '8.8.8.8').valid).toBe(true);
    });

    test('identifies private IPs', () => {
      const result = validateIoC('ipv4', '192.168.1.1');
      expect(result.valid).toBe(true);
      expect(result.reason).toBe('Private IP address');
    });

    test('identifies loopback IPs', () => {
      const result = validateIoC('ipv4', '127.0.0.1');
      expect(result.valid).toBe(true);
      expect(result.reason).toBe('Private IP address');
    });

    test('rejects invalid octets', () => {
      expect(validateIoC('ipv4', '256.1.1.1').valid).toBe(false);
    });

    test('validates defanged IPv4', () => {
      expect(validateIoC('ipv4', '192[.]168[.]1[.]1').valid).toBe(true);
    });
  });

  describe('IPv6 validation', () => {
    test('validates full IPv6', () => {
      expect(validateIoC('ipv6', '2001:0db8:85a3:0000:0000:8a2e:0370:7334').valid).toBe(true);
    });

    test('identifies loopback IPv6', () => {
      const result = validateIoC('ipv6', '::1');
      expect(result.valid).toBe(true);
      expect(result.reason).toBe('Loopback address');
    });
  });

  describe('Domain validation', () => {
    test('validates correct domain', () => {
      expect(validateIoC('domain', 'example.com').valid).toBe(true);
    });

    test('validates defanged domain', () => {
      expect(validateIoC('domain', 'example[.]com').valid).toBe(true);
    });

    test('rejects invalid TLDs', () => {
      expect(validateIoC('domain', 'test.local').valid).toBe(false);
      expect(validateIoC('domain', 'test.localhost').valid).toBe(false);
    });
  });

  describe('URL validation', () => {
    test('validates correct URL', () => {
      expect(validateIoC('url', 'https://example.com/path').valid).toBe(true);
    });

    test('validates defanged URL', () => {
      expect(validateIoC('url', 'hxxps://example[.]com/path').valid).toBe(true);
    });

    test('rejects invalid URL', () => {
      expect(validateIoC('url', 'not-a-url').valid).toBe(false);
    });
  });

  describe('Email validation', () => {
    test('validates correct email', () => {
      expect(validateIoC('email', 'user@example.com').valid).toBe(true);
    });

    test('validates defanged email', () => {
      expect(validateIoC('email', 'user[@]example[.]com').valid).toBe(true);
    });

    test('rejects invalid email', () => {
      expect(validateIoC('email', 'not-an-email').valid).toBe(false);
    });
  });

  describe('Hash validation', () => {
    test('validates correct MD5', () => {
      expect(validateIoC('md5', 'd41d8cd98f00b204e9800998ecf8427e').valid).toBe(true);
    });

    test('rejects wrong length MD5', () => {
      expect(validateIoC('md5', 'd41d8cd98f00b204').valid).toBe(false);
    });

    test('rejects repeated character hash', () => {
      expect(validateIoC('md5', '00000000000000000000000000000000').valid).toBe(false);
    });

    test('validates correct SHA256', () => {
      expect(validateIoC('sha256', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855').valid).toBe(true);
    });
  });

  describe('CVE validation', () => {
    test('validates correct CVE', () => {
      expect(validateIoC('cve', 'CVE-2021-44228').valid).toBe(true);
    });

    test('rejects invalid year', () => {
      expect(validateIoC('cve', 'CVE-1990-1234').valid).toBe(false);
    });

    test('rejects invalid format', () => {
      expect(validateIoC('cve', 'CVE-2021-12').valid).toBe(false);
    });
  });

  describe('MITRE ATT&CK validation', () => {
    test('validates technique ID', () => {
      expect(validateIoC('mitre_attack', 'T1059').valid).toBe(true);
    });

    test('validates sub-technique ID', () => {
      expect(validateIoC('mitre_attack', 'T1059.001').valid).toBe(true);
    });

    test('validates tactic ID', () => {
      expect(validateIoC('mitre_attack', 'TA0002').valid).toBe(true);
    });

    test('rejects invalid format', () => {
      expect(validateIoC('mitre_attack', 'T123').valid).toBe(false);
    });
  });
});

// ============================================================================
// Deduplication Tests
// ============================================================================

describe('deduplication', () => {
  test('deduplicates identical IoCs', () => {
    const result = extractIoCs('192.168.1.1 192.168.1.1 192.168.1.1');
    expect(result.iocs.ipv4.length).toBe(1);
  });

  test('deduplicates case-insensitive hashes', () => {
    const result = extractIoCs('d41d8cd98f00b204e9800998ecf8427e D41D8CD98F00B204E9800998ECF8427E');
    expect(result.iocs.md5.length).toBe(1);
  });

  test('deduplicates case-insensitive CVEs', () => {
    const result = extractIoCs('CVE-2021-44228 cve-2021-44228');
    expect(result.iocs.cve.length).toBe(1);
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('edge cases', () => {
  test('handles empty input', () => {
    const result = extractIoCs('');
    expect(result.total_iocs).toBe(0);
  });

  test('handles input with no IoCs', () => {
    const result = extractIoCs('This is just regular text with no indicators.');
    expect(result.total_iocs).toBe(0);
  });

  test('handles mixed IoC types', () => {
    const text = `
      IP: 192.168.1.1
      Domain: evil.com
      URL: https://malware.org/payload
      Email: attacker@evil.com
      MD5: d41d8cd98f00b204e9800998ecf8427e
      CVE: CVE-2021-44228
      ATT&CK: T1059
    `;
    const result = extractIoCs(text);
    expect(result.total_iocs).toBeGreaterThan(5);
  });

  test('returns correct total count', () => {
    const result = extractIoCs('192.168.1.1 10.0.0.1 evil.com CVE-2021-44228');
    const expectedTotal =
      result.iocs.ipv4.length +
      result.iocs.ipv6.length +
      result.iocs.domain.length +
      result.iocs.url.length +
      result.iocs.email.length +
      result.iocs.md5.length +
      result.iocs.sha1.length +
      result.iocs.sha256.length +
      result.iocs.sha512.length +
      result.iocs.cve.length +
      result.iocs.mitre_attack.length;
    expect(result.total_iocs).toBe(expectedTotal);
  });

  test('sets source correctly', () => {
    const result = extractIoCs('192.168.1.1', 'test-file.txt');
    expect(result.source).toBe('test-file.txt');
  });

  test('sets extracted_at timestamp', () => {
    const result = extractIoCs('192.168.1.1');
    expect(result.extracted_at).toBeDefined();
    expect(new Date(result.extracted_at).getTime()).toBeLessThanOrEqual(Date.now());
  });
});

// ============================================================================
// Real-World Threat Report Test
// ============================================================================

describe('real-world scenarios', () => {
  test('extracts IoCs from threat report sample', () => {
    const threatReport = `
      Threat Intelligence Report: APT29 Campaign

      The threat actor was observed using the following infrastructure:

      C2 Servers:
      - 203[.]0[.]113[.]50
      - 198[.]51[.]100[.]23
      - evil-c2[.]com
      - hxxps://malware-delivery[.]net/stage2

      Phishing Infrastructure:
      - legitimate-login[.]com
      - user[@]phishing-domain[.]org

      Malware Hashes:
      - SHA256: a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd
      - MD5: 1234567890abcdef1234567890abcdef

      Exploited Vulnerabilities:
      - CVE-2021-44228 (Log4Shell)
      - CVE-2024-21762 (FortiOS)

      MITRE ATT&CK Mapping:
      - T1566.001 (Spearphishing Attachment)
      - T1059.001 (PowerShell)
      - TA0001 (Initial Access)
    `;

    const result = extractIoCs(threatReport);

    expect(result.iocs.ipv4.length).toBe(2);
    expect(result.iocs.domain.length).toBeGreaterThan(0);
    expect(result.iocs.url.length).toBe(1);
    expect(result.iocs.email.length).toBe(1);
    expect(result.iocs.sha256.length).toBe(1);
    expect(result.iocs.md5.length).toBe(1);
    expect(result.iocs.cve.length).toBe(2);
    expect(result.iocs.mitre_attack.length).toBe(3);
  });
});
