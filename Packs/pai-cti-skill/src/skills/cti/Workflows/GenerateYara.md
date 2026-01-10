# Generate YARA Rules Workflow

Create detection rules in YARA format for threat hunting and malware detection.

## Trigger Phrases
- "create yara"
- "yara rule"
- "generate yara"
- "detection rule for"
- "malware signature"
- "yara detection"

## Input
- `target`: Malware sample info, IoCs, or behavior description
- `name`: Rule name (optional, auto-generated if not provided)
- `severity` (optional): Rule severity score (0-100)
- `context`: Additional context for rule generation

## Process

### Step 1: Analyze Input
```
Determine input type:
- File hash → Query threat intel for sample details
- Malware family → Research known characteristics
- Behavioral description → Identify detectable artifacts
- IoC list → Create indicator-based rules
- Report text → Extract relevant patterns
```

### Step 2: Identify Detection Opportunities

**String-based detection:**
```
Categories:
- Unique strings (C2 URLs, mutexes, error messages)
- File paths and registry keys
- Function names and API calls
- Configuration artifacts
- Debug strings and PDB paths
```

**Binary patterns:**
```
Categories:
- Magic bytes and headers
- Encoded/encrypted sections
- Shellcode patterns
- Packer signatures
- Import hash patterns
```

**Behavioral indicators:**
```
Categories:
- Process creation patterns
- File system modifications
- Registry modifications
- Network connections
- Memory patterns
```

### Step 3: Generate Rule Structure

**Naming Convention:**
```
CATEGORY_TYPE_Family_Platform_Date

Categories:
- MAL_ : Malware
- HKTL_ : Hacking tool
- WEBSHELL_ : Web shell
- EXPL_ : Exploit
- VULN_ : Vulnerable software
- SUSP_ : Suspicious activity
- PUA_ : Potentially unwanted application

Examples:
- MAL_Ransomware_LockBit_Win_2024
- HKTL_Mimikatz_x64_Any
- SUSP_PowerShell_Encoded_Command
```

**Rule Template:**
```yara
rule RULE_NAME : tag1 tag2
{
    meta:
        description = "Description of what this rule detects"
        author = "PAI ThreatIntelligence"
        date = "2026-01-10"
        version = "1.0"
        reference = "Source reference URL or report"
        hash = "Sample hash if applicable"
        tlp = "TLP:CLEAR"
        mitre_attack = "T1234"
        severity = 80

    strings:
        // Highly specific strings ($x)
        $x1 = "unique_malware_string" ascii
        $x2 = { 4D 5A 90 00 03 00 00 00 } // MZ header

        // Grouped strings ($s)
        $s1 = "CreateRemoteThread" ascii
        $s2 = "VirtualAllocEx" ascii
        $s3 = "WriteProcessMemory" ascii

        // Anti-FP strings ($fp)
        $fp1 = "Microsoft Corporation" ascii
        $fp2 = "Symantec" ascii

    condition:
        uint16(0) == 0x5A4D and
        filesize < 5MB and
        (
            any of ($x*) or
            (2 of ($s*) and not any of ($fp*))
        )
}
```

### Step 4: Apply Best Practices

**String Modifiers:**
```
ascii - ASCII strings
wide - Unicode (UTF-16LE)
nocase - Case insensitive
fullword - Match complete word only
base64 - Match base64 encoded
xor - Match XOR encoded (0x00-0xFF)
```

**Condition Patterns:**
```
// File type checks
uint16(0) == 0x5A4D           // PE file (MZ header)
uint32(0) == 0x464c457f       // ELF file
uint32(0) == 0xfeedface       // Mach-O 32-bit
uint32(0) == 0xfeedfacf       // Mach-O 64-bit

// Size constraints
filesize < 10MB
filesize > 1KB

// String counting
#str > 5                       // More than 5 matches
@str[1] < 100                  // First match within 100 bytes

// PE-specific (requires pe module)
pe.imphash() == "hash"
pe.exports("function")
pe.number_of_sections > 5
```

**YARA Modules:**
```yara
import "pe"      // PE file analysis
import "elf"     // ELF file analysis
import "hash"    // Hash calculations
import "math"    // Mathematical operations
import "dotnet"  // .NET assembly analysis
import "magic"   // File magic detection
```

