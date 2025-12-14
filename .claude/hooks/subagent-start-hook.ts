#!/usr/bin/env bun

import { readFileSync } from 'fs';
import { getVoicesPath } from './lib/pai-paths';

interface VoicesConfig {
  speed: number;
  voices: Record<string, string>;
}

const voicesPath = getVoicesPath();
if (!voicesPath) {
  process.exit(0);
}
const VOICE_CONFIG: VoicesConfig = JSON.parse(readFileSync(voicesPath, 'utf-8'));

async function main() {
  // Read input from stdin
  let input = '';
  try {
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();
    const timeoutPromise = new Promise<void>((resolve) => setTimeout(() => resolve(), 500));
    const readPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();
    await Promise.race([readPromise, timeoutPromise]);
  } catch (e) {
    process.exit(0);
  }

  // Parse to get agent type
  let agentType = 'agent';
  try {
    const parsed = JSON.parse(input);
    // Try to extract agent type from various sources
    agentType = parsed.subagent_type || parsed.agent_type || 'agent';
  } catch (e) {}

  // Format agent name
  const agentName = agentType.charAt(0).toUpperCase() + agentType.slice(1);
  const message = `${agentName} here, beginning task`;

  // Send notification with agent name (server looks up voice config)
  try {
    await fetch('http://localhost:8888/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        agent: agentType.toLowerCase()  // Server looks up voice by agent name
      })
    });
  } catch (e) {}

  process.exit(0);
}

main().catch(() => process.exit(0));
