# Secrets Management Best Practices

**Last Updated**: 2025-12-02
**CMMC Practices**: IA.L2-3.5.10, SC.L2-3.13.16, MP.L2-3.8.6

---

## Overview

**Secrets** = Sensitive data that grants access (API keys, passwords, tokens, encryption keys, database credentials)

**Problem**: Hardcoded secrets or plaintext storage leads to:
- Credential theft (secrets in git history, logs, config files)
- Unauthorized access (leaked API keys, database passwords)
- CMMC compliance failures (IA.L2-3.5.10 requires cryptographic protection)

**Solution**: Encrypt secrets at rest, never store in plaintext, use OS keychains or secret managers

---

## Secrets Management Hierarchy

**Level 1: Never Do This** ❌
- Hardcoded secrets in source code
- Secrets committed to git
- Plain text secrets in config files
- Secrets in environment variables (if process accessible)

**Level 2: Minimum Acceptable** ⚠️
- Secrets in `.env` file (gitignored)
- Environment variables (process-scoped)
- File permissions restricting access (chmod 600)

**Level 3: Recommended** ✅
- OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Encrypted configuration files
- Secret rotation automated

**Level 4: Enterprise** ✅✅
- Cloud secret managers (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager)
- Hardware Security Modules (HSM) for key storage
- Just-in-time secret provisioning
- Audit logging for all secret access

---

## FORGE Secrets

**What Secrets Does FORGE Handle?**

### 1. Profile Configuration (profile.json)
**Contains**:
- User identity information
- Project context paths
- Agent roster configurations
- (Potentially) API keys for integrations

**Current Risk**: Stored in plaintext
**CMMC Impact**: IA.L2-3.5.10 violation (passwords/keys not cryptographically protected)

**Remediation**:
- Encrypt profile.json with OS keychain
- Use macOS Keychain (Mac), Windows Credential Manager (Windows), or gnome-keyring (Linux)
- Store encryption key in keychain, not in file

---

### 2. Standup Conversation Logs
**Contains**:
- Project decisions (may include CUI)
- Architecture discussions
- Security decisions and rationale
- Cross-project references

**Current Risk**: Stored in plaintext (if logged)
**CMMC Impact**: SC.L2-3.13.16 violation (CUI confidentiality at rest)

**Remediation**:
- Encrypt conversation logs if they contain CUI
- Use AES-256-GCM for encryption
- Store encryption key in OS keychain
- Implement key rotation (annual)

---

### 3. API Keys (Third-Party Integrations)
**Examples**:
- Claude API key
- GitHub token
- Slack webhook URL
- Email service API key

**Current Risk**: Stored in environment variables (moderate risk)
**CMMC Impact**: IA.L2-3.5.10 violation if stored in plaintext

**Remediation**:
- Use OS keychain for API key storage
- Never commit to git (use .gitignore)
- Rotate keys every 90 days
- Implement key expiration

---

### 4. Database Credentials (if FORGE adds database)
**Examples**:
- PostgreSQL password
- MongoDB connection string
- Redis auth token

