/**
 * RebuildKnowledgeSchema — regenerate `MEMORY/KNOWLEDGE/_schema.md` from
 * `KnowledgeSchema.ts` (the pure-data source of truth) on the doc-integrity
 * pass, so the schema doc never drifts from the schema and exists on every
 * install. Fire-and-forget; a failure is non-fatal (logged by the caller).
 *
 * Runs the standalone generator as a subprocess rather than importing it,
 * because `GenerateKnowledgeSchemaDoc.ts` executes `main()` on import.
 */
import { spawn } from "child_process";
import { join } from "path";
import { getLifeosDir } from "../lib/paths";

export async function handleRebuildKnowledgeSchema(): Promise<void> {
  const generator = join(getLifeosDir(), "TOOLS", "GenerateKnowledgeSchemaDoc.ts");
  await new Promise<void>((resolve) => {
    const child = spawn("bun", [generator], { stdio: "ignore" });
    child.on("close", () => resolve());
    child.on("error", () => resolve());
  });
}
