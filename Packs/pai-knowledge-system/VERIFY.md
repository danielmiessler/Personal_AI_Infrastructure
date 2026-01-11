# PAI Knowledge System - Verification Checklist

Mandatory verification checklist for the Knowledge pack installation.

**Use this checklist to verify that your installation is complete and functional.**

> **FOR AI AGENTS:** This checklist MUST be completed after installation. Follow these rules:
> 1. **Run EVERY check** - Do not skip any verification step
> 2. **Mark each item PASS or FAIL** - Keep track of results
> 3. **Stop on failures** - If a section fails, troubleshoot before continuing
> 4. **All sections must pass** - Installation is NOT complete until all checks pass
> 5. **Report failures clearly** - Tell the user which specific checks failed

---

## Verification Overview

This checklist ensures:
- All components are installed
- System is properly configured
- All integrations are working
- End-to-end functionality is operational

**Run through each section in order. Mark items as PASS or FAIL.**

---

## Section 1: Directory Structure Verification

Verify all required files and directories are present.

### 1.1 Pack Root Files

- [ ] **README.md** exists in pack root
- [ ] **INSTALL.md** exists in pack root
- [ ] **VERIFY.md** exists in pack root (this file)
- [ ] **package.json** exists in pack root

**Verification commands:**
```bash
cd /path/to/pai-knowledge-system
ls -la README.md INSTALL.md VERIFY.md package.json
```

**Expected result:** All four files listed

---

### 1.1b Skill Root Files (src/skills/)

- [ ] **SKILL.md** exists in src/skills/
- [ ] **STANDARDS.md** exists in src/skills/ (usage standards)

**Verification commands:**
```bash
ls -la src/skills/SKILL.md src/skills/STANDARDS.md
```

**Expected result:** Both skill definition files listed

---

### 1.2 Source Directory Structure