**Current Risk**: N/A (FORGE doesn't use database currently)
**Future Remediation**:
- Use cloud secret managers (AWS Secrets Manager, etc.)
- Enable automatic rotation
- Use IAM authentication where possible (no passwords)

---

## Platform-Specific Implementation

### macOS: Keychain Access

**Store Secret**:
```bash
# Store API key in macOS Keychain
security add-generic-password \
  -a "FORGE" \
  -s "ClaudeAPIKey" \
  -w "sk-1234567890abcdef" \
  -T ""
```

**Retrieve Secret**:
```bash
# Retrieve API key from macOS Keychain
security find-generic-password \
  -a "FORGE" \
  -s "ClaudeAPIKey" \
  -w
```

**Advantages**:
- OS-level encryption (FileVault)
- Access control (requires user authentication)
- Audit trail (keychain access logged)

**CMMC Compliance**:
- ✅ IA.L2-3.5.10: Cryptographic password storage
- ✅ AC.L2-3.1.5: Least privilege (only user can access)

---

### Windows: Credential Manager

**Store Secret** (PowerShell):
```powershell
# Store API key in Windows Credential Manager
$secret = ConvertTo-SecureString "sk-1234567890abcdef" -AsPlainText -Force
$credential = New-Object PSCredential("FORGE:ClaudeAPIKey", $secret)
$credential | Export-Clixml -Path "$env:USERPROFILE\.forge\credential.xml"
```

**Retrieve Secret** (PowerShell):
```powershell
# Retrieve API key from Windows Credential Manager
$credential = Import-Clixml -Path "$env:USERPROFILE\.forge\credential.xml"
$apiKey = $credential.GetNetworkCredential().Password
```

**Advantages**:
- OS-level encryption (Data Protection API)
- User-scoped (cannot access other users' secrets)
- Integrated with Windows Hello

**CMMC Compliance**:
- ✅ IA.L2-3.5.10: Cryptographic password storage
- ✅ AC.L2-3.1.1: Limit access to authorized users

---

### Linux: Secret Service (gnome-keyring, kwallet)

**Store Secret**:
```bash
# Store API key in gnome-keyring (via secret-tool)
secret-tool store --label="FORGE Claude API Key" \
  application forge \
  service claude-api
# Prompts for secret, then stores encrypted
```

**Retrieve Secret**:
```bash
# Retrieve API key from gnome-keyring
secret-tool lookup application forge service claude-api
```

**Advantages**:
- Desktop-agnostic (works with GNOME, KDE, etc.)
- Encrypted storage
- D-Bus integration

**CMMC Compliance**:
- ✅ IA.L2-3.5.10: Cryptographic password storage

---

## Encrypting Configuration Files

### Option 1: Age Encryption (Recommended for FORGE)

**Age** = Simple, modern encryption tool (like GPG but easier)

**Install**:
```bash
# macOS
brew install age

# Linux
apt install age  # or equivalent

# Windows
scoop install age
```

**Encrypt profile.json**:
```bash
# Generate age key (store in OS keychain)
age-keygen -o key.txt

# Encrypt profile.json
age -r $(cat key.txt.pub) -o profile.json.age profile.json

# Delete plaintext (keep only encrypted)
rm profile.json
```

**Decrypt profile.json** (when needed):
```bash
# Decrypt profile.json
age -d -i key.txt profile.json.age > profile.json

# Use profile.json

# Re-encrypt when done
age -r $(cat key.txt.pub) -o profile.json.age profile.json
rm profile.json
```

**Advantages**:
- Simple (one command)
- Modern crypto (ChaCha20-Poly1305)
- Small footprint

**CMMC Compliance**:
- ✅ SC.L2-3.13.16: Protect CUI confidentiality at rest

---

### Option 2: GPG (Traditional)

**Encrypt profile.json**:
```bash
# Generate GPG key
gpg --gen-key

# Encrypt profile.json
gpg -e -r your-email@example.com profile.json

# Result: profile.json.gpg (encrypted)
```

**Decrypt**:
```bash
gpg -d profile.json.gpg > profile.json
```

---

### Option 3: OpenSSL (Ubiquitous)

**Encrypt profile.json**:
```bash
# Encrypt with password (prompts for password)
openssl enc -aes-256-cbc -salt -in profile.json -out profile.json.enc

# Password stored in OS keychain (retrieve with security/secret-tool)
```

**Decrypt**:
```bash
openssl enc -aes-256-cbc -d -in profile.json.enc -out profile.json
```

---

## Environment Variable Best Practices

**Acceptable for Non-CUI Projects**:
```bash
# .env file (gitignored)
CLAUDE_API_KEY=sk-1234567890abcdef
GITHUB_TOKEN=ghp_1234567890abcdef

# Load in shell
export $(grep -v '^#' .env | xargs)
```

**Ensure .gitignore**:
```
# .gitignore
.env
*.key
*.secret
profile.json
```

**NOT Acceptable for CUI Projects**:
- Environment variables are plaintext (not encrypted)
- Accessible to all processes run by user
- May leak in logs, error messages

**For CUI**: Use OS keychain or cloud secret manager

---

## Cloud Secret Managers (Enterprise)

### AWS Secrets Manager

**Store Secret**:
```bash
aws secretsmanager create-secret \
  --name forge/claude-api-key \
  --secret-string "sk-1234567890abcdef"
```

**Retrieve Secret**:
```bash
aws secretsmanager get-secret-value \
  --secret-id forge/claude-api-key \
  --query SecretString \
  --output text
```

**Advantages**:
- Automatic rotation
- Fine-grained IAM permissions
- Audit logging (CloudTrail)
- Encryption with KMS (FIPS 140-2)

**Cost**: $0.40/secret/month + $0.05/10k API calls

**CMMC Compliance**:
- ✅ IA.L2-3.5.10: Cryptographic storage
- ✅ AU.L2-3.3.1: Audit records (CloudTrail)
- ✅ SC.L2-3.13.8: FIPS-validated crypto (KMS)

---

### Azure Key Vault

**Store Secret**:
```bash
az keyvault secret set \
  --vault-name forge-keyvault \
  --name claude-api-key \
  --value "sk-1234567890abcdef"
```

**Retrieve Secret**:
```bash
az keyvault secret show \
  --vault-name forge-keyvault \
  --name claude-api-key \
  --query value \
  --output tsv
```

**Advantages**:
- Azure AD integration
- Managed HSM option (FIPS 140-2 Level 3)
- Soft delete and purge protection

---

### Google Cloud Secret Manager

**Store Secret**:
```bash
echo -n "sk-1234567890abcdef" | \
  gcloud secrets create claude-api-key --data-file=-
```

**Retrieve Secret**:
```bash
gcloud secrets versions access latest --secret="claude-api-key"
```

**Advantages**:
- IAM integration
- Automatic replication
- Version history

---

## Secret Rotation

**Principle**: Secrets should expire and be rotated regularly

**Rotation Schedule**:
| Secret Type | Rotation Frequency | CMMC Practice |
|-------------|-------------------|---------------|
| Passwords | 90 days | IA.L2-3.5.4 |
| API Keys | 90 days | IA.L2-3.5.4 |
| Encryption Keys | 365 days | SC.L2-3.13.7 |
| Database Credentials | 90 days (auto) | IA.L2-3.5.4 |
| Service Account Keys | 90 days | IA.L2-3.5.6 |

**Automation**:
```bash
# AWS Secrets Manager automatic rotation
aws secretsmanager rotate-secret \
  --secret-id forge/claude-api-key \
  --rotation-lambda-arn arn:aws:lambda:...
```

---

## Secrets in Git (Prevention)

**Problem**: Secrets accidentally committed to git (public or private)

**Prevention**:

### 1. .gitignore (Basic)
```
# .gitignore
.env
*.key
*.secret
*.pem
profile.json
credentials.json
```

### 2. git-secrets (Pre-Commit Hook)
```bash
# Install git-secrets
brew install git-secrets  # macOS
apt install git-secrets   # Linux

# Initialize in repo
git secrets --install
git secrets --register-aws  # AWS patterns
git secrets --add 'sk-[a-zA-Z0-9]{32,}'  # Claude API key pattern

# Now git will block commits with secrets
```

### 3. Gitleaks (CI/CD)
```yaml
# GitHub Actions
name: Secrets Scan
on: [push]
jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: gitleaks/gitleaks-action@v2
```

---

## Secrets in Logs (Prevention)

**Problem**: Secrets logged in application logs, error messages

**Prevention**:

### 1. Log Sanitization
```javascript
// ❌ BAD: Log full API request (includes key)
console.log('API request:', request)

// ✅ GOOD: Sanitize sensitive fields
console.log('API request:', {
  ...request,
  apiKey: '***REDACTED***'
})
```

### 2. Error Message Sanitization
```python
# ❌ BAD: Error includes database password
except Exception as e:
    print(f"DB connection failed: {connection_string}")

# ✅ GOOD: Generic error message
except Exception as e:
    logger.error("DB connection failed")  # No credentials
```

**CMMC Practice**: IA.L2-3.5.10 (Protect authentication information)

---

## CMMC Compliance Checklist

**IA.L2-3.5.10**: Store and transmit only cryptographically-protected passwords
- [ ] No plaintext passwords in config files
- [ ] Passwords encrypted at rest (OS keychain or secret manager)
- [ ] Passwords transmitted over TLS only
- [ ] Password hashing uses bcrypt/Argon2 (not MD5/SHA1)

**SC.L2-3.13.16**: Protect confidentiality of CUI at rest
- [ ] CUI data encrypted at rest (AES-256)
- [ ] Encryption keys stored securely (OS keychain, KMS)
- [ ] Full-disk encryption enabled (FileVault, BitLocker)

**MP.L2-3.8.6**: Implement cryptographic mechanisms to protect CUI in transit
- [ ] TLS 1.2+ for all network transmission
- [ ] VPN or encrypted channels for file transfers
- [ ] Email encryption for CUI (S/MIME, PGP)

**SC.L2-3.13.7**: Establish and manage cryptographic keys
- [ ] Key generation uses FIPS 140-2 validated modules
- [ ] Key rotation schedule defined (annual minimum)
- [ ] Key lifecycle management documented

**AU.L2-3.3.1**: Create and retain audit records
- [ ] Secret access logged (who accessed which secret when)
- [ ] Secret rotation events logged
- [ ] Failed secret access attempts logged

---

## Quick Reference

**Never**:
- ❌ Hardcode secrets in source code
- ❌ Commit secrets to git
- ❌ Store secrets in plaintext files
- ❌ Log secrets (API keys, passwords, tokens)
- ❌ Email secrets unencrypted

**Always**:
- ✅ Use OS keychain (macOS/Windows/Linux)
- ✅ Use cloud secret managers for enterprise (AWS/Azure/GCP)
- ✅ Encrypt configuration files containing secrets
- ✅ Rotate secrets every 90 days (passwords, keys)
- ✅ Use .gitignore to prevent accidental commits
- ✅ Scan for secrets in CI/CD (gitleaks, git-secrets)

---

**Last Updated**: 2025-12-02
**CMMC Practices**: IA.L2-3.5.10, SC.L2-3.13.16, MP.L2-3.8.6, SC.L2-3.13.7, AU.L2-3.3.1
**Next Review**: 2026-03-02 (quarterly)
