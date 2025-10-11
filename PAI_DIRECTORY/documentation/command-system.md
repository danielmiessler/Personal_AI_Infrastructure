# PAI Command System

The PAI Command System provides a flexible framework for creating custom commands, scripts, and automation tools that integrate seamlessly with the PAI infrastructure.

## 🏗️ Architecture Overview

The command system consists of three main components:

1. **Commands** - Standalone executable scripts and tools
2. **Hook Integration** - Commands triggered by system events
3. **Dynamic Loading** - Commands loaded based on user intent

## 📁 Directory Structure

```
${PAI_DIR}/commands/
├── *.md                    # Command documentation
├── *.ts                    # TypeScript implementations
├── *.sh                    # Shell script implementations
└── *.js                    # JavaScript implementations
```

## 🔧 Command Types

### 1. Standalone Commands

Independent tools that can be executed directly:

```bash
# TypeScript commands (using Bun runtime)
bun ${PAI_DIR}/commands/command-name.ts [args]

# Shell commands
bash ${PAI_DIR}/commands/command-name.sh [args]
```

### 2. Hook-Triggered Commands

Commands automatically executed by the PAI hook system:

- **UserPromptSubmit**: Triggered when user submits a prompt
- **SessionStart**: Executed at session initialization
- **Stop**: Run when session ends
- **PreCompact**: Triggered before context compression
- **SubagentStop**: Executed when subagent tasks complete

### 3. Dynamic Commands

Commands loaded based on semantic analysis of user intent via the `load-dynamic-requirements` system.

## 📝 Command Patterns

PAI supports two primary types of commands:

### 1. Instructional Commands
These are standard Markdown (`.md`) files that contain documentation, examples, and instructions for an AI to follow. They are not executable on their own. The AI reads the file and executes the described steps using its available tools.

**Use Case**: Complex workflows that require AI reasoning, or documenting a series of shell commands.

### 2. Executable Commands (Self-Contained Scripts)
This is a powerful pattern where a single file with a `.md` extension is also a fully executable TypeScript script. **This is the recommended pattern** for creating automated tools.

**Core Principle: ONE FILE = DOCUMENTATION + CODE**

Never create separate `.ts` and `.md` files. The whole point of this pattern is to have documentation and implementation together in one executable markdown file.

**The structure is critical:**
1.  **Shebang**: The file **must** start with `#!/usr/bin/env bun`.
2.  **JSDoc Comment Block**: All documentation (Purpose, Usage, etc.) **must** be placed inside a single JSDoc-style comment block (`/** ... */`) immediately following the shebang.
3.  **Pure TypeScript Code**: The rest of the file is pure TypeScript code. `Bun` will execute this code, ignoring the shebang and the JSDoc block.

**CRITICAL:** Do not include any standard Markdown syntax like `#` headings or `---` rules outside of the JSDoc block, as it will cause a syntax error.

**TypeScript Standards:** All code must follow strict type safety:
- ✅ No `any` types
- ✅ Explicit return types on all functions
- ✅ Proper interfaces for all data structures
- ✅ Error handling with `instanceof Error` checks
- ✅ Input validation

### Example Executable Command (`your-command.md`)

```markdown
#!/usr/bin/env bun
/**
 * # Your Command Title
 *
 * ## Purpose
 * A clear description of what this command does.
 *
 * ## Usage
 * ```bash
 * # Run the command directly
 * bun ${PAI_DIR}/commands/your-command.md
 * ```
 */

// TypeScript code starts here
import { $ } from 'bun';

console.log('This command is running!');

async function main() {
  await $`echo Hello from Bun!`;
}

main().catch(console.error);
```

## 🚀 Creating New Executable Commands

### Step 1: Create Your File
Create a single new file: `${PAI_DIR}/commands/your-command.md`.

### Step 2: Add Content
1.  Add `#!/usr/bin/env bun` to the very first line.
2.  Create a `/** ... */` block and write your documentation inside it.
3.  Write your pure TypeScript code directly after the comment block.

### Step 3: Make it Executable
Open a terminal and run `chmod +x` on your new file:
```bash
chmod +x ${PAI_DIR}/commands/your-command.md
```

### Step 4: Test Your Command
Execute your command directly to test it:
```bash
bun ${PAI_DIR}/commands/your-command.md
```


## 🔗 Integration Points

### Environment Variables

Commands should use these PAI environment variables:

- `PAI_DIR`: PAI configuration directory
- `ELEVENLABS_API_KEY`: Voice synthesis API key
- `PORT`: Voice server port (default: 8888)

### Standard Directories

Commands commonly interact with:

- `${PAI_DIR}/context/`: Context files and learnings
- `${PAI_DIR}/hooks/`: Hook scripts
- `${HOME}/Projects/`: Project-specific contexts

### Hook Integration

To integrate with hooks, add command to `${PAI_DIR}/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun ${PAI_DIR}/commands/your-command.md"
          }
        ]
      }
    ]
  }
}
```

