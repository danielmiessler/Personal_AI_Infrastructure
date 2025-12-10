#!/bin/bash
cd /Users/andreas/Documents/src/PAI-v1.2/Personal_AI_Infrastructure/bin/ingest
source /Users/andreas/.claude/.env
exec /Users/andreas/.bun/bin/bun run ingest.ts watch
