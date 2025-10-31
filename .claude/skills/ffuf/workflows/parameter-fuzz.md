# Parameter Fuzzing Workflow

## Trigger
User says: "fuzz parameters", "test GET/POST params", "parameter discovery"

## Purpose
Discover and test HTTP parameters (GET/POST) using ffuf.

## Workflow

### 1. GET Parameter Discovery
```bash
# Find parameter names
ffuf -w /path/to/params.txt \
     -u "https://target.com/api?FUZZ=test" \
     -fs 4242

# Test parameter values
ffuf -w /path/to/values.txt \
     -u "https://target.com/api?id=FUZZ" \
     -fc 401,403
```

### 2. POST Parameter Fuzzing
```bash
# Fuzz POST data
ffuf -w /path/to/wordlist.txt \
     -X POST \
     -d "username=admin&password=FUZZ" \
     -u https://target.com/login \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -fc 401
```

### 3. Multiple Parameters (Clusterbomb)
```bash
ffuf -w params.txt:PARAM \
     -w values.txt:VAL \
     -u "https://target.com/?PARAM=VAL" \
     -mode clusterbomb \
     -mc 200
```

### 4. JSON POST Fuzzing
```bash
ffuf -w wordlist.txt \
     -X POST \
     -d '{"username":"admin","password":"FUZZ"}' \
     -u https://target.com/api/login \
     -H "Content-Type: application/json" \
     -mc 200
```

## Common Parameter Wordlists
- `/usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt`
- `/usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt`
- Custom lists based on application

## Tips
- Calibrate filters based on error responses
- Use -mc to match successful responses
- Test both GET and POST methods
- Watch for subtle response differences

## Reference
See main ffuf skill for authenticated fuzzing and advanced techniques.
