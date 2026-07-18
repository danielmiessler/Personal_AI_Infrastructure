const BASE_URL = "https://discord.com/api/v10";

interface RateLimitState {
  remaining: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitState>();

function getHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "DiscordLifeOSConnector/1.0.0",
  };
}

async function handleRateLimit(route: string, res: Response): Promise<void> {
  const remaining = res.headers.get("X-RateLimit-Remaining");
  const resetAfter = res.headers.get("X-RateLimit-Reset-After");

  if (remaining !== null && resetAfter !== null) {
    rateLimits.set(route, {
      remaining: parseInt(remaining, 10),
      resetAt: Date.now() + parseFloat(resetAfter) * 1000,
    });
  }

  if (res.status === 429) {
    const body = (await res.json()) as { retry_after: number };
    const waitMs = body.retry_after * 1000;
    console.warn(`[discord/rest] Rate limited on ${route}, waiting ${waitMs}ms`);
    await Bun.sleep(waitMs);
  }
}

async function waitForRateLimit(route: string): Promise<void> {
  const limit = rateLimits.get(route);
  if (limit && limit.remaining === 0) {
    const waitMs = limit.resetAt - Date.now();
    if (waitMs > 0) {
      console.warn(`[discord/rest] Pre-emptive rate limit wait: ${waitMs}ms`);
      await Bun.sleep(waitMs);
    }
  }
}

export interface DiscordMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    bot?: boolean;
  };
  mentions: Array<{ id: string }>;
  timestamp: string;
}

export async function fetchMessages(
  token: string,
  channelId: string,
  after?: string | null
): Promise<DiscordMessage[]> {
  const route = `channels/${channelId}/messages`;
  await waitForRateLimit(route);

  let url = `${BASE_URL}/${route}?limit=50`;
  if (after) url += `&after=${after}`;

  const res = await fetch(url, { headers: getHeaders(token) });
  await handleRateLimit(route, res);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[discord/rest] fetchMessages failed (${res.status}): ${text}`);
  }

  const messages = (await res.json()) as DiscordMessage[];
  return messages.reverse(); // Discord returns newest first; process oldest first
}

export async function sendMessage(
  token: string,
  channelId: string,
  content: string
): Promise<void> {
  const route = `channels/${channelId}/messages`;
  const chunks = splitMessage(content);

  for (const chunk of chunks) {
    await waitForRateLimit(route);

    const res = await fetch(`${BASE_URL}/${route}`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({ content: chunk }),
    });

    await handleRateLimit(route, res);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`[discord/rest] sendMessage failed (${res.status}): ${text}`);
    }
  }
}

export async function addReaction(
  token: string,
  channelId: string,
  messageId: string,
  emoji: string = "✅"
): Promise<void> {
  const encoded = encodeURIComponent(emoji);
  const route = `channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`;
  await waitForRateLimit(route);

  const res = await fetch(`${BASE_URL}/${route}`, {
    method: "PUT",
    headers: getHeaders(token),
  });

  await handleRateLimit(route, res);

  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    console.warn(`[discord/rest] addReaction failed (${res.status}): ${text}`);
  }
}

export async function sendTyping(token: string, channelId: string): Promise<void> {
  const route = `channels/${channelId}/typing`;
  await waitForRateLimit(route);

  const res = await fetch(`${BASE_URL}/${route}`, {
    method: "POST",
    headers: getHeaders(token),
  });

  await handleRateLimit(route, res);
}

function splitMessage(content: string, maxLen: number = 2000): string[] {
  if (content.length <= maxLen) return [content];

  const chunks: string[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    let splitIdx = remaining.lastIndexOf("\n", maxLen);
    if (splitIdx <= 0) splitIdx = remaining.lastIndexOf(" ", maxLen);
    if (splitIdx <= 0) splitIdx = maxLen;

    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).trimStart();
  }

  return chunks;
}
