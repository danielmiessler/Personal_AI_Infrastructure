/**
 * Unit tests for frontmatter parser
 */

import { describe, it, expect } from 'bun:test';
import {
  parseFrontmatter,
  extractTitle,
  parseMarkdownFile,
  cleanBody
} from '../../../src/hooks/lib/frontmatter-parser';

describe('frontmatter-parser', () => {
  describe('parseFrontmatter', () => {
    it('should parse valid YAML frontmatter', () => {
      const content = `---
capture_type: LEARNING
timestamp: 2026-01-04 10:30:00
session_id: abc-123
executor: main
---

# LEARNING: Volume Mounting Fix

Some content here.
`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter.capture_type).toBe('LEARNING');
      expect(result.frontmatter.timestamp).toBe('2026-01-04 10:30:00');
      expect(result.frontmatter.session_id).toBe('abc-123');
      expect(result.frontmatter.executor).toBe('main');
      expect(result.body).toContain('Volume Mounting Fix');
    });

    it('should handle agent_completion for subagent outputs', () => {
      const content = `---
capture_type: RESEARCH
timestamp: 2026-01-04 10:30:00
session_id: abc-123
executor: researcher
agent_completion: API Investigation Complete
---

Research findings here.
`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter.capture_type).toBe('RESEARCH');
      expect(result.frontmatter.executor).toBe('researcher');
      expect(result.frontmatter.agent_completion).toBe('API Investigation Complete');
    });

    it('should throw on missing frontmatter delimiters', () => {
      const content = `No frontmatter here

Just some content.
`;

      expect(() => parseFrontmatter(content)).toThrow('Invalid frontmatter format');
    });

    it('should throw on missing required fields', () => {
      const content = `---
capture_type: LEARNING
---

Missing required fields.
`;

      expect(() => parseFrontmatter(content)).toThrow('Missing required frontmatter field');
    });

    it('should handle colons in values', () => {
      const content = `---
capture_type: LEARNING
timestamp: 2026-01-04 10:30:00
session_id: abc:def:123
executor: main
---

Content.
`;

      const result = parseFrontmatter(content);
      expect(result.frontmatter.session_id).toBe('abc:def:123');
    });
  });

  describe('extractTitle', () => {
    it('should extract title from LEARNING heading', () => {
      const body = '# LEARNING: Volume Mounting Fix\n\nSome content.';
      const title = extractTitle(body, 'FALLBACK');

      expect(title).toBe('Volume Mounting Fix');
    });

    it('should extract title from RESEARCH heading', () => {
      const body = '# RESEARCH: API Investigation\n\nFindings here.';
      const title = extractTitle(body, 'FALLBACK');

      expect(title).toBe('API Investigation');
    });

    it('should extract title from any heading', () => {
      const body = '# Some Generic Heading\n\nContent.';
      const title = extractTitle(body, 'FALLBACK');

      expect(title).toBe('Some Generic Heading');
    });

    it('should extract title from bold text', () => {
      const body = '**Important Finding**\n\nContent.';
      const title = extractTitle(body, 'FALLBACK');

      expect(title).toBe('Important Finding');
    });

    it('should use fallback when no title found', () => {
      const body = 'Just some plain text without any headings.';
      const title = extractTitle(body, 'FALLBACK');

      // Should match the first line pattern or fallback
      expect(title.length).toBeGreaterThan(0);
    });

    it('should truncate long titles', () => {
      const longTitle = 'A'.repeat(150);
      const body = `# ${longTitle}\n\nContent.`;
      const title = extractTitle(body, 'FALLBACK');

      expect(title.length).toBeLessThanOrEqual(100);
    });
  });

  describe('parseMarkdownFile', () => {
    it('should parse complete markdown file', () => {
      const content = `---
capture_type: LEARNING
timestamp: 2026-01-04 10:30:00
session_id: abc-123
executor: main
---

# LEARNING: Volume Mounting

I discovered that Podman uses host:container syntax.

---

*Captured by PAI History System*
`;

      const result = parseMarkdownFile(content);

      expect(result.frontmatter.capture_type).toBe('LEARNING');
      expect(result.title).toBe('Volume Mounting');
      expect(result.body).toContain('host:container syntax');
    });

    it('should extract title from frontmatter when no heading', () => {
      const content = `---
capture_type: DECISION
timestamp: 2026-01-04 10:30:00
session_id: abc-123
executor: architect
---

We decided to use the repository pattern.
`;

      const result = parseMarkdownFile(content);

      expect(result.title.length).toBeGreaterThan(0);
    });
  });

  describe('cleanBody', () => {
    it('should remove capture footer', () => {
      const body = `Some content here.

---

*Captured by PAI History System stop-hook*`;

      const cleaned = cleanBody(body);

      expect(cleaned).toBe('Some content here.');
      expect(cleaned).not.toContain('Captured by');
    });

    it('should remove excessive blank lines', () => {
      const body = `Line one.



Line two.




Line three.`;

      const cleaned = cleanBody(body);

      expect(cleaned).not.toContain('\n\n\n');
      expect(cleaned).toContain('Line one.');
      expect(cleaned).toContain('Line two.');
      expect(cleaned).toContain('Line three.');
    });

    it('should trim whitespace', () => {
      const body = `

  Content with whitespace.

`;

      const cleaned = cleanBody(body);

      expect(cleaned).toBe('Content with whitespace.');
    });
  });
});
