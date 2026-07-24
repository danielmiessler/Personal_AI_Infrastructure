#!/usr/bin/env bun

/**
 * LifeosLogo.ts — print the LifeOS wordmark as ANSI-colored ASCII art.
 *
 * Figlet-style blocky "AI" wordmark: a blocky "A" with the "P" hidden through
 * color (purple left leg/top/crossbar, blue right leg) beside a cyan "I".
 * Also exports printLogo()/getLogo() for reuse by other tools.
 *
 * Usage: bun LifeosLogo.ts   # print the logo to stdout
 */

const rgb = (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`;
const R = "\x1b[0m";

// P portion (left leg + top + crossbar of A) - Purple
const P = rgb(187, 154, 247);

// Right leg of A (below the P/crossbar) - Blue
const A = rgb(122, 162, 247);

// I pillar - Cyan
const I = rgb(125, 207, 255);

// The logo: A with P hidden inside + I
// P is the left leg, top bar, and crossbar of the A
// A's right leg (below crossbar) is different color
const logo = [
  `${P}███████${R} ${I}██${R}`,
  `${P}██${R}   ${A}██${R} ${I}██${R}`,
  `${P}███████${R} ${I}██${R}`,
  `${P}██${R}   ${A}██${R} ${I}██${R}`,
  `${P}██${R}   ${A}██${R} ${I}██${R}`,
];

function printLogo(): void {
  console.log();
  for (const line of logo) {
    console.log(line);
  }
  console.log();
}

function getLogo(): string[] {
  return logo;
}

export { printLogo, getLogo };

if (import.meta.main) {
  printLogo();
}
