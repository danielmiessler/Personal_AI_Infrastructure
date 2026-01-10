# Troubleshooting Guide

> Common issues and solutions for the PAI CTI Skill

---

## Installation Issues

### Dependencies Not Found

**Symptom:**
```
Cannot find module 'yaml'
```

**Cause:** Dependencies not installed.

**Solution:**
```bash
cd $PAI_DIR/skills/cti/Tools
bun install
```

---

### SKILL.md Not Found

**Symptom:**
```
Skill 'cti' not found or routing failed
```

**Cause:** SKILL.md missing or incorrectly installed.

**Solution:**
1. Verify file exists: `ls $PAI_DIR/skills/cti/SKILL.md`
2. Reinstall from pack if missing
3. Check file permissions

---

### Permission Denied

**Symptom:**
```
EACCES: permission denied
```

**Cause:** Insufficient file permissions.

**Solution:**
```bash
chmod -R u+rwX $PAI_DIR/skills/cti/
```

---

## Feed Issues

### API Key Not Found

**Symptom:**
```
Error: API key not found in environment variable: PAI_CTI_OTX_API_KEY
```

**Cause:** Environment variable not set.

**Solution:**
1. Add key to `$PAI_DIR/.env`:
   ```bash
   PAI_CTI_OTX_API_KEY="your-api-key"
   ```
2. Ensure `.env` file is sourced

---

### Feed Connection Failed

**Symptom:**
```
[FAIL] abuse.ch URLhaus
       Error: fetch failed
```

**Cause:** Network connectivity or firewall blocking.

**Solution:**
1. Test URL directly: `curl -I https://urlhaus.abuse.ch/downloads/json_recent/`
2. Check firewall rules
3. Verify DNS resolution
4. Check if behind proxy (configure proxy settings)

---

### Feed Parse Error

**Symptom:**
```
Error: Failed to parse feed response
```

**Cause:** Wrong format specified or API changed.

**Solution:**
1. Verify feed format in `TISources.yaml`
2. Test feed URL in browser
3. Check if API version changed
4. Update `format` field if needed

---

### Rate Limit Exceeded

**Symptom:**
```
HTTP 429: Too Many Requests
```

**Cause:** Exceeded API rate limit.

**Solution:**
1. Wait before retrying
2. Reduce `update_frequency` in configuration
3. Enable caching (`cache_ttl`)
4. Upgrade API plan if available

---

### Invalid API Key

**Symptom:**
```
HTTP 401: Unauthorized
```

**Cause:** API key is invalid or expired.

**Solution:**
1. Verify API key is correct
2. Check if key has expired
3. Generate new key from provider
4. Update `.env` file

---

## Tool Issues

### FeedManager List Empty

**Symptom:**
```
Found 0 feed(s)
```

**Cause:** Configuration file missing or empty.

**Solution:**
1. Verify file exists: `ls $PAI_DIR/skills/cti/Data/TISources.yaml`
2. Check YAML syntax: validate with online YAML validator
3. Reinstall default configuration from pack

---

### IoCExtractor No Output

**Symptom:**
```
Total IoCs: 0
```

**Cause:** No IoCs found or pattern mismatch.

**Solution:**
1. Verify input contains IoCs
2. Check `IoCPatterns.yaml` patterns
3. Try with `--refang` if input is defanged
4. Disable `--validate` to see all matches

---

### StixGenerator Invalid Output

**Symptom:**
```
Invalid STIX bundle
```

**Cause:** Malformed input or missing required fields.

**Solution:**
1. Verify indicator format: `type:value`
2. Check input JSON schema
3. Ensure TLP is valid: `clear`, `green`, `amber`, `red`

---

## Workflow Issues

### Workflow Not Triggered

**Symptom:** Natural language request doesn't invoke workflow.

**Cause:** Trigger phrase not recognized.

**Solution:**
1. Use documented trigger phrases
2. Be more specific: "extract IoCs from this text"
3. Check SKILL.md routing configuration

