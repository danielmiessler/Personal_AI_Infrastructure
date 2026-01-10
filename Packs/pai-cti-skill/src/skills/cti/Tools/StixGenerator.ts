#!/usr/bin/env bun
/**
 * STIX 2.1 Bundle Generator CLI
 *
 * Generate valid STIX 2.1 JSON bundles from threat intelligence data.
 *
 * Usage:
 *   bun run StixGenerator.ts --input intel.json --output bundle.json
 *   bun run StixGenerator.ts --indicator "ip:1.2.3.4" --name "Malicious IP"
 *   bun run StixGenerator.ts --iocs iocs.csv --threat "APT29 Campaign"
 *   bun run StixGenerator.ts --tlp amber
 */

// =============================================================================
// Types
// =============================================================================

export type IoCType = "ip" | "ipv4" | "ipv6" | "domain" | "url" | "md5" | "sha1" | "sha256" | "sha512" | "email";

export interface IoC {
  type: IoCType;
  value: string;
  description?: string;
}

export interface IndicatorOptions {
  name?: string;
  description?: string;
  validFrom?: string;
  validUntil?: string;
  indicatorTypes?: string[];
  confidence?: number;
  tlp?: TlpLevel;
}

export interface MalwareOptions {
  description?: string;
  malwareTypes?: string[];
  isFamily?: boolean;
  capabilities?: string[];
  aliases?: string[];
  tlp?: TlpLevel;
}

export interface ActorOptions {
  description?: string;
  threatActorTypes?: string[];
  aliases?: string[];
  roles?: string[];
  goals?: string[];
  sophistication?: string;
  resourceLevel?: string;
  primaryMotivation?: string;
  tlp?: TlpLevel;
}

export interface AttackPatternOptions {
  description?: string;
  externalReferences?: ExternalReference[];
  killChainPhases?: KillChainPhase[];
  tlp?: TlpLevel;
}

export interface RelationshipOptions {
  description?: string;
  startTime?: string;
  stopTime?: string;
}

export interface ExternalReference {
  source_name: string;
  external_id?: string;
  url?: string;
  description?: string;
}

export interface KillChainPhase {
  kill_chain_name: string;
  phase_name: string;
}

export type TlpLevel = "clear" | "green" | "amber" | "amber+strict" | "red";

// STIX Object Types
export interface StixBase {
  type: string;
  spec_version: "2.1";
  id: string;
  created: string;
  modified: string;
  object_marking_refs?: string[];
}

export interface StixIndicator extends StixBase {
  type: "indicator";
  name: string;
  description?: string;
  pattern: string;
  pattern_type: "stix";
  valid_from: string;
  valid_until?: string;
  indicator_types?: string[];
  confidence?: number;
}

export interface StixMalware extends StixBase {
  type: "malware";
  name: string;
  description?: string;
  malware_types?: string[];
  is_family: boolean;
  capabilities?: string[];
  aliases?: string[];
}

export interface StixThreatActor extends StixBase {
  type: "threat-actor";
  name: string;
  description?: string;
  threat_actor_types?: string[];
  aliases?: string[];
  roles?: string[];
  goals?: string[];
  sophistication?: string;
  resource_level?: string;
  primary_motivation?: string;
}

export interface StixAttackPattern extends StixBase {
  type: "attack-pattern";
  name: string;
  description?: string;
  external_references?: ExternalReference[];
  kill_chain_phases?: KillChainPhase[];
}

export interface StixRelationship extends StixBase {
  type: "relationship";
  relationship_type: string;
  source_ref: string;
  target_ref: string;
  description?: string;
  start_time?: string;
  stop_time?: string;
}

export interface StixMarkingDefinition {
  type: "marking-definition";
  spec_version: "2.1";
  id: string;
  created: string;
  definition_type: "tlp";
  name: string;
  definition: {
    tlp: string;
  };
}

export type StixObject =
  | StixIndicator
  | StixMalware
  | StixThreatActor
  | StixAttackPattern
  | StixRelationship
  | StixMarkingDefinition;

export interface StixBundle {
  type: "bundle";
  id: string;
  objects: StixObject[];
}

// =============================================================================
// TLP Marking Definitions (Standard STIX 2.1 IDs)
// =============================================================================

