#!/usr/bin/env bun
/**
 * SbomGenerator.ts
 *
 * Generates Software Bill of Materials (SBOM) in CycloneDX or SPDX format.
 *
 * Usage:
 *   bun run SbomGenerator.ts [options] [directory]
 *
 * Options:
 *   --format=<type>        Output format: cyclonedx (default) or spdx
 *   --include-dev          Include development dependencies
 *   --output=<file>        Write output to file instead of stdout
 *   --help                 Show this help message
 *
 * Exit codes:
 *   0 - SBOM generated successfully
 *   1 - Error generating SBOM
 */

import { existsSync } from "fs";
import { join, resolve, basename } from "path";
import { createHash } from "crypto";

// Types
interface Package {
  name: string;
  version: string;
  license?: string;
  purl?: string;
  checksums?: { algorithm: string; value: string }[];
  description?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  isDev: boolean;
}

interface CycloneDXBom {
  bomFormat: "CycloneDX";
  specVersion: string;
  version: number;
  serialNumber: string;
  metadata: {
    timestamp: string;
    tools: { name: string; version: string }[];
    component?: {
      type: string;
      name: string;
      version: string;
    };
  };
  components: CycloneDXComponent[];
}

interface CycloneDXComponent {
  type: string;
  name: string;
  version: string;
  purl?: string;
  licenses?: { license: { id?: string; name?: string } }[];
  hashes?: { alg: string; content: string }[];
  description?: string;
  author?: string;
  externalReferences?: { type: string; url: string }[];
}

interface SPDXDocument {
  spdxVersion: string;
  dataLicense: string;
  SPDXID: string;
  name: string;
  documentNamespace: string;
  creationInfo: {
    created: string;
    creators: string[];
  };
  packages: SPDXPackage[];
  relationships: SPDXRelationship[];
}

interface SPDXPackage {
  SPDXID: string;
  name: string;
  versionInfo: string;
  downloadLocation: string;
  filesAnalyzed: boolean;
  licenseConcluded?: string;
  licenseDeclared?: string;
  copyrightText: string;
  externalRefs?: {
    referenceCategory: string;
    referenceType: string;
    referenceLocator: string;
  }[];
  checksums?: { algorithm: string; checksumValue: string }[];
  description?: string;
  homepage?: string;
}

interface SPDXRelationship {
  spdxElementId: string;
  relationshipType: string;
  relatedSpdxElement: string;
}

// Parse command line arguments
function parseArgs(): {
  directory: string;
  format: "cyclonedx" | "spdx";
  includeDev: boolean;
  output: string | null;
  help: boolean;
} {
  const args = process.argv.slice(2);
  let directory = process.cwd();
  let format: "cyclonedx" | "spdx" = "cyclonedx";
  let includeDev = false;
  let output: string | null = null;
  let help = false;

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--include-dev") {
      includeDev = true;
    } else if (arg.startsWith("--format=")) {
      const fmt = arg.split("=")[1].toLowerCase();
      if (fmt === "spdx") {
        format = "spdx";
      } else if (fmt === "cyclonedx") {
        format = "cyclonedx";
      } else {
        console.error(`Invalid format: ${fmt}. Use: cyclonedx, spdx`);
        process.exit(1);
      }
    } else if (arg.startsWith("--output=")) {
      output = arg.split("=")[1];
    } else if (!arg.startsWith("-")) {
      directory = resolve(arg);
    }
  }

  return { directory, format, includeDev, output, help };
}

