/**
 * Cross-Platform Abstraction Layer
 *
 * All platform-specific logic flows through this module.
 * No other file should contain inline `process.platform` checks
 * (except Phase 2 temporary hook guards, which migrate here in Phase 3+).
 *
 * Follows conventions from hooks/lib/paths.ts:
 *   - Uses os.homedir(), os.tmpdir() for path resolution
 *   - Environment variable fallback chains
 *   - Pure functions, no side effects on import
 *
 * Part of: PRD-20260219-windows-11-support (Phase 0)
 */

import { homedir, tmpdir, platform as osPlatform } from 'os';
import { join, sep } from 'path';

// ─── Section 1: OS Detection ───────────────────────────────────────────────

/** Current platform identifier */
export const platform: NodeJS.Platform = process.platform;

/** True when running on Windows (including WSL host detection) */
export const isWindows: boolean = process.platform === 'win32';

/** True when running on macOS */
export const isMacOS: boolean = process.platform === 'darwin';

/** True when running on Linux (includes WSL) */
export const isLinux: boolean = process.platform === 'linux';

/** True when running inside WSL (Linux but on a Windows host) */
export const isWSL: boolean =
  isLinux && (
    !!process.env.WSL_DISTRO_NAME ||
    !!process.env.WSLENV ||
    (process.env.PATH || '').includes('/mnt/c/')
  );

/** Human-readable platform name */
export function getPlatformName(): string {
  if (isMacOS) return 'macOS';
  if (isWSL) return 'WSL';
  if (isWindows) return 'Windows';
  if (isLinux) return 'Linux';
  return process.platform;
}

// ─── Section 2: Path Resolution ────────────────────────────────────────────

/**
 * Get the user's home directory.
 * Uses os.homedir() which handles HOME (Unix) and USERPROFILE (Windows).
 */
export function getHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || homedir();
}

/**
 * Get the system temp directory.
 * Uses os.tmpdir() — returns /tmp on Unix, %TEMP% on Windows.
 */
export function getTempDir(): string {
  return tmpdir();
}

/**
 * Get a temp file path with the given prefix and extension.
 * Cross-platform: uses os.tmpdir() instead of hardcoded /tmp/.
 */
export function getTempFilePath(prefix: string, extension: string): string {
  return join(tmpdir(), `${prefix}-${Date.now()}${extension}`);
}

/**
 * Get the PAI directory (where .claude lives).
 * Priority: PAI_DIR env var → ~/.claude
 * Mirrors hooks/lib/paths.ts getPaiDir() for use outside hooks.
 */
export function getPaiDir(): string {
  if (process.env.PAI_DIR) {
    return process.env.PAI_DIR;
  }
  return join(getHomeDir(), '.claude');
}

/**
 * Get a path relative to the PAI directory.
 * Mirrors hooks/lib/paths.ts paiPath() for use outside hooks.
 */
export function paiPath(...segments: string[]): string {
  return join(getPaiDir(), ...segments);
}

/**
 * Get the PAI config directory.
 * Priority: PAI_CONFIG_DIR env → platform-appropriate default
 *   macOS/Linux: ~/.config/PAI
 *   Windows: %APPDATA%/PAI or ~/.config/PAI
 */
export function getConfigDir(): string {
  if (process.env.PAI_CONFIG_DIR) {
    return process.env.PAI_CONFIG_DIR;
  }

  if (isWindows && process.env.APPDATA) {
    return join(process.env.APPDATA, 'PAI');
  }

  return join(getHomeDir(), '.config', 'PAI');
}

/**
 * Get the PAI log directory.
 *   macOS: ~/Library/Logs
 *   Linux: ~/.local/share/PAI/logs
 *   Windows: %APPDATA%/PAI/logs
 */
export function getLogDir(): string {
  if (isMacOS) {
    return join(getHomeDir(), 'Library', 'Logs');
  }

  if (isWindows && process.env.APPDATA) {
    return join(process.env.APPDATA, 'PAI', 'logs');
  }

  return join(getHomeDir(), '.local', 'share', 'PAI', 'logs');
}

/**
 * Path separator for the current platform.
 * Exposed for cases where code needs to handle raw path strings.
 */
export const pathSeparator: string = sep;

// ─── Section 3: Command Mapping ────────────────────────────────────────────

/**
 * Get the command to find a process listening on a given port.
 * Returns: { command: string, args: string[] }
 */
export function getPortCheckCommand(port: number): { command: string; args: string[] } {
  if (isWindows) {
    return {
      command: 'netstat',
      args: ['-ano'],
      // Caller must filter output for the port and extract PID
    };
  }

  return {
    command: 'lsof',
    args: ['-ti', `:${port}`, '-sTCP:LISTEN'],
  };
}

