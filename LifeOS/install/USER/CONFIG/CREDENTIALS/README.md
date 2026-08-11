---
provenance: template
---

# CREDENTIALS

**Purpose:** Local credential store for skills that need API keys, OAuth tokens, or other secrets to call external services.

**What lives here:** One credential per file — typically a json file or a `.env` entry — keyed by service name. Skills read from this dir at runtime to authenticate with the APIs they wrap. Everything in this dir stays private to your machine and is never shipped in LifeOS releases or public mirrors.

**How it gets populated:** By the user explicitly. When a skill needs a new credential it will tell you what to drop here; you obtain the key from the service and save it. Treat this dir like any other secrets store — back it up out-of-band, never commit it, never paste contents into chat.

**Optional Tavily search:** Set `TAVILY_API_KEY` in `~/.claude/.env` or your shell environment to enable `TavilySearch.ts`. The key is not required for installation or for existing native WebSearch, Perplexity, or Gemini paths. Never paste it into research output, logs, or documentation.

**Sample state for fresh installs:** Empty / Just this README. Real content appears as you use LifeOS.