// Show help message
function showHelp(): void {
  console.log(`
SbomGenerator - Generate Software Bill of Materials

Usage:
  bun run SbomGenerator.ts [options] [directory]

Options:
  --format=<type>        Output format: cyclonedx (default) or spdx
  --include-dev          Include development dependencies
  --output=<file>        Write output to file instead of stdout
  --help, -h             Show this help message

Examples:
  bun run SbomGenerator.ts
  bun run SbomGenerator.ts /path/to/project
  bun run SbomGenerator.ts --format=spdx
  bun run SbomGenerator.ts --include-dev --output=sbom.json
  bun run SbomGenerator.ts --format=cyclonedx --include-dev /path/to/project

Supported Package Managers:
  - npm/pnpm/yarn (package.json)
  - pip (requirements.txt)
  - poetry (pyproject.toml)
  - cargo (Cargo.toml)
  - go (go.mod)

Output Formats:
  - CycloneDX JSON (default) - Industry standard SBOM format
  - SPDX JSON - Linux Foundation standard

Exit Codes:
  0 - SBOM generated successfully
  1 - Error generating SBOM
`);
}

// Detect package manager
function detectPackageManager(dir: string): string | null {
  const manifests = [
    { manager: "npm", file: "package.json" },
    { manager: "poetry", file: "pyproject.toml" },
    { manager: "pip", file: "requirements.txt" },
    { manager: "cargo", file: "Cargo.toml" },
    { manager: "go", file: "go.mod" },
  ];

  for (const { manager, file } of manifests) {
    if (existsSync(join(dir, file))) {
      return manager;
    }
  }

  return null;
}

// Generate package URL (PURL)
function generatePurl(
  manager: string,
  name: string,
  version: string
): string {
  switch (manager) {
    case "npm":
    case "pnpm":
    case "yarn":
      return `pkg:npm/${name}@${version}`;
    case "pip":
    case "poetry":
      return `pkg:pypi/${name}@${version}`;
    case "cargo":
      return `pkg:cargo/${name}@${version}`;
    case "go":
      return `pkg:golang/${name}@${version}`;
    default:
      return `pkg:generic/${name}@${version}`;
  }
}

// Parse npm/pnpm/yarn packages
async function parseNpmPackages(
  dir: string,
  includeDev: boolean
): Promise<{ packages: Package[]; rootName: string; rootVersion: string }> {
  const packages: Package[] = [];
  let rootName = "unknown";
  let rootVersion = "0.0.0";

  const packageJsonPath = join(dir, "package.json");
  if (!existsSync(packageJsonPath)) {
    return { packages, rootName, rootVersion };
  }

  try {
    const packageJson = await Bun.file(packageJsonPath).json();
    rootName = packageJson.name || basename(dir);
    rootVersion = packageJson.version || "0.0.0";

    // Get dependencies
    const deps = packageJson.dependencies || {};
    const devDeps = includeDev ? packageJson.devDependencies || {} : {};

    // Try to read lock file for exact versions
    let lockData: any = null;
    const lockFiles = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"];

    for (const lockFile of lockFiles) {
      const lockPath = join(dir, lockFile);
      if (existsSync(lockPath)) {
        if (lockFile === "package-lock.json") {
          try {
            lockData = await Bun.file(lockPath).json();
          } catch {
            // Ignore parse errors
          }
        }
        break;
      }
    }

    // Process production dependencies
    for (const [name, versionSpec] of Object.entries(deps)) {
      let version = String(versionSpec).replace(/^[\^~>=<]+/, "");

      // Try to get exact version from lock file
      if (lockData?.packages?.[`node_modules/${name}`]?.version) {
        version = lockData.packages[`node_modules/${name}`].version;
      } else if (lockData?.dependencies?.[name]?.version) {
        version = lockData.dependencies[name].version;
      }

      packages.push({
        name,
        version,
        purl: generatePurl("npm", name, version),
        isDev: false,
      });
    }

    // Process dev dependencies
    if (includeDev) {
      for (const [name, versionSpec] of Object.entries(devDeps)) {
        // Skip if already in production deps
        if (deps[name]) continue;

        let version = String(versionSpec).replace(/^[\^~>=<]+/, "");

        if (lockData?.packages?.[`node_modules/${name}`]?.version) {
          version = lockData.packages[`node_modules/${name}`].version;
        } else if (lockData?.dependencies?.[name]?.version) {
          version = lockData.dependencies[name].version;
        }

        packages.push({
          name,
          version,
          purl: generatePurl("npm", name, version),
          isDev: true,
        });
      }
    }
  } catch (error) {
    console.error(`Error parsing package.json: ${error}`);
  }

  return { packages, rootName, rootVersion };
}

