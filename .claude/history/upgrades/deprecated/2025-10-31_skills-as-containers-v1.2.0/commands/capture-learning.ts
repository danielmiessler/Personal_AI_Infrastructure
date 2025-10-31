#!/usr/bin/env bun

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const LEARNINGS_DIR = path.join(process.env.PAI_DIR || `${process.env.HOME}/.claude`, 'context', 'learnings');

// Ensure learnings directory exists
if (!fs.existsSync(LEARNINGS_DIR)) {
    fs.mkdirSync(LEARNINGS_DIR, { recursive: true });
}

// Get current date in readable format
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const dateStr = `${year}-${month}-${day}`;

async function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function main() {
    // Collect comprehensive narrative information
    let problem = process.argv[2];
    let initialAssumption = process.argv[3];
    let actualReality = process.argv[4];
    let troubleshootingSteps = process.argv[5];
    let solution = process.argv[6];
    let takeaway = process.argv[7];
    
    // Interactive prompts for comprehensive narrative
    if (!problem) {
        console.log('\n📚 Let\'s capture this learning in a comprehensive narrative format...\n');
        problem = await prompt('📝 What problem did we encounter? ');
    }
    
    if (!initialAssumption) {
        initialAssumption = await prompt('🤔 What did we initially think was true/how we thought it worked? ');
    }
    
    if (!actualReality) {
        actualReality = await prompt('💡 What did we realize was actually true? ');
    }
    
    if (!troubleshootingSteps) {
        troubleshootingSteps = await prompt('🔍 What troubleshooting steps did we take to get there? ');
    }
    
    if (!solution) {
        solution = await prompt('✅ What was the final solution? ');
    }
    
    if (!takeaway) {
        takeaway = await prompt('🎯 What\'s the key takeaway ("So now we know..." or "So now we do it this way...")? ');
    }
    
    // Create a filename-safe version of the problem
    const sanitizedProblem = problem
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50); // Limit length
    
    const filename = `${dateStr}-${sanitizedProblem}.md`;
    const filepath = path.join(LEARNINGS_DIR, filename);
    
    // Create the comprehensive narrative markdown content
    const content = `# Learning: ${problem}

**Date:** ${now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
})}

**Time:** ${now.toLocaleTimeString('en-US')}

---

## 🎭 The Full Story

### The Problem We Encountered

${problem}

### What We Initially Thought

We thought that ${initialAssumption}

This led us to believe the system worked in a certain way, and we approached the problem with these assumptions.

### What We Discovered Was Actually True

What we realized was that ${actualReality}

This was different from our initial understanding and required us to rethink our approach.

### The Journey: Troubleshooting Steps We Took

${troubleshootingSteps}

These steps helped us uncover the real issue and guided us toward the solution.

### The Solution That Worked

${solution}

This solution addressed the actual problem rather than what we initially thought was wrong.

---

## 🎯 The Lesson Learned

**So now we know:** ${takeaway}

This changes how we approach similar problems in the future because we understand the underlying mechanism better.

---

## 📋 Quick Reference

**Before:** We thought ${initialAssumption.substring(0, 100)}...

**After:** We know ${actualReality.substring(0, 100)}...

**Action:** ${takeaway}

---

## 🔧 Technical Details

### Commands/Tools That Helped
- Document specific commands that were useful
- Note any MCP servers or tools that aided in debugging
- Include any error messages that were key indicators

### Related Files/Configurations
- List any files that were modified
- Note configuration changes made
- Document any dependencies involved

### Future Applications
This learning applies to:
- Similar error patterns involving these components
- Related debugging scenarios in this area
- Comparable system behaviors we might encounter

---

*This narrative learning was captured to help us remember not just the solution, but the entire problem-solving journey and the thinking that led us to the answer.*
`;
    
    // Write the file
    fs.writeFileSync(filepath, content);
    
    console.log(`\n✅ Learning captured with full narrative!`);
    console.log(`📁 Saved to: ${filepath}`);
    console.log(`\n📖 The narrative format helps us:`);
    console.log(`   • Remember the journey, not just the destination`);
    console.log(`   • Understand why the solution works`);
    console.log(`   • Apply this knowledge to future problems`);
    console.log(`\n🎯 You can edit this file to add more technical details or insights.`);
}

main().catch(console.error);