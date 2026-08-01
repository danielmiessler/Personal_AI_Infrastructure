/**
 * Hermes Pulse module — visibility into, and control over, the sidecar's core files.
 *
 * Routes:
 *   GET  /api/hermes                → health + mount drift + the file manifest
 *   GET  /api/hermes/file/:id       → one file's content (never a sealed one)
 *   PUT  /api/hermes/file/:id       → write it back, after a timestamped backup
 *   POST /api/hermes/remount        → run Mount.ts (re-render SOUL, re-emit policy)
 *
 * ## Why an id registry and not a path parameter
 *
 * A `?path=` parameter on a localhost server is an arbitrary-file-read primitive
 * one traversal bug away from serving `~/.ssh/id_rsa`. Every file this module can
 * touch is named in `CORE_FILES` below, addressed by a stable slug. There is no
 * code path that opens a file the registry does not list.
 *
 * ## Code / data separation
 *
 * The registry carries a `plane` on every entry, because the three are governed
 * differently and the UI has to say which is which:
 *
 *   - `code`    — `LIFEOS/HERMES/*`. Ships publicly, install-generic. Writes are
 *                 gated on `assertClean()`, so a home path or a credential typed
 *                 into the editor is refused rather than committed.
 *   - `source`  — `LIFEOS/USER/*` plus the system prompt. The principal's real
 *                 content, and the actual input to SOUL.md. Editing here is what
 *                 changes what the sidecar is.
 *   - `runtime` — `$HERMES_HOME`. Outside the LifeOS repo entirely. Some of it is
 *                 generated (SOUL.md, policy.json, the installed plugin copies)
 *                 and therefore read-only here: a hand edit survives exactly until
 *                 the next mount, which is worse than not offering the edit.
 *
 * Credential material (`.env`, `auth.json`) is `sealed`: listed with size and
 * mtime so the operator knows it exists, never read into a response. That is the
 * same rule the guard plugin enforces on the sidecar itself — a dashboard is not
 * an exemption.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { checkHermesHealth, type HermesHealth } from "../../HERMES/Health.ts";
import { assertClean, scrubPaths } from "../../HERMES/RenderSoul.ts";

const MODULE_NAME = "hermes";
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
const LIFEOS_DIR = join(CLAUDE_DIR, "LIFEOS");
const USER_DIR = join(LIFEOS_DIR, "USER");
const HERMES_DIR = join(LIFEOS_DIR, "HERMES");
const HERMES_HOME = process.env.HERMES_HOME || join(homedir(), ".hermes");
const BACKUP_DIR = join(LIFEOS_DIR, "MEMORY", "STATE", "hermes-edits");

/** Serving cap. The core files are prose and config; anything larger is a database. */
const MAX_SERVE_BYTES = 1_000_000;

export type Plane = "runtime" | "source" | "code";
export type Language = "markdown" | "yaml" | "json" | "typescript" | "python" | "text";

interface CoreFile {
  /** Stable slug. The only thing a caller may name — never a path. */
  id: string;
  label: string;
  plane: Plane;
  path: string;
  language: Language;
  /** One line on what this file decides. Rendered in the UI, so it earns its keep. */
  role: string;
  /** Set when a generator owns the bytes — makes the file read-only here. */
  generatedBy?: string;
  /** For generated files: the ids to edit instead. */
  sourceIds?: string[];
  /** Credential material. Listed, never read. */
  sealed?: boolean;
}

/**
 * Everything the sidecar's behaviour actually depends on, in the order a person
 * would want to read it: what it believes, what it runs under, what it may not
 * touch, then the code that produces all three.
 */
