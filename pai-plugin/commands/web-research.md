# Web Research Command - Perplexity AI

## Quick Usage
```bash
# Basic research query (API key in ${CLAUDE_PLUGIN_ROOT}/.env as PERPLEXITY_API_KEY)
source ${CLAUDE_PLUGIN_ROOT}/.env && curl -s -X POST https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"sonar\",\"messages\":[{\"role\":\"user\",\"content\":\"YOUR_QUERY_HERE\"}]}" \
  | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['choices'][0]['message']['content'])"
```

## With Citations
```bash
source ${CLAUDE_PLUGIN_ROOT}/.env && curl -s -X POST https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"sonar\",\"messages\":[{\"role\":\"user\",\"content\":\"YOUR_QUERY_HERE\"}],\"return_citations\":true}" \
  | python3 -m json.tool
```

## Models
- **sonar-pro** - Deeper analysis with more sources

## When to Use
- Current events and recent information
- Technical documentation research
- Multi-source information synthesis
- Fact-checking and verification
