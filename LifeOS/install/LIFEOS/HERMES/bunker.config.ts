// Hermes sidecar's Bunker manifest — separate but integrated: its own process
// tree and vendor label, watched by the same harness as everything else.
//
// `cli` rather than a web type because the sidecar has no public URL. Its probes
// are local by nature (supervisor state, a live pid, a launchd job), so they run
// in the local monitor's jurisdiction and never compile to the cloud worker.
//
// Plain object literal, NOT `defineBunker()` — `LIFEOS/PULSE/Bunker/**` is a
// containment zone (impl stays private, concept ships via DOCUMENTATION), but
// `LIFEOS/HERMES/` ships. Importing the helper made this file dead on every
// public install; EmitSkill's ImportCaseGate caught it at the 7.24.0 cut. The
// two sibling manifests that ship (`LIFEOS/PULSE`, root) were already literals
// for the same reason. defineBunker only asserts name+type are present, which a
// literal carrying both satisfies by construction.
export default {
  name: "hermes",
  type: "cli",
  isa: "./ISA.md",
};
