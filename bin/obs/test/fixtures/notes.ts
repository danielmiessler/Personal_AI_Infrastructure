/**
 * Test note definitions for obs integration tests
 *
 * These notes are created in an ephemeral test vault during setup.
 * Each note has controlled dates for testing --since, --modified, --created filters.
 */

export interface TestNote {
  id: string;
  filename: string;
  frontmatter: {
    generation_date?: string;
    tags?: string[];
    source?: string;
  };
  content: string;
  /** Days ago for mtime (file modification time) */
  mtimeDaysAgo: number;
  /** Days ago for birthtime (file creation time) - defaults to mtimeDaysAgo */
  birthtimeDaysAgo?: number;
}

/**
 * Helper to generate a date string N days ago
 */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

/**
 * Helper to generate full datetime string N days ago
 */
export function datetimeAgo(n: number, hour = 10, minute = 30): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.toISOString().split("T")[0]} ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

/**
 * Test notes with controlled dates and tags
 */
export const TEST_NOTES: TestNote[] = [
  // Recent work note (today)
  {
    id: "recent-work",
    filename: "2025-12-08-Recent-Work-Note.md",
    frontmatter: {
      generation_date: datetimeAgo(0),
      tags: ["scope/work", "project/test", "meeting"],
      source: "test",
    },
    content: "This is a recent work note created today.\n\nIt should appear in --since today and --since 7d queries.",
    mtimeDaysAgo: 0,
  },

  // Week-old work note
  {
    id: "week-old-work",
    filename: "2025-12-01-Week-Old-Work.md",
    frontmatter: {
      generation_date: datetimeAgo(7),
      tags: ["scope/work", "project/test"],
      source: "test",
    },
    content: "This work note is 7 days old.\n\nIt should appear in --since 2w but not --since today.",
    mtimeDaysAgo: 7,
  },

  // Month-old private note
  {
    id: "month-old-private",
    filename: "2025-11-08-Month-Old-Private.md",
    frontmatter: {
      generation_date: datetimeAgo(30),
      tags: ["scope/private", "personal"],
      source: "test",
    },
    content: "This private note is 30 days old.\n\nIt should only appear with --scope private or --scope all.",
    mtimeDaysAgo: 30,
  },

  // Note with no scope tag (defaults to private)
  {
    id: "no-scope",
    filename: "2025-12-05-No-Scope-Tag.md",
    frontmatter: {
      generation_date: datetimeAgo(3),
      tags: ["incoming", "ideas"],
      source: "test",
    },
    content: "This note has no scope tag.\n\nBy security model, it defaults to private (excluded from work scope).",
    mtimeDaysAgo: 3,
  },

  // Note with different mtime and birthtime
  {
    id: "modified-recently",
    filename: "2025-11-15-Modified-Recently.md",
    frontmatter: {
      generation_date: datetimeAgo(23), // Captured 23 days ago
      tags: ["scope/work", "project/test"],
      source: "test",
    },
    content: "This note was captured 23 days ago but modified 1 day ago.\n\nTests --since vs --modified difference.",
    mtimeDaysAgo: 1,  // Modified yesterday
    birthtimeDaysAgo: 23, // File created 23 days ago
  },

  // Note without frontmatter date (uses mtime fallback)
  {
    id: "no-frontmatter-date",
    filename: "2025-12-06-No-Frontmatter-Date.md",
    frontmatter: {
      tags: ["scope/work", "project/test"],
      source: "test",
      // No generation_date - should fall back to mtime
    },
    content: "This note has no generation_date in frontmatter.\n\nThe --since filter should fall back to mtime.",
    mtimeDaysAgo: 2,
  },

  // Very old work note (for boundary testing)
  {
    id: "very-old",
    filename: "2025-09-01-Very-Old-Note.md",
    frontmatter: {
      generation_date: datetimeAgo(98),
      tags: ["scope/work", "archive"],
      source: "test",
    },
    content: "This work note is ~3 months old.\n\nUseful for testing longer time ranges.",
    mtimeDaysAgo: 98,
  },

  // Incoming note (for testing incoming filter)
  {
    id: "incoming-work",
    filename: "2025-12-07-Incoming-Work.md",
    frontmatter: {
      generation_date: datetimeAgo(1),
      tags: ["scope/work", "incoming", "project/test"],
      source: "telegram",
    },
    content: "This is an incoming work note waiting to be processed.\n\nShould appear in obs incoming command.",
    mtimeDaysAgo: 1,
  },
];

/**
 * Generate markdown content from test note definition
 */
export function generateMarkdown(note: TestNote): string {
  const frontmatterLines = ["---"];

  if (note.frontmatter.generation_date) {
    frontmatterLines.push(`generation_date: "${note.frontmatter.generation_date}"`);
  }
  if (note.frontmatter.tags && note.frontmatter.tags.length > 0) {
    frontmatterLines.push(`tags:`);
    for (const tag of note.frontmatter.tags) {
      frontmatterLines.push(`  - ${tag}`);
    }
  }
  if (note.frontmatter.source) {
    frontmatterLines.push(`source: ${note.frontmatter.source}`);
  }

  frontmatterLines.push("---");
  frontmatterLines.push("");
  frontmatterLines.push(note.content);

  return frontmatterLines.join("\n");
}