- [ ] **src/skills/workflows/** directory exists
- [ ] **src/skills/tools/** directory exists
- [ ] **src/server/** directory exists
- [ ] **src/hooks/** directory exists
- [ ] **config/** directory exists

**Verification commands:**
```bash
ls -la src/skills/workflows/
ls -la src/skills/tools/
ls -la src/server/
ls -la src/hooks/
ls -la config/
```

**Expected result:** Directories exist with workflow, tool, server, and hook files

---

### 1.3 Workflow Files

All required workflows must be present:

- [ ] `CaptureEpisode.md` - Add knowledge to graph
- [ ] `SearchKnowledge.md` - Search entities and summaries
- [ ] `SearchFacts.md` - Find relationships
- [ ] `GetRecent.md` - Retrieve recent knowledge
- [ ] `GetStatus.md` - Check system health
- [ ] `ClearGraph.md` - Delete all knowledge
- [ ] `BulkImport.md` - Import multiple documents

**Verification commands:**
```bash
ls -1 src/skills/workflows/
```

**Expected result:** All 7 workflow files listed

---

### 1.4 Skill Tool Files

Required tool files in `src/skills/tools/` (installed with skill):

- [ ] `Install.md` - Installation workflow (triggered by skill)
- [ ] `README.md` - Tools documentation
- [ ] `start.ts` - Start containers
- [ ] `stop.ts` - Stop containers
- [ ] `status.ts` - Show container status
- [ ] `logs.ts` - View container logs

**Verification commands:**
```bash
ls -1 src/skills/tools/
```

**Expected result:** Install.md, README.md, logs.ts, start.ts, status.ts, stop.ts

---

### 1.5 Skill Library Files

Required shared library in `src/skills/lib/` (installed with skill):

- [ ] `cli.ts` - CLI output utilities
- [ ] `container.ts` - Container management

**Verification commands:**
```bash
ls -1 src/skills/lib/
```

**Expected result:** cli.ts, container.ts

---

### 1.6 Server Infrastructure Files

Pack-level files in `src/server/` (not installed with skill):

- [ ] `run.ts` - Initial setup script
- [ ] `install.ts` - Interactive installation wizard
- [ ] `diagnose.ts` - Diagnostic and troubleshooting tool
- [ ] `mcp-wrapper.ts` - MCP protocol wrapper
- [ ] `podman-compose.yml` - Podman compose file
- [ ] `docker-compose.yml` - Docker compose file
- [ ] `lib/` - Full library (cli, config, container, mcp-client)

**Verification commands:**
```bash
ls -la src/server/
ls -la src/server/lib/
```

**Expected result:** run.ts, install.ts, diagnose.ts, mcp-wrapper.ts, compose files, and lib/ directory

---

### 1.7 Configuration Files

- [ ] `config/.env.example` exists
- [ ] `config/.mcp.json` exists
- [ ] Environment variables use `PAI_KNOWLEDGE_*` prefix

**Verification commands:**
```bash
ls -la config/
grep "PAI_KNOWLEDGE_" config/.env.example | head -5
```

**Expected result:** Config files exist with PAI_KNOWLEDGE_ prefixed variables

---

### 1.8 Hook Files

- [ ] `src/hooks/sync-history-to-knowledge.ts` exists
- [ ] `src/hooks/lib/` directory exists with support files

**Verification commands:**
```bash
ls -la src/hooks/
ls -la src/hooks/lib/
```

**Expected result:** Hook script and lib directory with frontmatter-parser.ts, knowledge-client.ts, lucene.ts, sync-state.ts

---

## Section 2: MCP Server Verification

> **FOR AI AGENTS:** This section verifies the MCP server is operational. ALL checks must pass.
> If server is not running, go back to INSTALL.md Step 3 and start the server.

Verify the Graphiti MCP server is running and accessible.

### 2.1 Container Status

- [ ] **Container is running**

**Verification commands:**
```bash
# For Podman
podman ps | grep pai-knowledge

# For Docker
docker ps | grep pai-knowledge

# Or use the status script
bun run src/skills/tools/status.ts
```

**Expected result:** Containers `pai-knowledge-graph-mcp` and `pai-knowledge-falkordb` listed with status "Up"

---

### 2.2 MCP SSE Endpoint Access

- [ ] **MCP SSE endpoint is accessible and returns session**

**Verification commands:**
```bash
curl -s http://localhost:8000/sse --max-time 2
```

**Expected result:** SSE event with session endpoint, e.g.:
```
event: endpoint
data: /messages/?session_id=<session-id>
```

This confirms the MCP server is running and accepting connections.

---

### 2.3 FalkorDB Connection

- [ ] **FalkorDB is responding**

**Verification commands:**
```bash
# For Podman
podman exec pai-knowledge-falkordb redis-cli -p 6379 PING

# For Docker
docker exec pai-knowledge-falkordb redis-cli -p 6379 PING
```

**Expected result:** `PONG`

---

### 2.4 FalkorDB UI Access

- [ ] **FalkorDB web UI is accessible on port 3000**

**Verification commands:**
```bash
# Check if port 3000 is listening
lsof -i :3000 | grep -i listen

# Or test HTTP response
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

**Expected result:** Port 3000 shows listening process, HTTP returns 200 or 302

**Browser verification:**
1. Open http://localhost:3000 in your browser
2. FalkorDB Browser interface should load
3. Connect using Host: `localhost`, Port: `6379`

---

### 2.5 Server Logs (No Errors)

- [ ] **No critical errors in logs**

**Verification commands:**
```bash
bun run src/skills/tools/logs.ts 2>&1 | grep -i "error\|critical\|fatal" | head -10
```

**Expected result:** No output (or only warnings, not errors)

---

## Section 3: PAI Skill Verification

Verify the PAI skill is properly installed and formatted.

### 3.1 Skill Installation

- [ ] **Skill directory exists in PAI installation**

**Verification commands:**
```bash
# Check standard location
ls -la ~/.claude/skills/Knowledge/

# Or if using custom PAI_DIR
ls -la ${PAI_DIR:-$HOME/.claude}/skills/Knowledge/
```

**Expected result:** Directory exists with SKILL.md, STANDARDS.md, workflows/, tools/

---

### 3.2 Installed Skill Structure

The installed skill is a copy of `src/skills/` directory:

- [ ] `Knowledge/SKILL.md` exists
- [ ] `Knowledge/STANDARDS.md` exists
- [ ] `Knowledge/workflows/` directory exists with 7 workflow files
- [ ] `Knowledge/tools/` directory exists with management scripts
- [ ] `Knowledge/lib/` directory exists with shared utilities

**Verification commands:**
```bash
PAI_SKILLS="${PAI_DIR:-$HOME/.claude}/skills"
ls -la "$PAI_SKILLS/Knowledge/"
ls -la "$PAI_SKILLS/Knowledge/workflows/"
ls -la "$PAI_SKILLS/Knowledge/tools/"
ls -la "$PAI_SKILLS/Knowledge/lib/"
```

**Expected result:** Structure matches `src/skills/` with SKILL.md, STANDARDS.md, workflows/, tools/, lib/

---

### 3.3 SKILL.md Frontmatter

- [ ] **SKILL.md has valid YAML frontmatter**
- [ ] **Frontmatter contains 'name' field**
- [ ] **Frontmatter contains 'description' field**
- [ ] **Description includes 'USE WHEN' clause**

**Verification commands:**
```bash
head -10 ~/.claude/skills/Knowledge/SKILL.md
```

**Expected result:** YAML frontmatter with name and description containing "USE WHEN"

---

### 3.4 Workflow Routing Table

- [ ] **SKILL.md contains workflow routing table**
- [ ] **All 7 workflows are listed in table**
- [ ] **Each workflow has trigger phrases**

**Verification commands:**
```bash
grep -A 20 "## Workflow Routing" ~/.claude/skills/Knowledge/SKILL.md
```

**Expected result:** Table with workflows and their triggers

---

### 3.5 Workflow Files Accessible

- [ ] **All workflow files are readable**
- [ ] **Workflow files have proper titles**
- [ ] **Workflow files follow PAI conventions**

**Verification commands:**
```bash
for file in ~/.claude/skills/Knowledge/workflows/*.md; do
    echo "Checking: $file"
    head -5 "$file"
done
```

**Expected result:** All files are readable with markdown headers

---

## Section 4: Configuration Verification

Verify all configuration is correct.

### 4.1 Pack Environment Variables

Check the pack's local configuration:

- [ ] `config/.env.example` exists with documented variables
- [ ] Variables use `PAI_KNOWLEDGE_*` prefix

**Verification commands:**
```bash
grep "^PAI_KNOWLEDGE_" config/.env.example
```

**Expected result:** Variables like PAI_KNOWLEDGE_OPENAI_API_KEY, PAI_KNOWLEDGE_MODEL_NAME, etc.

---

### 4.2 PAI Global Configuration

Check PAI's global .env for required variables:

- [ ] **API key is set** (OPENAI_API_KEY or PAI_KNOWLEDGE_OPENAI_API_KEY)
- [ ] **LLM provider is configured**

**Verification commands:**
```bash
PAI_ENV="${PAI_DIR:-$HOME/.claude}/.env"
if [ -f "$PAI_ENV" ]; then
    echo "Checking: $PAI_ENV"
    grep -E "(OPENAI_API_KEY|PAI_KNOWLEDGE_)" "$PAI_ENV" | grep -v "^#" | sed 's/=.*/=<SET>/'
