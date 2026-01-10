/**
 * Tests for STIX 2.1 Bundle Generator
 *
 * Run with: bun test StixGenerator.test.ts
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { unlink, writeFile } from "fs/promises";
import {
  generateUUID,
  generateStixId,
  generatePattern,
  detectIoCType,
  parseIndicatorString,
  createIndicator,
  createMalware,
  createThreatActor,
  createAttackPattern,
  createRelationship,
  createBundle,
  getTlpMarking,
  getTlpDefinition,
  TLP_MARKINGS,
  type IoC,
  type StixBundle,
  type StixIndicator,
  type StixMalware,
  type StixThreatActor,
  type StixAttackPattern,
  type StixRelationship,
} from "./StixGenerator";

// =============================================================================
// UUID Generation Tests
// =============================================================================

describe("UUID Generation", () => {
  test("generateUUID returns valid UUIDv4 format", () => {
    const uuid = generateUUID();
    // UUIDv4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
  });

  test("generateUUID returns unique values", () => {
    const uuids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      uuids.add(generateUUID());
    }
    expect(uuids.size).toBe(100);
  });

  test("generateStixId returns correct format", () => {
    const indicatorId = generateStixId("indicator");
    expect(indicatorId).toMatch(/^indicator--[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    const malwareId = generateStixId("malware");
    expect(malwareId).toMatch(/^malware--[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});

// =============================================================================
// STIX Pattern Generation Tests
// =============================================================================

describe("STIX Pattern Generation", () => {
  test("generates correct pattern for IPv4", () => {
    const ioc: IoC = { type: "ipv4", value: "1.2.3.4" };
    expect(generatePattern(ioc)).toBe("[ipv4-addr:value = '1.2.3.4']");
  });

  test("generates correct pattern for IP (alias)", () => {
    const ioc: IoC = { type: "ip", value: "192.168.1.1" };
    expect(generatePattern(ioc)).toBe("[ipv4-addr:value = '192.168.1.1']");
  });

  test("generates correct pattern for IPv6", () => {
    const ioc: IoC = { type: "ipv6", value: "2001:0db8:85a3:0000:0000:8a2e:0370:7334" };
    expect(generatePattern(ioc)).toBe("[ipv6-addr:value = '2001:0db8:85a3:0000:0000:8a2e:0370:7334']");
  });

  test("generates correct pattern for domain", () => {
    const ioc: IoC = { type: "domain", value: "evil.com" };
    expect(generatePattern(ioc)).toBe("[domain-name:value = 'evil.com']");
  });

  test("generates correct pattern for URL", () => {
    const ioc: IoC = { type: "url", value: "https://evil.com/malware.exe" };
    expect(generatePattern(ioc)).toBe("[url:value = 'https://evil.com/malware.exe']");
  });

  test("generates correct pattern for MD5 hash", () => {
    const ioc: IoC = { type: "md5", value: "d41d8cd98f00b204e9800998ecf8427e" };
    expect(generatePattern(ioc)).toBe("[file:hashes.'MD5' = 'd41d8cd98f00b204e9800998ecf8427e']");
  });

  test("generates correct pattern for SHA-1 hash", () => {
    const ioc: IoC = { type: "sha1", value: "da39a3ee5e6b4b0d3255bfef95601890afd80709" };
    expect(generatePattern(ioc)).toBe("[file:hashes.'SHA-1' = 'da39a3ee5e6b4b0d3255bfef95601890afd80709']");
  });

  test("generates correct pattern for SHA-256 hash", () => {
    const ioc: IoC = { type: "sha256", value: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" };
    expect(generatePattern(ioc)).toBe(
      "[file:hashes.'SHA-256' = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855']"
    );
  });

  test("generates correct pattern for SHA-512 hash", () => {
    const hash =
      "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e";
    const ioc: IoC = { type: "sha512", value: hash };
    expect(generatePattern(ioc)).toBe(`[file:hashes.'SHA-512' = '${hash}']`);
  });

  test("generates correct pattern for email", () => {
    const ioc: IoC = { type: "email", value: "attacker@evil.com" };
    expect(generatePattern(ioc)).toBe("[email-addr:value = 'attacker@evil.com']");
  });

  test("escapes single quotes in values", () => {
    const ioc: IoC = { type: "domain", value: "domain'with'quotes.com" };
    expect(generatePattern(ioc)).toBe("[domain-name:value = 'domain\\'with\\'quotes.com']");
  });
});

// =============================================================================
// IoC Type Detection Tests
// =============================================================================

describe("IoC Type Detection", () => {
  test("detects IPv4 addresses", () => {
    expect(detectIoCType("1.2.3.4")).toBe("ipv4");
    expect(detectIoCType("192.168.0.1")).toBe("ipv4");
    expect(detectIoCType("255.255.255.255")).toBe("ipv4");
  });

  test("detects IPv6 addresses", () => {
    expect(detectIoCType("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe("ipv6");
    expect(detectIoCType("::1")).toBe("ipv6");
    expect(detectIoCType("fe80::1")).toBe("ipv6");
  });

  test("detects MD5 hashes", () => {
    expect(detectIoCType("d41d8cd98f00b204e9800998ecf8427e")).toBe("md5");
  });

  test("detects SHA-1 hashes", () => {
    expect(detectIoCType("da39a3ee5e6b4b0d3255bfef95601890afd80709")).toBe("sha1");
  });

  test("detects SHA-256 hashes", () => {
    expect(detectIoCType("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")).toBe("sha256");
  });

  test("detects SHA-512 hashes", () => {
    const hash =
      "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e";
    expect(detectIoCType(hash)).toBe("sha512");
  });

  test("detects URLs", () => {
    expect(detectIoCType("https://evil.com/malware")).toBe("url");
    expect(detectIoCType("http://example.org/path")).toBe("url");
  });

  test("detects email addresses", () => {
    expect(detectIoCType("attacker@evil.com")).toBe("email");
    expect(detectIoCType("user.name+tag@domain.co.uk")).toBe("email");
  });

  test("detects domain names", () => {
    expect(detectIoCType("evil.com")).toBe("domain");
    expect(detectIoCType("subdomain.evil.org")).toBe("domain");
  });
});

// =============================================================================
// Indicator String Parsing Tests
// =============================================================================

describe("Indicator String Parsing", () => {
  test("parses type:value format", () => {
    const result = parseIndicatorString("ip:1.2.3.4");
    expect(result.type).toBe("ip");
    expect(result.value).toBe("1.2.3.4");
  });

  test("auto-detects type when not specified", () => {
    const result = parseIndicatorString("192.168.1.1");
    expect(result.type).toBe("ipv4");
    expect(result.value).toBe("192.168.1.1");
  });

  test("handles URLs correctly (does not split on http:)", () => {
    const result = parseIndicatorString("https://evil.com/path");
    expect(result.type).toBe("url");
    expect(result.value).toBe("https://evil.com/path");
  });

  test("parses domain type", () => {
    const result = parseIndicatorString("domain:evil.com");
    expect(result.type).toBe("domain");
    expect(result.value).toBe("evil.com");
  });
});

// =============================================================================
// Indicator Creation Tests
// =============================================================================

describe("Indicator Creation", () => {
  test("creates valid indicator object", () => {
    const ioc: IoC = { type: "ipv4", value: "1.2.3.4" };
    const indicator = createIndicator(ioc);

    expect(indicator.type).toBe("indicator");
    expect(indicator.spec_version).toBe("2.1");
    expect(indicator.id).toMatch(/^indicator--/);
    expect(indicator.pattern).toBe("[ipv4-addr:value = '1.2.3.4']");
    expect(indicator.pattern_type).toBe("stix");
    expect(indicator.valid_from).toBeDefined();
    expect(indicator.created).toBeDefined();
    expect(indicator.modified).toBeDefined();
  });

  test("applies custom options", () => {
    const ioc: IoC = { type: "domain", value: "evil.com" };
    const indicator = createIndicator(ioc, {
      name: "Malicious Domain",
      description: "Known C2 domain",
      indicatorTypes: ["malicious-activity"],
      confidence: 85,
    });

    expect(indicator.name).toBe("Malicious Domain");
    expect(indicator.description).toBe("Known C2 domain");
    expect(indicator.indicator_types).toEqual(["malicious-activity"]);
    expect(indicator.confidence).toBe(85);
  });

  test("applies TLP marking", () => {
    const ioc: IoC = { type: "ipv4", value: "1.2.3.4" };
    const indicator = createIndicator(ioc, { tlp: "amber" });

    expect(indicator.object_marking_refs).toContain(TLP_MARKINGS.amber);
  });
});

// =============================================================================
// Malware Creation Tests
// =============================================================================

describe("Malware Creation", () => {
  test("creates valid malware object", () => {
    const malware = createMalware("Emotet");

    expect(malware.type).toBe("malware");
    expect(malware.spec_version).toBe("2.1");
    expect(malware.id).toMatch(/^malware--/);
    expect(malware.name).toBe("Emotet");
    expect(malware.is_family).toBe(false);
  });

  test("applies custom options", () => {
    const malware = createMalware("TrickBot", {
      description: "Banking trojan",
      malwareTypes: ["trojan", "backdoor"],
      isFamily: true,
      capabilities: ["communicates-with-c2", "exfiltrates-data"],
      aliases: ["TrickLoader"],
      tlp: "red",
    });

    expect(malware.description).toBe("Banking trojan");
    expect(malware.malware_types).toEqual(["trojan", "backdoor"]);
    expect(malware.is_family).toBe(true);
    expect(malware.capabilities).toContain("communicates-with-c2");
    expect(malware.aliases).toContain("TrickLoader");
    expect(malware.object_marking_refs).toContain(TLP_MARKINGS.red);
  });
});

// =============================================================================
// Threat Actor Creation Tests
// =============================================================================

describe("Threat Actor Creation", () => {
  test("creates valid threat actor object", () => {
    const actor = createThreatActor("APT29");

    expect(actor.type).toBe("threat-actor");
    expect(actor.spec_version).toBe("2.1");
    expect(actor.id).toMatch(/^threat-actor--/);
    expect(actor.name).toBe("APT29");
  });

  test("applies custom options", () => {
    const actor = createThreatActor("APT29", {
      description: "Russian state-sponsored group",
      threatActorTypes: ["nation-state"],
      aliases: ["Cozy Bear", "The Dukes"],
      roles: ["agent"],
      goals: ["espionage"],
      sophistication: "expert",
      resourceLevel: "government",
      primaryMotivation: "ideology",
      tlp: "amber",
    });

    expect(actor.description).toBe("Russian state-sponsored group");
    expect(actor.threat_actor_types).toContain("nation-state");
    expect(actor.aliases).toContain("Cozy Bear");
    expect(actor.roles).toContain("agent");
    expect(actor.goals).toContain("espionage");
    expect(actor.sophistication).toBe("expert");
    expect(actor.resource_level).toBe("government");
    expect(actor.primary_motivation).toBe("ideology");
    expect(actor.object_marking_refs).toContain(TLP_MARKINGS.amber);
  });
});

// =============================================================================
// Attack Pattern Creation Tests
// =============================================================================

describe("Attack Pattern Creation", () => {
  test("creates valid attack pattern object", () => {
    const pattern = createAttackPattern("Spearphishing Link");

    expect(pattern.type).toBe("attack-pattern");
    expect(pattern.spec_version).toBe("2.1");
    expect(pattern.id).toMatch(/^attack-pattern--/);
    expect(pattern.name).toBe("Spearphishing Link");
  });

  test("applies custom options with MITRE ATT&CK reference", () => {
    const pattern = createAttackPattern("Spearphishing Link", {
      description: "Adversaries send spearphishing emails with a malicious link",
      externalReferences: [
        {
          source_name: "mitre-attack",
          external_id: "T1566.002",
          url: "https://attack.mitre.org/techniques/T1566/002/",
        },
      ],
      killChainPhases: [
        {
          kill_chain_name: "mitre-attack",
          phase_name: "initial-access",
        },
      ],
      tlp: "green",
    });

    expect(pattern.description).toBe("Adversaries send spearphishing emails with a malicious link");
    expect(pattern.external_references).toBeDefined();
    expect(pattern.external_references![0].external_id).toBe("T1566.002");
    expect(pattern.kill_chain_phases).toBeDefined();
    expect(pattern.kill_chain_phases![0].phase_name).toBe("initial-access");
    expect(pattern.object_marking_refs).toContain(TLP_MARKINGS.green);
  });
});

// =============================================================================
// Relationship Creation Tests
// =============================================================================

describe("Relationship Creation", () => {
  test("creates valid relationship object", () => {
    const sourceId = "threat-actor--12345678-1234-4123-8123-123456789012";
    const targetId = "malware--87654321-4321-4321-8321-210987654321";

    const relationship = createRelationship(sourceId, targetId, "uses");

    expect(relationship.type).toBe("relationship");
    expect(relationship.spec_version).toBe("2.1");
    expect(relationship.id).toMatch(/^relationship--/);
    expect(relationship.relationship_type).toBe("uses");
    expect(relationship.source_ref).toBe(sourceId);
    expect(relationship.target_ref).toBe(targetId);
  });

  test("applies custom options", () => {
    const sourceId = "indicator--12345678-1234-4123-8123-123456789012";
    const targetId = "malware--87654321-4321-4321-8321-210987654321";

    const relationship = createRelationship(sourceId, targetId, "indicates", {
      description: "This indicator indicates the presence of the malware",
      startTime: "2024-01-01T00:00:00.000Z",
      stopTime: "2024-12-31T23:59:59.999Z",
    });

    expect(relationship.description).toBe("This indicator indicates the presence of the malware");
    expect(relationship.start_time).toBe("2024-01-01T00:00:00.000Z");
    expect(relationship.stop_time).toBe("2024-12-31T23:59:59.999Z");
  });

  test("supports various relationship types", () => {
    const sourceId = "threat-actor--12345678-1234-4123-8123-123456789012";
    const targetId = "attack-pattern--87654321-4321-4321-8321-210987654321";

    const types = ["uses", "targets", "attributed-to", "indicates", "mitigates", "derived-from", "related-to"];

    for (const relType of types) {
      const rel = createRelationship(sourceId, targetId, relType);
      expect(rel.relationship_type).toBe(relType);
    }
  });
});

// =============================================================================
// Bundle Creation Tests
// =============================================================================

describe("Bundle Creation", () => {
  test("creates valid bundle structure", () => {
    const indicator = createIndicator({ type: "ipv4", value: "1.2.3.4" });
    const malware = createMalware("TestMalware");

    const bundle = createBundle([indicator, malware]);

    expect(bundle.type).toBe("bundle");
    expect(bundle.id).toMatch(/^bundle--/);
    expect(bundle.objects).toHaveLength(2);
  });

  test("creates empty bundle", () => {
    const bundle = createBundle([]);

    expect(bundle.type).toBe("bundle");
    expect(bundle.id).toMatch(/^bundle--/);
    expect(bundle.objects).toHaveLength(0);
  });

  test("creates bundle with multiple object types", () => {
    const indicator = createIndicator({ type: "domain", value: "evil.com" });
    const malware = createMalware("EvilMalware");
    const actor = createThreatActor("EvilGroup");
    const pattern = createAttackPattern("Phishing");
    const relationship = createRelationship(actor.id, malware.id, "uses");

    const bundle = createBundle([indicator, malware, actor, pattern, relationship]);

    expect(bundle.objects).toHaveLength(5);

    const types = bundle.objects.map((o) => o.type);
    expect(types).toContain("indicator");
    expect(types).toContain("malware");
    expect(types).toContain("threat-actor");
    expect(types).toContain("attack-pattern");
    expect(types).toContain("relationship");
  });

  test("bundle is valid JSON", () => {
    const indicator = createIndicator({ type: "ipv4", value: "1.2.3.4" });
    const bundle = createBundle([indicator]);

    const json = JSON.stringify(bundle);
    const parsed = JSON.parse(json) as StixBundle;

    expect(parsed.type).toBe("bundle");
    expect(parsed.objects).toHaveLength(1);
  });
});

// =============================================================================
// TLP Marking Tests
// =============================================================================

describe("TLP Marking", () => {
  test("returns correct TLP marking IDs", () => {
    expect(getTlpMarking("clear")).toBe("marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9");
    expect(getTlpMarking("green")).toBe("marking-definition--34098fce-860f-48ae-8e50-ebd3cc5e41da");
    expect(getTlpMarking("amber")).toBe("marking-definition--f88d31f6-486f-44da-b317-01333bde0b82");
    expect(getTlpMarking("amber+strict")).toBe("marking-definition--826578e1-40ad-459f-bc73-ede076f81f37");
    expect(getTlpMarking("red")).toBe("marking-definition--5e57c739-391a-4eb3-b6be-7d15ca92d5ed");
  });

  test("throws error for invalid TLP level", () => {
    expect(() => getTlpMarking("invalid" as any)).toThrow("Invalid TLP level");
  });

  test("returns correct TLP definition objects", () => {
    const amberDef = getTlpDefinition("amber");

    expect(amberDef.type).toBe("marking-definition");
    expect(amberDef.spec_version).toBe("2.1");
    expect(amberDef.definition_type).toBe("tlp");
    expect(amberDef.definition.tlp).toBe("amber");
    expect(amberDef.name).toBe("TLP:AMBER");
  });

  test("throws error for invalid TLP definition", () => {
    expect(() => getTlpDefinition("invalid" as any)).toThrow("Invalid TLP level");
  });

  test("TLP definitions have standard IDs", () => {
    const clearDef = getTlpDefinition("clear");
    const greenDef = getTlpDefinition("green");
    const amberDef = getTlpDefinition("amber");
    const redDef = getTlpDefinition("red");

    // These are the official STIX 2.1 TLP marking definition IDs
    expect(clearDef.id).toBe("marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9");
    expect(greenDef.id).toBe("marking-definition--34098fce-860f-48ae-8e50-ebd3cc5e41da");
    expect(amberDef.id).toBe("marking-definition--f88d31f6-486f-44da-b317-01333bde0b82");
    expect(redDef.id).toBe("marking-definition--5e57c739-391a-4eb3-b6be-7d15ca92d5ed");
  });
});

// =============================================================================
// JSON Validation Tests
// =============================================================================

describe("JSON Validation", () => {
  test("indicator serializes to valid JSON", () => {
    const indicator = createIndicator(
      { type: "ipv4", value: "1.2.3.4" },
      {
        name: "Test Indicator",
        description: "Test description",
        indicatorTypes: ["malicious-activity"],
        confidence: 90,
        tlp: "amber",
      }
    );

    const json = JSON.stringify(indicator);
    const parsed = JSON.parse(json) as StixIndicator;

    expect(parsed.type).toBe("indicator");
    expect(parsed.name).toBe("Test Indicator");
    expect(parsed.pattern).toBe("[ipv4-addr:value = '1.2.3.4']");
  });

  test("malware serializes to valid JSON", () => {
    const malware = createMalware("TestMalware", {
      description: "Test malware",
      malwareTypes: ["trojan"],
      isFamily: true,
    });

    const json = JSON.stringify(malware);
    const parsed = JSON.parse(json) as StixMalware;

    expect(parsed.type).toBe("malware");
    expect(parsed.name).toBe("TestMalware");
    expect(parsed.is_family).toBe(true);
  });

  test("complete bundle serializes to valid JSON", () => {
    const actor = createThreatActor("APT99", {
      threatActorTypes: ["nation-state"],
    });
    const malware = createMalware("APT99Malware", {
      malwareTypes: ["backdoor"],
    });
    const indicator = createIndicator({ type: "domain", value: "apt99.evil.com" });
    const relationship1 = createRelationship(actor.id, malware.id, "uses");
    const relationship2 = createRelationship(indicator.id, malware.id, "indicates");
    const tlpMarking = getTlpDefinition("amber");

    const bundle = createBundle([actor, malware, indicator, relationship1, relationship2, tlpMarking]);

    const json = JSON.stringify(bundle, null, 2);
    const parsed = JSON.parse(json) as StixBundle;

    expect(parsed.type).toBe("bundle");
    expect(parsed.objects).toHaveLength(6);

    // Verify all objects have required STIX fields
    for (const obj of parsed.objects) {
      expect(obj.type).toBeDefined();
      if (obj.type !== "marking-definition") {
        expect((obj as any).spec_version).toBe("2.1");
        expect((obj as any).id).toBeDefined();
        expect((obj as any).created).toBeDefined();
        expect((obj as any).modified).toBeDefined();
      }
    }
  });

  test("timestamps are in ISO 8601 format", () => {
    const indicator = createIndicator({ type: "ipv4", value: "1.2.3.4" });
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

    expect(indicator.created).toMatch(isoRegex);
    expect(indicator.modified).toMatch(isoRegex);
    expect(indicator.valid_from).toMatch(isoRegex);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("Integration Tests", () => {
  const testInputFile = "/tmp/test-intel.json";
  const testCsvFile = "/tmp/test-iocs.csv";
  const testOutputFile = "/tmp/test-output.json";

  afterEach(async () => {
    // Clean up test files
    try {
      await unlink(testInputFile);
    } catch {}
    try {
      await unlink(testCsvFile);
    } catch {}
    try {
      await unlink(testOutputFile);
    } catch {}
  });

  test("creates complete threat intelligence bundle", () => {
    // Create a comprehensive bundle representing a threat campaign
    const actor = createThreatActor("ShadowGroup", {
      description: "Financially motivated threat actor",
      threatActorTypes: ["crime-syndicate"],
      sophistication: "expert",
      primaryMotivation: "financial-gain",
      tlp: "amber",
    });

    const malware = createMalware("ShadowRAT", {
      description: "Remote access trojan",
      malwareTypes: ["remote-access-trojan"],
      capabilities: ["communicates-with-c2", "exfiltrates-data"],
      tlp: "amber",
    });

    const attackPattern = createAttackPattern("Spearphishing Attachment", {
      description: "Initial access via malicious email attachments",
      externalReferences: [
        {
          source_name: "mitre-attack",
          external_id: "T1566.001",
        },
      ],
      killChainPhases: [
        {
          kill_chain_name: "mitre-attack",
          phase_name: "initial-access",
        },
      ],
      tlp: "amber",
    });

    const indicators = [
      createIndicator(
        { type: "ipv4", value: "198.51.100.1" },
        { name: "C2 Server IP", indicatorTypes: ["malicious-activity"], tlp: "amber" }
      ),
      createIndicator(
        { type: "domain", value: "shadowgroup.evil.com" },
        { name: "C2 Domain", indicatorTypes: ["malicious-activity"], tlp: "amber" }
      ),
      createIndicator(
        { type: "sha256", value: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
        { name: "Malware Hash", indicatorTypes: ["malicious-activity"], tlp: "amber" }
      ),
    ];

    const relationships = [
      createRelationship(actor.id, malware.id, "uses", {
        description: "ShadowGroup uses ShadowRAT",
      }),
      createRelationship(actor.id, attackPattern.id, "uses", {
        description: "ShadowGroup uses spearphishing",
      }),
      createRelationship(indicators[0].id, malware.id, "indicates"),
      createRelationship(indicators[1].id, malware.id, "indicates"),
      createRelationship(indicators[2].id, malware.id, "indicates"),
    ];

    const tlpMarking = getTlpDefinition("amber");

    const bundle = createBundle([actor, malware, attackPattern, ...indicators, ...relationships, tlpMarking]);

    // Verify bundle structure
    expect(bundle.type).toBe("bundle");
    expect(bundle.objects.length).toBe(12); // 1 actor + 1 malware + 1 pattern + 3 indicators + 5 relationships + 1 TLP = 12

    // Verify all relationships reference valid objects
    const objectIds = new Set(bundle.objects.map((o) => o.id));
    for (const rel of relationships) {
      // Note: TLP marking won't be in relationships, so just check that source/target exist
      expect(objectIds.has(rel.source_ref)).toBe(true);
      expect(objectIds.has(rel.target_ref)).toBe(true);
    }

    // Verify JSON serialization
    const json = JSON.stringify(bundle, null, 2);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  test("handles edge cases in IoC values", () => {
    // Test various edge cases
    const edgeCases = [
      { type: "ipv4" as const, value: "0.0.0.0" },
      { type: "ipv4" as const, value: "255.255.255.255" },
      { type: "domain" as const, value: "a.b.c.d.e.f.g.com" },
      { type: "url" as const, value: "https://example.com/path?query=value&other=123" },
      { type: "sha256" as const, value: "0000000000000000000000000000000000000000000000000000000000000000" },
    ];

    for (const ioc of edgeCases) {
      const indicator = createIndicator(ioc);
      expect(indicator.pattern).toContain(ioc.value);

      // Verify it serializes correctly
      const json = JSON.stringify(indicator);
      expect(() => JSON.parse(json)).not.toThrow();
    }
  });
});
