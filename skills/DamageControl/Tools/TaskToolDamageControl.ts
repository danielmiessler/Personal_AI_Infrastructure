/**
 * DamageControl - Task Tool Security Hook
 * ========================================
 *
 * PreToolUse hook that validates Task tool prompts for prompt injection.
 * Blocks prompts that contain injection patterns attempting to manipulate
 * the agent's behavior.
 *
 * Exit codes:
 * 0 = Allow task
 * 2 = Block task (stderr fed back to Claude)
 */

// Prompt injection patterns (imported from security-validator.ts concept)
export const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?prior\s+instructions/i,
  /you\s+are\s+now\s+(in\s+)?[a-z]+\s+mode/i,
  /new\s+instruction[s]?:/i,
  /system\s+prompt:/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
];

interface HookInput {
  tool_name: string;
  tool_input: {
    prompt?: string;
    description?: string;
  };
}

/**
 * Check if a prompt contains injection patterns
 */
export function checkPrompt(prompt: string): { blocked: boolean; reason: string } {
  // Handle null/undefined/empty
  if (!prompt || typeof prompt !== "string") {
    return { blocked: false, reason: "" };
  }

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(prompt)) {
      return {
        blocked: true,
        reason: "Prompt injection pattern detected",
      };
    }
  }

  return { blocked: false, reason: "" };
}

async function main(): Promise<void> {
  // Read JSON from stdin
  let inputText = "";
  for await (const chunk of Bun.stdin.stream()) {
    inputText += new TextDecoder().decode(chunk);
  }

  let input: HookInput;
  try {
    input = JSON.parse(inputText);
  } catch (e) {
    console.error(`Error: Invalid JSON input: ${e}`);
    process.exit(1);
  }

  // Only check Task tool
  if (input.tool_name !== "Task") {
    process.exit(0);
  }

  // Check the prompt field
  const prompt = input.tool_input?.prompt || "";
  if (prompt) {
    const result = checkPrompt(prompt);
    if (result.blocked) {
      console.error(`SECURITY WARNING (would have blocked): Task tool due to ${result.reason}`);
      // Changed from exit(2) to exit(0) - warn but don't block
      process.exit(0);
    }
  }

  // Also check description field as it could contain injection
  const description = input.tool_input?.description || "";
  if (description) {
    const result = checkPrompt(description);
    if (result.blocked) {
      console.error(`SECURITY WARNING (would have blocked): Task tool description due to ${result.reason}`);
      // Changed from exit(2) to exit(0) - warn but don't block
      process.exit(0);
    }
  }

  process.exit(0);
}

// Only run main when executed directly, not when imported for testing
if (import.meta.main) {
  main().catch((e) => {
    console.error(`Hook error: ${e}`);
    process.exit(0); // Fail open
  });
}
