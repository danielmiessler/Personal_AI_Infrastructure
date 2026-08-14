import { EXIT, SCHEMA, runCortex, type CortexRunResult, type CortexRuntime } from "./Cortex";

export type CortexAdapterName = "claude" | "hermes" | "codex" | "subagent";

function invalidAdapterInput(command: string): Promise<CortexRunResult> {
  return Promise.resolve({ exitCode: EXIT.INVALID_INPUT, envelope: { schema: SCHEMA, ok: false, command, data: null, error: { code: "invalid_input", message: "Adapter input must be JSON-serializable" } } });
}

function isStringInput(value: unknown): value is string { return typeof value === "string"; }

function serializeInput(value: unknown): string | null {
  try {
    const serialized = JSON.stringify(value);
    return typeof serialized === "string" ? serialized : null;
  } catch {
    return null;
  }
}

function writePermission(options: unknown): boolean | null {
  if (options === undefined) return false;
  if (options === null || typeof options !== "object" || Array.isArray(options)) return null;
  try {
    const keys = Reflect.ownKeys(options);
    if (keys.some((key) => key !== "allowWrite")) return null;
    if (!keys.length) return false;
    const value = Reflect.get(options, "allowWrite");
    return typeof value === "boolean" ? value : null;
  } catch {
    return null;
  }
}

export function createCortexAdapter(name: CortexAdapterName, runtime: CortexRuntime = {}) {
  const read = (command: string, args: unknown[]) => args.every(isStringInput)
    ? runCortex([command, ...(args as string[]), "--adapter", name], runtime)
    : invalidAdapterInput(command);
  const write = (command: "remember" | "propose", item: unknown, options?: { allowWrite?: boolean }): Promise<CortexRunResult> => {
    const serialized = serializeInput(item), allowWrite = writePermission(options);
    if (serialized === null || allowWrite === null) return invalidAdapterInput(command);
    return runCortex([command, serialized, "--adapter", name, ...(allowWrite ? ["--allow-write"] : [])], runtime);
  };
  return Object.freeze({ name, status: () => read("status", []), search: (query: string) => read("search", [query]), get: (...ids: string[]) => read("get", ids), export: (...ids: string[]) => read("export", ids), timeline: (anchor: string) => read("timeline", ["--anchor", anchor]), remember: (item: unknown, options?: { allowWrite?: boolean }) => write("remember", item, options), propose: (item: unknown, options?: { allowWrite?: boolean }) => write("propose", item, options) });
}