export const TLP_MARKINGS: Record<TlpLevel, string> = {
  clear: "marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9",
  green: "marking-definition--34098fce-860f-48ae-8e50-ebd3cc5e41da",
  amber: "marking-definition--f88d31f6-486f-44da-b317-01333bde0b82",
  "amber+strict": "marking-definition--826578e1-40ad-459f-bc73-ede076f81f37",
  red: "marking-definition--5e57c739-391a-4eb3-b6be-7d15ca92d5ed",
};

export const TLP_DEFINITIONS: Record<TlpLevel, StixMarkingDefinition> = {
  clear: {
    type: "marking-definition",
    spec_version: "2.1",
    id: TLP_MARKINGS.clear,
    created: "2017-01-20T00:00:00.000Z",
    definition_type: "tlp",
    name: "TLP:CLEAR",
    definition: { tlp: "clear" },
  },
  green: {
    type: "marking-definition",
    spec_version: "2.1",
    id: TLP_MARKINGS.green,
    created: "2017-01-20T00:00:00.000Z",
    definition_type: "tlp",
    name: "TLP:GREEN",
    definition: { tlp: "green" },
  },
  amber: {
    type: "marking-definition",
    spec_version: "2.1",
    id: TLP_MARKINGS.amber,
    created: "2017-01-20T00:00:00.000Z",
    definition_type: "tlp",
    name: "TLP:AMBER",
    definition: { tlp: "amber" },
  },
  "amber+strict": {
    type: "marking-definition",
    spec_version: "2.1",
    id: TLP_MARKINGS["amber+strict"],
    created: "2017-01-20T00:00:00.000Z",
    definition_type: "tlp",
    name: "TLP:AMBER+STRICT",
    definition: { tlp: "amber+strict" },
  },
  red: {
    type: "marking-definition",
    spec_version: "2.1",
    id: TLP_MARKINGS.red,
    created: "2017-01-20T00:00:00.000Z",
    definition_type: "tlp",
    name: "TLP:RED",
    definition: { tlp: "red" },
  },
};

// =============================================================================
// UUID Generation
// =============================================================================

/**
 * Generate a UUIDv4 string for STIX objects.
 */
