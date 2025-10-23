# PAI System Architecture

> [!IMPORTANT]
> **v0.6.0 Directory Structure Update**
> As of v0.6.0, all PAI infrastructure lives in the `.claude/` directory:
> - **Repository:** `/PAI/.claude/` contains all infrastructure
> - **Your System:** `~/.claude/` is where you install PAI
> - **Migration:** Copy `.claude/` from repo to `~/.claude/` on your system
>
> This structure ensures the repository properly mirrors how PAI works in production.

## Overview

PAI (Personal AI Infrastructure) is a modular, event-driven system that enhances AI assistants with dynamic context management, automation, and extensibility. The architecture follows a layered approach with clear separation of concerns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Interface                       │
│              (Claude Desktop, Terminal, API)                 │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                       Hook System Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Pre-prompt   │  │ Tool hooks   │  │ Post-exec    │     │
│  │ Hooks        │  │              │  │ Hooks        │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                      Skills System                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Intent       │  │ Skill        │  │ Progressive  │     │
│  │ Matching     │  │ Activation   │  │ Loading      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                      Agent System                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Researcher   │  │ Engineer     │  │ Pentester    │     │
│  │              │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Voice Server │  │ MCP Tools    │  │ Commands     │     │
│  │              │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Hook System Layer

The hook system provides event-driven automation throughout the AI interaction lifecycle.

**Key Features:**
- **Pre-prompt hooks**: Execute before user prompts are processed
- **Tool hooks**: Intercept and modify tool calls
- **Post-execution hooks**: Run after commands complete

**Location:** `~/.claude/hooks/`

### 2. Skills System

The Skills System provides modular, self-contained capability packages that extend AI functionality with specialized knowledge and workflows.

**Key Features:**
- **Intent Matching**: Activates skills based on user request understanding
- **Progressive Disclosure**: SKILL.md → CLAUDE.md → Resources
- **Modular Design**: Self-contained with templates and components
- **Global Inheritance**: All skills automatically access global context

**Location:** `~/.claude/skills/`

### 3. Agent System

Specialized AI agents for different domains and tasks.

**Available Agents:**
- **General-purpose**: Default agent for most tasks
- **Researcher**: Web research and information gathering
- **Engineer**: Software development and debugging
- **Designer**: UI/UX and visual design
- **Pentester**: Security testing and vulnerability assessment
- **Architect**: System design and technical specifications

### 4. Service Layer

Supporting services that provide additional functionality.

**Services:**
- **Voice Server**: Text-to-speech notifications
- **MCP Tools**: Model Context Protocol integrations
- **Command System**: Custom command execution

## Data Flow

### 1. User Input Flow
```
User Input → Hook System → UFC Context → Agent Selection → Processing
```

1. User submits a prompt
2. Pre-prompt hooks execute
3. UFC system analyzes intent
4. Relevant context is loaded
5. Appropriate agent is selected
6. Prompt is processed with context

### 2. Tool Execution Flow
```
Tool Request → Hook Validation → Execution → Post-hook → Response
```

1. AI requests tool execution
2. Tool hooks validate/modify request
3. Tool executes
4. Post-execution hooks run
5. Response returned to AI

### 3. Context Loading Flow
```
Intent Analysis → Pattern Matching → Context Selection → Dynamic Loading
```

1. System analyzes user intent
2. Matches against context patterns
3. Selects appropriate contexts
4. Loads context files dynamically

## Directory Structure

```
${CLAUDE_PLUGIN_ROOT}/
├── skills/              # Modular capability packages
│   ├── prompting/      # Prompt engineering guide
│   ├── create-skill/   # Skill creation framework
│   ├── development/    # Software development
│   └── [custom]/       # Your custom skills
├── hooks/               # Event hooks
│   ├── user-prompt-submit-hook
│   ├── tool-use-hook
│   └── post-execution-hook
├── commands/            # Custom slash commands
│   └── *.md            # Command definitions
├── agents/              # Specialized AI agents
│   ├── engineer.md
│   ├── researcher.md
│   └── [others].md
├── voice-server/        # Voice notification service
│   ├── server.ts       # Server implementation
│   ├── voices.json     # Voice configuration
│   └── menubar/        # Menu bar integration
├── documentation/       # System documentation
└── statusline-command.sh

${HOME}/
├── Documentation/       # User documentation
├── Projects/           # User projects
└── Library/           # System libraries
    └── Logs/          # System logs
```

## Communication Protocols

### HTTP APIs

**Voice Server API:**
- `POST /notify` - Send voice notification
- `GET /health` - Health check
- `POST /pai` - PAI-specific notifications

**Request Format:**
```json
{
  "message": "Text to speak",
  "voice_id": "optional_voice_id",
  "title": "Optional Title"
}
```

### Hook Protocol

Hooks communicate through:
1. **Environment Variables**: Pass configuration
2. **Standard I/O**: Input/output piping
3. **Exit Codes**: Success/failure signaling
4. **File System**: Shared context files

## Security Architecture

### Input Validation
- All user inputs sanitized
- Shell metacharacters blocked
- Length limits enforced

### Process Isolation
- Spawn with argument arrays
- No shell interpretation
- Restricted permissions

### Network Security
- CORS restricted to localhost
- Rate limiting per IP
- Authentication tokens (when configured)

### Data Protection
- No hardcoded credentials
- Environment variable configuration
- Secure file permissions

## Extensibility Points

### 1. Adding Skills
Create new skills in:
- `${CLAUDE_PLUGIN_ROOT}/skills/[skill-name]/` - Skill directory
- `SKILL.md` - Quick reference (required)
- `CLAUDE.md` - Comprehensive guide (optional)
- Add to global context for discovery

### 2. Adding Hooks
Create executable scripts in:
- `${CLAUDE_PLUGIN_ROOT}/hooks/` - Event hooks

### 3. Adding Agents
Define new agents in:
- `${CLAUDE_PLUGIN_ROOT}/agents/[name].md` - Agent configuration

### 4. Adding Commands
Create slash commands in:
- `${CLAUDE_PLUGIN_ROOT}/commands/` - Custom slash commands

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading**: Context loads only when needed
2. **Caching**: Frequently used contexts cached
3. **Parallel Processing**: Independent operations run concurrently
4. **Rate Limiting**: Prevents resource exhaustion

### Resource Management
- Memory: Context files loaded on-demand
- CPU: Agent selection optimized for task
- Network: Batch operations when possible
- Disk: Log rotation and cleanup

## Error Handling

### Error Propagation
```
Service Error → Hook System → User Notification → Fallback Action
```

### Fallback Strategies
1. **Voice Server**: Falls back to macOS `say`
2. **Context Loading**: Uses default context
3. **Agent Selection**: Falls back to general-purpose
4. **Hook Execution**: Continues on non-critical failures

## Future Architecture Considerations

### Planned Enhancements
1. **Distributed Agents**: Multi-machine agent deployment
2. **Plugin System**: Third-party extensions
3. **Cloud Sync**: Context synchronization
4. **API Gateway**: Unified API interface

### Scalability Path
1. **Horizontal Scaling**: Multiple agent instances
2. **Load Balancing**: Request distribution
3. **Caching Layer**: Redis/Memcached integration
4. **Queue System**: Async task processing

---

*This architecture document describes PAI version 1.0.0*