## 📋 Existing Commands

### Core Commands

#### capture-learning
Captures comprehensive problem-solving narratives from work sessions.

**Usage**: `bun ${PAI_DIR}/commands/capture-learning.ts`
**Output**: `${PAI_DIR}/context/learnings/YYYY-MM-DD-problem.md`

#### load-dynamic-requirements
Dynamically loads context and agents based on user intent.

**Usage**: Triggered automatically via UserPromptSubmit hook
**Function**: Semantic analysis and context loading

#### web-research
Perplexity AI integration for web research queries.

**Usage**: Via API calls with PERPLEXITY_API_KEY
**Function**: External research and information gathering

## ❌ Anti-Patterns - DO NOT DO THIS

### WRONG: Separate Files

```
commands/
├── my-command.md       # Documentation
└── my-command.ts       # Code
```

**Why wrong:** Violates the "one file" principle. Documentation and code drift apart.

### WRONG: Missing Shebang

```typescript
/**
 * # my-command
 */
import { stuff } from "package";
```

**Why wrong:** File won't be executable without shebang.

### WRONG: Regular Comments Instead of JSDoc

```typescript
#!/usr/bin/env bun
// My Command
// Does stuff

import { stuff } from "package";
```

**Why wrong:** PAI indexing system looks for JSDoc blocks. Won't be discoverable.

### WRONG: Using `any` Types

```typescript
function process(data: any): any {
  return data.value;
}
```

**Why wrong:** Defeats TypeScript's type safety.

## 🎯 Best Practices

### 1. Start with Documentation

Write the JSDoc block first. Clarify what the command does before implementing.

### 2. Follow TypeScript Standards Strictly

No exceptions. Maintain strict type safety throughout.

### 3. Error Handling

```typescript
try {
    // Command logic
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error: ${message}`);
    process.exit(1);
}
```

### 4. User Feedback

```typescript
console.log('✅ Command completed successfully');
console.log(`📁 Output saved to: ${outputPath}`);
```

### 5. Argument Validation

```typescript
if (process.argv.length < 3) {
    console.error('Usage: bun command.md <required-arg>');
    process.exit(1);
}
```

### 6. Path Handling

```typescript
const outputDir = path.join(process.env.PAI_DIR || '', 'context', 'output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}
```

### 7. Use Consistent Exit Codes

```typescript
// Success
process.exit(0);

// User error (bad input)
process.exit(1);

// System error (network, permissions, etc)
process.exit(2);
```

## 🔧 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Command not found | Check file permissions and shebang |
| Command not executable | Run `chmod +x command-name.md` |
| PAI_DIR undefined | Set environment variable in shell |
| Import errors | Verify Bun installation and dependencies |
| Hook not triggering | Check settings.json configuration |
| TypeScript errors | Check for `any` types, missing return types |
| Not in pai-index | Verify JSDoc structure and run `pai-index refresh` |

### Command not executable

```bash
# Check permissions
ls -la ${PAI_DIR}/commands/my-command.md

# Should show: -rwxr-xr-x
# If not, fix with:
chmod +x ${PAI_DIR}/commands/my-command.md
```

### Command not in index

```bash
# Verify JSDoc structure
head -n 20 ${PAI_DIR}/commands/my-command.md

# Should see:
# #!/usr/bin/env bun
# /**
#  * # Title
#  *
#  * ## Purpose
#  * Description here...
#  */

# Refresh index
bun ${PAI_DIR}/commands/pai-index.md refresh

# Verify command appears
bun ${PAI_DIR}/commands/pai-index.md find "my-command"
```

### TypeScript errors

```bash
# Check syntax without running
bun --no-run ${PAI_DIR}/commands/my-command.md

# Common issues:
# - Missing return types
# - Using 'any' types
# - Missing imports
# - Incorrect error handling
```

### Debugging Commands

```bash
# Test command directly
bun ${PAI_DIR}/commands/command-name.md

# Check environment
echo $PAI_DIR

# Verify permissions
ls -la ${PAI_DIR}/commands/

# Check hook configuration
cat ${PAI_DIR}/settings.json | jq '.hooks'
```

## 📚 Reference Commands

Great examples of executable TypeScript .md commands to study:

1. **delegate-router.md** - Complex routing logic with multiple tools
2. **delegate.md** - Configuration management and status checking
3. **pai-index.md** - Large-scale file processing with progress tracking
4. **pai-audit.md** - System analysis with detailed reporting

All located in `${PAI_DIR}/commands/`

## 🚀 Advanced Features

### Interactive Commands
Use readline for user input:

```typescript
import * as readline from 'readline';

async function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}
```

### Voice Integration
Commands can trigger voice notifications:

```typescript
const notification = {
    title: "Command Complete",
    message: "Your command has finished successfully",
    voice_enabled: true
};

// Send to voice server
fetch('http://localhost:8888/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notification)
});
```

---

*The PAI Command System enables powerful automation and customization while maintaining simplicity and consistency across the infrastructure.*