/**
 * Get the command string to find a process on a port.
 * Returns a shell-executable string (for execSync usage).
 */
export function getPortCheckCommandString(port: number): string {
  if (isWindows) {
    return `netstat -ano | findstr :${port} | findstr LISTENING`;
  }
  return `lsof -ti:${port} -sTCP:LISTEN`;
}

/**
 * Get the command to kill a process by PID.
 */
export function getKillCommand(pid: number | string, force: boolean = false): string {
  if (isWindows) {
    return force
      ? `taskkill /F /PID ${pid}`
      : `taskkill /PID ${pid}`;
  }

  return force
    ? `kill -9 ${pid}`
    : `kill ${pid}`;
}

/**
 * Get the command to kill processes matching a pattern.
 */
export function getKillByPatternCommand(pattern: string): string {
  if (isWindows) {
    return `taskkill /F /FI "IMAGENAME eq ${pattern}"`;
  }
  return `pkill -f "${pattern}"`;
}

/**
 * Check if a Unix command exists. On Windows, returns false for Unix-only commands.
 */
export function isCommandAvailable(command: string): boolean {
  const unixOnlyCommands = ['lsof', 'fuser', 'pkill', 'pgrep', 'nohup', 'chmod', 'chown', 'afplay', 'osascript', 'launchctl', 'tput', 'stty'];

  if (isWindows && unixOnlyCommands.includes(command)) {
    return false;
  }

  // On Unix, assume the command exists (caller can verify with `which`)
  return true;
}

/**
 * Get the appropriate shell for spawning commands.
 *   macOS/Linux: value of $SHELL, or /bin/sh
 *   Windows: powershell.exe
 */
export function getDefaultShell(): string {
  if (isWindows) {
    return 'powershell.exe';
  }
  return process.env.SHELL || '/bin/sh';
}

/**
 * Get the shell profile file path.
 *   macOS/Linux: ~/.zshrc or ~/.bashrc based on $SHELL
 *   Windows: PowerShell profile path
 */