else
    echo "PAI .env not found at: $PAI_ENV"
fi
```

**Expected result:** API key shows as SET (value hidden)

---

### 4.3 MCP Server Configuration

- [ ] **MCP server configured in ~/.claude.json**
- [ ] **pai-knowledge server entry exists**
- [ ] **SSE transport configured**

**Verification commands:**
```bash
if [ -f ~/.claude.json ]; then
    grep -A 5 "pai-knowledge" ~/.claude.json
else
    echo "~/.claude.json not found"
fi
```

**Expected result:**
```json
"pai-knowledge": {
  "type": "sse",
  "url": "http://localhost:8000/sse"
}
```

---

### 4.4 Port Availability

- [ ] **Port 8000 is available** (or MCP server is listening)
- [ ] **Port 3000 is available** (or FalkorDB UI is listening)
- [ ] **Port 6379 is internal** (FalkorDB on container network)

**Verification commands:**
```bash
# Check MCP server port
lsof -i :8000

# Check FalkorDB UI port
lsof -i :3000
```

**Expected result:** Either no output (port available) or pai-knowledge process listed (using port)

---

## Section 5: End-to-End Functionality

> **FOR AI AGENTS:** This is the CRITICAL verification section. It tests actual knowledge operations.
> ALL tests MUST pass for the installation to be considered complete.
> If any test fails, the knowledge system is NOT functional - troubleshoot before proceeding.

Verify the complete system works end-to-end using the actual MCP tools.

### 5.1 Knowledge Capture (add_memory)

- [ ] **Can capture knowledge to graph**

**Verification commands:**
```bash
curl -s -X POST http://localhost:8000/mcp/ \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc":"2.0",
        "id":1,
        "method":"tools/call",
        "params":{
            "name":"add_memory",
            "arguments":{
                "name":"PAI Verification Test",
                "episode_body":"PAI Knowledge System verification test completed successfully.",
                "source":"text",
                "source_description":"verification test"
            }
        }
    }' | head -20