### Step 5: Score and Categorize

**Severity Scoring:**
```
Score Range | Severity | Description
----------- | -------- | -----------
80-100      | High     | Strong indicators, low FP risk
50-79       | Medium   | Good indicators, some FP potential
30-49       | Low      | Weak indicators, higher FP potential
0-29        | Info     | Informational, high FP expected
```

**String Categorization:**
```
$x* - Highly specific (unique to this threat)
$s* - Grouped strings (need combinations)
$a* - Pre-selection strings (narrow search space)
$fp* - False positive filters (exclude benign)
```

### Step 6: Validate Rule

```
Validation checks:
1. Syntax validation (compile test)
2. Logic review (condition makes sense)
3. False positive estimation
4. Performance impact assessment
5. Coverage verification

Test against:
- Known malicious samples (true positives)
- Benign software (false positives)
- Packed/modified samples (evasion)
```

### Step 7: Store to Knowledge Graph

Use the **Knowledge** skill:

```
Store the following as structured episodes:

1. YARA Rule:
   - Name: "YARA: {rule_name}"
   - Data: Complete rule text, metadata
   - Group: "threat-intel-detections"
   - Relationships: detects_threat, derived_from_intel

2. Detection Metadata:
   - Name: "Detection: {rule_name}"
   - Data: Severity, coverage, FP rate
   - Links to related threats

3. Version History:
   - Name: "YARA History: {rule_name}"
   - Data: Version changes, updates
   - Temporal tracking
```

## Output Format

```
📋 YARA RULE GENERATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 TARGET: [Threat/sample identifier]
📅 GENERATED: [timestamp]
🔒 TLP: [classification]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 RULE: [rule_name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```yara
[Complete YARA rule]
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RULE METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Severity Score: [X]/100
• Confidence: [High/Medium/Low]
• False Positive Risk: [Low/Medium/High]
• ATT&CK Coverage: [techniques covered]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 DETECTION LOGIC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This rule detects:
• [Detection point 1]
• [Detection point 2]
• [Detection point 3]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ LIMITATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• [Limitation 1]
• [Limitation 2]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 USAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Scan single file
yara [rule_file] [target_file]

# Scan directory recursively
yara -r [rule_file] [target_dir]

# With module dependencies
yara -m [rule_file] [target]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
🔗 Rule ID: [yara_rule_id]
```

## Example Rules

### Ransomware Detection
```yara
rule MAL_Ransomware_Generic_Indicators
{
    meta:
        description = "Detects generic ransomware indicators"
        author = "PAI ThreatIntelligence"
        severity = 85

    strings:
        $ransom1 = "Your files have been encrypted" nocase
        $ransom2 = "Bitcoin" nocase
        $ransom3 = ".onion" ascii

        $ext1 = ".locked" ascii
        $ext2 = ".encrypted" ascii
        $ext3 = ".crypted" ascii

        $api1 = "CryptEncrypt" ascii
        $api2 = "CryptGenKey" ascii
        $api3 = "CryptAcquireContext" ascii

    condition:
        uint16(0) == 0x5A4D and
        (
            (1 of ($ransom*) and 1 of ($ext*)) or
            (2 of ($api*) and 1 of ($ransom*))
        )
}
```

### Webshell Detection
```yara
rule WEBSHELL_PHP_Generic
{
    meta:
        description = "Detects PHP webshells"
        author = "PAI ThreatIntelligence"
        severity = 80

    strings:
        $php = "<?php" nocase

        $func1 = "eval(" nocase
        $func2 = "base64_decode(" nocase
        $func3 = "shell_exec(" nocase
        $func4 = "system(" nocase
        $func5 = "passthru(" nocase
        $func6 = "exec(" nocase

        $obf1 = "str_rot13(" nocase
        $obf2 = "gzinflate(" nocase
        $obf3 = "gzuncompress(" nocase

    condition:
        $php and
        (
            (2 of ($func*) and 1 of ($obf*)) or
            (3 of ($func*))
        )
}
```

## Tools & APIs Used
- YARA syntax validator
- Knowledge skill for persistence
- Threat intelligence for context

## Ethical Notes
- Rules are for defensive use only
- Test rules thoroughly before deployment
- Consider performance impact
- Document detection logic
- Share responsibly (respect TLP)
