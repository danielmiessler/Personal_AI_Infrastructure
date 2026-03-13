/**
 * PAI Uninstaller — Known PAI-owned filenames and directories.
 * These lists match the v3.0 release manifest.
 */

export const PAI_AGENTS: readonly string[] = [
  "Algorithm.md", "Architect.md", "Artist.md", "ClaudeResearcher.md",
  "CodexResearcher.md", "Designer.md", "Engineer.md", "GeminiResearcher.md",
  "GrokResearcher.md", "Intern.md", "Pentester.md", "PerplexityResearcher.md",
  "QATester.md",
];

export const PAI_HOOKS: readonly string[] = [
  "AgentExecutionGuard.hook.ts", "AlgorithmTracker.hook.ts", "AutoWorkCreation.hook.ts",
  "CheckVersion.hook.ts", "IntegrityCheck.hook.ts", "LoadContext.hook.ts",
  "QuestionAnswered.hook.ts", "RatingCapture.hook.ts", "README.md",
  "RelationshipMemory.hook.ts", "SecurityValidator.hook.ts", "SessionAutoName.hook.ts",
  "SessionSummary.hook.ts", "SetQuestionTab.hook.ts", "SkillGuard.hook.ts",
  "StartupGreeting.hook.ts", "StopOrchestrator.hook.ts", "UpdateCounts.hook.ts",
  "UpdateTabTitle.hook.ts", "VoiceGate.hook.ts", "WorkCompletionLearning.hook.ts",
];

export const PAI_SKILLS: readonly string[] = [
  "Agents", "AnnualReports", "Aphorisms", "Apify", "Art", "BeCreative", "BrightData",
  "Browser", "Cloudflare", "CORE", "Council", "CreateCLI", "CreateSkill", "Documents",
  "Evals", "ExtractWisdom", "Fabric", "FirstPrinciples", "IterativeDepth", "OSINT",
  "PAI", "PAIUpgrade", "Parser", "PrivateInvestigator", "Prompting", "PromptInjection",
  "Recon", "RedTeam", "Remotion", "Research", "Sales", "Science", "SECUpdates", "Telos",
  "USMetrics", "WebAssessment", "WorldThreatModelHarness", "WriteStory",
];

export const MEMORY_USER_SUBDIRS: readonly string[] = [
  "LEARNING", "WORK", "RELATIONSHIP", "SECURITY", "VOICE",
];

export const SETTINGS_PAI_KEYS: readonly string[] = [
  "principal", "daidentity", "pai", "counts", "plansDirectory", "statusLine",
];

export const SETTINGS_PAI_ENV_KEYS: readonly string[] = [
  "PROJECTS_DIR",
];