const CORE_FILES: readonly CoreFile[] = [
  // ── runtime: the mounted install ──
  {
    id: "soul",
    label: "SOUL.md",
    plane: "runtime",
    path: join(HERMES_HOME, "SOUL.md"),
    language: "markdown",
    role: "The sidecar's system prompt — constitution, identity, and front-door notes, loaded on every turn.",
    generatedBy: "LIFEOS/HERMES/Mount.ts (via RenderSoul.ts)",
    sourceIds: ["system-prompt", "da-identity", "principal-identity", "telos", "projects", "da-memory", "principal-memory"],
  },
  {
    id: "config",
    label: "config.yaml",
    plane: "runtime",
    path: join(HERMES_HOME, "config.yaml"),
    language: "yaml",
    role: "Gateway config — models, agents, channels, skills mount, approval policy. Mount.ts owns four keys inside it; everything else is yours.",
  },
  {
    id: "policy",
    label: "plugins/lifeos/policy.json",
    plane: "runtime",
    path: join(HERMES_HOME, "plugins", "lifeos", "policy.json"),
    language: "json",
    role: "The compiled deny list the guard enforces — which reads and which shell commands are refused in code.",
    generatedBy: "LIFEOS/HERMES/Policy.ts (via Mount.ts)",
    sourceIds: ["policy-src"],
  },
  {
    id: "guard-installed",
    label: "plugins/lifeos/guard.py",
    plane: "runtime",
    path: join(HERMES_HOME, "plugins", "lifeos", "guard.py"),
    language: "python",
    role: "The installed copy of the guard that vetoes credential-bearing tool calls.",
    generatedBy: "LIFEOS/HERMES/Mount.ts (copied from plugin/guard.py)",
    sourceIds: ["guard-src"],
  },
  {
    id: "plugin-manifest",
    label: "plugins/lifeos/plugin.yaml",
    plane: "runtime",
    path: join(HERMES_HOME, "plugins", "lifeos", "plugin.yaml"),
    language: "yaml",
    role: "Guard plugin manifest — how Hermes discovers and loads the LifeOS plugin.",
    generatedBy: "LIFEOS/HERMES/Mount.ts (copied from plugin/plugin.yaml)",
    sourceIds: ["plugin-manifest-src"],
  },
  {
    id: "cron-jobs",
    label: "cron/jobs.json",
    plane: "runtime",
    path: join(HERMES_HOME, "cron", "jobs.json"),
    language: "json",
    role: "The sidecar's own scheduler — the jobs Pulse surfaces as source=hermes tasks.",
  },
  {
    id: "hermes-env",
    label: ".env",
    plane: "runtime",
    path: join(HERMES_HOME, ".env"),
    language: "text",
    role: "Sidecar credentials and the write-sandbox root. Sealed: listed, never read into a response.",
    sealed: true,
  },
  {
    id: "hermes-auth",
    label: "auth.json",
    plane: "runtime",
    path: join(HERMES_HOME, "auth.json"),
    language: "json",
    role: "OAuth token store. Sealed: listed, never read into a response.",
    sealed: true,
  },

  // ── source: what SOUL.md is rendered FROM ──
  {
    id: "system-prompt",
    label: "LIFEOS_SYSTEM_PROMPT.md",
    plane: "source",
    path: join(LIFEOS_DIR, "LIFEOS_SYSTEM_PROMPT.md"),
    language: "markdown",
    role: "The constitution. Rendered into SOUL.md verbatim, minus the CLI output-format section.",
  },
  {
    id: "da-identity",
    label: "DA_IDENTITY.md",
    plane: "source",
    path: join(USER_DIR, "DIGITAL_ASSISTANT", "DA_IDENTITY.md"),
    language: "markdown",
    role: "Who the assistant is. Personality, writing style, and the relationship sections all reach the sidecar.",
  },
  {
    id: "da-memory",
    label: "DA_MEMORY.md",
    plane: "source",
    path: join(USER_DIR, "DIGITAL_ASSISTANT", "DA_MEMORY.md"),
    language: "markdown",
    role: "Hot-layer memory about the assistant's own operation, budgeted into SOUL.md.",
  },
  {
    id: "principal-identity",
    label: "PRINCIPAL_IDENTITY.md",
    plane: "source",
    path: join(USER_DIR, "PRINCIPAL", "PRINCIPAL_IDENTITY.md"),
    language: "markdown",
    role: "Who the principal is. PII lines are dropped at render time, so the sidecar gets the person without the address.",
  },
  {
    id: "principal-memory",
    label: "PRINCIPAL_MEMORY.md",
    plane: "source",
    path: join(USER_DIR, "PRINCIPAL", "PRINCIPAL_MEMORY.md"),
    language: "markdown",
    role: "Hot-layer memory about the principal, budgeted into SOUL.md.",
  },
  {
    id: "telos",
    label: "PRINCIPAL_TELOS.md",
    plane: "source",
    path: join(USER_DIR, "TELOS", "PRINCIPAL_TELOS.md"),
    language: "markdown",
    role: "Missions, goals, problems, challenges — what the sidecar understands the principal to be building toward.",
    generatedBy: "LIFEOS/TOOLS/GenerateTelosSummary.ts (from TELOS.md)",
    sourceIds: [],
  },
  {
    id: "projects",
    label: "PROJECTS.md",
    plane: "source",
    path: join(USER_DIR, "PROJECTS.md"),
    language: "markdown",
    role: "The project routing table. Only the names reach SOUL.md, so the sidecar recognises them without carrying paths.",
  },

  // ── code: install-generic, ships publicly ──
  {
    id: "render-soul",
    label: "RenderSoul.ts",
    plane: "code",
    path: join(HERMES_DIR, "RenderSoul.ts"),
    language: "typescript",
    role: "Builds SOUL.md: two tiers, PII and secret scrubbing, per-section budgets.",
  },
  {
    id: "mount",
    label: "Mount.ts",
    plane: "code",
    path: join(HERMES_DIR, "Mount.ts"),
    language: "typescript",
    role: "The installer. Writes SOUL.md, installs the guard, patches config.yaml, sets the write sandbox.",
  },
  {
    id: "policy-src",
    label: "Policy.ts",
    plane: "code",
    path: join(HERMES_DIR, "Policy.ts"),
    language: "typescript",
    role: "What the sidecar may never read, and why. Source of the compiled policy.json.",
  },
  {
    id: "health",
    label: "Health.ts",
    plane: "code",
    path: join(HERMES_DIR, "Health.ts"),
    language: "typescript",
    role: "The read-only probe behind every Hermes status in Pulse and the menu bar.",
  },
  {
    id: "guard-src",
    label: "plugin/guard.py",
    plane: "code",
    path: join(HERMES_DIR, "plugin", "guard.py"),
    language: "python",
    role: "The guard itself — vetoes any tool call that would put a secret in the sidecar's context.",
  },
  {
    id: "plugin-manifest-src",
    label: "plugin/plugin.yaml",
    plane: "code",
    path: join(HERMES_DIR, "plugin", "plugin.yaml"),
    language: "yaml",
    role: "Plugin manifest source, copied into the install by Mount.ts.",
  },
  {
    id: "plugin-init",
    label: "plugin/__init__.py",
    plane: "code",
    path: join(HERMES_DIR, "plugin", "__init__.py"),
    language: "python",
    role: "Plugin entry point — registers the guard hook with Hermes.",
  },
  {
    id: "bunker-config",
    label: "bunker.config.ts",
    plane: "code",
    path: join(HERMES_DIR, "bunker.config.ts"),
    language: "typescript",
    role: "Registers the sidecar with the Bunker harness so its probes run under bunker monitor.",
  },
  {
    id: "isa",
    label: "ISA.md",
    plane: "code",
    path: join(HERMES_DIR, "ISA.md"),
    language: "markdown",
    role: "State of record for the sidecar — the claims, their falsifiers, and the evidence that closed them.",
  },
];

