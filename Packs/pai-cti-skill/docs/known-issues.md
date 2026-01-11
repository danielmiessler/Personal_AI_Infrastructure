# Known Issues

> Known bugs, limitations, and workarounds for the PAI CTI Skill Pack

---

## Critical Issues

### RediSearch Hyphen Parsing Bug

**Affects:** Knowledge graph storage and search of domain names containing hyphens

**Severity:** High

**Description:**
RediSearch (used by FalkorDB/Graphiti in the pai-knowledge-system) treats hyphens (`-`) as the negation operator in search queries. When storing or searching for domain names like `evil-domain.com`, the query parser interprets this as:

```
"evil" NOT "domain.com"
```

This causes:
- Failed searches for hyphenated domains
- Incorrect or missing results when querying stored intelligence
- Potential false negatives in threat hunting

**Affected Components:**
- `add_memory` tool when storing domains with hyphens
- `search_memory_nodes` / `search_memory_facts` when querying
- Any workflow that stores IoCs to the knowledge graph

**Example:**
```
# This domain stored in knowledge graph:
malware-c2-server.evil.com

# Search query fails or returns wrong results:
search_memory_facts("malware-c2-server.evil.com")
# Interpreted as: "malware" NOT "c2" NOT "server.evil.com"
```

**Workarounds:**

1. **Escape hyphens in queries** - Wrap hyphenated terms in quotes or escape:
   ```
   search_memory_facts("\"malware-c2-server.evil.com\"")
   ```

2. **Store normalized versions** - When adding to knowledge graph, also store a dot-separated version:
   ```
   Original: malware-c2-server.evil.com
   Normalized: malware.c2.server.evil.com
   ```

3. **Use exact match queries** - When available, use UUID-based lookups instead of text search

**Status:** Upstream issue in RediSearch. No fix available. Track at:
- https://github.com/RediSearch/RediSearch/issues/1072
- https://github.com/getzep/graphiti/issues (if Graphiti wrapper issue filed)

**Impact on CTI Workflows:**
- Domain IoCs with hyphens may not be retrievable from knowledge graph
- Threat actor infrastructure using hyphenated domains may be missed in searches
- Consider maintaining a separate local cache for hyphenated domain IoCs

---

## Moderate Issues

### Feed Rate Limiting

**Affects:** FeedManager.ts when polling multiple feeds

**Severity:** Moderate

**Description:**
Some threat intelligence feeds implement rate limiting. Rapid successive requests may result in temporary blocks or 429 errors.

**Affected Feeds:**
- PhishTank (aggressive rate limiting)
- VirusTotal (API quota based)
- URLScan (rate limited without API key)

**Workaround:**
- Test feeds one at a time: `bun run FeedManager.ts test --name "FeedName"`
- Configure feed polling intervals in TISources.yaml
- Obtain API keys for feeds that offer them
- Add delays between batch operations in scripts

---

### STIX 2.1 Validation Strictness

**Affects:** StixGenerator.ts output

**Severity:** Low

**Description:**
Some STIX consumers have strict validation that may reject bundles with:
- Missing optional fields that they expect
- Custom properties not in x_ namespace
- Timestamp precision differences

**Workaround:**
- Validate output with official STIX validator before sharing: https://stixvalidator.com/
- Review STIX 2.1 specification for required vs optional fields
- Test with your target consumer before production use

---

### Large File IoC Extraction Memory

**Affects:** IoCExtractor.ts with files > 50MB

**Severity:** Low

**Description:**
Processing very large threat reports or log files may consume significant memory due to full-file regex scanning.

**Workaround:**
- Split large files before processing: `split -l 10000 largefile.txt chunk_`
- Process chunks individually and merge results
- Increase Bun memory limit: `BUN_JSC_forceGCSlowPaths=1 bun run ...`

---

## Platform-Specific Issues

### macOS: Bun File Watcher Limits

**Affects:** Feed monitoring on macOS

**Description:**
macOS has default file descriptor limits that may affect long-running feed monitoring.

**Workaround:**
```bash
ulimit -n 10240
```

### Windows: Path Length Limitations

**Affects:** Installation on Windows with deep directory structures

**Description:**
Windows MAX_PATH (260 chars) may cause issues with deeply nested skill files.

**Workaround:**
- Enable long paths in Windows 10+
- Install to shorter base path

---

## Reporting New Issues

If you discover a new issue:

1. Check if it's listed here first
2. Reproduce with minimal steps
3. Note your environment (OS, Bun version, skill version)
4. Report to the PAI repository or create a local note

---

## Changelog

| Date | Issue | Status |
|------|-------|--------|
| 2026-01-11 | RediSearch hyphen bug documented | Open - Upstream |
| 2026-01-11 | Initial known issues document | Created |
