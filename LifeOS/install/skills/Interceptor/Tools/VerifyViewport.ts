#!/usr/bin/env bun
/**
 * VerifyViewport — lifecycle-guaranteed browser verification.
 *
 * WHY THIS EXISTS
 * Chrome suspends the rendering lifecycle for any tab whose window is not
 * visible (minimized, fully occluded, or on an inactive Space). Timers still
 * fire, and getBoundingClientRect() still forces layout on demand — so
 * measurements LOOK fine — but requestAnimationFrame, ResizeObserver,
 * IntersectionObserver, and CSS transitions never run at all. Verification of
 * animation, responsive/observer-driven layout, lazy-loading and scroll-reveal
 * therefore returns a confident "nothing happened" in the standard test
 * profile whenever its window happens to be behind something.
 *
 * That is unacceptable for a verification tool: correctness must not depend on
 * where the operator left their windows.
 *
 * WHAT THIS DOES
 * Runs a dedicated Chrome instance in its own --user-data-dir with the
 * anti-throttling flags (these only take effect at browser-process launch, so
 * they can never be applied to an already-running Chrome). Its window is parked
 * off to the side and stays fully rendering regardless of occlusion. The
 * instance is driven over CDP through `interceptor macos cdp`, so it needs no
 * extension, and viewport size is set with Emulation.setDeviceMetricsOverride —
 * a real layout-viewport change that fires the page's own observers without
 * moving or resizing any window.
 *
 * The operator's Chrome is never touched: separate process, separate profile,
 * no shared state. Authenticated and stealth work stays on the normal
 * extension-driven test profile; this instance is for public pages whose
 * behavior depends on the rendering lifecycle.
 *
 * EVERY run asserts the lifecycle is actually live (visibilityState visible AND
 * rAF ticking) before reporting anything. If that assertion fails the tool
 * exits non-zero — it never degrades to a silent measurement.
 *
 * Usage:
 *   VerifyViewport.ts ensure
 *   VerifyViewport.ts check
 *   VerifyViewport.ts probe <url> --widths 1440,1100,900 --expr '<js>'|@file
 *   VerifyViewport.ts shot  <url> --width 1440 --out <path> [--full]
 *   VerifyViewport.ts stop
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const HOME = homedir()
const PORT = Number(process.env.INTERCEPTOR_VERIFY_CDP_PORT ?? 9333)
const USER_DATA_DIR =
  process.env.INTERCEPTOR_VERIFY_USER_DATA_DIR ??
  join(HOME, '.local', 'share', 'interceptor', 'verify-profile')
/**
 * Headless by default: no window is created at all, so the instance never puts
 * anything on the operator's desktop and there is no window state left to
 * depend on. Chrome's modern headless runs the same renderer as headful — the
 * full rendering lifecycle (rAF, ResizeObserver, transitions) is live, which is
 * asserted on every run regardless. Set INTERCEPTOR_VERIFY_HEADFUL=1 to get a
 * real window when you need to watch it with your own eyes.
 */
const HEADFUL = process.env.INTERCEPTOR_VERIFY_HEADFUL === '1'
const WINDOW_ARGS = HEADFUL
  ? (process.env.INTERCEPTOR_VERIFY_WINDOW ?? '--window-position=-3800,120 --window-size=1200,800')
  : '--headless=new --window-size=1200,800'

const CHROME_CANDIDATES = [
  process.env.INTERCEPTOR_CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
].filter(Boolean) as string[]

/** Only effective at browser-process launch — the reason a dedicated instance exists. */
const LIFECYCLE_FLAGS = [
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling',
  '--disable-features=CalculateNativeWinOcclusion'
]

function die(msg: string, code = 1): never {
  console.error(`[VerifyViewport] ${msg}`)
  process.exit(code)
}

async function sh(cmd: string, args: string[]): Promise<{ out: string; code: number }> {
  const p = Bun.spawn([cmd, ...args], { stdout: 'pipe', stderr: 'pipe' })
  const out = await new Response(p.stdout).text()
  const err = await new Response(p.stderr).text()
  return { out: out + err, code: await p.exited }
}

/** interceptor prefixes responses with a "[id] → verb" line; strip it before parsing. */
/** Drop the "[a1b2c3] → verb" trace lines the CLI prefixes to every response. */
function stripTrace(raw: string): string {
  return raw
    .split('\n')
    .filter((l) => !/^\s*\[[0-9a-f]{4,}\]\s*→/.test(l))
    .join('\n')
}

