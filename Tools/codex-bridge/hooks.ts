import { existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

const BUN_PATH = process.env.BUN_PATH || process.execPath || 'bun';

export type HookInput = {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
  prompt?: string;
  user_prompt?: string;
};

type RunOptions = {
  paiDir: string;
  dryRun: boolean;
};

function hookPath(paiDir: string, fileName: string): string {
  return join(paiDir, 'hooks', fileName);
}

async function runHook(
  name: string,
  fileName: string,
  input: HookInput | null,
  opts: RunOptions
): Promise<void> {
  const fullPath = hookPath(opts.paiDir, fileName);
  if (opts.dryRun) {
    console.log(`HOOK ${name} -> ${fullPath}`);
    return;
  }
  if (!existsSync(fullPath)) {
    console.error(`Hook not found: ${fullPath}`);
    return;
  }

  await new Promise<void>((resolve) => {
    const child = spawn(BUN_PATH, [fullPath], {
      stdio: ['pipe', 'inherit', 'inherit'],
      env: { ...process.env, PAI_DIR: opts.paiDir },
    });

    if (input) {
      child.stdin.write(JSON.stringify(input));
    }
    child.stdin.end();

    child.on('close', () => resolve());
  });
}

export async function runSessionStart(opts: RunOptions): Promise<void> {
  await runHook('SessionStart', 'StartupGreeting.hook.ts', null, opts);
}

export async function runUserPrompt(input: HookInput, opts: RunOptions): Promise<void> {
  await runHook('UserPromptSubmit', 'AutoWorkCreation.hook.ts', input, opts);
}

export async function runStop(input: HookInput, opts: RunOptions): Promise<void> {
  await runHook('Stop', 'StopOrchestrator.hook.ts', input, opts);
}
