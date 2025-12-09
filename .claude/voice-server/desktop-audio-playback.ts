import { spawn, spawnSync } from 'child_process';
import { platform, release, tmpdir } from 'os';
import { unlinkSync } from 'fs';

export type ShellEnvironment = 'macos' | 'windows-powershell' | 'windows-wsl2' | 'linux';

function detectShellEnvironment(): ShellEnvironment {
  const p = platform();
  if (p === 'darwin') return 'macos';
  if (p === 'win32') return 'windows-powershell';
  if (p === 'linux') {
    return release().toLowerCase().includes('microsoft') ? 'windows-wsl2' : 'linux';
  }
  throw new Error(`Unsupported platform: ${p}`);
}

export const currentShellEnvironment: ShellEnvironment = detectShellEnvironment();

// Convert WSL path to Windows path
function toWindowsPath(wslPath: string): string {
  const result = spawnSync('wslpath', ['-w', wslPath]);
  if (result.error || result.status !== 0) {
    throw new Error(`Failed to convert path: ${wslPath}`);
  }
  return result.stdout.toString().trim();
}

// Get temp file path based on shell environment
function getTempFile(format: string): string {
  const timestamp = Date.now();
  if (currentShellEnvironment === 'windows-powershell') {
    return `${tmpdir()}\\voice-${timestamp}.${format}`;
  }
  return `/tmp/voice-${timestamp}.${format}`;
}

// Clean up temp file
function cleanupTempFile(filePath: string): void {
  try {
    unlinkSync(filePath);
  } catch {
    // Ignore cleanup errors
  }
}

// PowerShell script for audio playback (used by both windows and wsl)
function getPowerShellScript(filePath: string): string {
  return `
    Add-Type -AssemblyName PresentationCore
    $player = New-Object System.Windows.Media.MediaPlayer
    $player.Open([uri]"${filePath}")
    Start-Sleep -Milliseconds 300
    $player.Play()
    while ($player.NaturalDuration.HasTimeSpan -eq $false) { Start-Sleep -Milliseconds 100 }
    Start-Sleep -Milliseconds ($player.NaturalDuration.TimeSpan.TotalMilliseconds + 100)
    $player.Close()
  `.replace(/\n/g, '; ');
}

export async function playAudio(audio: Buffer, format: 'mp3' | 'wav'): Promise<void> {
  const tempFile = getTempFile(format);
  await Bun.write(tempFile, audio);

  return new Promise((resolve, reject) => {
    let proc;

    switch (currentShellEnvironment) {
      case 'macos':
        proc = spawn('/usr/bin/afplay', [tempFile]);
        break;

      case 'windows-powershell':
        // Native Windows - path is already correct
        proc = spawn('powershell.exe', [
          '-NoProfile', '-NonInteractive', '-Command',
          getPowerShellScript(tempFile)
        ]);
        break;

      case 'windows-wsl2':
        // WSL2 - convert path to Windows format
        const winPath = toWindowsPath(tempFile);
        proc = spawn('powershell.exe', [
          '-NoProfile', '-NonInteractive', '-Command',
          getPowerShellScript(winPath)
        ]);
        break;

      case 'linux':
        proc = spawn('paplay', [tempFile]);
        break;

      default:
        const _exhaustive: never = currentShellEnvironment;
        throw new Error(`Unhandled shell environment: ${_exhaustive}`);
    }

    proc.on('error', (err) => {
      cleanupTempFile(tempFile);
      reject(err);
    });

    proc.on('exit', (code) => {
      cleanupTempFile(tempFile);
      code === 0 ? resolve() : reject(new Error(`Audio player exited with code ${code}`));
    });
  });
}
