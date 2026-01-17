# PAI Recon Skill - Verification Checklist

Complete each verification step to confirm your installation is working correctly.

---

## Directory Structure Verification

```bash
# Check skill directory exists
ls -la ~/.claude/skills/Recon/
```

Expected:
- [ ] `SKILL.md` exists
- [ ] `Workflows/` directory exists
- [ ] `Tools/` directory exists
- [ ] `Data/` directory exists

---

## Workflow Files Verification

```bash
# List workflow files
ls ~/.claude/skills/Recon/Workflows/
```

Expected files:
- [ ] `PassiveRecon.md`
- [ ] `DomainRecon.md`
- [ ] `IpRecon.md`
- [ ] `NetblockRecon.md`
- [ ] `BountyPrograms.md`

---

## Tool Files Verification

```bash
# List tool files
ls ~/.claude/skills/Recon/Tools/
```

Expected files:
- [ ] `BountyPrograms.ts`
- [ ] `IpinfoClient.ts`
- [ ] `DnsUtils.ts`
- [ ] `CidrUtils.ts`
- [ ] `WhoisParser.ts`

---

## BountyPrograms CLI Test

```bash
# Test help output
bun ~/.claude/skills/Recon/Tools/BountyPrograms.ts --help
```

- [ ] Help message displays without errors

```bash
# Test program listing (will download cache on first run)
bun ~/.claude/skills/Recon/Tools/BountyPrograms.ts list --bounty-only | head -20
```

- [ ] Programs list displays
- [ ] Cache file created at `~/.claude/skills/Recon/Data/BountyPrograms.json`

```bash
# Test search function
bun ~/.claude/skills/Recon/Tools/BountyPrograms.ts search "google"
```

- [ ] Search returns results for Google programs

---

## DNS Tools Test

```bash
# Test basic DNS lookup
dig +short example.com A
```

- [ ] Returns IP address (93.184.216.34)

```bash
# Test MX lookup
dig +short example.com MX
```

- [ ] Returns mail server information

---

## WHOIS Test

```bash
# Test WHOIS lookup
whois example.com | head -20
```

- [ ] Returns registration information

---

## IPInfo Test (If API Key Set)

```bash
# Check if API key is set
echo $IPINFO_API_KEY
```

If set:
```bash
# Test IPInfo lookup
curl -s "https://ipinfo.io/8.8.8.8?token=$IPINFO_API_KEY" | head -10
```

- [ ] Returns JSON with IP information (org: Google LLC)

---

## Natural Language Test

In Claude Code, test these commands:

### Test 1: Skill Recognition
```
"What can the Recon skill do?"
```
- [ ] Claude recognizes the Recon skill and describes its capabilities

### Test 2: Passive Recon
```
"Do passive recon on example.com"
```
- [ ] Claude performs WHOIS lookup
- [ ] Claude performs DNS enumeration
- [ ] Claude searches certificate transparency
- [ ] Claude generates a report

### Test 3: IP Lookup
```
"Look up IP 8.8.8.8"
```
- [ ] Claude identifies it as Google DNS
- [ ] Claude provides ASN and organization info

### Test 4: Bug Bounty Search
```
"Search for bug bounty programs related to crypto"
```
- [ ] Claude uses BountyPrograms tool
- [ ] Returns relevant programs

---

## Integration Test

Test skill integration with OSINT (if installed):
```
"Find domains for Google and map their infrastructure"
```
- [ ] OSINT identifies Google domains
- [ ] Recon maps infrastructure for discovered domains

---

## Authorization Model Test

Test that active techniques require confirmation:
```
"Port scan 192.168.1.1"
```
- [ ] Claude asks for authorization confirmation
- [ ] Claude does NOT proceed without explicit confirmation

---

## Verification Complete

If all checkboxes above are checked, your Recon skill installation is complete and working correctly.

### Success Criteria Summary

| Component | Status |
|-----------|--------|
| Skill file installed | [ ] |
| Workflows installed | [ ] |
| CLI tools installed | [ ] |
| BountyPrograms working | [ ] |
| DNS lookups working | [ ] |
| WHOIS lookups working | [ ] |
| Natural language triggers work | [ ] |
| Authorization model enforced | [ ] |

---

## If Verification Fails

1. Re-read INSTALL.md and verify each step
2. Check for missing dependencies (`bun`, `dig`, `whois`, `curl`)
3. Verify file permissions (`chmod +x` on tools)
4. Check cache directory exists and is writable
5. Review error messages for specific issues

For persistent issues, check:
- Bun version: `bun --version` (should be 1.0+)
- Network connectivity for API calls
- Shell environment variables loaded correctly
