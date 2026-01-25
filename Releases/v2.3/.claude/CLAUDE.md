# PAI (Personal AI Infrastructure)

## For Claude Code

When you start in this directory, determine the installation state:

### If settings.json exists and is configured:
This is an established PAI installation. Read and follow the CORE skill:
```
read skills/CORE/SKILL.md
```

### If principal.name is "User" (default):
This is a fresh installation. Guide them through setup using the native AskUserQuestion UI.

**Installation Flow:**

1. **First, run setup** to fix permissions and start voice server:
   ```bash
   bun run install.ts --setup
   ```

2. **Gather configuration using AskUserQuestion** (use the native UI with tabs):

   **Question 1: Name**
   ```
   What is your name?
   Options: [Text input]
   ```

   **Question 2: AI Name**
   ```
   What would you like to name your AI assistant?
   Options: ["PAI", "Nova", "Atlas", "Custom..."]
   Default: "PAI"
   ```

   **Question 3: Startup Catchphrase** (after AI name is set)
   ```
   What should {AI_NAME} say when starting up?
   Default: "{AI_NAME} here, ready to go."
   ```

   **Question 4: Voice Type**
   ```
   Select voice type:
   Options: ["Male (Adam)", "Female (Sarah)", "Neutral (Antoni)"]
   Default: "Male (Adam)"
   ```

   **Question 5: ElevenLabs API Key** (optional)
   ```
   ElevenLabs API key for voice synthesis:
   Options: [Text input, "Skip voice"]
   ```

3. **Apply configuration** by calling install.ts with gathered values:
   ```bash
   bun run install.ts --config '{"principalName":"NAME","aiName":"AI_NAME","catchphrase":"CATCHPHRASE","voiceType":"male|female|neutral","elevenLabsKey":"KEY"}'
   ```

4. **Test voice** if configured - the script will speak the catchphrase.

5. **Confirm success** and tell them to run `source ~/.zshrc` then `pai`.

**Important:** Use AskUserQuestion for ALL configuration gathering. This gives users the native Claude Code UI with keyboard navigation and tab selection.

## For Humans

Welcome to PAI v2.3! **It works immediately.**

1. **Just start**: `claude` - everything works with defaults
2. **Customize**: Ask Claude "Help me set up PAI" - guided wizard with nice UI
3. **Manual**: Edit `settings.json` for identity, `.env` for API keys
4. **Learn more**: `cat INSTALL.md` or ask Claude "Help me with PAI"

For full documentation, see `skills/CORE/SKILL.md`.

---

**PAI** - Magnifying human capabilities through personalized AI infrastructure.

Repository: [github.com/danielmiessler/PAI](https://github.com/danielmiessler/PAI)