export function generateUUID(): string {
  // Using crypto.randomUUID() for proper UUIDv4 generation
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a STIX-formatted ID for a given object type.
 */
export function generateStixId(type: string): string {
  return `${type}--${generateUUID()}`;
}

// =============================================================================
// Timestamp Helpers
// =============================================================================

/**
 * Get current timestamp in STIX format.
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

// =============================================================================
// STIX Pattern Generation
// =============================================================================

/**
 * Generate a STIX pattern string from an IoC.
 */
export function generatePattern(ioc: IoC): string {
  const { type, value } = ioc;
  const escapedValue = value.replace(/'/g, "\\'");

  switch (type) {
    case "ip":
    case "ipv4":
      return `[ipv4-addr:value = '${escapedValue}']`;
    case "ipv6":
      return `[ipv6-addr:value = '${escapedValue}']`;
    case "domain":
      return `[domain-name:value = '${escapedValue}']`;
    case "url":
      return `[url:value = '${escapedValue}']`;
    case "md5":
      return `[file:hashes.'MD5' = '${escapedValue}']`;
    case "sha1":
      return `[file:hashes.'SHA-1' = '${escapedValue}']`;
    case "sha256":
      return `[file:hashes.'SHA-256' = '${escapedValue}']`;
    case "sha512":
      return `[file:hashes.'SHA-512' = '${escapedValue}']`;
    case "email":
      return `[email-addr:value = '${escapedValue}']`;
    default:
      throw new Error(`Unsupported IoC type: ${type}`);
  }
}

/**
 * Detect IoC type from string value.
 */
export function detectIoCType(value: string): IoCType {
  // IPv4
  if (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(value)) {
    return "ipv4";
  }
  // IPv6 (simplified check)
  if (/^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(value) || value.includes("::")) {
    return "ipv6";
  }
  // SHA-512
  if (/^[a-fA-F0-9]{128}$/.test(value)) {
    return "sha512";
  }
  // SHA-256
  if (/^[a-fA-F0-9]{64}$/.test(value)) {
    return "sha256";
  }
  // SHA-1
  if (/^[a-fA-F0-9]{40}$/.test(value)) {
    return "sha1";
  }
  // MD5
  if (/^[a-fA-F0-9]{32}$/.test(value)) {
    return "md5";
  }
  // URL
  if (/^https?:\/\//i.test(value)) {
    return "url";
  }
  // Email
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
    return "email";
  }
  // Domain (default for remaining patterns that look like domains)
  if (/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(value)) {
    return "domain";
  }
  // Default to domain if unclear
  return "domain";
}

/**
 * Parse indicator string (e.g., "ip:1.2.3.4" or just "1.2.3.4").
 */
export function parseIndicatorString(indicator: string): IoC {
  const colonIndex = indicator.indexOf(":");
  // Check if it looks like a type:value format (but not a URL)
  if (colonIndex > 0 && colonIndex < 10 && !indicator.startsWith("http")) {
    const type = indicator.substring(0, colonIndex).toLowerCase() as IoCType;
    const value = indicator.substring(colonIndex + 1);
    return { type, value };
  }
  // Auto-detect type
  return { type: detectIoCType(indicator), value: indicator };
}

// =============================================================================
// STIX Object Creators
// =============================================================================

/**
 * Create a STIX Indicator object.
 */
export function createIndicator(ioc: IoC, options: IndicatorOptions = {}): StixIndicator {
  const now = getTimestamp();
  const indicator: StixIndicator = {
    type: "indicator",
    spec_version: "2.1",
    id: generateStixId("indicator"),
    created: now,
    modified: now,
    name: options.name || `${ioc.type.toUpperCase()} Indicator: ${ioc.value}`,
    pattern: generatePattern(ioc),
    pattern_type: "stix",
    valid_from: options.validFrom || now,
  };

  if (options.description) {
    indicator.description = options.description;
  }
  if (options.validUntil) {
    indicator.valid_until = options.validUntil;
  }
  if (options.indicatorTypes && options.indicatorTypes.length > 0) {
    indicator.indicator_types = options.indicatorTypes;
  }
  if (options.confidence !== undefined) {
    indicator.confidence = options.confidence;
  }
  if (options.tlp) {
    indicator.object_marking_refs = [getTlpMarking(options.tlp)];
  }

  return indicator;
}

/**
 * Create a STIX Malware object.
 */
export function createMalware(name: string, options: MalwareOptions = {}): StixMalware {
  const now = getTimestamp();
  const malware: StixMalware = {
    type: "malware",
    spec_version: "2.1",
    id: generateStixId("malware"),
    created: now,
    modified: now,
    name,
    is_family: options.isFamily ?? false,
  };

  if (options.description) {
    malware.description = options.description;
  }
  if (options.malwareTypes && options.malwareTypes.length > 0) {
    malware.malware_types = options.malwareTypes;
  }
  if (options.capabilities && options.capabilities.length > 0) {
    malware.capabilities = options.capabilities;
  }
  if (options.aliases && options.aliases.length > 0) {
    malware.aliases = options.aliases;
  }
  if (options.tlp) {
    malware.object_marking_refs = [getTlpMarking(options.tlp)];
  }

  return malware;
}

/**
 * Create a STIX Threat Actor object.
 */
export function createThreatActor(name: string, options: ActorOptions = {}): StixThreatActor {
  const now = getTimestamp();
  const actor: StixThreatActor = {
    type: "threat-actor",
    spec_version: "2.1",
    id: generateStixId("threat-actor"),
    created: now,
    modified: now,
    name,
  };

  if (options.description) {
    actor.description = options.description;
  }
  if (options.threatActorTypes && options.threatActorTypes.length > 0) {
    actor.threat_actor_types = options.threatActorTypes;
  }
  if (options.aliases && options.aliases.length > 0) {
    actor.aliases = options.aliases;
  }
  if (options.roles && options.roles.length > 0) {
    actor.roles = options.roles;
  }
  if (options.goals && options.goals.length > 0) {
    actor.goals = options.goals;
  }
  if (options.sophistication) {
    actor.sophistication = options.sophistication;
  }
  if (options.resourceLevel) {
    actor.resource_level = options.resourceLevel;
  }
  if (options.primaryMotivation) {
    actor.primary_motivation = options.primaryMotivation;
  }
  if (options.tlp) {
    actor.object_marking_refs = [getTlpMarking(options.tlp)];
  }

  return actor;
}

/**
 * Create a STIX Attack Pattern object.
 */
export function createAttackPattern(technique: string, options: AttackPatternOptions = {}): StixAttackPattern {
  const now = getTimestamp();
  const attackPattern: StixAttackPattern = {
    type: "attack-pattern",
    spec_version: "2.1",
    id: generateStixId("attack-pattern"),
    created: now,
    modified: now,
    name: technique,
  };

  if (options.description) {
    attackPattern.description = options.description;
  }
  if (options.externalReferences && options.externalReferences.length > 0) {
    attackPattern.external_references = options.externalReferences;
  }
  if (options.killChainPhases && options.killChainPhases.length > 0) {
    attackPattern.kill_chain_phases = options.killChainPhases;
  }
  if (options.tlp) {
    attackPattern.object_marking_refs = [getTlpMarking(options.tlp)];
  }

  return attackPattern;
}

/**
 * Create a STIX Relationship object.
 */
export function createRelationship(
  sourceRef: string,
  targetRef: string,
  relationshipType: string,
  options: RelationshipOptions = {}
): StixRelationship {
  const now = getTimestamp();
  const relationship: StixRelationship = {
    type: "relationship",
    spec_version: "2.1",
    id: generateStixId("relationship"),
    created: now,
    modified: now,
    relationship_type: relationshipType,
    source_ref: sourceRef,
    target_ref: targetRef,
  };

  if (options.description) {
    relationship.description = options.description;
  }
  if (options.startTime) {
    relationship.start_time = options.startTime;
  }
  if (options.stopTime) {
    relationship.stop_time = options.stopTime;
  }

  return relationship;
}

/**
 * Create a STIX Bundle containing objects.
 */
export function createBundle(objects: StixObject[]): StixBundle {
  return {
    type: "bundle",
    id: generateStixId("bundle"),
    objects,
  };
}

/**
 * Get TLP marking definition ID.
 */
export function getTlpMarking(tlp: TlpLevel): string {
  const marking = TLP_MARKINGS[tlp];
  if (!marking) {
    throw new Error(`Invalid TLP level: ${tlp}. Valid levels: ${Object.keys(TLP_MARKINGS).join(", ")}`);
  }
  return marking;
}

/**
 * Get TLP marking definition object.
 */
export function getTlpDefinition(tlp: TlpLevel): StixMarkingDefinition {
  const definition = TLP_DEFINITIONS[tlp];
  if (!definition) {
    throw new Error(`Invalid TLP level: ${tlp}. Valid levels: ${Object.keys(TLP_DEFINITIONS).join(", ")}`);
  }
  return definition;
}

// =============================================================================
// File I/O Helpers
// =============================================================================

interface IntelFile {
  indicators?: Array<{ type?: IoCType; value: string; description?: string }>;
  malware?: Array<{ name: string; types?: string[]; description?: string }>;
  threatActors?: Array<{ name: string; types?: string[]; description?: string }>;
  attackPatterns?: Array<{ name: string; description?: string }>;
  relationships?: Array<{ source: string; target: string; type: string }>;
  tlp?: TlpLevel;
}

/**
 * Parse input JSON file containing threat intelligence.
 */
async function parseInputFile(filePath: string): Promise<StixObject[]> {
  const file = Bun.file(filePath);
  const content = await file.text();
  const data: IntelFile = JSON.parse(content);
  const objects: StixObject[] = [];

  // Process indicators
  if (data.indicators) {
    for (const ind of data.indicators) {
      const ioc: IoC = {
        type: ind.type || detectIoCType(ind.value),
        value: ind.value,
        description: ind.description,
      };
      objects.push(createIndicator(ioc, { description: ind.description, tlp: data.tlp }));
    }
  }

  // Process malware
  if (data.malware) {
    for (const mal of data.malware) {
      objects.push(
        createMalware(mal.name, {
          malwareTypes: mal.types,
          description: mal.description,
          tlp: data.tlp,
        })
      );
    }
  }

  // Process threat actors
  if (data.threatActors) {
    for (const actor of data.threatActors) {
      objects.push(
        createThreatActor(actor.name, {
          threatActorTypes: actor.types,
          description: actor.description,
          tlp: data.tlp,
        })
      );
    }
  }

  // Process attack patterns
  if (data.attackPatterns) {
    for (const pattern of data.attackPatterns) {
      objects.push(
        createAttackPattern(pattern.name, {
          description: pattern.description,
          tlp: data.tlp,
        })
      );
    }
  }

  // Add TLP marking definition if specified
  if (data.tlp) {
    objects.push(getTlpDefinition(data.tlp));
  }

  return objects;
}

/**
 * Parse CSV file containing IoCs.
 */
async function parseIoCsFile(filePath: string, threatName?: string, tlp?: TlpLevel): Promise<StixObject[]> {
  const file = Bun.file(filePath);
  const content = await file.text();
  const lines = content.trim().split("\n");
  const objects: StixObject[] = [];

  // Skip header if present
  const startIndex = lines[0].toLowerCase().includes("type") || lines[0].toLowerCase().includes("value") ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(",").map((p) => p.trim());
    let ioc: IoC;

    if (parts.length >= 2) {
      // Format: type,value[,description]
      ioc = {
        type: parts[0].toLowerCase() as IoCType,
        value: parts[1],
        description: parts[2],
      };
    } else {
      // Just value, auto-detect type
      ioc = parseIndicatorString(parts[0]);
    }

    objects.push(
      createIndicator(ioc, {
        description: threatName ? `Associated with ${threatName}` : undefined,
        tlp,
      })
    );
  }

  // Add TLP marking definition if specified
  if (tlp) {
    objects.push(getTlpDefinition(tlp));
  }

  return objects;
}

