#!/usr/bin/env bun
/**
 * mai-spec - Spec Document Creation CLI
 *
 * Interactive wizard for creating specification documents.
 */

import { input, confirm, editor } from '@inquirer/prompts';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  createSpecDocument,
  validateSpec,
  getBlankSpecMarkdown,
  type SpecDocument,
} from 'mai-specdev-core';

async function main() {
  const args = process.argv.slice(2);
  const fromClaude = args.includes('--from-claude');
  const titleArg = args.find(a => a.startsWith('--title='))?.split('=')[1];

  console.log('\n=== MAI Spec Document Creation ===\n');

  // Check if SPEC.md already exists
  const specPath = join(process.cwd(), 'SPEC.md');
  if (existsSync(specPath)) {
    const overwrite = await confirm({
      message: 'SPEC.md already exists. Overwrite?',
      default: false,
    });
    if (!overwrite) {
      console.log('Cancelled.');
      return;
    }
  }

  let title: string;
  let problemStatement: string;
  let author = 'Joey';

  // Try to extract from CLAUDE.md if requested
  if (fromClaude) {
    const claudePath = join(process.cwd(), 'CLAUDE.md');
    if (existsSync(claudePath)) {
      const claude = readFileSync(claudePath, 'utf-8');

      // Extract title from CLAUDE.md
      const titleMatch = claude.match(/^# (.+)$/m);
      title = titleMatch ? titleMatch[1] : await input({ message: 'Title' });

      // Extract problem statement
      const problemMatch = claude.match(/## Problem Statement\n\n(.+?)(?=\n\n##|$)/s);
      problemStatement = problemMatch
        ? problemMatch[1].trim()
        : await input({ message: 'Problem Statement' });

      // Extract owner
      const ownerMatch = claude.match(/\*\*Owner:\*\* (.+)/);
      author = ownerMatch ? ownerMatch[1] : 'Joey';

      console.log(`Extracted from CLAUDE.md:`);
      console.log(`  Title: ${title}`);
      console.log(`  Author: ${author}`);
    } else {
      console.log('No CLAUDE.md found, using interactive mode.');
      title = titleArg || await input({ message: 'Title' });
      problemStatement = await input({ message: 'Problem Statement' });
    }
  } else {
    title = titleArg || await input({
      message: 'Spec Title',
      validate: v => v.length > 0 || 'Required',
    });

    author = await input({
      message: 'Author',
      default: 'Joey',
    });

    problemStatement = await input({
      message: 'Problem Statement - What problem are we solving?',
      validate: v => v.length > 0 || 'Required',
    });
  }

  // Success criteria
  const successCriteria: string[] = [];
  console.log('\nSuccess Criteria (enter blank to finish):');
  while (true) {
    const criterion = await input({
      message: `Criterion ${successCriteria.length + 1}`,
    });
    if (!criterion) {
      if (successCriteria.length === 0) {
        console.log('At least one criterion required.');
        continue;
      }
      break;
    }
    successCriteria.push(criterion);
  }

  // Approach
  const approach = await input({
    message: 'Approach - How will we solve this?',
    validate: v => v.length > 0 || 'Required',
  });

  // Security implications
  const securityImplications: string[] = [];
  console.log('\nSecurity Implications (enter blank to finish):');
  while (true) {
    const implication = await input({
      message: `Implication ${securityImplications.length + 1}`,
    });
    if (!implication) {
      if (securityImplications.length === 0) {
        console.log('At least one security consideration required.');
        continue;
      }
      break;
    }
    securityImplications.push(implication);
  }

  // Build spec document
  const spec = createSpecDocument(title, author, problemStatement);
  spec.sections.successCriteria = successCriteria;
  spec.sections.approach = approach;
  spec.sections.securityImplications = securityImplications;

  // Validate
  const { valid, errors } = validateSpec(spec);
  if (!valid) {
    console.log('\nValidation errors:');
    errors.forEach(e => console.log(`  - ${e}`));

    const proceed = await confirm({
      message: 'Create spec anyway?',
      default: false,
    });
    if (!proceed) {
      console.log('Cancelled.');
      return;
    }
  }

  // Generate markdown
  const markdown = generateSpecMarkdown(spec);

  // Preview
  console.log('\n=== Preview ===\n');
  console.log(markdown.slice(0, 500) + '...');

  const confirmed = await confirm({
    message: '\nCreate SPEC.md?',
    default: true,
  });

  if (confirmed) {
    writeFileSync(specPath, markdown);
    console.log(`\nCreated: ${specPath}`);
  } else {
    console.log('\nCancelled.');
  }
}

function generateSpecMarkdown(spec: SpecDocument): string {
  return `# ${spec.metadata.title} - Specification

**Version:** ${spec.metadata.version}
**Date:** ${spec.metadata.date}
**Author:** ${spec.metadata.author}
**Status:** ${spec.metadata.status}

---

## 1. Problem Statement

${spec.sections.problemStatement}

---

## 2. Success Criteria

${spec.sections.successCriteria.map(c => `- [ ] ${c}`).join('\n')}

---

## 3. Constraints

${spec.sections.constraints.length > 0
  ? spec.sections.constraints.map(c => `- ${c}`).join('\n')
  : 'None specified.'}

---

## 4. Approach

${spec.sections.approach}

---

## 5. Interfaces

(To be defined during design phase)

---

## 6. Security Implications

${spec.sections.securityImplications.map(s => `- ${s}`).join('\n')}

---

## 7. Open Questions

${spec.sections.openQuestions.length > 0
  ? spec.sections.openQuestions.map(q => `- [ ] ${q}`).join('\n')
  : 'None at this time.'}

---

## Approval

*Pending approval*
`;
}

main().catch(console.error);

export { generateSpecMarkdown };
