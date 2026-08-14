#!/usr/bin/env bun
// TabBar.ts — live control of kitty's tab bar (kitty >= 0.48).
// Commands: expand | contract | dock | hide | edge | reset
//   edge toggles the bar between top and left at runtime (persisted in state).
//   On the left edge, width is the sidebar width; on top it caps per-tab title length.
//
// kitty 0.48.2 bug: a plain `kitten @ load-config` (no overrides) kills the
// tab bar entirely. Every apply here therefore includes an explicit
// --override tab_bar_edge=<edge>, which forces kitty to rebuild the bar.

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// State lives OUTSIDE ~/.config/kitty — kitty's conf watcher reloads on any
// change in that directory, and a plain reload re-triggers the vertical-bar bug.
const STATE_FILE = join(homedir(), ".cache/kitty-tabbar-state.json");
const WIDTH_DEFAULT = 20;
const WIDTH_MIN = 8;
const WIDTH_MAX = 48;
const WIDTH_STEP = 6;
const DOCK_WIDTH = 4;
const DOCK_TEMPLATE = "{title[:2]}"; // leading state icon only

// Mirrors the kitty.conf template, with a rendered-empty nonce prepended.
// kitty 0.48.2 caches the vertical bar's template/width across reloads and only
// re-renders on a genuine option delta — the nonce changes the template string
// every call (forcing the re-render) while rendering to nothing.
//
// `titleExpr` is how {title} is rendered. On the LEFT edge the sidebar width is
// fixed, and kitty 0.48.2's powerline renderer WRAPS an over-long title into a
// second column instead of clipping it (the "garbled double column"). Pre-slicing
// the title in the template — kitty gets a string that already fits — is what
// stops the wrap; tab_title_max_length alone does not. On TOP the bar is
// horizontal, over-long titles clip cleanly, and the full title is kept.
// No index/colon prefix and no filler spaces — the title (which leads with its
// state icon) IS the tab. Every saved cell goes to title text.
const buildTemplate = (titleExpr: string) =>
  `{('◉ ' + keyboard_mode.upper() + ' ') if keyboard_mode else ''}{bell_symbol}{activity_symbol}${titleExpr}`;
const NORMAL_TEMPLATE = buildTemplate("{title}");

type Mode = "normal" | "docked" | "hidden";
type Edge = "top" | "left";
const DEFAULT_EDGE: Edge = "top";
// appliedW: the left-bar width actually applied last time, so `refit` can
// no-op when titles changed but the computed width didn't.
interface State { mode: Mode; width: number; prevMode: Mode; nonce: number; edge: Edge; appliedW?: number; }

function loadState(): State {
  try {
    const s = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    if (["normal", "docked", "hidden"].includes(s.mode) && typeof s.width === "number") {
      return {
        mode: s.mode, width: s.width, prevMode: s.prevMode ?? "normal",
        nonce: s.nonce ?? 0, edge: s.edge === "left" ? "left" : "top",
        appliedW: typeof s.appliedW === "number" ? s.appliedW : undefined,
      };
    }
  } catch {}
  return { mode: "normal", width: WIDTH_DEFAULT, prevMode: "normal", nonce: 0, edge: DEFAULT_EDGE };
}

function kittenBin(): string {
  for (const p of ["/opt/homebrew/bin/kitten", "/Applications/kitty.app/Contents/MacOS/kitten"]) {
    if (existsSync(p)) return p;
  }
  return "kitten";
}

// Display cells of a title: wide glyphs (emoji, symbols, CJK) render 2 cells.
// UTF-16 .length undercounts BMP emoji like ⚡ (1 code unit, 2 cells), which
// left titles clipped one cell short — count real cells instead.
function displayCells(s: string): number {
  let cells = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    const wide =
      cp >= 0x1100 &&
      (cp >= 0x1f000 ||                      // emoji, symbols-extended
        (cp >= 0x2600 && cp <= 0x27bf) ||    // misc symbols + dingbats (⚡✅⏳⛺)
        (cp >= 0x2b00 && cp <= 0x2bff) ||    // misc symbols and arrows
        (cp >= 0x1100 && cp <= 0x115f) ||    // hangul jamo
        (cp >= 0x2e80 && cp <= 0xa4cf) ||    // CJK
        (cp >= 0xac00 && cp <= 0xd7a3) ||    // hangul syllables
        (cp >= 0xf900 && cp <= 0xfaff) ||    // CJK compat
        (cp >= 0xfe30 && cp <= 0xfe4f) ||    // CJK compat forms
        (cp >= 0xff00 && cp <= 0xff60));     // fullwidth forms
    cells += wide ? 2 : 1;
  }
  return cells;
}

// Widest current title in display cells across all tabs, so the left bar can be
// sized to hug the content instead of a fixed reserved column.
// Returns null if kitty can't be queried (caller falls back to state.width).
function maxLabelWidth(): number | null {
  try {
    const out = Bun.spawnSync([kittenBin(), "@", ...socketArg(), "ls"]);
    if (out.exitCode !== 0) return null;
    const data = JSON.parse(out.stdout.toString());
    let max = 0;
    for (const osw of data) for (const t of osw.tabs ?? []) {
      max = Math.max(max, displayCells(`${t.title ?? ""}`));
    }
    return max || null;
  } catch { return null; }
}