function parseCdp(raw: string): any {
  const body = stripTrace(raw)
  const start = body.indexOf('{')
  if (start < 0) throw new Error(`no JSON in CDP response: ${body.slice(0, 200)}`)
  return JSON.parse(body.slice(start))
}

function parseCdpList(raw: string): any[] {
  const body = stripTrace(raw)
  const start = body.indexOf('[')
  if (start < 0) return []
  return JSON.parse(body.slice(start))
}

/**
 * The daemon derives a context id from the connect host, and mints an extra
 * URL-named alias on every navigation. The host-derived id is the only one
 * that stays valid across navigations, so pin it and pass it explicitly —
 * bare cdp calls hard-error once more than one context exists.
 */
const CDP_CONTEXT = `cdp:${(process.env.INTERCEPTOR_VERIFY_CDP_HOST ?? '127.0.0.1').replace(/\./g, '-')}`

async function cdp(method: string, params: Record<string, unknown> = {}): Promise<any> {
  const { out } = await sh('interceptor', [
    'macos', 'cdp', 'raw', method, JSON.stringify(params), '--context', CDP_CONTEXT
  ])
  if (/^error:/m.test(out)) throw new Error(`${method} failed: ${out.trim().slice(0, 300)}`)
  return parseCdp(out)
}

/** Evaluate an expression in the page and return its value (expression must yield JSON-safe data). */
async function evaluate(expression: string): Promise<any> {
  const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  const res = r?.result
  if (res?.subtype === 'error' || r?.exceptionDetails) {
    throw new Error(`page threw: ${res?.description ?? JSON.stringify(r.exceptionDetails).slice(0, 300)}`)
  }
  return res?.value
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function endpointAlive(): Promise<boolean> {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/version`, {
      signal: AbortSignal.timeout(1500)
    })
    return r.ok
  } catch {
    return false
  }
}

function launch(): void {
  const chrome = CHROME_CANDIDATES.find((p) => existsSync(p))
  if (!chrome) die(`no Chromium binary found. Set INTERCEPTOR_CHROME_BIN.`, 2)

  mkdirSync(join(USER_DATA_DIR, 'NativeMessagingHosts'), { recursive: true })
  // A custom --user-data-dir gets its own (empty) NativeMessagingHosts dir. Seed it
  // so the daemon can still reach this instance if an extension is ever added.
  const nmhSrc = join(HOME, 'Library', 'Application Support', 'Google', 'Chrome',
    'NativeMessagingHosts', 'com.interceptor.host.json')
  if (existsSync(nmhSrc)) {
    try { copyFileSync(nmhSrc, join(USER_DATA_DIR, 'NativeMessagingHosts', 'com.interceptor.host.json')) } catch {}
  }

  const args = [
    `--user-data-dir=${USER_DATA_DIR}`,
    `--remote-debugging-port=${PORT}`,
    `--remote-allow-origins=http://127.0.0.1:${PORT}`,
    ...LIFECYCLE_FLAGS,
    '--no-first-run',
    '--no-default-browser-check',
    '--password-store=basic',
    ...WINDOW_ARGS.split(/\s+/).filter(Boolean),
    'about:blank'
  ]
  const child = spawn(chrome, args, { detached: true, stdio: 'ignore' })
  child.unref()
}

/** Attach CDP to the instance's page target, pruning stale alias contexts first. */
async function attach(): Promise<void> {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
  const page = list.find((t: any) => t.type === 'page')
  if (!page) throw new Error('verification instance has no page target')

  await sh('interceptor', ['macos', 'cdp', 'connect', String(PORT)])

  // Drop URL-named aliases left by earlier navigations so CDP_CONTEXT resolves.
  const { out: statusOut } = await sh('interceptor', ['macos', 'cdp', 'status'])
  try {
    for (const c of parseCdpList(statusOut)) {
      if (c.port === PORT && c.contextId && c.contextId !== CDP_CONTEXT) {
        await sh('interceptor', ['macos', 'cdp', 'detach', '--context', c.contextId])
      }
    }
  } catch { /* no contexts yet on a cold start */ }

  const { out } = await sh('interceptor', [
    'macos', 'cdp', 'attach', page.id, '--context', CDP_CONTEXT
  ])
  if (/^error:/m.test(out)) throw new Error(`attach failed: ${out.trim().slice(0, 200)}`)
}

/**
 * Prove the rendering lifecycle is live. This is the whole point of the tool,
 * so it is asserted on every run rather than assumed from the launch flags.
 */
