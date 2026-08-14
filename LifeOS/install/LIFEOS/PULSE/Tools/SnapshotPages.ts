#!/usr/bin/env bun
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { renderShell, renderPage, renderEmpty } from "../ui/render";
import { readIndex, readPage } from "../lib/data-plane";
import { loadAllManifests } from "../lib/manifest-loader";
import { homedir } from "node:os";

const HOME = process.env.HOME ?? process.env.USERPROFILE ?? homedir();
const SNAP_DIR = resolve(HOME, ".claude", "LIFEOS", "PULSE", "Schema", "Snapshots");
mkdirSync(SNAP_DIR, { recursive: true });

const idx = readIndex();
const manifests = loadAllManifests();
let count = 0;

for (const m of manifests) {
  const file = readPage(m.id);
  let body: string;
  if (!file) {
    body = renderEmpty(m.id, "No data plane file yet — run an adapter to populate.");
  } else {
    body = renderPage(file.data, { rebuildable: m.rebuildButton });
  }
  const html = renderShell({ mode: "light", pageId: m.id, pageTitle: m.title, index: idx, body });
  const outPath = join(SNAP_DIR, `${m.id}.light.html`);
  writeFileSync(outPath, html);
  count++;
}

console.log(`Wrote ${count} snapshot(s) to ${SNAP_DIR}`);

void resolve; void readFileSync; void existsSync;
