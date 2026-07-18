# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Add durable project-specific notes here as they are discovered through real work.

## Pulse (`LifeOS/install/LIFEOS/PULSE`)

- **Never import `pulse.ts` to inspect it.** It calls `main()` unguarded at the
  bottom — no `import.meta.main` check — so importing it boots the daemon and
  binds port 31337, colliding with any running Pulse. To check the module graph,
  use `bun build ./pulse.ts --outdir=<tmp>` instead.
- **No `tsconfig.json` and no root `package.json`,** so there is no project
  typecheck command. Ad hoc, from the PULSE dir after `bun install`:
  `bunx tsc --noEmit --strict --target esnext --module esnext --moduleResolution bundler --allowImportingTsExtensions --types bun --skipLibCheck <files>`.
  Two errors are pre-existing on a clean tree (`modules/hooks.ts` stats, and the
  absent private `./Assistant/module`) — diff against the release tag before
  attributing any error to your change.
- **Modules are registered explicitly in `pulse.ts`**, not auto-discovered.
  Adding a file under `modules/` does nothing until it is wired at every site the
  neighbouring modules use (handle, gated `import()` in `loadModules`,
  `PulseConfig` entry, `loadPulseConfig` mapping, health block, route, supervised
  start, shutdown). `modules/telegram.ts` is the reference pattern.
- **`supervise()` restarts on clean return.** A subsystem that returns without
  throwing is restarted after 10s, so validate config *before* calling it —
  otherwise a bad value becomes an endless restart loop.
- `PULSE.toml` string values get `${VAR}` expanded from the environment by
  `parseConfigToml()` in `lib.ts`. Put secrets in the environment and reference
  them; never inline a credential in the file.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
