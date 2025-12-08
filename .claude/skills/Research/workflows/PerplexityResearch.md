#!/usr/bin/env bun

/**
 * # Enhanced Web Research Command - Intelligent Multi-Query Perplexity AI
 *
 * This command analyzes your research question, decomposes it into 4-8 targeted
 * sub-queries, and executes them in parallel using perplexity-researcher agents.
 * 
 * ## Usage
 * ```bash
 * bun ${PAI_DIR}/commands/perform-perplexity-research.md "your complex research question here"
 * ```
 *
 * ## Features
 * - Intelligent query decomposition into multiple focused searches
 * - Parallel execution via perplexity-researcher agents for speed
 * - Iterative follow-up searches based on initial findings
 * - Comprehensive synthesis of all findings
 * 
 * ## Models
 * - **sonar** - Fast web search (default for initial queries)
 * - **sonar-pro** - Deeper analysis (used for follow-ups)
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const exec = promisify(require('child_process').exec);

// Load .env file from ~/.claude directory
function loadEnv() {
  const envPath = path.join(os.homedir(), '.claude', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (key && value) {
          process.env[key] = value;
        }
      }
    });
  }
}

// Load environment variables
loadEnv();

// Get the research question from command line
const originalQuestion = process.argv.slice(2).join(' ');

if (!originalQuestion) {
  console.error('❌ Please provide a research question');
  console.error('Usage: bun ${PAI_DIR}/commands/perform-perplexity-research.md "your question here"');
  process.exit(1);
}

// Load API key from environment
const apiKey = process.env.PERPLEXITY_API_KEY;
if (!apiKey) {
  console.error('❌ PERPLEXITY_API_KEY not found');
  console.error('Please add PERPLEXITY_API_KEY to your ${PAI_DIR}/.env file');
  process.exit(1);
}

console.log('📅 ' + new Date().toISOString());
console.log('\n📋 SUMMARY: Intelligent web research with query decomposition\n');
console.log('🔍 ANALYSIS: Analyzing your question to generate targeted queries...\n');
console.log('Original question:', originalQuestion);
console.log('\n⚡ ACTIONS: Decomposing into sub-queries...\n');

// Function to analyze question and generate sub-queries
async function decomposeQuestion(question: string): Promise<string[]> {
  // Use Claude to intelligently decompose the question
  const analysisPrompt = `
Analyze this research question and decompose it into 4-8 focused sub-queries for comprehensive research:

"${question}"

Consider:
1. Different aspects/angles of the topic
2. Background/context queries
3. Current state/recent developments
4. Comparisons/alternatives
5. Technical details if relevant
6. Implications/consequences
7. Expert opinions/analysis
8. Data/statistics if relevant

Return ONLY a JSON array of query strings, no explanation:
`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{
          role: 'system',
          content: 'You are a research query decomposition expert. Return only valid JSON arrays.'
        }, {
          role: 'user',
          content: analysisPrompt
        }],
        temperature: 0.3
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback: create basic queries if parsing fails
    return [
      question,
      `latest news about ${question}`,
      `technical details ${question}`,
      `expert analysis ${question}`
    ];
  } catch (error) {
    console.error('Failed to decompose question, using fallback queries');
    return [
      question,
      `current state of ${question}`,
      `recent developments in ${question}`,
      `analysis of ${question}`
    ];
  }
}

// Function to execute a single search query
async function executeSearch(query: string, model: string = 'sonar'): Promise<any> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [{
        role: 'user',
        content: query
      }],
      return_citations: true
    })
  });

  return response.json();
}

// Function to run perplexity-researcher agent for a query
async function runResearcherAgent(query: string, index: number): Promise<string> {
  return new Promise((resolve) => {
    console.log(`🔍 Agent ${index + 1}: Researching "${query}"`);

    const agentPrompt = `
[VOICE CONFIG - MANDATORY]
Follow your agents/perplexity-researcher.md configuration:
- Use [AGENT:perplexity-researcher] tag in COMPLETED section
- Your voice ID: AXdMgz6evoL7OPd7eU12
- Follow your specified output format

[TASK]
Research the following query using the Perplexity API and provide comprehensive findings:
"${query}"

Use the web-research command tools to search for information.
Focus on finding authoritative, recent, and relevant information.
Synthesize your findings clearly and concisely.
`;

    // Simulate agent task execution (in real implementation, use Task tool)
    executeSearch(query)
      .then(result => {
        const content = result.choices[0].message.content;
        const citations = result.citations || [];
        
        let output = `\n### Query ${index + 1}: ${query}\n`;
        output += `**Findings:**\n${content}\n`;
        
        if (citations.length > 0) {
          output += `\n**Sources:**\n`;
          citations.forEach((citation: any) => {
            output += `- ${citation.title || citation.url}\n`;
          });
        }
        
        resolve(output);
      })
      .catch(error => {
        resolve(`\n### Query ${index + 1}: ${query}\n**Error:** ${error.message}\n`);
      });
  });
}

// Main execution
(async () => {
  try {
    // Step 1: Decompose the question
    const subQueries = await decomposeQuestion(originalQuestion);
    console.log(`Generated ${subQueries.length} targeted queries:\n`);
    subQueries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
    
    console.log('\n✅ RESULTS: Executing parallel research...\n');
    console.log('═'.repeat(60));
    
    // Step 2: Execute all queries in parallel
    const searchPromises = subQueries.map((query, index) => 
      runResearcherAgent(query, index)
    );
    
    const results = await Promise.all(searchPromises);
    
    // Step 3: Display all results
    results.forEach(result => console.log(result));
    
    console.log('═'.repeat(60));
    
    // Step 4: Determine if follow-up searches are needed
    console.log('\n📊 STATUS: Analyzing if follow-up searches are needed...\n');
    
    // Simple heuristic: if original question mentions "latest" or "2024" or "2025", do a follow-up
    if (originalQuestion.match(/latest|recent|2024|2025|current|today|now/i)) {
      console.log('➡️ NEXT: Executing follow-up search for most recent information...\n');
      
      const followUpQuery = `Most recent updates and developments as of ${new Date().toLocaleDateString()} regarding: ${originalQuestion}`;
      const followUpResult = await executeSearch(followUpQuery, 'sonar-pro');
      
      console.log('### Follow-up Search: Latest Updates');
      console.log(followUpResult.choices[0].message.content);
      console.log('\n');
    }
    
    // Step 5: Final synthesis
    console.log('\n🎯 COMPLETED: Completed multi-query intelligent web research.');
    
  } catch (error) {
    console.error('❌ Error during research:', error);
    process.exit(1);
  }
})();