// Parse pip requirements.txt
async function parsePipPackages(
  dir: string,
  includeDev: boolean
): Promise<{ packages: Package[]; rootName: string; rootVersion: string }> {
  const packages: Package[] = [];
  const rootName = basename(dir);
  const rootVersion = "0.0.0";

  const reqPath = join(dir, "requirements.txt");
  if (!existsSync(reqPath)) {
    return { packages, rootName, rootVersion };
  }

  try {
    const content = await Bun.file(reqPath).text();
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) {
        continue;
      }

      // Parse package==version or package>=version
      const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:[=<>!~]+(.+))?/);
      if (match) {
        const name = match[1];
        const version = match[2]?.split(",")[0]?.replace(/[=<>!~]+/, "") || "*";

        packages.push({
          name,
          version,
          purl: generatePurl("pip", name, version),
          isDev: false,
        });
      }
    }

    // Check for dev requirements
    if (includeDev) {
      const devReqPath = join(dir, "requirements-dev.txt");
      if (existsSync(devReqPath)) {
        const devContent = await Bun.file(devReqPath).text();
        const devLines = devContent.split("\n");

        for (const line of devLines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) {
            continue;
          }

          const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:[=<>!~]+(.+))?/);
          if (match) {
            const name = match[1];
            const version =
              match[2]?.split(",")[0]?.replace(/[=<>!~]+/, "") || "*";

            // Skip if already in production
            if (!packages.find((p) => p.name === name)) {
              packages.push({
                name,
                version,
                purl: generatePurl("pip", name, version),
                isDev: true,
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error parsing requirements.txt: ${error}`);
  }

  return { packages, rootName, rootVersion };
}

// Parse poetry pyproject.toml
async function parsePoetryPackages(
  dir: string,
  includeDev: boolean
): Promise<{ packages: Package[]; rootName: string; rootVersion: string }> {
  const packages: Package[] = [];
  let rootName = basename(dir);
  let rootVersion = "0.0.0";

  const pyprojectPath = join(dir, "pyproject.toml");
  if (!existsSync(pyprojectPath)) {
    return { packages, rootName, rootVersion };
  }

  try {
    const content = await Bun.file(pyprojectPath).text();

    // Parse project name and version
    const nameMatch = content.match(/^name\s*=\s*"([^"]+)"/m);
    const versionMatch = content.match(/^version\s*=\s*"([^"]+)"/m);

    if (nameMatch) rootName = nameMatch[1];
    if (versionMatch) rootVersion = versionMatch[1];

    // Parse dependencies section
    const depsMatch = content.match(
      /\[tool\.poetry\.dependencies\]([\s\S]*?)(?:\[|$)/
    );
    if (depsMatch) {
      const depsSection = depsMatch[1];
      const depLines = depsSection.split("\n");

      for (const line of depLines) {
        const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*["']?([^"'\s{]+)/);
        if (match && match[1] !== "python") {
          const name = match[1];
          const version = match[2].replace(/[\^~>=<]+/, "");

          packages.push({
            name,
            version,
            purl: generatePurl("poetry", name, version),
            isDev: false,
          });
        }
      }
    }

    // Parse dev dependencies
    if (includeDev) {
      const devDepsMatch = content.match(
        /\[tool\.poetry\.(?:dev-)?dependencies\]([\s\S]*?)(?:\[|$)/g
      );

      if (devDepsMatch) {
        for (const section of devDepsMatch) {
          if (section.includes("dev-dependencies") || section.includes("group.dev")) {
            const depLines = section.split("\n");

            for (const line of depLines) {
              const match = line.match(
                /^([a-zA-Z0-9_-]+)\s*=\s*["']?([^"'\s{]+)/
              );
              if (match && match[1] !== "python") {
                const name = match[1];
                const version = match[2].replace(/[\^~>=<]+/, "");

                if (!packages.find((p) => p.name === name)) {
                  packages.push({
                    name,
                    version,
                    purl: generatePurl("poetry", name, version),
                    isDev: true,
                  });
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error parsing pyproject.toml: ${error}`);
  }

  return { packages, rootName, rootVersion };
}

// Parse Cargo.toml
async function parseCargoPackages(
  dir: string,
  includeDev: boolean
): Promise<{ packages: Package[]; rootName: string; rootVersion: string }> {
  const packages: Package[] = [];
  let rootName = basename(dir);
  let rootVersion = "0.0.0";

  const cargoPath = join(dir, "Cargo.toml");
  if (!existsSync(cargoPath)) {
    return { packages, rootName, rootVersion };
  }

  try {
    const content = await Bun.file(cargoPath).text();

    // Parse package name and version
    const nameMatch = content.match(/^name\s*=\s*"([^"]+)"/m);
    const versionMatch = content.match(/^version\s*=\s*"([^"]+)"/m);

    if (nameMatch) rootName = nameMatch[1];
    if (versionMatch) rootVersion = versionMatch[1];

    // Parse dependencies
    const depsMatch = content.match(/\[dependencies\]([\s\S]*?)(?:\[|$)/);
    if (depsMatch) {
      const depsSection = depsMatch[1];
      const depLines = depsSection.split("\n");

      for (const line of depLines) {
        // Handle simple version: dep = "1.0"
        let match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
        if (match) {
          packages.push({
            name: match[1],
            version: match[2].replace(/[\^~>=<]+/, ""),
            purl: generatePurl("cargo", match[1], match[2]),
            isDev: false,
          });
          continue;
        }

        // Handle table inline: dep = { version = "1.0" }
        match = line.match(
          /^([a-zA-Z0-9_-]+)\s*=\s*\{.*version\s*=\s*"([^"]+)"/
        );
        if (match) {
          packages.push({
            name: match[1],
            version: match[2].replace(/[\^~>=<]+/, ""),
            purl: generatePurl("cargo", match[1], match[2]),
            isDev: false,
          });
        }
      }
    }

    // Parse dev dependencies
    if (includeDev) {
      const devDepsMatch = content.match(
        /\[dev-dependencies\]([\s\S]*?)(?:\[|$)/
      );
      if (devDepsMatch) {
        const depsSection = devDepsMatch[1];
        const depLines = depsSection.split("\n");

        for (const line of depLines) {
          let match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
          if (match && !packages.find((p) => p.name === match![1])) {
            packages.push({
              name: match[1],
              version: match[2].replace(/[\^~>=<]+/, ""),
              purl: generatePurl("cargo", match[1], match[2]),
              isDev: true,
            });
            continue;
          }

          match = line.match(
            /^([a-zA-Z0-9_-]+)\s*=\s*\{.*version\s*=\s*"([^"]+)"/
          );
          if (match && !packages.find((p) => p.name === match![1])) {
            packages.push({
              name: match[1],
              version: match[2].replace(/[\^~>=<]+/, ""),
              purl: generatePurl("cargo", match[1], match[2]),
              isDev: true,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error parsing Cargo.toml: ${error}`);
  }

  return { packages, rootName, rootVersion };
}

// Parse go.mod
async function parseGoPackages(
  dir: string,
  includeDev: boolean
): Promise<{ packages: Package[]; rootName: string; rootVersion: string }> {
  const packages: Package[] = [];
  let rootName = basename(dir);
  const rootVersion = "0.0.0";

  const goModPath = join(dir, "go.mod");
  if (!existsSync(goModPath)) {
    return { packages, rootName, rootVersion };
  }

  try {
    const content = await Bun.file(goModPath).text();

    // Parse module name
    const moduleMatch = content.match(/^module\s+(.+)$/m);
    if (moduleMatch) {
      rootName = moduleMatch[1].trim();
    }

    // Parse require block
    const requireMatch = content.match(/require\s*\(([\s\S]*?)\)/);
    if (requireMatch) {
      const requireSection = requireMatch[1];
      const lines = requireSection.split("\n");

      for (const line of lines) {
        const match = line
          .trim()
          .match(/^([^\s]+)\s+v?([^\s]+)(?:\s+\/\/\s*indirect)?$/);
        if (match) {
          const isIndirect = line.includes("// indirect");
          // Treat indirect as dev dependencies
          if (isIndirect && !includeDev) {
            continue;
          }

          packages.push({
            name: match[1],
            version: match[2],
            purl: generatePurl("go", match[1], match[2]),
            isDev: isIndirect,
          });
        }
      }
    }

    // Parse single-line requires
    const singleRequires = content.matchAll(/^require\s+([^\s]+)\s+v?([^\s]+)/gm);
    for (const match of singleRequires) {
      if (!packages.find((p) => p.name === match[1])) {
        packages.push({
          name: match[1],
          version: match[2],
          purl: generatePurl("go", match[1], match[2]),
          isDev: false,
        });
      }
    }
  } catch (error) {
    console.error(`Error parsing go.mod: ${error}`);
  }

  return { packages, rootName, rootVersion };
}

// Generate UUID
function generateUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Generate CycloneDX SBOM
function generateCycloneDX(
  packages: Package[],
  rootName: string,
  rootVersion: string
): CycloneDXBom {
  const components: CycloneDXComponent[] = packages.map((pkg) => {
    const component: CycloneDXComponent = {
      type: "library",
      name: pkg.name,
      version: pkg.version,
    };

    if (pkg.purl) {
      component.purl = pkg.purl;
    }

    if (pkg.license) {
      component.licenses = [{ license: { id: pkg.license } }];
    }

    if (pkg.checksums && pkg.checksums.length > 0) {
      component.hashes = pkg.checksums.map((c) => ({
        alg: c.algorithm.toUpperCase().replace("-", "") as any,
        content: c.value,
      }));
    }

    if (pkg.description) {
      component.description = pkg.description;
    }

    if (pkg.homepage || pkg.repository) {
      component.externalReferences = [];
      if (pkg.homepage) {
        component.externalReferences.push({
          type: "website",
          url: pkg.homepage,
        });
      }
      if (pkg.repository) {
        component.externalReferences.push({ type: "vcs", url: pkg.repository });
      }
    }

    return component;
  });

  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    version: 1,
    serialNumber: `urn:uuid:${generateUuid()}`,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ name: "SbomGenerator", version: "1.0.0" }],
      component: {
        type: "application",
        name: rootName,
        version: rootVersion,
      },
    },
    components,
  };
}

// Generate SPDX SBOM
function generateSPDX(
  packages: Package[],
  rootName: string,
  rootVersion: string
): SPDXDocument {
  const spdxPackages: SPDXPackage[] = [];
  const relationships: SPDXRelationship[] = [];

  // Add root package
  const rootSpdxId = "SPDXRef-RootPackage";
  spdxPackages.push({
    SPDXID: rootSpdxId,
    name: rootName,
    versionInfo: rootVersion,
    downloadLocation: "NOASSERTION",
    filesAnalyzed: false,
    copyrightText: "NOASSERTION",
  });

  // Add dependencies
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    const spdxId = `SPDXRef-Package-${i + 1}`;

    const spdxPkg: SPDXPackage = {
      SPDXID: spdxId,
      name: pkg.name,
      versionInfo: pkg.version,
      downloadLocation: "NOASSERTION",
      filesAnalyzed: false,
      copyrightText: "NOASSERTION",
    };

    if (pkg.license) {
      spdxPkg.licenseConcluded = pkg.license;
      spdxPkg.licenseDeclared = pkg.license;
    }

    if (pkg.purl) {
      spdxPkg.externalRefs = [
        {
          referenceCategory: "PACKAGE-MANAGER",
          referenceType: "purl",
          referenceLocator: pkg.purl,
        },
      ];
    }

    if (pkg.checksums && pkg.checksums.length > 0) {
      spdxPkg.checksums = pkg.checksums.map((c) => ({
        algorithm: c.algorithm.toUpperCase().replace("-", "") as any,
        checksumValue: c.value,
      }));
    }

    if (pkg.description) {
      spdxPkg.description = pkg.description;
    }

    if (pkg.homepage) {
      spdxPkg.homepage = pkg.homepage;
    }

    spdxPackages.push(spdxPkg);

    // Add relationship
    relationships.push({
      spdxElementId: rootSpdxId,
      relationshipType: pkg.isDev ? "DEV_DEPENDENCY_OF" : "DEPENDENCY_OF",
      relatedSpdxElement: spdxId,
    });
  }

  // Add document describes relationship
  relationships.push({
    spdxElementId: "SPDXRef-DOCUMENT",
    relationshipType: "DESCRIBES",
    relatedSpdxElement: rootSpdxId,
  });

  return {
    spdxVersion: "SPDX-2.3",
    dataLicense: "CC0-1.0",
    SPDXID: "SPDXRef-DOCUMENT",
    name: `${rootName}-sbom`,
    documentNamespace: `https://spdx.org/spdxdocs/${rootName}-${generateUuid()}`,
    creationInfo: {
      created: new Date().toISOString(),
      creators: ["Tool: SbomGenerator-1.0.0"],
    },
    packages: spdxPackages,
    relationships,
  };
}

// Main function
async function main(): Promise<void> {
  const { directory, format, includeDev, output, help } = parseArgs();

  if (help) {
    showHelp();
    process.exit(0);
  }

  // Check if directory exists
  if (!existsSync(directory)) {
    console.error(`Error: Directory not found: ${directory}`);
    process.exit(1);
  }

  // Detect package manager
  const manager = detectPackageManager(directory);

  if (!manager) {
    console.error("Error: No supported package manifest found in:", directory);
    console.error(
      "Supported: package.json, pyproject.toml, requirements.txt, Cargo.toml, go.mod"
    );
    process.exit(1);
  }

  // Parse packages
  let result: { packages: Package[]; rootName: string; rootVersion: string };

  switch (manager) {
    case "npm":
      result = await parseNpmPackages(directory, includeDev);
      break;
    case "poetry":
      result = await parsePoetryPackages(directory, includeDev);
      break;
    case "pip":
      result = await parsePipPackages(directory, includeDev);
      break;
    case "cargo":
      result = await parseCargoPackages(directory, includeDev);
      break;
    case "go":
      result = await parseGoPackages(directory, includeDev);
      break;
    default:
      console.error(`Error: Unsupported package manager: ${manager}`);
      process.exit(1);
  }

  if (result.packages.length === 0) {
    console.error("Warning: No packages found");
  }

  // Generate SBOM
  let sbom: CycloneDXBom | SPDXDocument;

  if (format === "spdx") {
    sbom = generateSPDX(result.packages, result.rootName, result.rootVersion);
  } else {
    sbom = generateCycloneDX(
      result.packages,
      result.rootName,
      result.rootVersion
    );
  }

  const sbomJson = JSON.stringify(sbom, null, 2);

  // Output
  if (output) {
    const outputPath = resolve(directory, output);
    await Bun.write(outputPath, sbomJson);
    console.error(`SBOM written to: ${outputPath}`);
    console.error(`Format: ${format.toUpperCase()}`);
    console.error(`Components: ${result.packages.length}`);
  } else {
    console.log(sbomJson);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
