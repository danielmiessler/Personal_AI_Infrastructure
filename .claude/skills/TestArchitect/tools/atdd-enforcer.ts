#!/usr/bin/env node
/**
 * ATDD Enforcer - Ensures acceptance tests exist before code implementation
 *
 * Purpose: Enforce Acceptance Test-Driven Development (ATDD) by:
 * 1. Checking that every user story has acceptance criteria (Given-When-Then)
 * 2. Verifying acceptance tests exist for each scenario
 * 3. Preventing code commits without tests (pre-commit hook)
 *
 * Usage:
 *   npm install -g @forge/atdd-enforcer
 *   atdd-enforcer check --story US-42
 *   atdd-enforcer pre-commit
 *
 * Integration:
 * - Pre-commit hook: Runs before git commit
 * - CI/CD: Runs in GitHub Actions / GitLab CI
 * - IDE: VS Code extension (future)
 */

import * as fs from 'fs'
import * as path from 'path'
import * as glob from 'glob'

// Types
interface Scenario {
  name: string
  givenWhenThen: string[]
  testFile?: string
  tested: boolean
}

interface UserStory {
  id: string
  title: string
  filePath: string
  hasAcceptanceCriteria: boolean
  scenarios: Scenario[]
  coveragePercent: number
  status: 'untested' | 'partial' | 'complete'
}

interface ATDDReport {
  totalStories: number
  testedStories: number
  untested Stories: string[]
  partialStories: string[]
  completeStories: string[]
  overallCoverage: number
  passed: boolean
}

// Configuration
interface ATDDConfig {
  storyGlob: string  // Where to find user story files (e.g., "docs/stories/**/*.md")
  testGlob: string   // Where to find test files (e.g., "tests/**/*.spec.ts")
  minCoverage: number  // Minimum % of scenarios that must have tests (80%)
  enforceMode: 'strict' | 'warn' | 'off'  // strict = block commit, warn = allow but warn
  ignorePattern?: string[]  // Stories to ignore (e.g., ["spike", "research"])
}

const defaultConfig: ATDDConfig = {
  storyGlob: 'docs/stories/**/*.md',
  testGlob: 'tests/**/*.spec.{ts,js}',
  minCoverage: 80,
  enforceMode: 'strict',
  ignorePattern: ['spike', 'research', 'documentation'],
}

// Load config from .atddrc.json or use defaults
function loadConfig(): ATDDConfig {
  const configPath = path.join(process.cwd(), '.atddrc.json')
  if (fs.existsSync(configPath)) {
    const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    return { ...defaultConfig, ...userConfig }
  }
  return defaultConfig
}

// Parse user story markdown file
function parseUserStory(filePath: string): UserStory | null {
  const content = fs.readFileSync(filePath, 'utf-8')
  const filename = path.basename(filePath, '.md')

  // Extract story ID (e.g., US-42 from US-42-password-reset.md)
  const idMatch = filename.match(/^(US-\d+)/)
  if (!idMatch) {
    console.warn(`⚠️  Skipping ${filePath}: No story ID found (expected format: US-XXX-title.md)`)
    return null
  }
  const storyId = idMatch[1]

  // Extract title
  const titleMatch = content.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1] : filename

  // Check for "Acceptance Criteria" section
  const hasAcceptanceCriteria = /##\s+Acceptance Criteria/i.test(content)

  // Extract scenarios (Given-When-Then format)
  const scenarios: Scenario[] = []
  const scenarioRegex = /###?\s+Scenario\s*\d*:\s*(.+?)\n((?:Given|When|Then|And)[\s\S]*?)(?=\n###|\n##|$)/g

  let match
  while ((match = scenarioRegex.exec(content)) !== null) {
    const scenarioName = match[1].trim()
    const gwt = match[2]
      .split('\n')
      .filter((line) => /^(Given|When|Then|And)/.test(line.trim()))
      .map((line) => line.trim())

    scenarios.push({
      name: scenarioName,
      givenWhenThen: gwt,
      tested: false,  // Will be checked later
    })
  }

  // Calculate coverage
  const testedScenarios = scenarios.filter((s) => s.tested).length
  const coveragePercent = scenarios.length > 0 ? (testedScenarios / scenarios.length) * 100 : 0

  // Determine status
  let status: UserStory['status']
  if (coveragePercent === 0) status = 'untested'
  else if (coveragePercent === 100) status = 'complete'
  else status = 'partial'

  return {
    id: storyId,
    title,
    filePath,
    hasAcceptanceCriteria,
    scenarios,
    coveragePercent,
    status,
  }
}

// Find test files that reference a story
function findTestsForStory(storyId: string, testGlob: string): string[] {
  const testFiles = glob.sync(testGlob)
  const matchingTests: string[] = []

  for (const testFile of testFiles) {
    const content = fs.readFileSync(testFile, 'utf-8')

    // Check if test file references story ID
    if (content.includes(storyId)) {
      matchingTests.push(testFile)
    }
  }

  return matchingTests
}