export function getShellProfilePath(): string {
  if (isWindows) {
    // PowerShell profile location
    const docs = process.env.USERPROFILE
      ? join(process.env.USERPROFILE, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1')
      : '';
    return docs;
  }

  const shell = process.env.SHELL || '';
  if (shell.includes('zsh')) {
    return join(getHomeDir(), '.zshrc');
  }
  return join(getHomeDir(), '.bashrc');
}

// ─── Section 4: Terminal Detection ─────────────────────────────────────────

/** Supported terminal types */
export type TerminalType = 'kitty' | 'windows-terminal' | 'iterm2' | 'generic';

/**
 * Detect the current terminal emulator.
 */
export function detectTerminal(): TerminalType {
  // Kitty detection
  if (process.env.TERM === 'xterm-kitty' || process.env.KITTY_WINDOW_ID) {
    return 'kitty';
  }

  // Windows Terminal detection
  if (process.env.WT_SESSION || process.env.WT_PROFILE_ID) {
    return 'windows-terminal';
  }

  // iTerm2 detection
  if (process.env.TERM_PROGRAM === 'iTerm.app') {
    return 'iterm2';
  }

  return 'generic';
}

/**
 * Check if the current terminal supports Kitty remote control.
 * Always false on Windows (Kitty is not available).
 */
export function isKittyAvailable(): boolean {
  if (isWindows) return false;

  return detectTerminal() === 'kitty' &&
    !!(process.env.KITTY_LISTEN_ON || process.env.KITTY_WINDOW_ID);
}

/**
 * Get the Kitty socket path (Unix only).
 * Returns null on Windows.
 */
export function getKittySocketPath(): string | null {
  if (isWindows) return null;

  if (process.env.KITTY_LISTEN_ON) {
    return process.env.KITTY_LISTEN_ON;
  }

  const user = process.env.USER || process.env.LOGNAME || 'user';
  return `unix:/tmp/kitty-${user}`;
}

/**
 * Check if the terminal supports ANSI escape sequences.
 * Windows Terminal and modern cmd.exe support ANSI, but legacy terminals may not.
 */
export function supportsAnsiEscapes(): boolean {
  if (!isWindows) return true;

  // Windows Terminal supports ANSI
  if (process.env.WT_SESSION) return true;

  // ConEmu supports ANSI
  if (process.env.ConEmuPID) return true;

  // Check for ENABLE_VIRTUAL_TERMINAL_PROCESSING
  // In Bun/Node, stdout.isTTY is a reasonable proxy
  return !!process.stdout.isTTY;
}

// ─── Section 5: Audio & Notifications ──────────────────────────────────────

/**
 * Get the command to play an audio file.
 * Returns null if no audio player is available.
 */
export function getAudioPlayCommand(filePath: string, volume?: number): { command: string; args: string[] } | null {
  if (isMacOS) {
    const args = volume !== undefined
      ? ['-v', volume.toString(), filePath]
      : [filePath];
    return { command: '/usr/bin/afplay', args };
  }

  if (isLinux) {
    // Try common Linux audio players
    return { command: 'paplay', args: [filePath] };
  }

  if (isWindows) {
    // PowerShell WPF MediaPlayer — handles MP3 (SoundPlayer is WAV-only)
    const vol = volume !== undefined ? volume : 1.0;
    const ps = [
      `Add-Type -AssemblyName PresentationCore`,
      `$p = New-Object System.Windows.Media.MediaPlayer`,
      `$p.Open([Uri]::new('${filePath.replace(/'/g, "''")}'))`,
      `$p.Volume = ${vol}`,
      `Start-Sleep -Milliseconds 300`,
      `$p.Play()`,
      `while(-not $p.NaturalDuration.HasTimeSpan){Start-Sleep -Milliseconds 100}`,
      `Start-Sleep -Milliseconds ([math]::Ceiling($p.NaturalDuration.TimeSpan.TotalMilliseconds))`,
      `$p.Close()`,
    ].join('; ');
    return {
      command: 'powershell.exe',
      args: ['-NoProfile', '-sta', '-Command', ps],
    };
  }

  return null;
}

/**
 * Get the command to speak text using local TTS (no API key needed).
 * Windows: System.Speech.Synthesis.SpeechSynthesizer (SAPI)
 * macOS: /usr/bin/say
 * Linux: espeak (if available)
 * Returns null if no local TTS is available.
 */
export function getLocalTTSCommand(text: string): { command: string; args: string[] } | null {
  // Sanitize text to prevent command injection
  const safeText = text.replace(/['"\\`$]/g, '');

  if (isMacOS) {
    return { command: '/usr/bin/say', args: [safeText] };
  }

  if (isWindows) {
    // Windows SAPI via System.Speech.Synthesis
    const ps = [
      `Add-Type -AssemblyName System.Speech`,
      `$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer`,
      `$synth.Rate = 1`,
      `$synth.Speak('${safeText.replace(/'/g, "''")}')`,
      `$synth.Dispose()`,
    ].join('; ');
    return {
      command: 'powershell.exe',
      args: ['-NoProfile', '-Command', ps],
    };
  }

  if (isLinux) {
    return { command: 'espeak', args: [safeText] };
  }

  return null;
}

/**
 * Get the command to send a system notification.
 * Returns null if no notification method is available.
 */
export function getNotificationCommand(
  title: string,
  message: string,
): { command: string; args: string[] } | null {
  if (isMacOS) {
    const script = `display notification "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"`;
    return { command: '/usr/bin/osascript', args: ['-e', script] };
  }

  if (isLinux) {
    return { command: 'notify-send', args: [title, message] };
  }

  if (isWindows) {
    const ps = `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null; $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); $text = $xml.GetElementsByTagName('text'); $text[0].AppendChild($xml.CreateTextNode('${title.replace(/'/g, "''")}')) | Out-Null; $text[1].AppendChild($xml.CreateTextNode('${message.replace(/'/g, "''")}')) | Out-Null; [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('PAI').Show([Windows.UI.Notifications.ToastNotification]::new($xml))`;
    return {
      command: 'powershell.exe',
      args: ['-NoProfile', '-Command', ps],
    };
  }

  return null;
}

/**
 * Get the command to delete a file.
 * Avoids hardcoded /bin/rm.
 */
export function getDeleteFileCommand(filePath: string): { command: string; args: string[] } {
  if (isWindows) {
    return { command: 'cmd.exe', args: ['/c', 'del', '/f', filePath] };
  }
  return { command: 'rm', args: ['-f', filePath] };
}

// ─── Section 6: Service Management ─────────────────────────────────────────

/** Service manager type for the current platform */
export type ServiceManagerType = 'launchctl' | 'systemd' | 'task-scheduler' | 'none';

/**
 * Detect the available service manager.
 */
export function getServiceManager(): ServiceManagerType {
  if (isMacOS) return 'launchctl';
  if (isWindows) return 'task-scheduler';
  if (isLinux) return 'systemd';
  return 'none';
}
