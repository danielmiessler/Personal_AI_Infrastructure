# PAI CTI Skill Verification Checklist

> Run through this checklist after installation to verify everything is working correctly

---

## File Structure Verification

### Core Files

| Check | Command | Expected |
|-------|---------|----------|
| SKILL.md exists | `ls $PAI_DIR/skills/cti/SKILL.md` | File exists |
| SKILL.md has frontmatter | `head -5 $PAI_DIR/skills/cti/SKILL.md` | Shows `---` and `name: cti` |

### Tools

| Check | Command | Expected |
|-------|---------|----------|
| FeedManager.ts | `ls $PAI_DIR/skills/cti/Tools/FeedManager.ts` | File exists |
| IoCExtractor.ts | `ls $PAI_DIR/skills/cti/Tools/IoCExtractor.ts` | File exists |
| StixGenerator.ts | `ls $PAI_DIR/skills/cti/Tools/StixGenerator.ts` | File exists |
| package.json | `ls $PAI_DIR/skills/cti/Tools/package.json` | File exists |
| node_modules | `ls $PAI_DIR/skills/cti/Tools/node_modules` | Directory exists |

### Data Files

| Check | Command | Expected |
|-------|---------|----------|
| TISources.yaml | `ls $PAI_DIR/skills/cti/Data/TISources.yaml` | File exists |
| IoCPatterns.yaml | `ls $PAI_DIR/skills/cti/Data/IoCPatterns.yaml` | File exists |
| Valid YAML | `bun -e "require('yaml').parse(require('fs').readFileSync('$PAI_DIR/skills/cti/Data/TISources.yaml','utf8'))"` | No errors |

### Workflows

| Check | Command | Expected |
|-------|---------|----------|
| Workflow count | `ls $PAI_DIR/skills/cti/Workflows/*.md \| wc -l` | 11 files |
| AnalyzeIntelligence.md | `ls $PAI_DIR/skills/cti/Workflows/AnalyzeIntelligence.md` | File exists |
| ExtractIoCs.md | `ls $PAI_DIR/skills/cti/Workflows/ExtractIoCs.md` | File exists |

### Frameworks

| Check | Command | Expected |
|-------|---------|----------|
| Framework count | `ls $PAI_DIR/skills/cti/Frameworks/*.md \| wc -l` | 4 files |
| MitreAttack.md | `ls $PAI_DIR/skills/cti/Frameworks/MitreAttack.md` | File exists |
| CyberKillChain.md | `ls $PAI_DIR/skills/cti/Frameworks/CyberKillChain.md` | File exists |
| DiamondModel.md | `ls $PAI_DIR/skills/cti/Frameworks/DiamondModel.md` | File exists |
| RiskScoring.md | `ls $PAI_DIR/skills/cti/Frameworks/RiskScoring.md` | File exists |

---

## Functional Verification

### IoC Extractor

**Test 1: Basic extraction**
```bash
echo "Check IP 192.168.1.1 and domain evil.com with hash d41d8cd98f00b204e9800998ecf8427e" | \
  bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts --stdin --format json
```

**Expected output:** JSON with ipv4, domain, and md5 arrays populated.

**Test 2: Defanged IoCs**
```bash
echo "Malicious IP: 8[.]8[.]8[.]8 and URL: hxxps://evil[.]com/malware" | \
  bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts --stdin --refang --format table
```

**Expected output:** Refanged IPs and URLs extracted correctly.

---

### Feed Manager

**Test 1: List feeds**
```bash
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts list
```

**Expected output:** Table showing 15+ feeds with name, category, format, enabled status.

**Test 2: Filter by category**
```bash
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts list --category malware
```

**Expected output:** Only malware-category feeds shown.

**Test 3: Test a feed** (requires network)
```bash
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts test --name "OpenPhish"
```

**Expected output:** `[OK] OpenPhish` with status code and response time.

---

### STIX Generator