const BY_ID = new Map(CORE_FILES.map((f) => [f.id, f]));

const state: { running: boolean } = { running: false };

export function start() {
  state.running = true;
}

export function health() {
  return { module: MODULE_NAME, running: state.running, files: CORE_FILES.length };
}

// ── manifest ──

interface FileEntry {
  id: string;
  label: string;
  plane: Plane;
  language: Language;
  role: string;
  /** Home-scrubbed. The real path never leaves this process. */
  displayPath: string;
  exists: boolean;
  sealed: boolean;
  editable: boolean;
  generatedBy: string | null;
  sourceIds: string[];
  bytes: number | null;
  lines: number | null;
  modified: string | null;
}

function describe(f: CoreFile): FileEntry {
  let bytes: number | null = null;
  let modified: string | null = null;
  let lines: number | null = null;
  const exists = existsSync(f.path);
  if (exists) {
    try {
      const st = statSync(f.path);
      bytes = st.size;
      modified = st.mtime.toISOString();
      // Line count is cheap for prose and config, and it is the number a person
      // actually wants next to a file they are about to open. Skipped for sealed
      // files and anything database-sized.
      if (!f.sealed && st.size <= MAX_SERVE_BYTES) {
        lines = readFileSync(f.path, "utf8").split("\n").length;
      }
    } catch {
      /* a file we cannot stat is reported as present-but-unknown, not fatal */
    }
  }
  return {
    id: f.id,
    label: f.label,
    plane: f.plane,
    language: f.language,
    role: f.role,
    displayPath: scrubPaths(f.path),
    exists,
    sealed: Boolean(f.sealed),
    editable: exists && !f.sealed && !f.generatedBy,
    generatedBy: f.generatedBy ?? null,
    sourceIds: f.sourceIds ?? [],
    bytes,
    lines,
    modified,
  };
}

// ── mount drift ──

/** Run a Hermes tool and capture its result. Fixed argv — nothing user-supplied. */
function runTool(script: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("bun", [join(HERMES_DIR, script), ...args], {
      cwd: HERMES_DIR,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += String(d)));
    child.stderr.on("data", (d) => (stderr += String(d)));
    const timer = setTimeout(() => child.kill("SIGKILL"), 60_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout: scrubPaths(stdout).trim(), stderr: scrubPaths(stderr).trim() });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout: "", stderr: String(err) });
    });
  });
}

/**
 * `Mount.ts --check` exits 1 on drift, which is its contract, not a failure —
 * so exit code is read as a state and never surfaced as an error.
 */