---

### Knowledge Graph Not Storing

**Symptom:**
```
Stored to Knowledge Graph: No
```

**Cause:** Knowledge skill not installed or configured.

**Solution:**
1. Verify pai-knowledge-system is installed
2. Check Knowledge skill is accessible
3. Verify storage path exists and is writable

---

### Enrichment Failed

**Symptom:**
```
Enrichment failed for X indicators
```

**Cause:** External API unavailable or quota exceeded.

**Solution:**
1. Check API service status
2. Verify API keys are set
3. Check rate limits
4. Try with `depth: quick` for fewer API calls

---

## Configuration Issues

### YAML Parse Error

**Symptom:**
```
YAMLException: bad indentation
```

**Cause:** Invalid YAML syntax.

**Solution:**
1. Validate YAML with online validator
2. Check indentation (use spaces, not tabs)
3. Ensure proper quoting of strings
4. Check for special characters

---

### Environment Variable Not Loaded

**Symptom:** API key set but not recognized.

**Cause:** `.env` file not sourced.

**Solution:**
1. Verify `.env` file location: `$PAI_DIR/.env`
2. Check file permissions
3. Ensure no syntax errors in `.env`
4. Restart session/tool

---

## Performance Issues

### Slow Feed Checks

**Symptom:** Feed monitoring takes too long.

**Cause:** Too many feeds or slow network.

**Solution:**
1. Reduce `max_concurrent_fetches`
2. Disable low-priority feeds
3. Increase `request_timeout`
4. Enable caching

---

### High Memory Usage

**Symptom:** Tools consuming excessive memory.

**Cause:** Too many IoCs in memory.

**Solution:**
1. Reduce `max_iocs_per_feed`
2. Decrease `retention_days`
3. Process in batches

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ENOENT: no such file` | File missing | Check path, reinstall |
| `EACCES: permission denied` | Permissions | Fix file permissions |
| `fetch failed` | Network error | Check connectivity |
| `SyntaxError: Unexpected token` | Invalid JSON/YAML | Validate syntax |
| `Cannot find module` | Missing dependency | Run `bun install` |
| `API key required` | Missing API key | Add to `.env` |
| `Rate limit exceeded` | Too many requests | Wait, reduce frequency |
| `Invalid TLP level` | Wrong TLP value | Use valid TLP |

---

## Debug Mode

Enable verbose output for debugging:

```bash
# FeedManager with debug
DEBUG=1 bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts list

# IoCExtractor with verbose
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts input.txt --verbose

# Test specific feed with full output
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts test --name "Feed Name" --verbose
```

---

## Getting Help

If issues persist:

1. **Check documentation** - Review relevant docs section
2. **Verify installation** - Use VERIFY.md checklist
3. **Test components** - Test tools individually
4. **Check logs** - Review any error messages
5. **Reinstall** - Use INSTALL.md wizard

---

## Diagnostic Commands

### Check Installation

```bash
# Verify directory structure
ls -la $PAI_DIR/skills/cti/

# Check SKILL.md
cat $PAI_DIR/skills/cti/SKILL.md | head -20

# Test FeedManager
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts --help

# Test all feeds
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts test --all
```

### Check Configuration

```bash
# Verify TISources.yaml
cat $PAI_DIR/skills/cti/Data/TISources.yaml | head -50

# Verify IoCPatterns.yaml
cat $PAI_DIR/skills/cti/Data/IoCPatterns.yaml | head -50

# Check environment variables
grep PAI_CTI $PAI_DIR/.env
```

### Test Tools

```bash
# Test IoC extraction
echo "Test IP: 8.8.8.8" | bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts --stdin

# Test STIX generation
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts --indicator "ip:8.8.8.8" --tlp clear
```

---

## See Also

- [Getting Started](getting-started.md) - Installation and first steps
- [Configuration](configuration.md) - Configuration reference
- [Tools Overview](tools/README.md) - Tool documentation