**Test 1: Single indicator**
```bash
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts \
  --indicator "ip:203.0.113.42" \
  --name "Test Indicator"
```

**Expected output:** Valid STIX 2.1 JSON bundle with indicator object.

**Test 2: With TLP marking**
```bash
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts \
  --indicator "domain:evil.example.com" \
  --tlp amber
```

**Expected output:** STIX bundle with `object_marking_refs` and TLP:AMBER marking definition.

---

## Integration Verification

### Skill Invocation

Ask your AI assistant:

1. **"Extract IoCs from: The malware connects to 192.168.1.100 and downloads from hxxps://malware[.]com/payload.exe"**

   Expected: AI uses IoCExtractor, extracts IPv4 and URL (defanged)

2. **"What threat feeds are available?"**

   Expected: AI uses FeedManager to list feeds

3. **"Create a STIX indicator for IP 10.0.0.1 with TLP:RED"**

   Expected: AI uses StixGenerator with --tlp red flag

---

## Quick Verification Script

Run this all-in-one verification:

```bash
#!/bin/bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
PASS=0
FAIL=0

check() {
  if eval "$2" > /dev/null 2>&1; then
    echo "[PASS] $1"
    ((PASS++))
  else
    echo "[FAIL] $1"
    ((FAIL++))
  fi
}

echo "=== PAI CTI Skill Verification ==="
echo ""

# File checks
check "SKILL.md exists" "[ -f '$PAI_DIR/skills/cti/SKILL.md' ]"
check "FeedManager.ts exists" "[ -f '$PAI_DIR/skills/cti/Tools/FeedManager.ts' ]"
check "IoCExtractor.ts exists" "[ -f '$PAI_DIR/skills/cti/Tools/IoCExtractor.ts' ]"
check "StixGenerator.ts exists" "[ -f '$PAI_DIR/skills/cti/Tools/StixGenerator.ts' ]"
check "TISources.yaml exists" "[ -f '$PAI_DIR/skills/cti/Data/TISources.yaml' ]"
check "IoCPatterns.yaml exists" "[ -f '$PAI_DIR/skills/cti/Data/IoCPatterns.yaml' ]"
check "Workflows directory" "[ -d '$PAI_DIR/skills/cti/Workflows' ]"
check "Frameworks directory" "[ -d '$PAI_DIR/skills/cti/Frameworks' ]"

# Functional checks
check "IoC extraction works" "echo '8.8.8.8' | bun run '$PAI_DIR/skills/cti/Tools/IoCExtractor.ts' --stdin"
check "Feed list works" "bun run '$PAI_DIR/skills/cti/Tools/FeedManager.ts' list"
check "STIX generation works" "bun run '$PAI_DIR/skills/cti/Tools/StixGenerator.ts' --indicator 'ip:1.2.3.4'"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ $FAIL -eq 0 ]; then
  echo "CTI Skill installation verified successfully!"
  exit 0
else
  echo "Some checks failed. Review the output above."
  exit 1
fi
```

---

## Troubleshooting Failed Checks

| Failed Check | Solution |
|--------------|----------|
| SKILL.md missing | Re-copy from pack src/skills/cti/SKILL.md |
| Tool files missing | Re-copy from pack src/skills/cti/Tools/ |
| IoC extraction fails | Run `cd $PAI_DIR/skills/cti/Tools && bun install` |
| Feed list fails | Check yaml package installed: `bun add yaml` |
| STIX generation fails | Verify StixGenerator.ts has no syntax errors |

---

## Success Criteria

All of the following must pass for a successful installation:

- [ ] All 3 tool files exist and are executable
- [ ] All 2 data files exist and are valid YAML
- [ ] All 11 workflow files exist
- [ ] All 4 framework files exist
- [ ] IoC extraction produces valid JSON output
- [ ] Feed manager can list feeds
- [ ] STIX generator produces valid STIX 2.1 JSON

**Installation is complete when all checks pass.**
