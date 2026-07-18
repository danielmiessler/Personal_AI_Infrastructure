type Message = { role: "user" | "assistant"; content: string };

export interface OllamaResponse {
  success: boolean;
  output: string;
  model: string;
  durationMs: number;
}

export async function askOllama(
  ollamaUrl: string,
  defaultModel: string,
  messages: Message[],
  model?: string
): Promise<OllamaResponse> {
  const useModel = model || defaultModel;
  const timeoutMs = 120_000;
  const start = Date.now();

  console.log(`[discord/ollama] Asking ${useModel} with ${messages.length} message(s)`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: useModel, messages, stream: false }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const durationMs = Date.now() - start;

    if (!res.ok) {
      const text = await res.text();
      return { success: false, output: `Ollama error (${res.status}): ${text.slice(0, 500)}`, model: useModel, durationMs };
    }

    const data = (await res.json()) as { message?: { content: string } };
    const output = data.message?.content?.trim() || "(empty response)";
    return { success: true, output, model: useModel, durationMs };
  } catch (err) {
    clearTimeout(timeout);
    const durationMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("abort")) {
      return { success: false, output: `Ollama timed out after ${timeoutMs}ms`, model: useModel, durationMs };
    }
    return { success: false, output: `Ollama error: ${message}`, model: useModel, durationMs };
  }
}

export interface OllamaModel {
  name: string;
  size: number;
}

export async function listModels(ollamaUrl: string): Promise<OllamaModel[]> {
  try {
    const res = await fetch(`${ollamaUrl}/api/tags`);
    if (!res.ok) throw new Error(`Failed to list models (${res.status})`);
    const data = (await res.json()) as { models: Array<{ name: string; size: number }> };
    return data.models.map((m) => ({ name: m.name, size: m.size }));
  } catch (err) {
    console.error(`[discord/ollama] listModels error:`, err);
    return [];
  }
}

export function formatModelList(models: OllamaModel[]): string {
  if (models.length === 0) return "No Ollama models found. Is Ollama running?";
  const lines = models.map((m) => `- **${m.name}** (${(m.size / 1e9).toFixed(1)} GB)`);
  return `**Available Ollama Models:**\n${lines.join("\n")}\n\nUsage: \`!ollama <prompt>\` or \`!ollama:model_name <prompt>\``;
}
