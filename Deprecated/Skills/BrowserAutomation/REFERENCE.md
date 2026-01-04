# Browser Automation CLI Reference

This document provides detailed technical reference for the CLI browser automation tool.

## Architecture Overview

The browser automation system consists of:

- **Stagehand**: TypeScript library wrapping Playwright for AI-driven browser control. Uses AI model to find and interact with the right elements, so be specific
- **Chrome CDP**: Chrome DevTools Protocol connection on port 9222
- **CLI Tool**: Command-line interface in `src/cli.ts` for browser automation
- **Local Chrome**: Chrome browser launched with remote debugging enabled

### File Locations

- **Chrome Profile**: `.chrome-profile/` - Persistent browser profile directory
- **Screenshots**: `./agent/browser_screenshots/` - Screenshot output directory
- **Downloads**: `./agent/downloads/` - File download directory

## CLI Command Reference

### navigate

Navigate to a URL in the browser.

**Usage**:
```bash
browser navigate <url>
```

**Parameters**:
- `url` (string, required): The URL to navigate to. Must include protocol (http:// or https://)

**Returns**:
JSON output:
```json
{
  "success": true,
  "message": "Successfully navigated to <url>",
  "screenshot": "/path/to/screenshot.png"
}
```

**Implementation Details**:
- Uses Playwright's `page.goto()` under the hood
- Waits for network idle and DOM content loaded
- Automatically takes a screenshot after navigation
- Supports HTTPS upgrade for HTTP URLs

**Example**:
```bash
browser navigate https://example.com
```

**Error Handling**:
- Invalid URLs return error with `success: false`
- Network timeouts return timeout error
- SSL certificate errors may fail navigation

---

### act

Perform an action on the page using natural language.

**Usage**:
```bash
browser act "<action>"
```

**Parameters**:
- `action` (string, required): Natural language description of the action to perform

**Returns**:
JSON output:
```json
{
  "success": true,
  "message": "Successfully performed action: <action>",
  "screenshot": "/path/to/screenshot.png"
}
```

Note: Without specificity it might succeed on the wrong element!

**Implementation Details**:
- Uses Stagehand's `page.act()` which leverages Claude Haiku 4.5
- AI model interprets natural language and executes corresponding browser actions
- Supports: clicking, typing, selecting, scrolling, waiting, hovering, and more
- Automatically handles element location and interaction
- Automatically takes a screenshot after the action

**Natural Language Examples**:
```bash
browser act "Click the login button"
browser act "Fill in email field with test@example.com"
browser act "Scroll to the bottom of the page"
browser act "Select 'California' from the state dropdown"
browser act "Hover over the menu icon"
browser act "Wait for 3 seconds"
browser act "Press the Enter key"
browser act "Double-click the file icon"
```

**Best Practices**:
- Be **specific** about which element to interact with
- Include visual descriptors ("button next to the form", "top menu", "form at bottom")
- For ambiguous elements, mention nearby context
- Break complex actions into multiple simple actions

**Error Handling**:
- Element not found errors indicate selector couldn't be resolved
- Timeout errors occur when action takes too long
- Action not possible errors indicate element state prevents action
- All errors return JSON with `success: false`

---

### extract

Extract structured data from the current page using a schema.

**Usage**:
```bash
browser extract "<instruction>" '{"field": "type"}'
```

**Parameters**:
- `instruction` (string, required): Natural language description of what to extract
- `schema` (JSON string, required): Schema definition mapping field names to types

**Schema Types**:
- `"string"`: Text content
- `"number"`: Numeric values (integers or floats)
- `"boolean"`: True/false values

**Returns**:
JSON output:
```json
{
  "success": true,
  "data": {
    "field1": "value",
    "field2": 123
  }
}
```

**Implementation Details**:
- Uses Stagehand's `page.extract()` with Zod schema validation
- AI model (Claude Haiku 4.5) identifies relevant page elements
- Automatically handles pagination and dynamic content
- Validates extracted data against schema

**Schema Example**:
```bash
browser extract "Extract the product information" '{"productName": "string", "price": "number", "inStock": "boolean", "description": "string", "rating": "number"}'
```

**Complex Extraction Example**:
```bash
browser extract "Extract all items from the shopping cart" '{"itemName": "string", "quantity": "number", "unitPrice": "number", "totalPrice": "number", "imageUrl": "string"}'
```

**Best Practices**:
- Use clear, descriptive field names
- Match schema types to expected data types
- Provide specific extraction instructions
- Handle missing data by checking result properties

**Error Handling**:
- Schema validation errors indicate type mismatch
- Extraction failures occur when data not found on page
- Timeout errors for pages that take too long to analyze
- All errors return JSON with `success: false`

---

### observe

Discover available actions on the page.

**Usage**:
```bash
browser observe "<query>"
```

**Parameters**:
- `query` (string, required): Natural language query to discover elements

**Returns**:
JSON output:
```json
{
  "success": true,
  "data": [
    {
      "selector": "button.submit-btn",
      "text": "Submit Form",
      "type": "button",
      "visible": true,
      "enabled": true
    }
  ]
}
```

**Implementation Details**:
- Uses Stagehand's `page.observe()` to scan page elements
- Returns actionable elements matching the query
- Provides element properties, states, and available actions

**Query Examples**:
```bash
browser observe "Find all buttons"
browser observe "Find clickable links in the navigation"
browser observe "Find form input fields"
browser observe "Find all submit buttons"
browser observe "Find elements with text 'Login'"
browser observe "Find all images"
```

**Use Cases**:
- Page exploration and discovery
- Debugging action failures
- Understanding page structure
- Finding dynamic element selectors

**Error Handling**:
- Empty array returned when no elements match
- Timeout for pages that take too long to scan
- All errors return JSON with `success: false`

---

### screenshot

Take a screenshot of the current page.

**Usage**:
```bash
browser screenshot
```

**Parameters**: None

**Returns**:
JSON output:
```json
{
  "success": true,
  "screenshot": "/path/to/screenshot.png"
}
```

**Implementation Details**:
- Uses Chrome DevTools Protocol `Page.captureScreenshot`
- Captures full viewport at current scroll position
- Saves as PNG format with timestamp in filename
- Automatically resizes images larger than 2000x2000 pixels using Sharp
- Uses lossless PNG compression

**Screenshot Path Format**:
```
./agent/browser_screenshots/screenshot-YYYY-MM-DDTHH-MM-SS-mmmZ.png
```

**Example**:
```bash
browser screenshot
```

**Image Processing**:
- Original resolution preserved if ≤ 2000x2000
- Larger images resized to fit within 2000x2000 while maintaining aspect ratio
- Uses Sharp library for high-quality image processing

**Best Practices**:
- Take screenshots before and after important actions
- Use for visual debugging and verification
- Screenshot after navigation to confirm page loaded
- Capture error states for troubleshooting

**Error Handling**:
- Directory creation errors if screenshots folder can't be created
- CDP errors if Chrome DevTools Protocol connection fails
- File write errors if disk space insufficient
- All errors return JSON with `success: false`

---

### close

Close the browser and cleanup resources.

**Usage**:
```bash
browser close
```

**Parameters**: None

**Returns**:
JSON output:
```json
{
  "success": true,
  "message": "Browser closed"
}
```

**Implementation Details**:
- Calls `stagehand.close()` to clean up Playwright resources
- Kills Chrome process if it was started by the CLI tool
- Clears internal state variables
- Does NOT delete `.chrome-profile/` directory (preserved for reuse)

**Resource Cleanup**:
- Closes all browser tabs and windows
- Terminates Chrome process (only if started by this tool)
- Releases CDP connection
- Clears Stagehand instance

**Best Practices**:
- Always call at the end of browser automation tasks
- Call even if errors occurred during automation
- Don't call mid-workflow unless explicitly needed

**Error Handling**:
- Continues cleanup even if some steps fail
- Safe to call multiple times
- Gracefully handles already-closed browser
- All errors return JSON with `success: false`

---

## Configuration Details

### Stagehand Initialization

The Stagehand instance is configured in `src/cli.ts` with:

```typescript
new Stagehand({
  env: "LOCAL",
  verbose: 0,
  enableCaching: true,
  modelName: "anthropic/claude-haiku-4-5-20251001",
  localBrowserLaunchOptions: {
    cdpUrl: `http://localhost:9222`,
  },
})
```

**Configuration Options**:
- `env: "LOCAL"`: Uses local Chrome instead of remote browser
- `verbose: 0`: Minimal logging output
- `enableCaching: true`: Caches page analysis for better performance
- `modelName`: Claude Haiku 4.5 for AI-driven actions and extraction
- `cdpUrl`: Chrome DevTools Protocol endpoint

### Chrome Launch Arguments

Chrome is launched by `src/cli.ts` with:

```bash
--remote-debugging-port=9222
--user-data-dir=.chrome-profile
--window-position=-9999,-9999
--window-size=1280,720
```

**Arguments**:
- `--remote-debugging-port`: Enables CDP on port 9222
- `--user-data-dir`: Persistent profile directory for session/cookie persistence
- `--window-position`: Launches minimized off-screen
- `--window-size`: Default window size

### Download Configuration

Downloads are configured via CDP:

```typescript
await client.send("Browser.setDownloadBehavior", {
  behavior: "allow",
  downloadPath: "./agent/downloads",
  eventsEnabled: true,
})
```

**Behavior**:
- Downloads start automatically (no dialog)
- Files saved to `./agent/downloads/`
- Download events can be monitored via CDP

---

## Error Messages Reference

### Common Errors

**"Could not find local Chrome installation"**
- Cause: Chrome/Chromium not installed or not in standard locations
- Solution: Install Chrome from https://www.google.com/chrome/

**"Chrome failed to start with remote debugging on port 9222"**
- Cause: Port 9222 already in use or Chrome can't bind to port
- Solution: Close other Chrome instances or change CDP port

**"Browser failed to become ready within timeout"**
- Cause: Chrome launched but page context not ready
- Solution: Check Chrome version compatibility, restart system

**"Error performing action: element not found"**
- Cause: Natural language description didn't match any page element
- Solution: Use more specific description or use observe to find elements

**"Error extracting data: schema validation failed"**
- Cause: Extracted data type doesn't match schema
- Solution: Verify schema types match actual page data

**"Error taking screenshot: directory not writable"**
- Cause: Insufficient permissions for screenshots directory
- Solution: Check file permissions on `./agent/browser_screenshots/`

---

## Performance Considerations

### Caching

Stagehand caches page analysis to improve performance on repeated actions. Cache is maintained for:
- Element selectors
- Page structure analysis
- Vision model results

### Timeouts

Default timeouts:
- Navigation: 30 seconds
- Action execution: 30 seconds
- Extraction: 60 seconds
- CDP connection: 15 seconds (50 retries × 300ms)

### Resource Usage

Browser automation consumes:
- Memory: ~200-500MB for Chrome process
- CPU: Variable based on page complexity
- Disk: ~50-200MB for Chrome profile
- Network: Depends on pages visited

---

## Security Considerations

### Credential Handling

- Browser uses persistent profile (`.chrome-profile/`)
- Saved passwords and cookies persist between sessions
- Consider using isolated profiles for sensitive operations

### Download Safety

- Downloads automatically saved to `./agent/downloads/`
- No file type restrictions enforced
- Verify downloaded file integrity before use

### Network Access

- Browser has full network access
- Respects system proxy settings
- Can access localhost and internal networks

---

## Debugging Tips

### Enable Verbose Logging

Edit `src/cli.ts` and change verbose level in Stagehand configuration:

```typescript
// Change verbose: 0 to verbose: 1 or 2
verbose: 2,  // Maximum verbosity
```

### View Chrome Console

Connect to Chrome DevTools manually:
1. Open Chrome
2. Navigate to `chrome://inspect`
3. Click "inspect" under Remote Target

### Check CDP Connection

Test CDP endpoint:
```bash
curl http://localhost:9222/json/version
```

### Monitor Browser Process

Check Chrome process:
```bash
ps aux | grep chrome
```

### View Screenshots

Screenshots provide visual debugging:
```bash
ls -lh ./agent/browser_screenshots/
open ./agent/browser_screenshots/screenshot-*.png
```

### Test CLI Commands

Test individual commands:
```bash
browser navigate https://example.com
browser screenshot
browser close
```

---

## Version Information

- **Stagehand**: Uses `@browserbasehq/stagehand` package v2.5.2+
- **Model**: Claude Haiku 4.5 (claude-haiku-4-5-20251001) for browser actions
- **CLI Tool**: TypeScript CLI in `src/cli.ts`
- **Agent SDK**: `@anthropic-ai/claude-agent-sdk` for conversation framework
- **Browser**: Local Chrome/Chromium installation

For updates and changelog, see the main project repository.
