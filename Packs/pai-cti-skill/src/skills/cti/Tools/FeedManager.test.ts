/**
 * FeedManager Tests
 *
 * Run with: bun test
 */

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { stringify, parse } from "yaml";

import {
  loadConfig,
  saveConfig,
  addFeed,
  removeFeed,
  enableFeed,
  disableFeed,
  listFeeds,
  getFeed,
  testFeed,
  validateFeed,
  setConfigPath,
  getConfigPath,
  type Feed,
  type FeedConfig,
} from "./FeedManager";

// ============================================
// Test Fixtures
// ============================================

function createTestConfig(): FeedConfig {
  return {
    version: "1.0",
    last_updated: "2026-01-10",
    feeds: [
      {
        name: "Test Feed 1",
        description: "A test feed",
        url: "https://example.com/feed1.json",
        category: "malware",
        format: "json",
        api_key_env: null,
        update_frequency: "hourly",
        enabled: true,
        priority: 1,
        tlp: "clear",
        ioc_types: ["ip", "url"],
        added: "2026-01-10",
        last_checked: null,
      },
      {
        name: "Test Feed 2",
        description: "Another test feed",
        url: "https://example.com/feed2.xml",
        category: "phishing",
        format: "xml",
        api_key_env: "TEST_API_KEY",
        update_frequency: "daily",
        enabled: false,
        priority: 5,
        tlp: "green",
        ioc_types: ["domain"],
        added: "2026-01-10",
        last_checked: null,
      },
      {
        name: "Test Feed 3",
        description: "Third test feed",
        url: "https://example.com/feed3.csv",
        category: "malware",
        format: "csv",
        api_key_env: null,
        update_frequency: "weekly",
        enabled: true,
        priority: 3,
        tlp: "amber",
        ioc_types: ["sha256"],
        added: "2026-01-10",
        last_checked: null,
      },
    ],
    settings: {
      default_update_frequency: "hourly",
      max_concurrent_fetches: 3,
      request_timeout: 30,
      retry_attempts: 3,
      retry_delay: 5,
      cache_ttl: 3600,
      storage_path: "/tmp/threat-intel/",
      max_iocs_per_feed: 10000,
      retention_days: 90,
      notify_on_critical: true,
      notify_on_high: true,
      notification_channels: ["knowledge_graph"],
    },
  };
}

// ============================================
// Test Setup / Teardown
// ============================================

let tempDir: string;
let tempConfigPath: string;
let originalConfigPath: string;

beforeEach(() => {
  // Create temp directory for test config
  tempDir = mkdtempSync(join(tmpdir(), "feedmanager-test-"));
  tempConfigPath = join(tempDir, "TISources.yaml");

  // Save original config path
  originalConfigPath = getConfigPath();

  // Create test config file
  const testConfig = createTestConfig();
  writeFileSync(tempConfigPath, stringify(testConfig), "utf-8");

  // Set config path to temp file
  setConfigPath(tempConfigPath);
});

