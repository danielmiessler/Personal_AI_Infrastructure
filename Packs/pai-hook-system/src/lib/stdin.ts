// Cross-platform stdin reading utility
// Bun.stdin.text() doesn't work properly on Windows with piped input
// This uses Node.js-style stdin reading which works everywhere

export async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data);
    });

    // Timeout after 100ms if no data (for hooks that might not receive input)
    setTimeout(() => {
      if (!data) resolve('{}');
    }, 100);
  });
}

export async function readStdinJson<T = any>(): Promise<T> {
  const data = await readStdin();
  try {
    return JSON.parse(data.trim() || '{}');
  } catch {
    return {} as T;
  }
}