/**
 * Write bundle to output file.
 */
async function writeOutput(bundle: StixBundle, filePath: string): Promise<void> {
  const json = JSON.stringify(bundle, null, 2);
  await Bun.write(filePath, json);
}

// =============================================================================
// CLI Interface
// =============================================================================

interface CliArgs {
  input?: string;
  output?: string;
  indicator?: string;
  name?: string;
  iocs?: string;
  threat?: string;
  tlp?: TlpLevel;
  help?: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--input":
      case "-i":
        result.input = args[++i];
        break;
      case "--output":
      case "-o":
        result.output = args[++i];
        break;
      case "--indicator":
        result.indicator = args[++i];
        break;
      case "--name":
      case "-n":
        result.name = args[++i];
        break;
      case "--iocs":
        result.iocs = args[++i];
        break;
      case "--threat":
      case "-t":
        result.threat = args[++i];
        break;
      case "--tlp":
        result.tlp = args[++i] as TlpLevel;
        break;
      case "--help":
      case "-h":
        result.help = true;
        break;
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
STIX 2.1 Bundle Generator

Usage:
  bun run StixGenerator.ts [options]

Options:
  --input, -i <file>     Input JSON file with threat intelligence
  --output, -o <file>    Output file for STIX bundle (default: stdout)
  --indicator <ioc>      Single indicator (format: type:value or just value)
  --name, -n <name>      Name for the indicator
  --iocs <file>          CSV file with IoCs (type,value,description)
  --threat, -t <name>    Threat/campaign name for IoC context
  --tlp <level>          TLP marking: clear, green, amber, amber+strict, red
  --help, -h             Show this help message

Examples:
  # Generate from JSON intelligence file
  bun run StixGenerator.ts --input intel.json --output bundle.json