```

**Expected result:** JSON response with success indication, no errors

---

### 5.2 Knowledge Search (search_memory_nodes)

- [ ] **Can search knowledge graph nodes**

**Verification commands:**
```bash
curl -s -X POST http://localhost:8000/mcp/ \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc":"2.0",
        "id":2,
        "method":"tools/call",
        "params":{
            "name":"search_memory_nodes",
            "arguments":{
                "query":"PAI Knowledge System",
                "max_nodes":5
            }
        }
    }' | head -20
```

**Expected result:** JSON response with search results (may be empty if graph is new)

---

### 5.3 Relationship Search (search_memory_facts)

- [ ] **Can search relationships/facts**

**Verification commands:**
```bash
curl -s -X POST http://localhost:8000/mcp/ \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc":"2.0",
        "id":3,
        "method":"tools/call",
        "params":{
            "name":"search_memory_facts",
            "arguments":{
                "query":"PAI",
                "max_facts":5
            }
        }
    }' | head -20
```

**Expected result:** JSON response with facts/relationships (may be empty if graph is new)

---

### 5.4 Recent Episodes (get_episodes)

- [ ] **Can retrieve recent episodes**

**Verification commands:**
```bash
curl -s -X POST http://localhost:8000/mcp/ \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc":"2.0",
        "id":4,
        "method":"tools/call",
        "params":{
            "name":"get_episodes",
            "arguments":{
                "last_n":5
            }
        }
    }' | head -20
```

**Expected result:** JSON array with episodes (includes test episode from 5.1)

---

## Section 6: Lucene Query Sanitization

> **FOR AI AGENTS:** This section verifies that hyphenated group_ids work correctly with RediSearch queries.
> This is critical for preventing syntax errors when using hyphenated identifiers.

Verify that Lucene query sanitization handles special characters correctly.

### 6.1 Hyphenated Group ID Capture

- [ ] **Can capture knowledge with hyphenated group_id**

**Verification commands:**
```bash
curl -s -X POST http://localhost:8000/mcp/ \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc":"2.0",
        "id":5,
        "method":"tools/call",
        "params":{
            "name":"add_memory",
            "arguments":{
                "name":"Lucene Sanitization Test",
                "episode_body":"Testing Lucene query sanitization with hyphenated group_id",
                "source":"text",
                "source_description":"lucene test",
                "group_id":"test-group-123"
            }
        }
    }' | head -20
```

**Expected result:** JSON response with success indication, no RediSearch syntax errors

**Success indicators:**
- Response contains episode UUID
- No "Syntax error" in response
- No "Query syntax error" in server logs

---

### 6.2 Search with Hyphenated Group ID

- [ ] **Can search knowledge using hyphenated group_id**

**Verification commands:**
```bash
curl -s -X POST http://localhost:8000/mcp/ \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc":"2.0",
        "id":6,
        "method":"tools/call",
        "params":{
            "name":"search_memory_nodes",
            "arguments":{
                "query":"lucene sanitization",
                "max_nodes":5,
                "group_id":"test-group-123"
            }
        }
    }' | head -20
