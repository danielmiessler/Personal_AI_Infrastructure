#!/usr/bin/env bun
/**
 * Browse CLI Tool
 *
 * Browser automation using Playwright code-first interface.
 * Wraps Playwright for easy CLI invocation.
 *
 * Usage:
 *   bun run $PAI_DIR/skills/Browser/Tools/Browse.ts open <url>
 *   bun run $PAI_DIR/skills/Browser/Tools/Browse.ts screenshot <url> [path]
 *   bun run $PAI_DIR/skills/Browser/Tools/Browse.ts verify <url> <selector>
 *
 * Examples:
 *   bun run $PAI_DIR/skills/Browser/Tools/Browse.ts open https://danielmiessler.com
 *   bun run $PAI_DIR/skills/Browser/Tools/Browse.ts screenshot https://example.com /tmp/shot.png
 *   bun run $PAI_DIR/skills/Browser/Tools/Browse.ts verify https://example.com "h1"
 */

import { PlaywrightBrowser } from '../index.ts'

const VOICE_SERVER = 'http://localhost:8888/notify'

async function notify(message: string): Promise<void> {
  try {
    await fetch(VOICE_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    })
  } catch {
    // Voice server not running - silent fail
  }
}

async function openUrl(url: string): Promise<void> {
  await notify('Opening browser with Browse skill')
  console.log(`Opening ${url} in browser...`)

  const browser = new PlaywrightBrowser()
  await browser.launch({ headless: false })
  await browser.navigate(url)

  console.log('Browser opened. Press Ctrl+C to close.')

  // Keep browser open until interrupted
  await new Promise(() => {})
}

async function takeScreenshot(url: string, path: string): Promise<void> {
  await notify('Taking screenshot with Browse skill')
  console.log(`Taking screenshot of ${url}...`)

  const browser = new PlaywrightBrowser()
  await browser.launch({ headless: true })
  await browser.navigate(url)
  await browser.waitForNetworkIdle(5000)
  await browser.screenshot({ path, fullPage: false })
  await browser.close()

  console.log(`Screenshot saved to ${path}`)
}

async function verifyElement(url: string, selector: string): Promise<void> {
  await notify('Verifying page element with Browse skill')
  console.log(`Verifying ${selector} on ${url}...`)

  const browser = new PlaywrightBrowser()
  await browser.launch({ headless: true })
  await browser.navigate(url)

  try {
    await browser.waitForSelector(selector, { timeout: 10000 })
    const text = await browser.getVisibleText(selector)
    console.log(`PASS: Element "${selector}" found`)
    console.log(`Content: ${text.slice(0, 200)}${text.length > 200 ? '...' : ''}`)
  } catch (error) {
    console.log(`FAIL: Element "${selector}" not found`)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command) {
    console.log(`
Browse CLI - Browser automation tool

Usage:
  bun run $PAI_DIR/skills/Browser/Tools/Browse.ts <command> [args]

Commands:
  open <url>                    Open URL in visible browser
  screenshot <url> [path]       Take screenshot (default: /tmp/screenshot.png)
  verify <url> <selector>       Verify element exists on page

Examples:
  bun run $PAI_DIR/skills/Browser/Tools/Browse.ts open https://danielmiessler.com
  bun run $PAI_DIR/skills/Browser/Tools/Browse.ts screenshot https://example.com /tmp/shot.png
  bun run $PAI_DIR/skills/Browser/Tools/Browse.ts verify https://example.com "h1"
    `)
    process.exit(0)
  }

  switch (command) {
    case 'open':
      if (!args[1]) {
        console.error('Error: URL required')
        process.exit(1)
      }
      await openUrl(args[1])
      break

    case 'screenshot':
      if (!args[1]) {
        console.error('Error: URL required')
        process.exit(1)
      }
      await takeScreenshot(args[1], args[2] || '/tmp/screenshot.png')
      break

    case 'verify':
      if (!args[1] || !args[2]) {
        console.error('Error: URL and selector required')
        process.exit(1)
      }
      await verifyElement(args[1], args[2])
      break

    default:
      console.error(`Unknown command: ${command}`)
      process.exit(1)
  }
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
