# Tool Definition Examples

This directory contains example tool definitions for use with `ChatWithTools.ts`.

## Quick Start

Use any of these example tool definitions with the `--tools` flag:

```bash
# Weather tools
bun run ChatWithTools.ts --message "What's the weather in Paris?" --tools ./examples/weather-tools.json

# Math tools
bun run ChatWithTools.ts --message "Calculate 15 * 23" --tools ./examples/math-tools.json

# File tools
bun run ChatWithTools.ts --message "Read the README.md file" --tools ./examples/file-tools.json

# Web tools
bun run ChatWithTools.ts --message "Search for TypeScript tutorials" --tools ./examples/web-tools.json

# System tools
bun run ChatWithTools.ts --message "What time is it?" --tools ./examples/system-tools.json
```

## Available Examples

### weather-tools.json
Weather-related functions:
- `get_weather` - Get current weather for a location
- `get_forecast` - Get weather forecast for upcoming days

### math-tools.json
Mathematical operations:
- `calculate` - Basic math (add, subtract, multiply, divide)
- `calculate_advanced` - Advanced math (power, sqrt, log, trig functions)
- `factorial` - Calculate factorial

### file-tools.json
File system operations:
- `read_file` - Read file contents
- `write_file` - Write content to a file
- `list_directory` - List files in a directory
- `get_file_info` - Get file metadata

### web-tools.json
Web-related functions:
- `web_search` - Search the web
- `fetch_url` - Fetch content from a URL
- `extract_text` - Extract text from HTML

### system-tools.json
System utilities:
- `get_time` - Get current time and date
- `execute_command` - Execute shell commands
- `get_environment_variable` - Read environment variables
- `generate_uuid` - Generate random UUIDs

## Creating Custom Tools

Tool definitions follow the OpenAI function calling format:

```json
[
  {
    "type": "function",
    "function": {
      "name": "tool_name",
      "description": "Clear description of what the tool does",
      "parameters": {
        "type": "object",
        "properties": {
          "param1": {
            "type": "string",
            "description": "Description of parameter 1"
          },
          "param2": {
            "type": "number",
            "description": "Description of parameter 2",
            "enum": [1, 2, 3]
          }
        },
        "required": ["param1"]
      }
    }
  }
]
```

### Parameter Types

- `string` - Text values
- `number` - Numeric values
- `boolean` - True/false values
- `object` - Nested objects
- `array` - Lists of values

### Parameter Properties

- `description` - Helps the model understand what the parameter is for
- `enum` - Restrict values to a specific set
- `required` - Array of parameter names that must be provided

## Implementing Tool Logic

The example tools in `ChatWithTools.ts` show placeholder implementations. To use these tools in production:

1. **Create Tool Implementations**
   ```typescript
   async function executeTool(toolCall: ToolCall): Promise<string> {
     const { name, arguments: args } = toolCall.function;

     switch (name) {
       case 'read_file':
         const content = await readFile(args.path, 'utf-8');
         return JSON.stringify({ content });

       case 'web_search':
         const results = await searchWeb(args.query, args.max_results);
         return JSON.stringify({ results });

       // Add more implementations...
     }
   }
   ```

2. **Use with ChatWithTools**
   ```bash
   bun run ChatWithTools.ts --message "Your question" --tools ./your-tools.json
   ```

## Best Practices

1. **Clear Descriptions** - Write detailed descriptions so the model knows when to use each tool
2. **Specific Parameters** - Use enums to restrict choices when appropriate
3. **Error Handling** - Return structured errors in JSON format
4. **Type Safety** - Validate parameter types before using them
5. **Security** - Be cautious with tools that execute code or access files

## Examples in Action

### Multi-Step Tool Usage

The model can chain multiple tool calls:

```bash
bun run ChatWithTools.ts --message "What's 15 * 23, and what's the weather like?" --tools ./examples/math-tools.json
```

The model will:
1. Call `calculate` with operation=multiply, a=15, b=23
2. Use the result in its response

### Combining Tool Sets

You can combine multiple tool definition files:

```bash
# Merge files first
jq -s 'add' examples/math-tools.json examples/weather-tools.json > combined-tools.json

# Use combined tools
bun run ChatWithTools.ts --message "Calculate 2+2 and tell me the weather" --tools ./combined-tools.json
```

## Model Compatibility

Tool calling works with models that support function calling:
- ✅ qwen3:4b (tested, works well)
- ✅ qwen3:8b (tested, works well)
- ✅ qwen2:7b (should work)
- ✅ Any model with tool calling support in Ollama

## Troubleshooting

### Model doesn't call tools
- Make sure your model supports tool calling
- Check that tool descriptions are clear and relevant to the query
- Try rephrasing your question to be more explicit

### Tool call fails
- Verify your tool implementation matches the definition
- Check that required parameters are marked correctly
- Ensure you're returning valid JSON from tool execution

### Timeout errors
- Increase `--maxTurns` if the model needs more steps
- Use lite PAI mode with small models: `OLLAMA_PAI_MODE=lite`
- Consider using a larger model (8B+) for complex reasoning