  # Create single indicator
  bun run StixGenerator.ts --indicator "ip:1.2.3.4" --name "Malicious IP"

  # Process CSV of IoCs
  bun run StixGenerator.ts --iocs iocs.csv --threat "APT29 Campaign" --tlp amber

  # Output to stdout with TLP marking
  bun run StixGenerator.ts --indicator "domain:evil.com" --tlp red
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  let objects: StixObject[] = [];

  // Process input file
  if (args.input) {
    objects = await parseInputFile(args.input);
  }

  // Process single indicator
  if (args.indicator) {
    const ioc = parseIndicatorString(args.indicator);
    const indicator = createIndicator(ioc, {
      name: args.name,
      tlp: args.tlp,
    });
    objects.push(indicator);

    // Add TLP marking if specified and not already added
    if (args.tlp && !objects.some((o) => o.type === "marking-definition")) {
      objects.push(getTlpDefinition(args.tlp));
    }
  }

  // Process IoCs CSV file
  if (args.iocs) {
    const iocObjects = await parseIoCsFile(args.iocs, args.threat, args.tlp);
    objects.push(...iocObjects);
  }

  if (objects.length === 0) {
    console.error("Error: No input provided. Use --help for usage information.");
    process.exit(1);
  }

  // Create bundle
  const bundle = createBundle(objects);

  // Output
  if (args.output) {
    await writeOutput(bundle, args.output);
    console.log(`STIX bundle written to: ${args.output}`);
    console.log(`Objects: ${objects.length}`);
  } else {
    console.log(JSON.stringify(bundle, null, 2));
  }
}

// Run CLI if this is the main module
if (import.meta.main) {
  main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}