function socketArg(): string[] {
  if (process.env.KITTY_LISTEN_ON) return []; // kitten reads the env var itself
  try {
    const socks = readdirSync("/tmp")
      .filter((f) => f.startsWith("kitty-"))
      .map((f) => join("/tmp", f))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    if (socks.length) return ["--to", `unix:${socks[0]}`];
  } catch {}
  return [];
}

// The left bar's total sidebar columns: widest title + separator cell,
// bounded by [WIDTH_MIN, state.width].
function leftBarWidth(state: State): number {
  const fit = maxLabelWidth();
  return Math.max(WIDTH_MIN, Math.min(state.width, (fit ?? state.width) + 1));
}

function apply(state: State): void {
  state.nonce = (state.nonce % 999983) + 1;
  const nonce = `{'n${state.nonce}'[:0]}`; // unique every call, renders empty
  const overrides = [`tab_bar_edge=${state.edge}`];
  state.appliedW = undefined;
  if (state.mode === "hidden") {
    overrides.push("tab_bar_style=hidden");
  } else if (state.mode === "docked") {
    overrides.push(
      "tab_bar_style=powerline",
      `tab_title_max_length=${DOCK_WIDTH}`,
      `tab_title_template=${nonce}${DOCK_TEMPLATE}`,
    );
  } else if (state.edge === "left") {
    // kitty sizes the vertical sidebar at tab_title_max_length + 8 columns
    // (state.c vertical_tab_bar_cols) yet clips rendered titles AT
    // tab_title_max_length (tab_bar.py draw_title), so the stock powerline
    // renderer structurally cannot fill the bar — ~8 dead columns always
    // remain between the tab and the pane. tab_bar.py's custom vertical
    // branch draws each row manually (no draw_title, no clip) and fills to
    // screen.columns, so here we only size the sidebar: request W total
    // columns by setting the option to W - 8.
    const W = leftBarWidth(state);
    state.appliedW = W;
    overrides.push(
      "tab_bar_style=custom",
      `tab_title_max_length=${Math.max(1, W - 8)}`,
      `tab_title_template=${nonce}{title}`,
    );
  } else {
    // Top edge: tab_bar.py (tab_bar_style custom) divides the full window width
    // evenly across tabs on every redraw — no max_length cap wanted here.
    overrides.push(
      "tab_bar_style=custom",
      "tab_title_max_length=0",
      `tab_title_template=${nonce}${NORMAL_TEMPLATE}`,
    );
  }
  const args = ["@", ...socketArg(), "load-config", ...overrides.flatMap((o) => ["--override", o])];
  const proc = Bun.spawnSync([kittenBin(), ...args]);
  if (proc.exitCode !== 0) {
    console.error(`kitten load-config failed: ${proc.stderr.toString()}`);
    process.exit(1);
  }
  writeFileSync(STATE_FILE, JSON.stringify(state));
}

const cmd = process.argv[2];
const s = loadState();

switch (cmd) {
  case "expand":
    if (s.mode !== "normal") { s.prevMode = s.mode; s.mode = "normal"; }
    else s.width = Math.min(WIDTH_MAX, s.width + WIDTH_STEP);
    break;
  case "contract":
    if (s.mode !== "normal") { s.prevMode = s.mode; s.mode = "normal"; }
    else s.width = Math.max(WIDTH_MIN, s.width - WIDTH_STEP);
    break;
  case "dock":
    if (s.mode === "docked") { s.mode = "normal"; }
    else { s.prevMode = s.mode; s.mode = "docked"; }
    break;
  case "hide":
    if (s.mode === "hidden") { s.mode = s.prevMode === "hidden" ? "normal" : s.prevMode; }
    else { s.prevMode = s.mode; s.mode = "hidden"; }
    break;
  case "edge":
    s.edge = s.edge === "left" ? "top" : "left";
    break;
  case "reset":
    s.mode = "normal"; s.width = WIDTH_DEFAULT; s.prevMode = "normal"; s.edge = DEFAULT_EDGE;
    break;
  case "refit":
    // Called by tab_refit_watcher.py on title changes: re-apply only when the
    // auto-fit width actually moved, so the common case is a cheap no-op.
    // `refit force` skips the no-op guard — the watcher sends it once per
    // kitty instance, because appliedW persists across a kitty restart while
    // the live options revert to kitty.conf (the bar regresses but state
    // still claims the width was applied).
    if (s.mode !== "normal" || s.edge !== "left") process.exit(0);
    if (process.argv[3] !== "force" && leftBarWidth(s) === s.appliedW) {
      process.exit(0);
    }
    break;
  default:
    console.error("usage: TabBar.ts expand|contract|dock|hide|edge|reset|refit");
    process.exit(2);
}

apply(s);
console.log(`tab bar: ${s.mode} edge=${s.edge}${s.mode === "normal" ? ` width=${s.width}` : ""}`);
