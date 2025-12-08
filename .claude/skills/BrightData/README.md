# BrightData Four-Tier Web Scraping

Progressive escalation strategy for reliable URL content retrieval with automatic fallback.

## Overview

This skill implements a four-tier progressive web scraping system that automatically escalates through increasingly powerful methods until it succeeds. It starts with fast, free tools and only uses paid services when necessary.

### The Four Tiers

1. **Tier 1: WebFetch** - Built-in Claude Code tool (~2-5 seconds, free)
2. **Tier 2: cURL + Headers** - Chrome-like browser headers (~3-7 seconds, free)
3. **Tier 3: Browser Automation** - Full Playwright execution (~10-20 seconds, free)
4. **Tier 4: Bright Data MCP** - Professional scraping service (~5-15 seconds, paid)

The system automatically tries each tier in order, only escalating when the previous tier fails.

## Setup Requirements

### 1. Install Bright Data MCP Server

To use Tier 4 (Bright Data MCP), you need to install the Bright Data MCP server and configure your API key.

**Step 1: Get Bright Data API Key**

1. Create account at [https://brightdata.com](https://brightdata.com)
2. Navigate to your account settings
3. Go to the API section
4. Generate a new API key
5. Copy the API token (you'll need it for configuration)

Full documentation: [Bright Data API Documentation](https://docs.brightdata.com/api-reference/web-scraper/introduction)

**Step 2: Configure MCP Server**

Add the Bright Data MCP server to your Claude Code MCP configuration file (`.claude/.mcp.json` or `${PAI_DIR}/.mcp.json`):

```json
{
  "mcpServers": {
    "brightdata": {
      "command": "bunx",
      "args": [
        "-y",
        "@brightdata/mcp"
      ],
      "env": {
        "API_TOKEN": "your_bright_data_api_token_here"
      }
    }
  }
}
```

**Step 3: Restart Claude Code**

After adding the MCP server configuration, restart Claude Code to load the Bright Data MCP server.

**Verify Installation:**

Once Claude Code restarts, the `mcp__Brightdata__scrape_as_markdown` tool will be available. You can verify by asking Claude Code to list available MCP tools.

### 2. Browser Automation (Optional)

For Tier 3, you need Playwright installed:

```bash
# Install Playwright
npm install -D playwright
# or
bun add -d playwright

# Install browsers
npx playwright install
```

## Usage

Once configured, simply ask Claude Code to scrape URLs:

```
"Scrape this URL"
"Get content from https://example.com"
"Can't access this site - help me fetch it"
"Use Bright Data to fetch https://difficult-site.com"
```

The skill automatically:
- Routes your request to the four-tier workflow
- Tries each tier until success
- Returns content in markdown format
- Reports which tier succeeded

## Cost Optimization

The progressive escalation strategy minimizes costs:

- **Most sites (60-70%)**: Succeed at Tier 1 or 2 (free)
- **JavaScript-heavy sites**: Escalate to Tier 3 (free, but slower)
- **Protected sites**: Use Tier 4 only when necessary (minimal cost)

**Real-world costs**: Over 3 weeks of heavy usage with tons of queries, total Bright Data costs were $0.31 (averaging $0.01 per day).

## When Each Tier Is Used

### Tier 1 (WebFetch)
- Simple public websites
- No bot detection
- No JavaScript requirements
- **Success rate**: ~40%

### Tier 2 (cURL + Headers)
- Basic user-agent checking
- Simple header validation
- Static content sites
- **Success rate**: ~20-30%

### Tier 3 (Browser Automation)
- JavaScript-heavy sites (React, Vue, Angular)
- Single-page applications (SPAs)
- Dynamic content loading
- Cookie/session requirements
- **Success rate**: ~20-25%

### Tier 4 (Bright Data)
- CAPTCHA challenges
- Advanced bot detection
- Residential IP requirements
- Aggressive rate limiting
- **Success rate**: ~95%+

## Examples

### Example 1: Simple Site (Tier 1)
```
You: "Scrape https://example.com"

Kai: Successfully retrieved content using Tier 1 (WebFetch)
     [Content in markdown...]
```

### Example 2: JavaScript Site (Tier 3)
```
You: "Get content from https://spa-site.com"

Kai: Tier 1 failed (empty content)
     Tier 2 failed (JavaScript required)
     Successfully retrieved content using Tier 3 (Browser Automation)
     [Content in markdown...]
```

### Example 3: Protected Site (Tier 4)
```
You: "Scrape https://protected-site.com"

Kai: Tier 1 failed (blocked)
     Tier 2 failed (bot detection)
     Tier 3 failed (CAPTCHA)
     Successfully retrieved content using Tier 4 (Bright Data)
     [Content in markdown...]
```

## Skill Structure

```
brightdata/
├── SKILL.md                          # Skill definition and routing
├── README.md                         # This file
└── workflows/
    └── four-tier-scrape.md           # Main workflow implementation
```

## Ethical Use

This system is designed exclusively for scraping publicly available data. It should not be used to:
- Bypass authentication or access restricted content
- Violate terms of service
- Access private or protected data
- Perform any illegal scraping activities

Always respect robots.txt and website terms of service.

## Related Resources

- **Blog Post**: [Progressive Web Scraping: Four-Tier System](https://danielmiessler.com/blog/progressive-web-scraping-four-tier-system)
- **PAI Repository**: [github.com/danielmiessler/PAI](https://github.com/danielmiessler/PAI)
- **Bright Data Documentation**: [docs.brightdata.com](https://docs.brightdata.com)

## Support

Questions or improvements?
- Email: daniel@danielmiessler.com
- X/Twitter: @danielmiessler

---

**AIL Tier Level 5** (Highest AI Involvement) - Daniel's idea completely implemented by Kai.
