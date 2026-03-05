import { NextResponse } from "next/server"
import { getTelosContext } from "@/lib/telos-data"
import { join } from "path"
import { homedir } from "os"

// Dynamic import resolved at runtime — avoids ARG_MAX risk from passing
// large prompts as subprocess CLI arguments (see issue #905).
// inference() pipes user prompts via stdin internally, handling any size.
async function getInference() {
  const modulePath = join(homedir(), '.claude', 'PAI', 'Tools', 'Inference.ts')
  const mod = await import(modulePath)
  return mod.inference as typeof import("../../../../PAI/Tools/Inference").inference
}

export async function POST(request: Request) {
  try {
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // Load all TELOS context
    const telosContext = getTelosContext()

    const systemPrompt = `You are a helpful AI assistant with access to the user's complete Personal TELOS (Life Operating System).

${telosContext}

When answering questions:
- Reference specific information from the TELOS files above
- Be conversational and helpful
- If asked about goals, projects, beliefs, wisdom, etc., use the exact information from the relevant sections
- If information isn't in the TELOS data, say so clearly
- Keep responses concise but informative`

    const inference = await getInference()
    const result = await inference({
      systemPrompt,
      userPrompt: message,
      level: 'fast',
    })

    if (!result.success) {
      console.error("Inference Error:", result.error)
      throw new Error(`Inference failed: ${result.error}`)
    }

    const assistantMessage = result.output

    if (!assistantMessage) {
      throw new Error("No response from inference")
    }

    return NextResponse.json({ response: assistantMessage })
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
