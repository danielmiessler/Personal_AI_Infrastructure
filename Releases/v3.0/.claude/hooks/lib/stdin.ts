/**
 * stdin.ts — Cross-platform stdin reading utility
 *
 * Replaces duplicated Bun.stdin patterns across all hooks.
 * Uses process.stdin (not Bun.stdin) for Windows compatibility.
 *
 * Bun.stdin.text() and Bun.stdin.stream().getReader() fail silently
 * on Windows/MSYS — returning empty strings or hanging indefinitely.
 * process.stdin with event listeners works reliably on all platforms.
 *
 * See: https://github.com/danielmiessler/Personal_AI_Infrastructure/issues/385
 */

/**
 * Read all of stdin with a timeout fallback.
 * Returns whatever data was received before timeout, or '' on error.
 *
 * @param timeoutMs - Maximum time to wait for stdin (default: 500ms)
 */
export function readStdinWithTimeout(timeoutMs = 500): Promise<string> {
  return new Promise<string>((resolve) => {
    let data = '';
    const timer = setTimeout(() => {
      process.stdin.destroy();
      resolve(data);
    }, timeoutMs);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(''); });
  });
}