async function mountDrift(): Promise<{ stale: boolean; detail: string; probed: boolean }> {
  if (!existsSync(HERMES_HOME)) return { stale: false, detail: "no sidecar installed", probed: false };
  const r = await runTool("Mount.ts", ["--check"]);
  if (r.code < 0) return { stale: false, detail: r.stderr || "probe failed", probed: false };
  return { stale: r.code === 1, detail: r.stdout || r.stderr, probed: true };
}

// ── backups ──

/**
 * Every write keeps the previous bytes. The editor is a text box on a dashboard;
 * the cost of a backup is nothing and the cost of not having one is a hand-edited
 * constitution with no undo.
 */
function backup(f: CoreFile): string | null {
  if (!existsSync(f.path)) return null;
  mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = join(BACKUP_DIR, `${f.id}.${stamp}.${basename(f.path)}`);
  writeFileSync(dest, readFileSync(f.path));
  return scrubPaths(dest);
}

// ── routes ──

export async function handleRequest(req: Request, pathname: string): Promise<Response | null> {
  const method = req.method;

  if (method === "GET" && (pathname === "/api/hermes" || pathname === "/api/hermes/")) {
    let hermes: HermesHealth | null = null;
    try {
      hermes = checkHermesHealth();
    } catch {
      hermes = null;
    }
    return Response.json({
      health: hermes,
      hermesHome: scrubPaths(HERMES_HOME),
      mount: await mountDrift(),
      files: CORE_FILES.map(describe),
      planes: {
        runtime: "The mounted install, outside the LifeOS repo. Generated files are read-only here.",
        source: "Your content. This is what SOUL.md is rendered from — editing here changes what the sidecar is.",
        code: "Install-generic and publicly shipped. Writes are refused if they contain a home path or a credential.",
      },
    });
  }

  if (pathname.startsWith("/api/hermes/file/")) {
    const id = decodeURIComponent(pathname.slice("/api/hermes/file/".length));
    const f = BY_ID.get(id);
    if (!f) return Response.json({ error: `Unknown file id "${id}"` }, { status: 404 });

    if (method === "GET") {
      if (f.sealed) {
        return Response.json(
          { error: "sealed", detail: "Credential material is listed, never read. Edit it in a terminal." },
          { status: 403 },
        );
      }
      if (!existsSync(f.path)) return Response.json({ error: "not found on disk", meta: describe(f) }, { status: 404 });
      const st = statSync(f.path);
      if (st.size > MAX_SERVE_BYTES) {
        return Response.json({ error: `too large to serve (${st.size} bytes)`, meta: describe(f) }, { status: 413 });
      }
      return Response.json({ meta: describe(f), content: readFileSync(f.path, "utf8") });
    }

    if (method === "PUT") {
      if (f.sealed) return Response.json({ error: "sealed — not writable from the dashboard" }, { status: 403 });
      if (f.generatedBy) {
        return Response.json(
          {
            error: "generated",
            detail: `${f.label} is written by ${f.generatedBy}. A hand edit survives until the next mount. Edit its sources and re-mount.`,
            sourceIds: f.sourceIds ?? [],
          },
          { status: 409 },
        );
      }
      if (!existsSync(f.path)) return Response.json({ error: "not found on disk" }, { status: 404 });

      let body: { content?: unknown };
      try {
        body = (await req.json()) as { content?: unknown };
      } catch {
        return Response.json({ error: "invalid JSON body" }, { status: 400 });
      }
      const content = body.content;
      if (typeof content !== "string") return Response.json({ error: "content must be a string" }, { status: 400 });
      if (content.length > MAX_SERVE_BYTES) return Response.json({ error: "content too large" }, { status: 413 });

      // The code plane ships publicly. A home path or a credential typed into the
      // editor is refused at the boundary rather than discovered at release time.
      if (f.plane === "code") {
        try {
          assertClean(content, f.label);
        } catch (err) {
          return Response.json(
            { error: "containment", detail: scrubPaths(String(err instanceof Error ? err.message : err)) },
            { status: 422 },
          );
        }
      }

      const backedUp = backup(f);
      writeFileSync(f.path, content, "utf8");
      return Response.json({ ok: true, meta: describe(f), backup: backedUp, written: new Date().toISOString() });
    }
  }

  if (method === "POST" && pathname === "/api/hermes/remount") {
    if (!existsSync(HERMES_HOME)) {
      return Response.json({ error: "no sidecar installed" }, { status: 404 });
    }
    const r = await runTool("Mount.ts", []);
    return Response.json({
      ok: r.code === 0,
      exitCode: r.code,
      output: r.stdout,
      error: r.code === 0 ? null : r.stderr || r.stdout,
      mount: await mountDrift(),
    });
  }

  return null;
}
