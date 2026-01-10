 kai-ollama-skill Uninstallation Plan

 Current Status: kai-ollama-skill is INSTALLED and active
 Installation Location: /home/kaishraiberg/.claude/pai/skills/Ollama/
 Hooks Active: 3 hooks registered in settings.json
 Environment Config: OLLAMA_* variables in .env

 ---
 What's Currently Installed

 1. Skill Directory

 Location: /home/kaishraiberg/.claude/pai/skills/Ollama/

 Contents:
 Ollama/
 ├── SKILL.md              # Skill definition with USE WHEN routing
 ├── QuickReference.md     # Documentation
 ├── Benchmarks.md         # Performance benchmarks
 ├── Tools/                # TypeScript executables
 │   ├── CheckHealth.ts
 │   ├── Generate.ts
 │   ├── Chat.ts
 │   ├── Embed.ts
 │   ├── ListModels.ts
 │   └── Run.ts
 └── Workflows/            # Workflow templates
     ├── CodeReview.md
     ├── Summarize.md
     └── Experiment.md

 2. Hooks Registered in settings.json

 Three hooks are active:

 1. SessionStart Hook (line 23-24 in settings.json):
 {
   "type": "command",
   "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/skills/Ollama/Tools/CheckHealth.ts"
 }
   - Purpose: Checks Ollama health at session start
   - Impact: Runs on every Claude Code session start
 2. PreToolUse Hook (line 34 in settings.json):
 {
   "type": "command",
   "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/hooks/intelligent-router.ts"
 }
   - Purpose: Intelligently routes queries to Ollama vs Claude API
   - Impact: Runs before EVERY tool use (high frequency)
   - File: /home/kaishraiberg/.claude/pai/hooks/intelligent-router.ts
 3. UserPromptSubmit Hook (line 74 in settings.json):
 {
   "type": "command",
   "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/hooks/store-prompt-context.ts"
 }
   - Purpose: Stores prompt context for intelligent routing
   - Impact: Runs on every user message
   - File: /home/kaishraiberg/.claude/pai/hooks/store-prompt-context.ts

 3. Environment Variables in .env

 Location: /home/kaishraiberg/.claude/pai/.env (lines 54-77)

 # OLLAMA LOCAL AI CONFIGURATION
 OLLAMA_BASE_URL=http://localhost:11434
 OLLAMA_TIMEOUT=30000

 # Models
 OLLAMA_DEFAULT_MODEL=deepseek-r1:7b
 OLLAMA_CHAT_MODEL=llama3.2:3b
 OLLAMA_CODE_MODEL=qwen2:7b
 OLLAMA_EMBED_MODEL=nomic-embed-text:latest

 # Features
 OLLAMA_ENABLE_ROUTING=true

 4. Temporary Files (if any)

 Potential locations:
 - /home/kaishraiberg/.claude/pai/.temp/prompt-*.json - Session prompt context

 ---
 Uninstallation Impact Assessment

 What Will Stop Working

 1. ✅ Local AI routing - All queries will go to Claude API (no local Ollama fallback)
 2. ✅ Ollama skill commands - Direct Ollama tool invocations will fail
 3. ✅ Health checks - No more Ollama health validation at session start
 4. ✅ Intelligent routing - No automatic query routing based on complexity

 What Will Keep Working

 1. ✅ All other PAI features - CORE, Agents, Prompting, History, etc.
 2. ✅ Claude Code - Normal operation unaffected
 3. ✅ Ollama binary - Ollama itself remains installed (if desired)
 4. ✅ Ollama models - Downloaded models remain available (~/.ollama/models/)

 Dependencies

 - No other packs depend on kai-ollama-skill
 - Safe to uninstall without breaking other functionality

 ---
 Uninstallation Steps

 Phase 1: Backup (Safety First)

 Create backups before any changes:

 # 1. Backup settings.json
 cp ~/.claude/settings.json ~/.claude/settings.json.backup

 # 2. Backup .env
 cp ~/.claude/pai/.env ~/.claude/pai/.env.backup

 # 3. Backup Ollama skill (optional - for reference)
 cp -r ~/.claude/pai/skills/Ollama ~/.claude/pai/skills/Ollama.backup

 Verification: Backups exist
 ls -la ~/.claude/settings.json.backup
 ls -la ~/.claude/pai/.env.backup

 ---
 Phase 2: Remove Hooks from settings.json

 Critical File: /home/kaishraiberg/.claude/settings.json

 Three edits required:

 Edit 1: Remove CheckHealth.ts from SessionStart (Line 21-24)

 REMOVE:
           {
             "type": "command",
             "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/skills/Ollama/Tools/CheckHealth.ts"
           }

 Before (lines 16-25):
           {
             "type": "command",
             "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/hooks/capture-all-events.ts --event-type SessionStart"
           },
           {
             "type": "command",
             "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/skills/Ollama/Tools/CheckHealth.ts"
           }
         ]
       }
     ],

 After (lines 16-21):
           {
             "type": "command",
             "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/hooks/capture-all-events.ts --event-type SessionStart"
           }
         ]
       }
     ],

 Edit 2: Remove intelligent-router.ts from PreToolUse (Line 28-36)

 REMOVE entire matcher block:
       {
         "matcher": "*",
         "hooks": [
           {
             "type": "command",
             "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/hooks/intelligent-router.ts"
           }
         ]
       },

 Before (lines 28-47):
     "PreToolUse": [
       {
         "matcher": "*",
         "hooks": [
           {
             "type": "command",
             "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/hooks/intelligent-router.ts"
           }
         ]
       },
       {
         "matcher": "Bash",
         "hooks": [
           {
             "type": "command",
             "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/hooks/security-validator.ts"
           }
         ]
       },

 After (lines 28-38):
     "PreToolUse": [
       {
         "matcher": "Bash",
         "hooks": [
           {
             "type": "command",
             "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/hooks/security-validator.ts"
           }
         ]
       },

 Edit 3: Remove store-prompt-context.ts from UserPromptSubmit (Line 71-74)

 REMOVE:
           {
             "type": "command",
             "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/hooks/store-prompt-context.ts"
           },

 Before (lines 71-83):
         "hooks": [
           {
             "type": "command",
             "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/hooks/store-prompt-context.ts"
           },
           {
             "type": "command",
             "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/hooks/update-tab-titles.ts"
           },
           {
             "type": "command",
             "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/hooks/capture-all-events.ts --event-type UserPromptSubmit"
           }
         ]

 After (lines 71-79):
         "hooks": [
           {
             "type": "command",
             "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/hooks/update-tab-titles.ts"
           },
           {
             "type": "command",
             "command": "/home/kaishraiberg/.bun/bin/bun run $PAI_DIR/hooks/capture-all-events.ts --event-type UserPromptSubmit"
           }
         ]

 Verification: Validate JSON syntax
 cat ~/.claude/settings.json | jq . > /dev/null && echo "✓ Valid JSON" || echo "✗ Invalid JSON"

 ---
 Phase 3: Remove Environment Variables from .env

 Critical File: /home/kaishraiberg/.claude/pai/.env

 REMOVE lines 54-77:

 # OLLAMA LOCAL AI CONFIGURATION
 # ============================================================================
 # Server configuration for Ollama
 OLLAMA_BASE_URL=http://localhost:11434
 OLLAMA_TIMEOUT=30000

 # Default models for different tasks
 OLLAMA_DEFAULT_MODEL=deepseek-r1:7b

 # Specific model assignments
 OLLAMA_CHAT_MODEL=llama3.2:3b

 # Code-related model
 OLLAMA_CODE_MODEL=qwen2:7b

 # Embedding model
 OLLAMA_EMBED_MODEL=nomic-embed-text:latest

 # Feature flags
 OLLAMA_ENABLE_ROUTING=true

 Recommended approach:
 # Use Edit tool to remove lines 54-77 from .env
 # OR manually edit with nano/vim

 Verification: Check no OLLAMA variables remain
 grep "OLLAMA" ~/.claude/pai/.env
 # Should return no results

 ---
 Phase 4: Remove Hook Files

 Delete Ollama-specific hooks:

 # 1. Remove intelligent-router.ts
 rm -f ~/.claude/pai/hooks/intelligent-router.ts

 # 2. Remove store-prompt-context.ts
 rm -f ~/.claude/pai/hooks/store-prompt-context.ts

 Verification: Files deleted
 ls ~/.claude/pai/hooks/intelligent-router.ts 2>&1 | grep "No such file"
 ls ~/.claude/pai/hooks/store-prompt-context.ts 2>&1 | grep "No such file"

 ---
 Phase 5: Remove Skill Directory

 Delete the entire Ollama skill:

 rm -rf ~/.claude/pai/skills/Ollama

 Verification: Directory deleted
 ls ~/.claude/pai/skills/Ollama 2>&1 | grep "No such file"

 ---
 Phase 6: Clean Temporary Files

 Remove session context files (if any):

 # Check for temporary prompt context files
 ls ~/.claude/pai/.temp/prompt-*.json 2>/dev/null

 # Remove if found
 rm -f ~/.claude/pai/.temp/prompt-*.json

 ---
 Phase 7: Restart Claude Code

 Required for changes to take effect:

 # Exit all Claude Code sessions
 # Then restart:
 claude

 Verification: Check session starts without errors
 - No errors about missing CheckHealth.ts
 - No errors about intelligent-router.ts
 - Session initializes normally

 ---
 Post-Uninstallation Verification

 Checklist

 # 1. Skill directory removed
 [ ! -d ~/.claude/pai/skills/Ollama ] && echo "✓ Skill directory removed" || echo "✗ Still exists"

 # 2. Hook files removed
 [ ! -f ~/.claude/pai/hooks/intelligent-router.ts ] && echo "✓ Router hook removed" || echo "✗ Still exists"
 [ ! -f ~/.claude/pai/hooks/store-prompt-context.ts ] && echo "✓ Context hook removed" || echo "✗ Still exists"

 # 3. Environment variables removed
 ! grep -q "OLLAMA" ~/.claude/pai/.env && echo "✓ OLLAMA vars removed" || echo "✗ Still present"

 # 4. settings.json valid
 cat ~/.claude/settings.json | jq . > /dev/null && echo "✓ Valid JSON" || echo "✗ Invalid JSON"

 # 5. No CheckHealth.ts reference
 ! grep -q "CheckHealth.ts" ~/.claude/settings.json && echo "✓ CheckHealth removed" || echo "✗ Still referenced"

 # 6. No intelligent-router.ts reference
 ! grep -q "intelligent-router.ts" ~/.claude/settings.json && echo "✓ Router removed" || echo "✗ Still referenced"

 # 7. No store-prompt-context.ts reference
 ! grep -q "store-prompt-context.ts" ~/.claude/settings.json && echo "✓ Context store removed" || echo "✗ Still referenced"

 Test PAI Functionality

 # Start new Claude Code session
 claude

 # Check:
 # - Session starts without errors
 # - CORE skill loads (you see PAI Context loaded message)
 # - Other skills work (try "Create custom agents")
 # - No Ollama-related errors

 ---
 What About Ollama Itself?

 Ollama Binary & Models (Separate)

 The kai-ollama-skill uninstallation does NOT remove:

 1. Ollama binary - The Ollama application itself
   - Location: /usr/local/bin/ollama or via Homebrew
   - Still functional for direct use: ollama run llama3.2
 2. Ollama models - Downloaded models (~/.ollama/models/)
   - Location: ~/.ollama/models/ (or custom OLLAMA_MODELS path)
   - Size: 2-20GB each (deepseek-r1:7b, llama3.2:3b, qwen2:7b, nomic-embed-text)
   - Still available for direct Ollama CLI use

 To Keep Ollama (Recommended)

 # Ollama continues to work independently
 ollama list               # See installed models
 ollama run llama3.2       # Use models directly
 ollama serve              # Run server for other tools

 To Remove Ollama Completely (Optional)

 If you want to uninstall Ollama itself:

 # 1. Stop Ollama service
 systemctl --user stop ollama   # Linux
 # OR just quit the app on macOS

 # 2. Remove Ollama binary
 brew uninstall ollama          # macOS
 # OR
 sudo rm -rf /usr/local/bin/ollama   # Linux

 # 3. Remove models (optional - large disk space)
 rm -rf ~/.ollama/models/       # ⚠️ Deletes all downloaded models

 Disk space reclaimed:
 - deepseek-r1:7b: ~4.4GB
 - llama3.2:3b: ~2GB
 - qwen2:7b: ~4.4GB
 - nomic-embed-text: ~274MB
 - Total: ~11GB

 ---
 Rollback Plan (If Issues Arise)

 If Uninstallation Causes Problems

 Restore from backups:

 # 1. Restore settings.json
 cp ~/.claude/settings.json.backup ~/.claude/settings.json

 # 2. Restore .env
 cp ~/.claude/pai/.env.backup ~/.claude/pai/.env

 # 3. Restore skill directory (if backed up)
 cp -r ~/.claude/pai/skills/Ollama.backup ~/.claude/pai/skills/Ollama

 # 4. Reinstall hooks (if deleted)
 # Refer to Packs/kai-ollama-skill/INSTALL.md

 ---
 Execution Order Summary

 Safe uninstallation sequence:

 1. ✅ Backup (settings.json, .env, skill directory)
 2. ✅ Edit settings.json (remove 3 hook references)
 3. ✅ Validate JSON (ensure no syntax errors)
 4. ✅ Edit .env (remove OLLAMA_* variables)
 5. ✅ Delete hook files (intelligent-router.ts, store-prompt-context.ts)
 6. ✅ Delete skill directory (rm -rf Ollama/)
 7. ✅ Clean temp files (prompt-*.json)
 8. ✅ Restart Claude Code (apply changes)
 9. ✅ Verify (run checklist, test functionality)

 Total time: ~10-15 minutes

 ---
 Critical Files Reference
 ┌──────────────────────────────────────────────────────────────┬──────────────────────────────┬───────────────────────────┐
 │                             File                             │            Action            │       Line Numbers        │
 ├──────────────────────────────────────────────────────────────┼──────────────────────────────┼───────────────────────────┤
 │ /home/kaishraiberg/.claude/settings.json                     │ Edit (remove 3 hooks)        │ Lines 21-24, 28-36, 71-74 │
 ├──────────────────────────────────────────────────────────────┼──────────────────────────────┼───────────────────────────┤
 │ /home/kaishraiberg/.claude/pai/.env                          │ Edit (remove OLLAMA section) │ Lines 54-77               │
 ├──────────────────────────────────────────────────────────────┼──────────────────────────────┼───────────────────────────┤
 │ /home/kaishraiberg/.claude/pai/hooks/intelligent-router.ts   │ Delete                       │ N/A                       │
 ├──────────────────────────────────────────────────────────────┼──────────────────────────────┼───────────────────────────┤
 │ /home/kaishraiberg/.claude/pai/hooks/store-prompt-context.ts │ Delete                       │ N/A                       │
 ├──────────────────────────────────────────────────────────────┼──────────────────────────────┼───────────────────────────┤
 │ /home/kaishraiberg/.claude/pai/skills/Ollama/                │ Delete directory             │ N/A                       │
 └──────────────────────────────────────────────────────────────┴──────────────────────────────┴───────────────────────────┘
 ---
 Risk Assessment
 ┌───────────────────────────────┬───────────────────────────┬────────────┬─────────────────────────────────┐
 │             Risk              │          Impact           │ Likelihood │           Mitigation            │
 ├───────────────────────────────┼───────────────────────────┼────────────┼─────────────────────────────────┤
 │ Invalid JSON in settings.json │ HIGH (breaks Claude Code) │ LOW        │ Validate with jq before restart │
 ├───────────────────────────────┼───────────────────────────┼────────────┼─────────────────────────────────┤
 │ Other hooks stop working      │ MEDIUM                    │ VERY LOW   │ Only Ollama hooks removed       │
 ├───────────────────────────────┼───────────────────────────┼────────────┼─────────────────────────────────┤
 │ Lost configuration            │ LOW                       │ LOW        │ Backups created first           │
 ├───────────────────────────────┼───────────────────────────┼────────────┼─────────────────────────────────┤
 │ Ollama binary removed         │ LOW                       │ NONE       │ Binary separate from skill      │
 └───────────────────────────────┴───────────────────────────┴────────────┴─────────────────────────────────┘
 ---
 Questions Before Proceeding

 1. Preserve Ollama binary? Do you want to keep Ollama installed for direct CLI use?
 2. Preserve models? Keep downloaded models (~11GB) or delete for disk space?
 3. Backup location? Use default (~/.claude/*.backup) or custom location?
 4. Immediate execution? Uninstall now or plan for later?
 5. Other packs? Any other packs you want to uninstall at same time?
