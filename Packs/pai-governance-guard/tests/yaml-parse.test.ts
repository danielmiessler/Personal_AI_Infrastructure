import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseYaml } from "../src/governance/yaml-parse";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("YAML parser — scalars", () => {
  it("parses booleans", () => {
    const result = parseYaml("a: true\nb: false\nc: True\nd: FALSE") as any;
    assert.equal(result.a, true);
    assert.equal(result.b, false);
    assert.equal(result.c, true);
    assert.equal(result.d, false);
  });

  it("parses integers", () => {
    const result = parseYaml("x: 42\ny: -7\nz: 0") as any;
    assert.equal(result.x, 42);
    assert.equal(result.y, -7);
    assert.equal(result.z, 0);
  });

  it("parses floats", () => {
    const result = parseYaml("pi: 3.14\nneg: -0.5") as any;
    assert.equal(result.pi, 3.14);
    assert.equal(result.neg, -0.5);
  });

  it("parses quoted strings", () => {
    const result = parseYaml('a: "hello"\nb: \'world\'') as any;
    assert.equal(result.a, "hello");
    assert.equal(result.b, "world");
  });

  it("parses unquoted strings", () => {
    const result = parseYaml("name: standard") as any;
    assert.equal(result.name, "standard");
  });

  it("parses null values", () => {
    const result = parseYaml("a: null\nb: ~") as any;
    assert.equal(result.a, null);
    assert.equal(result.b, null);
  });
});

describe("YAML parser — mappings", () => {
  it("parses flat mappings", () => {
    const result = parseYaml("a: 1\nb: 2\nc: 3") as any;
    assert.deepEqual(result, { a: 1, b: 2, c: 3 });
  });

  it("parses nested mappings", () => {
    const yaml = `parent:
  child1: value1
  child2: value2`;
    const result = parseYaml(yaml) as any;
    assert.deepEqual(result, { parent: { child1: "value1", child2: "value2" } });
  });

  it("parses deeply nested mappings", () => {
    const yaml = `a:
  b:
    c: deep`;
    const result = parseYaml(yaml) as any;
    assert.equal(result.a.b.c, "deep");
  });
});

describe("YAML parser — sequences", () => {
  it("parses simple sequences", () => {
    const yaml = `items:
  - one
  - two
  - three`;
    const result = parseYaml(yaml) as any;
    assert.deepEqual(result.items, ["one", "two", "three"]);
  });

  it("parses sequences of mappings", () => {
    const yaml = `rules:
  - id: rule1
    decision: deny
  - id: rule2
    decision: approve`;
    const result = parseYaml(yaml) as any;
    assert.equal(result.rules.length, 2);
    assert.equal(result.rules[0].id, "rule1");
    assert.equal(result.rules[0].decision, "deny");
    assert.equal(result.rules[1].id, "rule2");
    assert.equal(result.rules[1].decision, "approve");
  });

  it("parses mixed scalar types in sequences", () => {
    const yaml = `items:
  - 42
  - true
  - hello`;
    const result = parseYaml(yaml) as any;
    assert.deepEqual(result.items, [42, true, "hello"]);
  });
});

describe("YAML parser — comments", () => {
  it("strips full-line comments", () => {
    const yaml = `# This is a comment
key: value
# Another comment`;
    const result = parseYaml(yaml) as any;
    assert.equal(result.key, "value");
  });

  it("strips inline comments", () => {
    const yaml = `key: value # inline comment`;
    const result = parseYaml(yaml) as any;
    assert.equal(result.key, "value");
  });

  it("preserves # in quoted strings", () => {
    const yaml = `key: "value # not a comment"`;
    const result = parseYaml(yaml) as any;
    assert.equal(result.key, "value # not a comment");
  });
});

describe("YAML parser — edge cases", () => {
  it("throws on empty input", () => {
    assert.throws(() => parseYaml(""), /empty document/);
  });

  it("throws on whitespace-only input", () => {
    assert.throws(() => parseYaml("   \n  \n  "), /empty document/);
  });

  it("handles colons in quoted values", () => {
    const yaml = 'url: "https://example.com"';
    const result = parseYaml(yaml) as any;
    assert.equal(result.url, "https://example.com");
  });
});

describe("YAML parser — policy presets", () => {
  const policiesDir = join(__dirname, "..", "policies");

  it("parses minimal.yaml", () => {
    const raw = readFileSync(join(policiesDir, "minimal.yaml"), "utf8");
    const result = parseYaml(raw) as any;
    assert.equal(result.name, "minimal");
    assert.equal(result.default_decision, "approve");
    assert.ok(Array.isArray(result.rules));
    assert.ok(result.rules.length >= 3);
    assert.equal(result.rules[0].id, "block-destructive");
    assert.equal(result.rules[0].decision, "deny");
  });

  it("parses standard.yaml", () => {
    const raw = readFileSync(join(policiesDir, "standard.yaml"), "utf8");
    const result = parseYaml(raw) as any;
    assert.equal(result.name, "standard");
    assert.equal(result.default_decision, "deny");
    assert.ok(result.rules.length >= 10);
    assert.ok(result.box_policy);
    assert.equal(result.box_policy.requireDefiniteTrue, true);
    assert.ok(result.diamond_policy);
  });

  it("parses strict.yaml", () => {
    const raw = readFileSync(join(policiesDir, "strict.yaml"), "utf8");
    const result = parseYaml(raw) as any;
    assert.equal(result.name, "strict");
    assert.equal(result.default_decision, "deny");
    assert.equal(result.rules[0].id, "allow-read");
    assert.equal(result.rules[0].decision, "approve");
    assert.ok(result.box_policy);
    assert.equal(result.box_policy.maxSeverity, "info");
  });
});
