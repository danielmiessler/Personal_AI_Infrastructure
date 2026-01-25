import { NextResponse } from "next/server"
import { getTelosContext } from "@/lib/telos-data"

export async function POST(request: Request) {
  try {
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      )
    }

    // Load all TELOS context
    const telosContext = getTelosContext()

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: `You are a helpful AI assistant with access to the user's complete Personal TELOS (Life Operating System).

${telosContext}

When answering questions:
- Reference specific information from the TELOS files above
- Be conversational and helpful
- If asked about goals, projects, beliefs, wisdom, etc., use the exact information from the relevant sections
- If information isn't in the TELOS data, say so clearly
- Keep responses concise but informative`,
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API Error:", errorText)
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const data = await response.json()
    const assistantMessage = data.content[0]?.text

    if (!assistantMessage) {
      throw new Error("No response from API")
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
