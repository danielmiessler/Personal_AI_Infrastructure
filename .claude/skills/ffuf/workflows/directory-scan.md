# Directory Scan Workflow

## Trigger
User says: "scan directories", "find hidden paths", "directory fuzzing"

## Purpose
Discover hidden directories and files on a web application using ffuf.

## Workflow

### 1. Basic Directory Scan
```bash
ffuf -w /path/to/wordlist.txt \
     -u https://target.com/FUZZ \
     -c -v
```

### 2. With File Extensions
```bash
ffuf -w /path/to/wordlist.txt \
     -u https://target.com/FUZZ \
     -e .php,.html,.txt,.pdf,.js \
     -c -v
```

### 3. Recursive Scanning
```bash
ffuf -w /path/to/wordlist.txt \
     -u https://target.com/FUZZ \
     -recursion \
     -recursion-depth 2 \
     -c -v
```

### 4. Filter Results
```bash
# Filter by status code
ffuf -w wordlist.txt -u https://target.com/FUZZ -fc 404,403

# Filter by size
ffuf -w wordlist.txt -u https://target.com/FUZZ -fs 4242

# Match specific status
ffuf -w wordlist.txt -u https://target.com/FUZZ -mc 200,301,302
```

## Common Wordlists
- `/usr/share/wordlists/dirb/common.txt`
- `/usr/share/seclists/Discovery/Web-Content/common.txt`
- `/usr/share/seclists/Discovery/Web-Content/raft-large-directories.txt`

## Tips
- Start with common.txt, escalate to larger lists
- Use -recursion for thorough discovery
- Filter false positives with -fs or -fc
- Save results with -o output.json

## Reference
See main ffuf skill for complete documentation and advanced techniques.
