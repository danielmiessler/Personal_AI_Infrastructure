# Ollama Tool Calling Implementation Guide

**Date Created**: 2026-01-10
**Model**: qwen3:4b (supports tool calling)

## Current State

The **kai-ollama-skill** doesn't use tool calling yet. The code uses basic chat/generate endpoints without the `tools` parameter. Your qwen3:4b model is already configured to support it though!

## How Ollama Tool Calling Works

**Concept**: You give the model a list of functions it can call, and it decides when to invoke them.

### Example Flow

```typescript
// 1. Define tools as JSON schema
const tools = [{
  type: "function",
  function: {
    name: "get_weather",
    description: "Get current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "City name" }
      },
      required: ["location"]
    }
  }
}];

// 2. Send to Ollama with tools parameter
const response = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    model: "qwen3:4b",
    messages: [{ role: "user", content: "What's the weather in SF?" }],
    tools: tools  // <-- Key addition!
  })
});

// 3. Model responds with tool call in XML format
// <tool_call>
// {"name": "get_weather", "arguments": {"location": "San Francisco"}}
// </tool_call>

// 4. Execute the function and send result back
const toolResult = getWeather("San Francisco");
messages.push({
  role: "tool",
  content: JSON.stringify(toolResult)
});

// 5. Model incorporates result into final answer
```

## Key Capabilities

From the official docs:
- **Single-shot**: Call one tool, get result, continue
- **Parallel calls**: Request multiple tools at once
- **Streaming**: Tool calls work with streaming responses
- **Python convenience**: Pass Python functions directly (schema auto-generated)

## qwen3:4b Template Format

From your Modelfile, the model uses this format:

```
<tool_call>
{"name": "<function-name>", "arguments": <args-json-object>}
</tool_call>
```

And tool responses:
```
<tool_response>
[result content]
</tool_response>
```

## Perfect Use Cases for PAI

1. **Local RAG with embeddings** - Model calls `search_documents()` tool
2. **Code execution** - Model decides when to run code snippets
3. **File operations** - Model calls `read_file()`, `write_file()`
4. **Multi-step workflows** - Model orchestrates complex tasks
5. **Privacy-first agents** - All tool execution stays local

## Implementation Path

Extend Chat.ts with tool support:

```typescript
interface Tool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

interface OllamaChatRequest {
  model: string;
  messages: Message[];
  stream?: boolean;
  tools?: Tool[];  // Add this
  options?: {
    temperature?: number;
  };
}

// Tool response parsing
if (response.includes('<tool_call>')) {
  // Extract JSON between <tool_call> tags
  // Execute function
  // Send back as message with role: "tool"
}
```

## Implementation Options

1. **Add tool calling to Chat.ts** - Extend current implementation
2. **Create ToolChat.ts** - New tool demonstrating the feature
3. **Build local agent** - Model that can search files, run code, etc.
4. **Create workflow** - Pre-built tool-calling template

## Resources

### Official Documentation
- [Tool calling docs](https://docs.ollama.com/capabilities/tool-calling) - Main guide
- [Streaming + tools](https://ollama.com/blog/streaming-tool) - Real-time tool calls
- [Python library](https://ollama.com/blog/functions-as-tools) - Convenient function passing

### Tutorials
- [Medium: Ollama Tool Calling](https://medium.com/@danushidk507/ollama-tool-calling-8e399b2a17a8)
- [IBM Granite tutorial](https://www.ibm.com/think/tutorials/local-tool-calling-ollama-granite)
- [Node.js + Ollama](https://developers.redhat.com/blog/2024/09/10/quick-look-tool-usefunction-calling-nodejs-and-ollama)
- [Caktus Group: Function Calling Basics](https://www.caktusgroup.com/blog/2025/12/03/learning-llm-basics-ollama-function-calling/)

## Next Steps

- [ ] Study the official docs and examples
- [ ] Design tool interface for TypeScript
- [ ] Implement tool call parsing (XML extraction)
- [ ] Create example tools (file read, search, execute)
- [ ] Build interactive tool-calling chat
- [ ] Add to skill documentation
- [ ] Create workflow examples
