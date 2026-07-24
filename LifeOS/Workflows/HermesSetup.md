# HermesSetup — Hermes system integration (phase 1)

Wires LifeOS into Hermes. Runs when installing or migrating LifeOS on a Hermes agent harness. Installs the unified LifeOS skill body into `$HERMES_HOME/skills/`, configures the Hermes constitution, and links memory/cognitive services.

## Steps

### 1. Detect Hermes Harness
- Run environment detection using `bun Tools/DetectEnv.ts`.
- Verify that `harness` is detected as `hermes` (`InstallEngine.ts` supports Hermes harness detection).
- Confirm `$HERMES_HOME` path (defaults to `~/.hermes`).

### 2. Verify Prerequisites
- Check `hermes` CLI binary is accessible: `hermes --version`.
- Hindsight health check: ping memory service backend to verify `retain`/`recall`/`reflect` operational state.
- Cognitive-graph ping: test connection to `mind.db` (Aron cognitive model graph database).

### 3. Deploy Hermes Constitution
- Copy `install/LIFEOS/HERMES_CONSTITUTION.md` to a Hermes-loadable location (e.g. `$HERMES_HOME/constitutions/LIFEOS_HERMES_CONSTITUTION.md`).
- Ensure Hermes agent launcher is configured to load this file as `ephemeral_system_prompt`.

### 4. Install Unified LifeOS Skills
- Install portable LifeOS skills from `install/skills/` into `$HERMES_HOME/skills/`.
- Deploy as one unified body without splitting into separate runtime subfolders.
- Exclude macOS/Claude-specific skills (`Art`, `Daemon`, `Interceptor`, `Remotion`) as detailed in `install/SKILL_MANIFEST.md`.

### 5. Wire Canonical TELOS Source Pointer
- Prompt the principal for their canonical TELOS folder path (e.g. `E:/Dropbox/ARON BIJL MSC/TELOS/`).
- Write `install/LIFEOS/TELOS_SOURCE.md` containing the confirmed path:
  ```
  TELOS canonical source: <confirmed_path>
  ```

### 6. Set Up Project Context
- Place `install/HERMES.md` into the project root / target working directory to enable auto-loading when Hermes runs in this directory.

### 7. Verification
Run verification checks:
1. `hermes skills list` — verify all portable LifeOS skills are registered in Hermes.
2. Constitution load check — verify `HERMES_CONSTITUTION.md` parses and loads cleanly as `ephemeral_system_prompt`.
3. TELOS path resolution — verify the path in `TELOS_SOURCE.md` exists and is readable.
4. Memory backend check — execute a prefetch call (`MemoryManager.prefetch_all()`) to confirm Hindsight integration.

### 8. Summary Report
Print installation status summary detailing:
- Successfully installed portable skills (47 skills).
- Active Hermes integration points (Constitution, Hindsight Memory, Cognitive Graph, TELOS source).
- Excluded Claude/macOS-specific components (`Interceptor`, `Daemon`, `Art`, `Remotion`, Kitty terminal hooks).
