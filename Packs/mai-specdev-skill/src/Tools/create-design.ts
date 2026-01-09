#!/usr/bin/env bun
/**
 * mai-design - Design Document Creation CLI
 *
 * Interactive wizard for creating design documents from specs.
 */

import { input, confirm, select } from '@inquirer/prompts';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  createDesignDocument,
  addComponent,
  getBlankDesignMarkdown,
  type DesignDocument,
  type Component,
} from 'mai-specdev-core';

async function main() {
  const args = process.argv.slice(2);
  const specArg = args.find(a => a.startsWith('--spec='))?.split('=')[1];

  console.log('\n=== MAI Design Document Creation ===\n');

  // Check if DESIGN.md already exists
  const designPath = join(process.cwd(), 'DESIGN.md');
  if (existsSync(designPath)) {
    const overwrite = await confirm({
      message: 'DESIGN.md already exists. Overwrite?',
      default: false,
    });
    if (!overwrite) {
      console.log('Cancelled.');
      return;
    }
  }

  // Find or specify spec reference
  let specRef = specArg || 'SPEC.md';
  const specPath = join(process.cwd(), specRef);

  if (!existsSync(specPath)) {
    console.log(`Warning: ${specRef} not found.`);
    specRef = await input({
      message: 'Spec reference (filename or ID)',
      default: 'SPEC.md',
    });
  } else {
    console.log(`Found spec: ${specRef}`);
  }

  // Extract title from spec if available
  let title = 'Design Document';
  if (existsSync(specPath)) {
    const specContent = readFileSync(specPath, 'utf-8');
    const titleMatch = specContent.match(/^# (.+) - Specification$/m);
    if (titleMatch) {
      title = `${titleMatch[1]} - Design`;
    }
  }

  title = await input({
    message: 'Design Title',
    default: title,
  });

  const author = await input({
    message: 'Author',
    default: 'Joey',
  });

  // Create design document
  const design = createDesignDocument(title, author, specRef);

  // Add components
  console.log('\nComponent Identification (enter blank name to finish):');
  let addMore = true;
  while (addMore) {
    const name = await input({
      message: 'Component name',
    });

    if (!name) {
      if (design.sections.componentIdentification.length === 0) {
        console.log('At least one component required.');
        continue;
      }
      break;
    }

    const type = await select({
      message: 'Component type',
      choices: [
        { value: 'module', name: 'Module' },
        { value: 'service', name: 'Service' },
        { value: 'library', name: 'Library' },
        { value: 'ui', name: 'UI Component' },
        { value: 'data', name: 'Data Store' },
      ],
    }) as Component['type'];

    const description = await input({
      message: 'Description',
    });

    const responsibilitiesRaw = await input({
      message: 'Responsibilities (comma-separated)',
    });
    const responsibilities = responsibilitiesRaw
      .split(',')
      .map(r => r.trim())
      .filter(Boolean);

    const component: Component = {
      name,
      type,
      description,
      responsibilities,
      dependencies: [],
      interfaces: [],
    };

    addComponent(design, component);
    design.sections.componentIdentification.push(component);

    addMore = await confirm({
      message: 'Add another component?',
      default: true,
    });
  }

  // Generate markdown
  const markdown = generateDesignMarkdown(design);

  // Preview
  console.log('\n=== Preview ===\n');
  console.log(markdown.slice(0, 500) + '...');

  const confirmed = await confirm({
    message: '\nCreate DESIGN.md?',
    default: true,
  });

  if (confirmed) {
    writeFileSync(designPath, markdown);
    console.log(`\nCreated: ${designPath}`);
  } else {
    console.log('\nCancelled.');
  }
}

function generateDesignMarkdown(design: DesignDocument): string {
  const components = design.sections.componentIdentification
    .map((c, i) => `### ${i + 1}. ${c.name}

**Type:** ${c.type}

${c.description}

**Responsibilities:**
${c.responsibilities.map(r => `- ${r}`).join('\n')}

**Dependencies:**
${c.dependencies.length > 0 ? c.dependencies.map(d => `- ${d}`).join('\n') : 'None'}

**Interfaces:**
${c.interfaces.length > 0 ? c.interfaces.map(i => `- ${i}`).join('\n') : 'To be defined'}
`)
    .join('\n');

  return `# ${design.metadata.title}

**Version:** ${design.metadata.version}
**Date:** ${design.metadata.date}
**Author:** ${design.metadata.author}
**Status:** ${design.metadata.status}
**Spec Reference:** ${design.metadata.specRef}

---

## 1. Component Identification

${components}

---

## 2. Interface Definitions

(To be detailed based on component interfaces)

---

## 3. Data Flow

(To be diagrammed)

---

## 4. Test Strategy

### 4.1 Unit Tests

- **Framework:** bun:test
- **Coverage Target:** 80%

### 4.2 Integration Tests

- **Framework:** bun:test
- **Scope:** Component interactions

---

## 5. Security Controls

| ID | Name | Type | Implementation |
|----|------|------|----------------|
| SC-1 | Input Validation | preventive | Validate all inputs at boundaries |

---

## Approval

*Pending approval*
`;
}

main().catch(console.error);

export { generateDesignMarkdown };