```

**Expected result:** JSON response with search results, no query syntax errors

**Success indicators:**
- Response contains nodes array
- No "Syntax error" in response
- No "Query syntax error" in server logs
- Results include the test episode from 6.1

---

### 6.3 Verify No RediSearch Syntax Errors

- [ ] **Server logs show no RediSearch syntax errors**

**Verification commands:**
```bash
# Check recent logs for syntax errors
bun run src/skills/tools/logs.ts 2>&1 | grep -i "syntax error" | tail -10

# Or check container logs directly
podman logs pai-knowledge-graph-mcp 2>&1 | grep -i "syntax error" | tail -10

# For Docker
docker logs pai-knowledge-graph-mcp 2>&1 | grep -i "syntax error" | tail -10
```

**Expected result:** No output (no syntax errors)

---

### 6.4 Multiple Hyphens in Group ID

- [ ] **Can handle multiple consecutive hyphens in group_id**

**Verification commands:**
```bash
curl -s -X POST http://localhost:8000/mcp/ \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc":"2.0",
        "id":7,
        "method":"tools/call",
        "params":{
            "name":"add_memory",
            "arguments":{
                "name":"Multiple Hyphen Test",
                "episode_body":"Testing multiple hyphens in group_id",
                "source":"text",
                "source_description":"hyphen test",
                "group_id":"test--multiple---hyphens"
            }
        }
    }' | head -20
```

**Expected result:** JSON response with success indication, no errors

---

### 6.5 Special Characters in Group ID

- [ ] **Can handle various special characters in group_id**

**Verification commands:**
```bash
curl -s -X POST http://localhost:8000/mcp/ \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc":"2.0",
        "id":8,
        "method":"tools/call",
        "params":{
            "name":"Special Character Test",
            "episode_body":"Testing special characters in group_id",
            "source":"text",
            "source_description":"special char test",
                "group_id":"test_group_123"
            }
        }
    }' | head -20
```

**Expected result:** JSON response with success indication, no query syntax errors

---

## Section 7: Integration Verification

Verify integration with PAI system and Claude Code.

### 7.1 PAI Skill Recognition

- [ ] **Claude Code recognizes the skill**

**Verification:**
1. Restart Claude Code
2. In Claude Code, type: `What is the PAI Knowledge System?`
3. Check if Claude mentions the skill

**Expected result:** Claude is aware of the PAI Knowledge System skill

---

### 7.2 Workflow Invocation

- [ ] **Workflows can be invoked via natural language**

**Verification:**
In Claude Code, try each trigger phrase:

1. "Show the knowledge graph status" → Should invoke GetStatus
2. "Remember that this is a test" → Should invoke CaptureEpisode
3. "What do I know about PAI?" → Should invoke SearchKnowledge

**Expected result:** Claude Code follows the workflow instructions

---

### 7.3 MCP Tool Access

- [ ] **Claude Code can access MCP tools**

**Verification:**
In Claude Code, the workflows reference MCP server tools. If workflows execute successfully, MCP integration is working.

Check that these tools are available:
- `mcp__pai-knowledge__add_memory`
- `mcp__pai-knowledge__search_memory_nodes`
- `mcp__pai-knowledge__search_memory_facts`
- `mcp__pai-knowledge__get_episodes`
- `mcp__pai-knowledge__clear_graph`

**Expected result:** Workflows complete without MCP connection errors

---

## Section 8: History Sync Hook Verification

Verify the history sync hook is properly installed (if using pai-history-system).

### 8.1 Hook Files Installed

- [ ] **Hook script exists in PAI hooks directory**
- [ ] **Hook lib files exist**

**Verification commands:**
```bash
PAI_HOOKS="${PAI_DIR:-$HOME/.claude}/hooks"
ls -la "$PAI_HOOKS/"
ls -la "$PAI_HOOKS/lib/"
```

**Expected result:** sync-history-to-knowledge.ts and lib/ directory with:
- frontmatter-parser.ts
- knowledge-client.ts
- lucene.ts (Lucene query sanitization for hyphenated group_ids)
- sync-state.ts

---

### 8.2 Hook Registered

- [ ] **Hook is registered in settings.json**

**Verification commands:**
```bash
PAI_SETTINGS="${PAI_DIR:-$HOME/.claude}/settings.json"
if [ -f "$PAI_SETTINGS" ]; then
    grep "sync-history-to-knowledge" "$PAI_SETTINGS"