afterEach(() => {
  // Restore original config path
  setConfigPath(originalConfigPath);

  // Clean up temp directory
  try {
    rmSync(tempDir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
});

// ============================================
// Config Loading Tests
// ============================================

describe("loadConfig", () => {
  test("loads configuration from YAML file", () => {
    const config = loadConfig();

    expect(config.version).toBe("1.0");
    expect(config.feeds).toHaveLength(3);
    expect(config.feeds[0].name).toBe("Test Feed 1");
  });

  test("throws error when config file does not exist", () => {
    setConfigPath("/nonexistent/path/config.yaml");

    expect(() => loadConfig()).toThrow("Configuration file not found");
  });

  test("initializes empty feeds array if missing", () => {
    const configWithoutFeeds = { version: "1.0", last_updated: "2026-01-10" };
    writeFileSync(tempConfigPath, stringify(configWithoutFeeds), "utf-8");

    const config = loadConfig();
    expect(config.feeds).toEqual([]);
  });
});

describe("saveConfig", () => {
  test("saves configuration to YAML file", () => {
    const config = loadConfig();
    config.feeds[0].name = "Updated Feed Name";

    saveConfig(config);

    const savedConfig = loadConfig();
    expect(savedConfig.feeds[0].name).toBe("Updated Feed Name");
  });

  test("updates last_updated timestamp", () => {
    const config = loadConfig();
    const originalDate = config.last_updated;

    // Wait a bit to ensure different timestamp (though date-only should be same day)
    saveConfig(config);

    const savedConfig = loadConfig();
    // Should be today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];
    expect(savedConfig.last_updated).toBe(today);
  });
});

// ============================================
// List Feeds Tests
// ============================================

describe("listFeeds", () => {
  test("returns all feeds when no category specified", () => {
    const feeds = listFeeds();

    expect(feeds).toHaveLength(3);
  });

  test("filters feeds by category", () => {
    const malwareFeeds = listFeeds("malware");

    expect(malwareFeeds).toHaveLength(2);
    expect(malwareFeeds.every((f) => f.category === "malware")).toBe(true);
  });

  test("returns empty array for non-existent category", () => {
    const aptFeeds = listFeeds("apt");

    expect(aptFeeds).toHaveLength(0);
  });

  test("category filter is case-insensitive", () => {
    const feeds = listFeeds("MALWARE");

    expect(feeds).toHaveLength(2);
  });
});

describe("getFeed", () => {
  test("returns feed by name", () => {
    const feed = getFeed("Test Feed 1");

    expect(feed).toBeDefined();
    expect(feed?.name).toBe("Test Feed 1");
    expect(feed?.category).toBe("malware");
  });

  test("returns undefined for non-existent feed", () => {
    const feed = getFeed("Nonexistent Feed");

    expect(feed).toBeUndefined();
  });

  test("name lookup is case-insensitive", () => {
    const feed = getFeed("test feed 1");

    expect(feed).toBeDefined();
    expect(feed?.name).toBe("Test Feed 1");
  });
});

// ============================================
// Add Feed Tests
// ============================================

describe("addFeed", () => {
  test("adds a new feed to configuration", () => {
    const newFeed: Feed = {
      name: "New Test Feed",
      url: "https://example.com/new-feed.json",
      category: "c2",
      format: "json",
      api_key_env: null,
      update_frequency: "daily",
      enabled: true,
      priority: 5,
      tlp: "clear",
    };

    addFeed(newFeed);

    const feeds = listFeeds();
    expect(feeds).toHaveLength(4);

    const addedFeed = getFeed("New Test Feed");
    expect(addedFeed).toBeDefined();
    expect(addedFeed?.category).toBe("c2");
  });

  test("sets default values for optional fields", () => {
    const minimalFeed: Feed = {
      name: "Minimal Feed",
      url: "https://example.com/minimal.json",
      category: "general",
      format: "json",
      api_key_env: null,
      update_frequency: "daily",
      enabled: true,
      priority: 5,
      tlp: "clear",
    };

    addFeed(minimalFeed);

    const addedFeed = getFeed("Minimal Feed");
    expect(addedFeed?.added).toBeDefined();
    expect(addedFeed?.last_checked).toBeNull();
  });

  test("throws error for duplicate feed name", () => {
    const duplicateFeed: Feed = {
      name: "Test Feed 1",
      url: "https://example.com/duplicate.json",
      category: "general",
      format: "json",
      api_key_env: null,
      update_frequency: "daily",
      enabled: true,
      priority: 5,
      tlp: "clear",
    };

    expect(() => addFeed(duplicateFeed)).toThrow('Feed with name "Test Feed 1" already exists');
  });

  test("throws error for invalid feed data", () => {
    const invalidFeed = {
      name: "",
      url: "not-a-url",
      category: "invalid-category",
      format: "invalid-format",
    } as Feed;

    expect(() => addFeed(invalidFeed)).toThrow("Validation failed");
  });
});

// ============================================
// Remove Feed Tests
// ============================================

describe("removeFeed", () => {
  test("removes feed by name", () => {
    removeFeed("Test Feed 1");

    const feeds = listFeeds();
    expect(feeds).toHaveLength(2);

    const removedFeed = getFeed("Test Feed 1");
    expect(removedFeed).toBeUndefined();
  });

  test("throws error for non-existent feed", () => {
    expect(() => removeFeed("Nonexistent Feed")).toThrow('Feed "Nonexistent Feed" not found');
  });

  test("name lookup is case-insensitive", () => {
    removeFeed("test feed 1");

    const feed = getFeed("Test Feed 1");
    expect(feed).toBeUndefined();
  });
});

// ============================================
// Enable/Disable Feed Tests
// ============================================

describe("enableFeed", () => {
  test("enables a disabled feed", () => {
    // Test Feed 2 is initially disabled
    const feedBefore = getFeed("Test Feed 2");
    expect(feedBefore?.enabled).toBe(false);

    enableFeed("Test Feed 2");

    const feedAfter = getFeed("Test Feed 2");
    expect(feedAfter?.enabled).toBe(true);
  });

  test("throws error for non-existent feed", () => {
    expect(() => enableFeed("Nonexistent Feed")).toThrow('Feed "Nonexistent Feed" not found');
  });
});

describe("disableFeed", () => {
  test("disables an enabled feed", () => {
    // Test Feed 1 is initially enabled
    const feedBefore = getFeed("Test Feed 1");
    expect(feedBefore?.enabled).toBe(true);

    disableFeed("Test Feed 1");

    const feedAfter = getFeed("Test Feed 1");
    expect(feedAfter?.enabled).toBe(false);
  });

  test("throws error for non-existent feed", () => {
    expect(() => disableFeed("Nonexistent Feed")).toThrow('Feed "Nonexistent Feed" not found');
  });
});

// ============================================
// Validation Tests
// ============================================

describe("validateFeed", () => {
  test("returns no errors for valid feed", () => {
    const validFeed: Partial<Feed> = {
      name: "Valid Feed",
      url: "https://example.com/feed.json",
      category: "malware",
      format: "json",
      priority: 5,
      tlp: "clear",
    };

    const errors = validateFeed(validFeed);
    expect(errors).toHaveLength(0);
  });

  test("returns error for missing name", () => {
    const feed: Partial<Feed> = {
      url: "https://example.com/feed.json",
      category: "malware",
      format: "json",
    };

    const errors = validateFeed(feed);
    expect(errors.some((e) => e.field === "name")).toBe(true);
  });

  test("returns error for empty name", () => {
    const feed: Partial<Feed> = {
      name: "   ",
      url: "https://example.com/feed.json",
      category: "malware",
      format: "json",
    };

    const errors = validateFeed(feed);
    expect(errors.some((e) => e.field === "name")).toBe(true);
  });

  test("returns error for missing URL", () => {
    const feed: Partial<Feed> = {
      name: "Test Feed",
      category: "malware",
      format: "json",
    };

    const errors = validateFeed(feed);
    expect(errors.some((e) => e.field === "url")).toBe(true);
  });

  test("returns error for invalid URL format", () => {
    const feed: Partial<Feed> = {
      name: "Test Feed",
      url: "not-a-valid-url",
      category: "malware",
      format: "json",
    };

    const errors = validateFeed(feed);
    expect(errors.some((e) => e.field === "url" && e.message.includes("Invalid URL"))).toBe(true);
  });

  test("returns error for invalid category", () => {
    const feed: Partial<Feed> = {
      name: "Test Feed",
      url: "https://example.com/feed.json",
      category: "invalid-category" as any,
      format: "json",
    };

    const errors = validateFeed(feed);
    expect(errors.some((e) => e.field === "category")).toBe(true);
  });

  test("returns error for invalid format", () => {
    const feed: Partial<Feed> = {
      name: "Test Feed",
      url: "https://example.com/feed.json",
      category: "malware",
      format: "invalid-format" as any,
    };

    const errors = validateFeed(feed);
    expect(errors.some((e) => e.field === "format")).toBe(true);
  });

  test("returns error for priority out of range", () => {
    const feedLow: Partial<Feed> = {
      name: "Test Feed",
      url: "https://example.com/feed.json",
      category: "malware",
      format: "json",
      priority: 0,
    };

    const feedHigh: Partial<Feed> = {
      name: "Test Feed",
      url: "https://example.com/feed.json",
      category: "malware",
      format: "json",
      priority: 11,
    };

    expect(validateFeed(feedLow).some((e) => e.field === "priority")).toBe(true);
    expect(validateFeed(feedHigh).some((e) => e.field === "priority")).toBe(true);
  });

  test("returns error for invalid TLP", () => {
    const feed: Partial<Feed> = {
      name: "Test Feed",
      url: "https://example.com/feed.json",
      category: "malware",
      format: "json",
      tlp: "invalid-tlp" as any,
    };

    const errors = validateFeed(feed);
    expect(errors.some((e) => e.field === "tlp")).toBe(true);
  });

  test("accepts all valid categories", () => {
    const categories = [
      "malware",
      "phishing",
      "c2",
      "apt",
      "general",
      "iocs",
      "reputation",
      "infrastructure",
      "government",
      "blog",
    ];

    for (const category of categories) {
      const feed: Partial<Feed> = {
        name: "Test Feed",
        url: "https://example.com/feed.json",
        category: category as any,
        format: "json",
      };

      const errors = validateFeed(feed);
      expect(errors.some((e) => e.field === "category")).toBe(false);
    }
  });

  test("accepts all valid formats", () => {
    const formats = ["json", "xml", "csv", "rss", "txt", "html", "markdown"];

    for (const format of formats) {
      const feed: Partial<Feed> = {
        name: "Test Feed",
        url: "https://example.com/feed.json",
        category: "malware",
        format: format as any,
      };

      const errors = validateFeed(feed);
      expect(errors.some((e) => e.field === "format")).toBe(false);
    }
  });
});

// ============================================
// Test Feed Connection Tests
// ============================================

describe("testFeed", () => {
  test("returns error for non-existent feed", async () => {
    const result = await testFeed("Nonexistent Feed");

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  test("returns error when API key is required but missing", async () => {
    // Test Feed 2 requires TEST_API_KEY which is not set
    const originalEnv = process.env.TEST_API_KEY;
    delete process.env.TEST_API_KEY;

    const result = await testFeed("Test Feed 2");

    expect(result.success).toBe(false);
    expect(result.apiKeyValid).toBe(false);
    expect(result.error).toContain("API key not found");

    // Restore
    if (originalEnv) {
      process.env.TEST_API_KEY = originalEnv;
    }
  });

  test("includes response time in result", async () => {
    // Add a feed pointing to a mock or known endpoint
    const mockFeed: Feed = {
      name: "Mock Feed",
      url: "https://httpbin.org/json",
      category: "general",
      format: "json",
      api_key_env: null,
      update_frequency: "daily",
      enabled: true,
      priority: 5,
      tlp: "clear",
    };

    addFeed(mockFeed);

    const result = await testFeed("Mock Feed");

    // Result should have responseTime regardless of success
    expect(result.responseTime).toBeDefined();
    expect(typeof result.responseTime).toBe("number");
  });

  test("handles network errors gracefully", async () => {
    const badFeed: Feed = {
      name: "Bad Network Feed",
      url: "https://nonexistent.invalid.domain.xyz/feed.json",
      category: "general",
      format: "json",
      api_key_env: null,
      update_frequency: "daily",
      enabled: true,
      priority: 5,
      tlp: "clear",
    };

    addFeed(badFeed);

    const result = await testFeed("Bad Network Feed");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================
// Config File Operations Tests
// ============================================

describe("Config file operations", () => {
  test("persists changes across load/save cycles", () => {
    // Add feed
    const newFeed: Feed = {
      name: "Persistent Feed",
      url: "https://example.com/persistent.json",
      category: "apt",
      format: "json",
      api_key_env: null,
      update_frequency: "weekly",
      enabled: true,
      priority: 7,
      tlp: "amber",
    };

    addFeed(newFeed);

    // Disable it
    disableFeed("Persistent Feed");

    // Reload config (simulating a fresh start)
    const config = loadConfig();

    // Find the feed and verify state persisted
    const feed = config.feeds.find((f) => f.name === "Persistent Feed");
    expect(feed).toBeDefined();
    expect(feed?.enabled).toBe(false);
    expect(feed?.priority).toBe(7);
  });

  test("handles concurrent modifications", () => {
    // Load config twice
    const config1 = loadConfig();
    const config2 = loadConfig();

    // Modify both
    config1.feeds[0].priority = 10;
    config2.feeds[0].description = "Updated description";

    // Save first
    saveConfig(config1);

    // Save second (will overwrite first changes)
    saveConfig(config2);

    // Verify second write won
    const finalConfig = loadConfig();
    expect(finalConfig.feeds[0].description).toBe("Updated description");
    // First change is lost (expected behavior without proper locking)
  });

  test("preserves settings and categories sections", () => {
    const newFeed: Feed = {
      name: "Settings Test Feed",
      url: "https://example.com/settings-test.json",
      category: "general",
      format: "json",
      api_key_env: null,
      update_frequency: "daily",
      enabled: true,
      priority: 5,
      tlp: "clear",
    };

    addFeed(newFeed);

    const config = loadConfig();
    expect(config.settings).toBeDefined();
    expect(config.settings?.max_concurrent_fetches).toBe(3);
  });
});

// ============================================
// Error Handling Tests
// ============================================

describe("Error handling", () => {
  test("handles malformed YAML gracefully", () => {
    writeFileSync(tempConfigPath, "{ invalid yaml: [", "utf-8");

    expect(() => loadConfig()).toThrow();
  });

  test("handles read-only config file", () => {
    // This test is platform-dependent and may not work in all environments
    // Skip if not on Unix-like system
    if (process.platform === "win32") {
      return;
    }

    const { chmodSync } = require("fs");

    try {
      chmodSync(tempConfigPath, 0o444); // Read-only

      const newFeed: Feed = {
        name: "Read-Only Test Feed",
        url: "https://example.com/readonly.json",
        category: "general",
        format: "json",
        api_key_env: null,
        update_frequency: "daily",
        enabled: true,
        priority: 5,
        tlp: "clear",
      };

      expect(() => addFeed(newFeed)).toThrow();
    } finally {
      // Restore permissions for cleanup
      chmodSync(tempConfigPath, 0o644);
    }
  });

  test("validates all required fields before writing", () => {
    const incompleteFeed = {
      name: "Incomplete Feed",
      // Missing url, category, format
    } as Feed;

    expect(() => addFeed(incompleteFeed)).toThrow("Validation failed");

    // Verify nothing was written
    const feeds = listFeeds();
    expect(feeds.find((f) => f.name === "Incomplete Feed")).toBeUndefined();
  });
});

// ============================================
// Integration Tests
// ============================================

describe("Integration tests", () => {
  test("full workflow: add, enable, disable, remove", () => {
    const feed: Feed = {
      name: "Integration Test Feed",
      url: "https://example.com/integration.json",
      category: "c2",
      format: "json",
      api_key_env: null,
      update_frequency: "hourly",
      enabled: false,
      priority: 3,
      tlp: "green",
    };

    // Add
    addFeed(feed);
    expect(getFeed("Integration Test Feed")).toBeDefined();
    expect(getFeed("Integration Test Feed")?.enabled).toBe(false);

    // Enable
    enableFeed("Integration Test Feed");
    expect(getFeed("Integration Test Feed")?.enabled).toBe(true);

    // Disable
    disableFeed("Integration Test Feed");
    expect(getFeed("Integration Test Feed")?.enabled).toBe(false);

    // Remove
    removeFeed("Integration Test Feed");
    expect(getFeed("Integration Test Feed")).toBeUndefined();
  });

  test("list with category filter after modifications", () => {
    // Initial state: 2 malware feeds
    expect(listFeeds("malware")).toHaveLength(2);

    // Add another malware feed
    addFeed({
      name: "New Malware Feed",
      url: "https://example.com/new-malware.json",
      category: "malware",
      format: "json",
      api_key_env: null,
      update_frequency: "daily",
      enabled: true,
      priority: 5,
      tlp: "clear",
    });

    expect(listFeeds("malware")).toHaveLength(3);

    // Remove one
    removeFeed("New Malware Feed");
    expect(listFeeds("malware")).toHaveLength(2);
  });
});
