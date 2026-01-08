#!/usr/bin/env bun
// $PAI_DIR/hooks/security-validator.ts
// PreToolUse hook: Validates commands and blocks dangerous operations

import { sendEventToObservability, getCurrentTimestamp, getSourceApp } from './lib/observability';

interface PreToolUsePayload {
  session_id: string;
  tool_name: string;
  tool_input: Record<string, any>;
}

// Attack pattern categories
const ATTACK_PATTERNS = {
  // Tier 1: Catastrophic - Always block
  catastrophic: {
    patterns: [
      /rm\s+(-rf?|--recursive)\s+[\/~]/i,           // rm -rf /
      /rm\s+(-rf?|--recursive)\s+\*/i,              // rm -rf *
      />\s*\/dev\/sd[a-z]/i,                        // Overwrite disk
      /mkfs\./i,                                     // Format filesystem
      /dd\s+if=.*of=\/dev/i,                        // dd to device
    ],
    action: 'block',
    message: '🚨 BLOCKED: Catastrophic deletion/destruction detected'
  },

  // Tier 2: Reverse shells - Always block
  reverseShell: {
    patterns: [
      /bash\s+-i\s+>&\s*\/dev\/tcp/i,              // Bash reverse shell
      /nc\s+(-e|--exec)\s+\/bin\/(ba)?sh/i,        // Netcat shell
      /python.*socket.*connect/i,                   // Python socket
      /perl.*socket.*connect/i,                     // Perl socket
      /ruby.*TCPSocket/i,                          // Ruby socket
      /php.*fsockopen/i,                           // PHP socket
      /socat.*exec/i,                              // Socat exec
      /\|\s*\/bin\/(ba)?sh/i,                      // Pipe to shell
    ],
    action: 'block',
    message: '🚨 BLOCKED: Reverse shell pattern detected'
  },

  // Tier 3: Credential theft - Always block
  credentialTheft: {
    patterns: [
      /curl.*\|\s*(ba)?sh/i,                       // curl pipe to shell
      /wget.*\|\s*(ba)?sh/i,                       // wget pipe to shell
      /curl.*(-o|--output).*&&.*chmod.*\+x/i,      // Download and execute
      /base64\s+-d.*\|\s*(ba)?sh/i,                // Base64 decode to shell
    ],
    action: 'block',
    message: '🚨 BLOCKED: Remote code execution pattern detected'
  },

  // Tier 4: Prompt injection indicators - Block and log
  promptInjection: {
    patterns: [
      /ignore\s+(all\s+)?previous\s+instructions/i,
      /disregard\s+(all\s+)?prior\s+instructions/i,
      /you\s+are\s+now\s+(in\s+)?[a-z]+\s+mode/i,
      /new\s+instruction[s]?:/i,
      /system\s+prompt:/i,
      /\[INST\]/i,                                  // LLM injection
      /<\|im_start\|>/i,                           // ChatML injection
    ],
    action: 'block',
    message: '🚨 BLOCKED: Prompt injection pattern detected - logging incident'
  },

  // Tier 5: Environment manipulation - Warn
  envManipulation: {
    patterns: [
      /export\s+(ANTHROPIC|OPENAI|AWS|AZURE)_/i,   // API key export
      /echo\s+\$\{?(ANTHROPIC|OPENAI)_/i,          // Echo API keys
      /env\s*\|.*KEY/i,                            // Dump env with keys
      /printenv.*KEY/i,                            // Print env keys
    ],
    action: 'warn',
    message: '⚠️ WARNING: Environment/credential access detected'
  },

  // Tier 6: Git dangerous operations - Require confirmation
  gitDangerous: {
    patterns: [
      /git\s+push.*(-f|--force)/i,                 // Force push
      /git\s+reset\s+--hard/i,                     // Hard reset
      /git\s+clean\s+-fd/i,                        // Clean untracked
      /git\s+checkout\s+--\s+\./i,                 // Discard all changes
    ],
    action: 'confirm',
    message: '⚠️ CONFIRM: Potentially destructive git operation'
  },

  // Tier 7: System modification - Log
  systemMod: {
    patterns: [
      /chmod\s+777/i,                              // World writable
      /chown\s+root/i,                             // Change to root
      /sudo\s+/i,                                  // Sudo usage
      /systemctl\s+(stop|disable)/i,               // Stop services
    ],
    action: 'log',
    message: '📝 LOGGED: System modification command'
  },

  // Tier 8: Network operations - Log
  network: {
    patterns: [
      /ssh\s+/i,                                   // SSH connections
      /scp\s+/i,                                   // SCP transfers
      /rsync.*:/i,                                 // Rsync remote
      /curl\s+(-X\s+POST|--data)/i,               // POST requests
    ],
    action: 'log',
    message: '📝 LOGGED: Network operation'
  },

  // Tier 9: Data exfiltration patterns - Block
  exfiltration: {
    patterns: [
      /curl.*(@|--upload-file)/i,                  // Upload file
      /tar.*\|.*curl/i,                            // Tar and send
      /zip.*\|.*nc/i,                              // Zip and netcat
    ],
    action: 'block',
    message: '🚨 BLOCKED: Data exfiltration pattern detected'
  },

  // Tier 10: PAI-specific protection - Block
  paiProtection: {
    patterns: [
      /rm.*\.config\/pai/i,                        // Delete PAI config
      /rm.*\.claude/i,                             // Delete Claude config
      /git\s+push.*PAI.*public/i,                  // Push PAI to public
    ],
    action: 'block',
    message: '🚨 BLOCKED: PAI infrastructure protection triggered'
  }
};

function validateCommand(command: string): { allowed: boolean; message?: string; action?: string } {
  // Fast path: Most commands are safe
  if (!command || command.length < 3) {
    return { allowed: true };
  }

  // Check each tier
  for (const [tierName, tier] of Object.entries(ATTACK_PATTERNS)) {
    for (const pattern of tier.patterns) {
      if (pattern.test(command)) {
        const result = {
          allowed: tier.action !== 'block',
          message: tier.message,
          action: tier.action
        };

        // Log security event
        console.error(`[Security] ${tierName}: ${tier.message}`);
        console.error(`[Security] Command: ${command.substring(0, 100)}...`);

        return result;
      }
    }
  }

  return { allowed: true };
}

async function main() {
  try {
    const stdinData = await Bun.stdin.text();
    if (!stdinData.trim()) {
      process.exit(0);
    }

    const payload: PreToolUsePayload = JSON.parse(stdinData);

    // Only validate Bash commands
    if (payload.tool_name !== 'Bash') {
      process.exit(0);
    }

    const command = payload.tool_input?.command;
    if (!command) {
      process.exit(0);
    }

    const validation = validateCommand(command);

    // Send to observability if configured
    if (validation.action) {
      await sendEventToObservability({
        source_app: getSourceApp(),
        session_id: payload.session_id,
        hook_event_type: 'PreToolUse',
        timestamp: getCurrentTimestamp(),
        tool_name: 'Bash',
        tool_input: { command: command.substring(0, 200) },
        security_action: validation.action,
        security_message: validation.message
      });
    }

    if (!validation.allowed) {
      // Output the block message - Claude Code will see this
      console.log(validation.message);
      console.log(`Command blocked: ${command.substring(0, 100)}...`);

      // Exit with code 2 to signal block (Claude Code specific)
      process.exit(2);
    }

    // Log warnings but allow execution
    if (validation.action === 'warn' || validation.action === 'confirm') {
      console.log(validation.message);
    }

  } catch (error) {
    // Never crash - log error and allow command
    console.error('Security validator error:', error);
  }

  // Exit 0 = allow the command
  process.exit(0);
}

await main();