// Check if scenario has corresponding test
function scenarioHasTest(story: UserStory, scenario: Scenario, testFiles: string[]): boolean {
  for (const testFile of testFiles) {
    const content = fs.readFileSync(testFile, 'utf-8')

    // Check if test file contains scenario name or Given-When-Then steps
    const scenarioNameMatch = content.includes(scenario.name)
    const gwtMatch = scenario.givenWhenThen.some((step) => content.includes(step))

    if (scenarioNameMatch || gwtMatch) {
      scenario.testFile = testFile
      return true
    }
  }

  return false
}

// Analyze all user stories
function analyzeStories(config: ATDDConfig): ATDDReport {
  const storyFiles = glob.sync(config.storyGlob)
  const stories: UserStory[] = []

  console.log(`\n📋 Analyzing ${storyFiles.length} user stories...\n`)

  for (const storyFile of storyFiles) {
    const story = parseUserStory(storyFile)
    if (!story) continue

    // Skip ignored stories
    if (config.ignorePattern) {
      const shouldIgnore = config.ignorePattern.some((pattern) =>
        story.title.toLowerCase().includes(pattern.toLowerCase())
      )
      if (shouldIgnore) {
        console.log(`⏭️  Skipping ${story.id}: ${story.title} (ignored pattern)`)
        continue
      }
    }

    // Find tests for this story
    const testFiles = findTestsForStory(story.id, config.testGlob)

    // Check each scenario for tests
    for (const scenario of story.scenarios) {
      scenario.tested = scenarioHasTest(story, scenario, testFiles)
    }

    // Recalculate coverage after checking tests
    const testedScenarios = story.scenarios.filter((s) => s.tested).length
    story.coveragePercent = story.scenarios.length > 0 ? (testedScenarios / story.scenarios.length) * 100 : 0

    if (story.coveragePercent === 0) story.status = 'untested'
    else if (story.coveragePercent === 100) story.status = 'complete'
    else story.status = 'partial'

    stories.push(story)

    // Log story status
    const statusEmoji = {
      untested: '❌',
      partial: '⚠️ ',
      complete: '✅',
    }[story.status]

    console.log(`${statusEmoji} ${story.id}: ${story.title} (${story.scenarios.length} scenarios, ${story.coveragePercent.toFixed(0)}% tested)`)

    if (!story.hasAcceptanceCriteria) {
      console.log(`   ⚠️  No "Acceptance Criteria" section found`)
    }

    if (story.scenarios.length === 0) {
      console.log(`   ⚠️  No Given-When-Then scenarios found`)
    }

    for (const scenario of story.scenarios) {
      const tested = scenario.tested ? '✓' : '✗'
      const testFileInfo = scenario.testFile ? ` (${path.basename(scenario.testFile)})` : ''
      console.log(`   ${tested} Scenario: ${scenario.name}${testFileInfo}`)
    }

    console.log()
  }

  // Generate report
  const untestedStories = stories.filter((s) => s.status === 'untested').map((s) => s.id)
  const partialStories = stories.filter((s) => s.status === 'partial').map((s) => s.id)
  const completeStories = stories.filter((s) => s.status === 'complete').map((s) => s.id)

  const totalScenarios = stories.reduce((sum, s) => sum + s.scenarios.length, 0)
  const testedScenarios = stories.reduce(
    (sum, s) => sum + s.scenarios.filter((sc) => sc.tested).length,
    0
  )
  const overallCoverage = totalScenarios > 0 ? (testedScenarios / totalScenarios) * 100 : 0

  const passed = overallCoverage >= config.minCoverage && untestedStories.length === 0

  return {
    totalStories: stories.length,
    testedStories: completeStories.length,
    untestedStories,
    partialStories,
    completeStories,
    overallCoverage,
    passed,
  }
}

// Print ATDD report
function printReport(report: ATDDReport, config: ATDDConfig): void {
  console.log('\n' + '='.repeat(60))
  console.log('📊 ATDD ENFORCEMENT REPORT')
  console.log('='.repeat(60) + '\n')

  console.log(`Total Stories: ${report.totalStories}`)
  console.log(`✅ Complete: ${report.completeStories.length} (${((report.completeStories.length / report.totalStories) * 100).toFixed(0)}%)`)
  console.log(`⚠️  Partial: ${report.partialStories.length} (${((report.partialStories.length / report.totalStories) * 100).toFixed(0)}%)`)
  console.log(`❌ Untested: ${report.untestedStories.length} (${((report.untestedStories.length / report.totalStories) * 100).toFixed(0)}%)`)
  console.log()

  console.log(`Overall Coverage: ${report.overallCoverage.toFixed(1)}% (minimum: ${config.minCoverage}%)`)
  console.log()

  if (report.untestedStories.length > 0) {
    console.log('❌ Untested Stories (no acceptance tests):')
    for (const storyId of report.untestedStories) {
      console.log(`   - ${storyId}`)
    }
    console.log()
  }

  if (report.partialStories.length > 0) {
    console.log('⚠️  Partially Tested Stories (some scenarios missing tests):')
    for (const storyId of report.partialStories) {
      console.log(`   - ${storyId}`)
    }
    console.log()
  }

  // Pass/Fail
  if (report.passed) {
    console.log('✅ ATDD ENFORCEMENT: PASSED')
    console.log('   All stories have acceptance tests.')
    console.log()
  } else {
    if (config.enforceMode === 'strict') {
      console.log('❌ ATDD ENFORCEMENT: FAILED')
      console.log('   Some stories are missing acceptance tests.')
      console.log('   Commit BLOCKED. Please add tests before committing.')
      console.log()
      process.exit(1)  // Exit with error (blocks commit)
    } else if (config.enforceMode === 'warn') {
      console.log('⚠️  ATDD ENFORCEMENT: WARNING')
      console.log('   Some stories are missing acceptance tests.')
      console.log('   Commit ALLOWED, but please add tests soon.')
      console.log()
      process.exit(0)  // Exit with success (allows commit)
    }
  }
}

