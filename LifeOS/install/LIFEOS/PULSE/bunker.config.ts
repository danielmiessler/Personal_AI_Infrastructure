// Pulse — the LifeOS local runtime + Life Dashboard. Local-only (no public
// URL): every probe is local jurisdiction, paged by the launchd monitor.
// alertEmail deliberately omitted — the monitor's default recipient applies
// (SYSTEM tree: no principal-identifying literals here).
export default {
  name: "pulse",
  type: "runtime",
  // Per-install state: the ISA is created by the running install (run-state
  // never ships in a release), so this path resolves only once one exists.
  isa: "./ISA.md",
};
