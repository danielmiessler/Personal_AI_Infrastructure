/**
 * iMessage Sender via AppleScript
 *
 * Sends iMessage replies through Messages.app using osascript.
 * Works on macOS Sonoma/Sequoia with Automation permission granted.
 *
 * Absorbed from the iMessage bot/lib/imessage-send.ts into Pulse module system.
 */

import { $ } from "bun"

const MAX_MESSAGE_LENGTH = 8000 // iMessage has no hard limit but keep reasonable

/**
 * Send an iMessage to a specific handle (phone or email).
 * Uses the chat identifier for reliable routing.
 */
export async function sendMessage(
  handle: string,
  text: string,
): Promise<boolean> {
  if (!text.trim()) return false

  // Split long messages
  const chunks = splitMessage(text, MAX_MESSAGE_LENGTH)

  for (const chunk of chunks) {
    const escaped = escapeForAppleScript(chunk)

    // Use buddy-based send. The old object-specifier form
    // (`participant targetService handle "..."`) no longer resolves on
    // current macOS; `participant "..." of targetService` works on both.
    // (ported from public PR #1835, @J0UH)
    const script = `
tell application "Messages"
  set targetService to 1st account whose service type = iMessage
  set targetBuddy to participant "${escapeForAppleScript(handle)}" of targetService
  send "${escaped}" to targetBuddy
end tell`

    try {
      await $`osascript -e ${script}`.quiet()
    } catch (err) {
      // Fallback: try chat-based approach
      const chatScript = `
tell application "Messages"
  send "${escaped}" to chat id "iMessage;-;${escapeForAppleScript(handle)}"
end tell`
      try {
        await $`osascript -e ${chatScript}`.quiet()
      } catch (fallbackErr) {
        console.error(
          `Failed to send iMessage to ${handle}:`,
          String(fallbackErr),
        )
        return false
      }
    }

    // Small delay between chunks to preserve ordering
    if (chunks.length > 1) {
      await Bun.sleep(500)
    }
  }

  return true
}

function escapeForAppleScript(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text]

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining)
      break
    }

    // Try to split at a newline or space
    let splitIdx = remaining.lastIndexOf("\n", maxLength)
    if (splitIdx === -1 || splitIdx < maxLength * 0.5) {
      splitIdx = remaining.lastIndexOf(" ", maxLength)
    }
    if (splitIdx === -1 || splitIdx < maxLength * 0.5) {
      splitIdx = maxLength
    }

    chunks.push(remaining.slice(0, splitIdx))
    remaining = remaining.slice(splitIdx).trimStart()
  }

  return chunks
}