else
    echo "settings.json not found"
fi
```

**Expected result:** Hook command found in SessionStart hooks

---

### 8.3 Sync State Directory

- [ ] **Sync state directory exists**

**Verification commands:**
```bash
HISTORY_DIR="${PAI_DIR:-$HOME/.claude}/history"
ls -la "$HISTORY_DIR/.synced/" 2>/dev/null || echo "Sync state directory not yet created (will be created on first sync)"
```

**Expected result:** Directory exists or will be created on first sync

---

### 8.4 Hook Dry Run

- [ ] **Hook runs without errors in dry-run mode**

**Verification commands:**
```bash
cd /path/to/pai-knowledge-system
bun run src/hooks/sync-history-to-knowledge.ts --dry-run --verbose
```

**Expected result:** Hook completes without errors, shows what would be synced

---

## Section 9: Documentation Verification

Verify all documentation is complete and accurate.

### 9.1 README.md Completeness

- [ ] **README.md has all required sections**
- [ ] **README.md has proper YAML frontmatter**
- [ ] **Architecture diagrams are present**
- [ ] **Example usage is documented**

**Verification commands:**
```bash
grep "^##" README.md | head -20
head -35 README.md | grep "^---"
```

**Expected result:** All major sections listed, frontmatter present

---

### 9.2 INSTALL.md Completeness

- [ ] **INSTALL.md has pre-installation analysis**
- [ ] **INSTALL.md has step-by-step instructions**
- [ ] **INSTALL.md has troubleshooting section**
- [ ] **INSTALL.md references TypeScript files (not .sh)**

**Verification commands:**
```bash
grep "^##" INSTALL.md
grep "bun run" INSTALL.md | head -5
```

**Expected result:** Sections for Prerequisites, Pre-Installation, Steps, Troubleshooting; uses `bun run` commands

---

### 9.3 Workflow Documentation

- [ ] **Each workflow has clear purpose**
- [ ] **Each workflow has usage examples**
- [ ] **Each workflow has MCP tool references**

**Verification:**
Open and review each workflow file in `src/skills/workflows/`

**Expected result:** All workflows are well-documented

---

## Section 10: End-to-End Completeness

Verify the pack has no missing components (Template Requirement).

### 10.1 Chain Test

**The Chain Test:** Trace every data flow to ensure no "beyond scope" gaps.

**Data Flow 1: User Input → Knowledge Graph**
- [ ] User triggers skill (Claude Code)
- [ ] Workflow executes (SKILL.md routing)
- [ ] MCP server receives request (HTTP to localhost:8000)
- [ ] Graphiti processes episode (LLM extraction)
- [ ] FalkorDB stores data (graph persistence)

**Verification:** All components are included in pack

---

**Data Flow 2: Knowledge Graph → User Output**
- [ ] User searches knowledge (Claude Code)
- [ ] Workflow executes (SearchKnowledge)
- [ ] MCP server receives request (HTTP)
- [ ] Graphiti searches graph (vector embeddings)
- [ ] FalkorDB returns results (graph query)
- [ ] Results formatted and returned (workflow output)

**Verification:** All components are included in pack

---

### 10.2 No "Beyond Scope" Statements

- [ ] **README has no "beyond scope" statements**
- [ ] **INSTALL has no "implement your own" statements**
- [ ] **All referenced components are included**

**Verification commands:**
```bash
grep -i "beyond.*scope\|implement.*your.*own\|left as.*exercise" \
    README.md \
    INSTALL.md
