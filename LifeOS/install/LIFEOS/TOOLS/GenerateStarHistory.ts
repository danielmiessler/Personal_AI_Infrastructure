#!/usr/bin/env bun
// GenerateStarHistory.ts — render a self-hosted star-history SVG for a repo.
// Born 2026-07-17: star-history.com's embed API timed out (10s ceiling on their
// GitHub fetches) and starchart.cc rate-limits, so the public README carried a
// broken image. This renders the chart from GitHub's own starred_at data into a
// static SVG that can never break at view time.
//
// Usage: bun LIFEOS/TOOLS/GenerateStarHistory.ts [owner/repo] [out.svg]
// Auth:  uses `gh` CLI token if available, else unauthenticated (60 req/hr cap).

const repo = process.argv[2] ?? 'danielmiessler/LifeOS';
const out = process.argv[3] ?? '/tmp/star-history.svg';

async function ghToken(): Promise<string | null> {
  try {
    const p = Bun.spawnSync(['gh', 'auth', 'token']);
    const t = p.stdout.toString().trim();
    return p.exitCode === 0 && t ? t : null;
  } catch { return null; }
}

const token = await ghToken();
const headers: Record<string, string> = {
  Accept: 'application/vnd.github.star+json',
  'User-Agent': 'lifeos-star-history',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

// Fetch every stargazer's starred_at (100/page).
const dates: number[] = [];
for (let page = 1; ; page++) {
  const res = await fetch(`https://api.github.com/repos/${repo}/stargazers?per_page=100&page=${page}`, { headers });
  if (res.status === 422) break; // GitHub caps stargazer pagination at 400 pages (40K)
  if (!res.ok) throw new Error(`GitHub ${res.status} on page ${page}: ${await res.text()}`);
  const batch = await res.json() as Array<{ starred_at: string }>;
  if (!batch.length) break;
  for (const s of batch) dates.push(Date.parse(s.starred_at));
  if (page % 20 === 0) console.log(`  fetched ${dates.length} stars...`);
}
dates.sort((a, b) => a - b);
if (!dates.length) throw new Error('no stargazer data');
console.log(`${repo}: ${dates.length} stars, ${new Date(dates[0]).toISOString().slice(0, 10)} → today`);

// Cumulative series sampled at ~240 points.
const t0 = dates[0];
const t1 = Date.now();
const N = 240;
const pts: Array<[number, number]> = [];
let idx = 0;
for (let i = 0; i <= N; i++) {
  const t = t0 + ((t1 - t0) * i) / N;
  while (idx < dates.length && dates[idx] <= t) idx++;
  pts.push([t, idx]);
}

// Layout
const W = 800, H = 360, ML = 62, MR = 24, MT = 28, MB = 44;
const IW = W - ML - MR, IH = H - MT - MB;
const yMax = Math.ceil(dates.length / 2000) * 2000;
const x = (t: number) => ML + ((t - t0) / (t1 - t0)) * IW;
const y = (v: number) => MT + IH - (v / yMax) * IH;
const fmtK = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}K` : `${v}`);

// Month ticks (at most ~8)
const ticks: Array<{ t: number; label: string }> = [];
const d0 = new Date(t0); d0.setUTCDate(1); d0.setUTCHours(0, 0, 0, 0);
const months: number[] = [];
for (const d = new Date(d0); d.getTime() <= t1; d.setUTCMonth(d.getUTCMonth() + 1)) months.push(d.getTime());
const step = Math.max(1, Math.ceil(months.length / 8));
for (let i = 0; i < months.length; i += step) {
  const dt = new Date(months[i]);
  ticks.push({ t: months[i], label: dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }) });
}

const line = pts.map(([t, v], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
const area = `${line} L${x(t1).toFixed(1)},${y(0)} L${x(t0).toFixed(1)},${y(0)} Z`;
const yTicks = [0.25, 0.5, 0.75, 1].map((f) => Math.round(yMax * f));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Star history for ${repo}">
  <style>text{font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;fill:#8b949e;font-size:12px}.t{font-size:13px;font-weight:600;fill:#8b949e}</style>
  <text class="t" x="${ML}" y="16">${repo} — GitHub stars</text>
  ${yTicks.map(v => `<line x1="${ML}" y1="${y(v)}" x2="${W - MR}" y2="${y(v)}" stroke="#8b949e" stroke-opacity="0.18" stroke-dasharray="3,4"/>
  <text x="${ML - 8}" y="${y(v) + 4}" text-anchor="end">${fmtK(v)}</text>`).join('\n  ')}
  <line x1="${ML}" y1="${y(0)}" x2="${W - MR}" y2="${y(0)}" stroke="#8b949e" stroke-opacity="0.45"/>
  ${ticks.map(k => `<text x="${x(k.t).toFixed(1)}" y="${H - 16}" text-anchor="middle">${k.label}</text>`).join('\n  ')}
  <path d="${area}" fill="#1E40AF" fill-opacity="0.12"/>
  <path d="${line}" fill="none" stroke="#1E40AF" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="${x(t1).toFixed(1)}" cy="${y(dates.length).toFixed(1)}" r="4" fill="#1E40AF"/>
  <text x="${(x(t1) - 10).toFixed(1)}" y="${(y(dates.length) - 10).toFixed(1)}" text-anchor="end" style="font-weight:600;fill:#1E40AF">★ ${fmtK(dates.length)}</text>
</svg>
`;
await Bun.write(out, svg);
console.log(`wrote ${out} (${svg.length} bytes)`);

export {};
