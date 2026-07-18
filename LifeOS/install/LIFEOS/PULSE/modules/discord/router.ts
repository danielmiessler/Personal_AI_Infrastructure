export type Backend = "claude" | "ollama" | "models" | "clear";

export interface ParsedCommand {
  backend: Backend;
  model?: string;
  prompt: string;
}

export function parseCommand(content: string): ParsedCommand | null {
  const trimmed = content.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "!clear") return { backend: "clear", prompt: "" };
  if (lower === "!models") return { backend: "models", prompt: "" };

  const ollamaModelMatch = trimmed.match(/^!ollama:(\S+)\s+([\s\S]+)/i);
  if (ollamaModelMatch) {
    return { backend: "ollama", model: ollamaModelMatch[1], prompt: ollamaModelMatch[2].trim() };
  }

  const ollamaMatch = trimmed.match(/^!ollama\s+([\s\S]+)/i);
  if (ollamaMatch) {
    return { backend: "ollama", prompt: ollamaMatch[1].trim() };
  }

  if (lower.startsWith("!pai")) {
    return { backend: "claude", prompt: trimmed.slice(4).trim() };
  }

  return null;
}

const COMMAND_PREFIXES = ["!pai", "!ollama", "!models", "!clear"];

export function isCommand(content: string): boolean {
  const lower = content.trim().toLowerCase();
  return COMMAND_PREFIXES.some((p) => lower.startsWith(p));
}