// CLI commands
function checkStory(storyId: string, config: ATDDConfig): void {
  const storyFiles = glob.sync(config.storyGlob)
  const storyFile = storyFiles.find((file) => path.basename(file).includes(storyId))

  if (!storyFile) {
    console.error(`❌ Story ${storyId} not found in ${config.storyGlob}`)
    process.exit(1)
  }

  const story = parseUserStory(storyFile)
  if (!story) {
    console.error(`❌ Failed to parse story ${storyFile}`)
    process.exit(1)
  }

  const testFiles = findTestsForStory(story.id, config.testGlob)

  for (const scenario of story.scenarios) {
    scenario.tested = scenarioHasTest(story, scenario, testFiles)
  }

  const testedScenarios = story.scenarios.filter((s) => s.tested).length
  story.coveragePercent = story.scenarios.length > 0 ? (testedScenarios / story.scenarios.length) * 100 : 0

  console.log(`\n📋 Story: ${story.id} - ${story.title}`)
  console.log(`File: ${story.filePath}`)
  console.log(`Acceptance Criteria: ${story.hasAcceptanceCriteria ? '✅' : '❌'}`)
  console.log(`Scenarios: ${story.scenarios.length}`)
  console.log(`Tested: ${testedScenarios} / ${story.scenarios.length} (${story.coveragePercent.toFixed(0)}%)`)
  console.log()

  for (const scenario of story.scenarios) {
    const tested = scenario.tested ? '✅' : '❌'
    const testFileInfo = scenario.testFile ? ` (${path.basename(scenario.testFile)})` : ''
    console.log(`${tested} Scenario: ${scenario.name}${testFileInfo}`)

    if (!scenario.tested) {
      console.log(`   Missing test for:`)
      for (const step of scenario.givenWhenThen.slice(0, 3)) {  // Show first 3 steps
        console.log(`   - ${step}`)
      }
    }
  }

  console.log()

  if (story.coveragePercent === 100) {
    console.log('✅ All scenarios have tests!')
  } else {
    console.log(`⚠️  ${story.scenarios.length - testedScenarios} scenarios are missing tests`)
    process.exit(1)
  }
}

// Pre-commit hook: Check all stories
function preCommit(config: ATDDConfig): void {
  console.log('\n🔒 ATDD Pre-Commit Hook Running...\n')

  const report = analyzeStories(config)
  printReport(report, config)
}

// Main CLI
function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  const config = loadConfig()

  if (command === 'check' && args[1] === '--story' && args[2]) {
    const storyId = args[2]
    checkStory(storyId, config)
  } else if (command === 'pre-commit' || command === 'check-all') {
    preCommit(config)
  } else if (command === 'init') {
    // Initialize .atddrc.json config file
    const configPath = path.join(process.cwd(), '.atddrc.json')
    if (fs.existsSync(configPath)) {
      console.log('⚠️  .atddrc.json already exists')
      process.exit(1)
    }

    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2))
    console.log('✅ Created .atddrc.json')
    console.log('   Edit this file to configure ATDD enforcement for your project.')
  } else {
    console.log(`
ATDD Enforcer - Ensure acceptance tests exist before code implementation

Usage:
  atdd-enforcer init                           Create .atddrc.json config file
  atdd-enforcer check --story US-42            Check specific user story
  atdd-enforcer pre-commit                     Check all stories (use in pre-commit hook)
  atdd-enforcer check-all                      Check all stories

Options:
  --story <ID>    Story ID to check (e.g., US-42)

Configuration:
  Create .atddrc.json in project root:
  {
    "storyGlob": "docs/stories/**/*.md",
    "testGlob": "tests/**/*.spec.ts",
    "minCoverage": 80,
    "enforceMode": "strict",
    "ignorePattern": ["spike", "research"]
  }

Pre-Commit Hook Setup:
  1. Install husky: npm install --save-dev husky
  2. Add pre-commit hook: npx husky add .husky/pre-commit "atdd-enforcer pre-commit"
  3. Now all commits will be checked for ATDD compliance

CI/CD Integration (GitHub Actions):
  - name: ATDD Enforcement
    run: |
      npm install -g @forge/atdd-enforcer
      atdd-enforcer check-all
    `)
  }
}

main()
