/**
 * Interactive prompts using @clack/prompts
 */

import * as p from '@clack/prompts';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { validatePath, validateEmail, validateName, validateAssistantName, expandPath } from './validators';
import type { SetupConfig } from './configurators';

/**
 * Try to get default values from git config
 */
function getGitConfig(key: string): string | null {
  try {
    return execSync(`git config --global ${key}`, { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Color options for assistant
 */
const colorOptions = [
  { value: 'blue', label: 'Blue', hint: 'calm, professional' },
  { value: 'purple', label: 'Purple', hint: 'creative, unique' },
  { value: 'green', label: 'Green', hint: 'growth, balanced' },
  { value: 'cyan', label: 'Cyan', hint: 'tech, modern' },
  { value: 'red', label: 'Red', hint: 'bold, energetic' },
];

/**
 * Run the interactive setup wizard
 */
export async function runInteractiveSetup(): Promise<SetupConfig | null> {
  p.intro('🤖 PAI Setup Wizard');

  const defaultName = getGitConfig('user.name') || '';
  const defaultEmail = getGitConfig('user.email') || '';
  const defaultPaiDir = `${homedir()}/.claude`;

  const results = await p.group(
    {
      paiDir: () =>
        p.text({
          message: 'Where should PAI be installed?',
          placeholder: defaultPaiDir,
          initialValue: defaultPaiDir,
          validate: validatePath,
        }),

      userName: () =>
        p.text({
          message: "What's your name?",
          placeholder: defaultName || 'Your Name',
          initialValue: defaultName,
          validate: validateName,
        }),

      userEmail: () =>
        p.text({
          message: "What's your email?",
          placeholder: defaultEmail || 'you@example.com',
          initialValue: defaultEmail,
          validate: validateEmail,
        }),

      assistantName: () =>
        p.text({
          message: 'What would you like to name your AI assistant?',
          placeholder: 'Kai',
          initialValue: 'Kai',
          validate: validateAssistantName,
        }),

      assistantColor: () =>
        p.select({
          message: 'Choose a color theme for your assistant:',
          options: colorOptions,
          initialValue: 'purple',
        }),

      voiceEnabled: () =>
        p.confirm({
          message: 'Enable voice server? (macOS only)',
          initialValue: process.platform === 'darwin',
        }),

      updateShellProfile: () =>
        p.confirm({
          message: 'Add PAI environment variables to your shell profile?',
          initialValue: true,
        }),
    },
    {
      onCancel: () => {
        p.cancel('Setup cancelled.');
        return null;
      },
    }
  );

  if (!results || p.isCancel(results)) {
    return null;
  }

  // Show summary and confirm
  p.note(
    [
      `📁 PAI Directory: ${results.paiDir}`,
      `👤 Your Name: ${results.userName}`,
      `📧 Email: ${results.userEmail}`,
      `🤖 Assistant: ${results.assistantName}`,
      `🎨 Color: ${results.assistantColor}`,
      `🔊 Voice: ${results.voiceEnabled ? 'Enabled' : 'Disabled'}`,
      `🐚 Shell Profile: ${results.updateShellProfile ? 'Will update' : 'Skip'}`,
    ].join('\n'),
    'Configuration Summary'
  );

  const confirmed = await p.confirm({
    message: 'Proceed with this configuration?',
    initialValue: true,
  });

  if (!confirmed || p.isCancel(confirmed)) {
    p.cancel('Setup cancelled.');
    return null;
  }

  return {
    paiDir: expandPath(results.paiDir as string),
    userName: results.userName as string,
    userEmail: results.userEmail as string,
    assistantName: results.assistantName as string,
    assistantColor: results.assistantColor as string,
    voicePort: 8888,
    voiceEnabled: results.voiceEnabled as boolean,
    updateShellProfile: results.updateShellProfile as boolean,
  };
}