async function assertLifecycleLive(): Promise<{ vis: string; rafDelta: number }> {
  await evaluate(`window.__vvRaf=0;(function t(){window.__vvRaf++;requestAnimationFrame(t)})();0`)
  const before = await evaluate('window.__vvRaf')
  await sleep(1000)
  const after = await evaluate('window.__vvRaf')
  const vis = await evaluate('document.visibilityState')
  const rafDelta = after - before
  if (vis !== 'visible' || rafDelta < 5) {
    throw new Error(
      `rendering lifecycle is NOT live (visibility=${vis}, rAF ticks in 1s=${rafDelta}). ` +
      `Measurements from this context would silently miss ResizeObserver, animation and lazy-load behavior.`
    )
  }
  return { vis, rafDelta }
}

async function ensure(): Promise<void> {
  if (!(await endpointAlive())) {
    launch()
    for (let i = 0; i < 40; i++) {
      await sleep(500)
      if (await endpointAlive()) break
    }
    if (!(await endpointAlive())) die(`verification instance did not expose CDP on ${PORT}`, 3)
  }
  await attach()
}

async function setViewport(width: number, height: number): Promise<void> {
  await cdp('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: false
  })
}

async function navigate(url: string): Promise<void> {
  await cdp('Page.enable')
  await cdp('Page.navigate', { url })
  // Poll readiness rather than sleeping a fixed amount.
  for (let i = 0; i < 40; i++) {
    await sleep(400)
    try {
      const [state, href] = await Promise.all([
        evaluate('document.readyState'),
        evaluate('location.href')
      ])
      if (state === 'complete' && href !== 'about:blank') break
    } catch { /* mid-navigation contexts throw; keep polling */ }
  }
  try { await evaluate('document.fonts && document.fonts.ready ? document.fonts.ready.then(()=>0) : 0') } catch {}
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}

async function main() {
  const cmd = process.argv[2]

  if (cmd === 'stop') {
    await sh('pkill', ['-f', USER_DATA_DIR])
    console.log('[VerifyViewport] stopped')
    return
  }

  if (cmd === 'ensure' || cmd === 'check') {
    await ensure()
    const live = await assertLifecycleLive()
    console.log(`[VerifyViewport] READY — lifecycle live (visibility=${live.vis}, ${live.rafDelta} rAF ticks/s), CDP :${PORT}`)
    return
  }

  if (cmd === 'probe') {
    const url = process.argv[3]
    if (!url) die('usage: probe <url> --widths 1440,1100 --expr <js|@file>')
    const widths = (flag('widths') ?? '1440').split(',').map((w) => Number(w.trim()))
    const height = Number(flag('height') ?? 900)
    const exprArg = flag('expr')
    if (!exprArg) die('--expr is required')
    const expression = exprArg.startsWith('@') ? await Bun.file(exprArg.slice(1)).text() : exprArg

    await ensure()
    const live = await assertLifecycleLive()
    await setViewport(widths[0], height)
    await navigate(url)

    const results: any[] = []
    for (const w of widths) {
      await setViewport(w, height)
      // Two settle beats: one for layout, one for the observer callbacks it triggers.
      await sleep(700)
      // --expr accepts either a zero-arg function or a bare expression.
      results.push({
        width: w,
        value: await evaluate(
          `(()=>{const __f=(${expression}); return typeof __f==='function' ? __f() : __f})()`
        )
      })
    }
    console.log(JSON.stringify({
      url,
      lifecycle: { visibility: live.vis, rafTicksPerSecond: live.rafDelta },
      results
    }, null, 2))
    return
  }

  if (cmd === 'shot') {
    const url = process.argv[3]
    const width = Number(flag('width') ?? 1440)
    const height = Number(flag('height') ?? 900)
    const out = flag('out')
    if (!url || !out) die('usage: shot <url> --width N --out <path>')
    await ensure()
    await assertLifecycleLive()
    await setViewport(width, height)
    await navigate(url)
    await sleep(800)
    const r = await cdp('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: process.argv.includes('--full')
    })
    const b64 = r?.result?.data ?? r?.data
    if (!b64) die('screenshot returned no data')
    writeFileSync(out, Buffer.from(b64, 'base64'))
    console.log(out)
    return
  }

  die('usage: ensure | check | probe <url> --widths .. --expr .. | shot <url> --width N --out P | stop')
}

main().catch((e) => die(e.message))