```

**Expected result:** No matches (all components are included)

---

### 10.3 Complete Component List

- [ ] **MCP Server included** (`src/server/run.ts` and compose files)
- [ ] **PAI Skill included** (`SKILL.md` with workflows)
- [ ] **Workflows included** (7 complete workflows in `src/skills/workflows/`)
- [ ] **Skill tools included** (start.ts, stop.ts, status.ts, logs.ts in `src/skills/tools/`)
- [ ] **Pack tools included** (install.ts, diagnose.ts in `src/server/`)
- [ ] **Hooks included** (sync-history-to-knowledge.ts in `src/hooks/`)
- [ ] **Installation included** (`INSTALL.md` with all steps)
- [ ] **Configuration included** (`config/.env.example` with all variables)
- [ ] **Documentation included** (README, INSTALL, VERIFY)
- [ ] **Tests included** (`tests/` directory with unit and integration tests)
- [ ] **No external dependencies** beyond documented prerequisites

**Verification:** Manual review of pack contents

---

## Section 11: Optional Verification

Optional but recommended checks.

### 11.1 Performance Test

- [ ] **Knowledge capture completes in < 30 seconds**
- [ ] **Search completes in < 10 seconds**
- [ ] **Server responds to health check in < 1 second**

**Verification:**
```bash
time curl -s http://localhost:8000/health
```

---

### 11.2 Data Persistence

- [ ] **Knowledge persists across container restarts**

**Verification:**
1. Add test knowledge
2. Restart containers: `bun run src/skills/tools/stop.ts && bun run src/skills/tools/start.ts`
3. Search for test knowledge
4. Verify it's still there

---

### 11.3 Error Handling

- [ ] **Invalid API key returns clear error**
- [ ] **Server unavailable handled gracefully in workflows**
- [ ] **Empty search results handled gracefully**

**Verification:**
Test error scenarios and verify helpful error messages

---

### 11.4 Run Tests

- [ ] **Unit tests pass**
- [ ] **Integration tests pass**

**Verification commands:**
```bash
cd /path/to/pai-knowledge-system
bun test
```

**Expected result:** All tests pass

---

## Verification Summary

> **FOR AI AGENTS:** Review this summary to confirm installation success.
> - ALL "Critical" items MUST pass - no exceptions
> - Report the final status clearly to the user
> - If any critical item fails, installation is NOT complete

### Pass Criteria

For a successful installation, you must have:

**Critical (ALL must pass):**
- All files in correct locations (Section 1)
- MCP server running and accessible (Section 2)
- PAI skill installed with flat structure (Section 3)
- Configuration complete with valid API key (Section 4)
- End-to-end functionality working (Section 5)
- Lucene query sanitization working (Section 6)
- MCP configured in ~/.claude.json (Section 4.3)
- No "beyond scope" gaps (Section 10)

**Important (at least 80% pass):**
- Integration with Claude Code (Section 7)
- History sync hook installed (Section 8) - if using pai-history-system
- Documentation complete (Section 9)

### Failure Actions

If any critical item fails:

1. **Review logs:** `bun run src/skills/tools/logs.ts`
2. **Check configuration:** Verify `config/.env.example` is properly configured
3. **Re-run installation:** Follow `INSTALL.md` steps again
4. **Check troubleshooting:** Review troubleshooting section in `INSTALL.md`
5. **Run diagnostics:** `bun run src/server/diagnose.ts`

### Final Verification

Once all checks pass:

- [ ] **Create a test episode** in Claude Code: "Remember that I've successfully installed the PAI Knowledge System"
- [ ] **Search for it**: "What do I know about the PAI Knowledge System installation?"
- [ ] **Verify it's returned**: The search should find your test episode

**If all three steps work, your installation is complete and verified!**

---

**Verification completed:** _______________

**Verified by:** _______________

**Result:** PASS / FAIL

---

**Next Steps:**
- If PASS: Start using the PAI Knowledge System!
- If FAIL: Review failed items, re-install as needed, and re-verify
