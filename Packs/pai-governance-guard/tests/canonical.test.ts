import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { stableStringify, sha256Hex, canonicalHash } from "../src/governance/canonical";

describe("stableStringify", () => {
  it("serializes primitives", () => {
    assert.equal(stableStringify(null), "null");
    assert.equal(stableStringify(undefined), "null");
    assert.equal(stableStringify(true), "true");
    assert.equal(stableStringify(false), "false");
    assert.equal(stableStringify(42), "42");
    assert.equal(stableStringify(3.14), "3.14");
    assert.equal(stableStringify("hello"), '"hello"');
  });

  it("serializes arrays", () => {
    assert.equal(stableStringify([1, 2, 3]), "[1,2,3]");
    assert.equal(stableStringify([]), "[]");
    assert.equal(stableStringify(["a", null, true]), '["a",null,true]');
  });

  it("sorts object keys deterministically", () => {
    const a = { z: 1, a: 2, m: 3 };
    const b = { a: 2, m: 3, z: 1 };
    assert.equal(stableStringify(a), stableStringify(b));
    assert.equal(stableStringify(a), '{"a":2,"m":3,"z":1}');
  });

  it("handles nested objects", () => {
    const obj = { b: { d: 1, c: 2 }, a: [3] };
    assert.equal(stableStringify(obj), '{"a":[3],"b":{"c":2,"d":1}}');
  });

  it("omits undefined values in objects", () => {
    const obj = { a: 1, b: undefined, c: 3 };
    assert.equal(stableStringify(obj), '{"a":1,"c":3}');
  });
});

describe("sha256Hex", () => {
  it("produces 64-char hex string", () => {
    const hash = sha256Hex("hello");
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    assert.equal(sha256Hex("test"), sha256Hex("test"));
  });

  it("produces different hashes for different inputs", () => {
    assert.notEqual(sha256Hex("a"), sha256Hex("b"));
  });

  it("matches known SHA-256 for empty string", () => {
    assert.equal(
      sha256Hex(""),
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });
});

describe("canonicalHash", () => {
  it("hashes via stableStringify then SHA-256", () => {
    const obj = { b: 2, a: 1 };
    const expected = sha256Hex(stableStringify(obj));
    assert.equal(canonicalHash(obj), expected);
  });

  it("produces same hash for key-reordered objects", () => {
    assert.equal(
      canonicalHash({ x: 1, y: 2 }),
      canonicalHash({ y: 2, x: 1 })
    );
  });
});
