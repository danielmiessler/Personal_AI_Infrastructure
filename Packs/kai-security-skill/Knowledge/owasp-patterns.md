# OWASP Top 10 2021 - Security Patterns

Quick reference for OWASP Top 10 2021 with detection patterns and remediation guidance.

## Overview

The OWASP Top 10 represents the most critical security risks to web applications. This reference provides patterns for identification and remediation.

| # | Category | Risk Level | Prevalence |
|---|----------|------------|------------|
| A01 | Broken Access Control | Critical | Very High |
| A02 | Cryptographic Failures | High | High |
| A03 | Injection | Critical | Medium |
| A04 | Insecure Design | High | Medium |
| A05 | Security Misconfiguration | Medium | Very High |
| A06 | Vulnerable Components | High | High |
| A07 | Authentication Failures | High | Medium |
| A08 | Software Integrity Failures | Medium | Medium |
| A09 | Logging Failures | Medium | High |
| A10 | SSRF | Medium | Low |

---

## A01: Broken Access Control

**Description:** Failures to enforce proper access controls allowing users to act outside their intended permissions.

**Impact:** Unauthorized data access, modification, or deletion; privilege escalation.

### Common Examples

1. **IDOR (Insecure Direct Object Reference)**
   - URLs contain predictable IDs: `/api/users/123/profile`
   - Users can access other users' data by changing IDs

2. **Missing Function Level Access Control**
   - Admin endpoints accessible without admin role
   - API endpoints skip authorization checks

3. **Path Traversal**
   - File paths constructed from user input
   - `../` sequences not filtered

4. **CORS Misconfiguration**
   - `Access-Control-Allow-Origin: *`
   - Credentials allowed with wildcard origin

### Detection Patterns

```javascript
// IDOR - User ID from URL without ownership check
app.get('/api/users/:id', (req, res) => {
  const user = db.getUser(req.params.id);  // No authorization!
  res.json(user);
});

// Path traversal
const filePath = path.join(uploadDir, req.query.filename);  // Unsafe!
fs.readFile(filePath);

// Missing authorization middleware
app.delete('/api/admin/users/:id', deleteUser);  // No auth check!

// Permissive CORS
app.use(cors({ origin: '*', credentials: true }));  // Dangerous!
```

### Remediation

```javascript
// IDOR - Verify ownership
app.get('/api/users/:id', authorize, (req, res) => {
  if (req.params.id !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const user = db.getUser(req.params.id);
  res.json(user);
});

// Path traversal - Validate path
const safePath = path.resolve(uploadDir, req.query.filename);
if (!safePath.startsWith(path.resolve(uploadDir))) {
  return res.status(400).json({ error: 'Invalid path' });
}

// Authorization middleware on all routes
app.delete('/api/admin/users/:id', authorize, requireAdmin, deleteUser);

// Explicit CORS whitelist
app.use(cors({
  origin: ['https://app.example.com'],
  credentials: true
}));
```

---

## A02: Cryptographic Failures

**Description:** Failures related to cryptography that expose sensitive data.

**Impact:** Data breach, credential theft, privacy violations.

### Common Examples

1. **Weak Algorithms**
   - MD5, SHA1 for passwords
   - DES, 3DES for encryption

2. **Missing Encryption**
   - Sensitive data in plaintext
   - HTTP instead of HTTPS

3. **Key Management Issues**
   - Hardcoded keys
   - Keys in source control

4. **Improper Certificate Validation**
   - Disabled certificate checks
   - Self-signed certificates accepted

### Detection Patterns

```javascript
// Weak password hashing
const hash = crypto.createHash('md5').update(password).digest('hex');
const hash = crypto.createHash('sha1').update(password).digest('hex');

// Hardcoded secrets
const API_KEY = 'sk_live_abc123xyz';
const dbPassword = 'supersecretpassword';

// Disabled certificate validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const agent = new https.Agent({ rejectUnauthorized: false });

// Weak encryption
const cipher = crypto.createCipher('des', key);
```

### Remediation

```javascript
// Strong password hashing with bcrypt
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash(password, 12);

// Secrets from environment or secrets manager
const API_KEY = process.env.API_KEY;
const dbPassword = await secretsManager.getSecret('db-password');

// Proper TLS validation (default behavior)
// Don't disable certificate validation in production

// Strong encryption with AES-256-GCM
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
```

---

## A03: Injection

**Description:** Untrusted data sent to an interpreter as part of a command or query.

**Impact:** Data theft, data corruption, system compromise, RCE.

### Common Examples

1. **SQL Injection**
   - String concatenation in queries
   - Dynamic query building

2. **NoSQL Injection**
   - Object injection in MongoDB queries

3. **Command Injection**
   - User input in shell commands

4. **XSS (Cross-Site Scripting)**
   - User input rendered without encoding

### Detection Patterns

```javascript
// SQL injection
db.query("SELECT * FROM users WHERE email = '" + email + "'");
db.query(`DELETE FROM posts WHERE id = ${postId}`);

// NoSQL injection
db.users.find({ username: req.body.username, password: req.body.password });

// Command injection
exec("convert " + filename + " output.png");
spawn("ls", userInput);

// XSS
element.innerHTML = userInput;
res.send("<div>" + userComment + "</div>");
```

### Remediation

```javascript
// Parameterized SQL queries
db.query("SELECT * FROM users WHERE email = ?", [email]);
db.query("DELETE FROM posts WHERE id = $1", [postId]);

// NoSQL - Sanitize input types
const username = String(req.body.username);
const password = String(req.body.password);
db.users.find({ username, password: await bcrypt.compare(password, hash) });

// Command injection - Use arrays, avoid shell
execFile("convert", [sanitizedFilename, "output.png"]);
// Or use libraries instead of shell commands

// XSS - Encode output
element.textContent = userInput;
res.send(`<div>${escapeHtml(userComment)}</div>`);
// Or use templating with auto-escaping
```

---

## A04: Insecure Design

**Description:** Missing or ineffective security controls due to design flaws.

**Impact:** Varies; fundamental weaknesses that cannot be fixed by implementation alone.

### Common Examples

1. **Missing Rate Limiting**
   - No throttling on login attempts
   - Unlimited API requests

2. **Insufficient Input Validation**
   - No size limits
   - No format validation

3. **Missing Security Controls**
   - No CAPTCHA on public forms
   - No account lockout

4. **Trust Boundary Violations**
   - Client-side only validation
   - Trusting internal services implicitly

### Detection Patterns

```javascript
// No rate limiting
app.post('/login', (req, res) => {
  // Unlimited attempts allowed
  authenticate(req.body.username, req.body.password);
});

// No input limits
app.post('/upload', (req, res) => {
  // No file size limit
  saveFile(req.body.file);
});

// Client-side only validation
// If validation only exists in frontend JavaScript,
// backend accepts anything
```

### Remediation

```javascript
// Rate limiting
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts'
});
app.post('/login', loginLimiter, authenticate);

// Input limits
app.post('/upload', express.json({ limit: '1mb' }), (req, res) => {
  if (req.body.file.size > 1024 * 1024) {
    return res.status(400).json({ error: 'File too large' });
  }
  saveFile(req.body.file);
});

// Server-side validation (always validate on backend)
const { body, validationResult } = require('express-validator');
app.post('/user',
  body('email').isEmail(),
  body('age').isInt({ min: 0, max: 150 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  }
);
```

---

## A05: Security Misconfiguration

**Description:** Missing security hardening, default configurations, or excessive permissions.

**Impact:** Information disclosure, system compromise, service disruption.

### Common Examples

1. **Default Credentials**
   - Admin/admin, root/root
   - Default database passwords

2. **Verbose Errors**
   - Stack traces in production
   - Database error details exposed

3. **Missing Security Headers**
   - No Content-Security-Policy
   - No X-Frame-Options

4. **Debug Mode in Production**
   - DEBUG=true
   - Development settings active

### Detection Patterns

```javascript
// Debug mode in production
app.set('env', 'development');
DEBUG=true

// Verbose error handling
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack  // Exposes internals!
  });
});

// Missing security headers
// No helmet() or manual header setting

// Default configurations
// Using framework defaults without hardening
```

### Remediation

```javascript
// Production mode
app.set('env', 'production');
process.env.NODE_ENV = 'production';

// Safe error handling
app.use((err, req, res, next) => {
  console.error(err.stack); // Log for debugging
  res.status(500).json({
    error: 'Internal server error'  // Generic message
  });
});

// Security headers with helmet
const helmet = require('helmet');
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
  }
}));

// Explicit configuration
const config = {
  debug: false,
  logLevel: 'error',
  trustProxy: false
};
```

---

## A06: Vulnerable and Outdated Components

**Description:** Using components with known vulnerabilities or outdated versions.

**Impact:** Depends on component; can range from information disclosure to RCE.

### Common Examples

1. **Known CVEs**
   - Dependencies with published vulnerabilities

2. **Unmaintained Packages**
   - No security updates available

3. **Outdated Frameworks**
   - Old versions of major frameworks

### Detection Patterns

```bash
# Check for vulnerabilities
npm audit
yarn audit
pip-audit
bundle-audit

# Check for outdated packages
npm outdated
yarn outdated
pip list --outdated
```

### Remediation

```bash
# Update vulnerable packages
npm audit fix
yarn upgrade

# Use lockfiles for reproducibility
npm ci  # Uses package-lock.json
yarn install --frozen-lockfile

# Automated dependency updates
# Configure Dependabot or Renovate
```

```javascript
// Pin versions in package.json
{
  "dependencies": {
    "express": "4.18.2",  // Exact version
    "lodash": "^4.17.21"  // Minor updates only
  }
}
```

---

## A07: Identification and Authentication Failures

**Description:** Weaknesses in authentication mechanisms that allow unauthorized access.

**Impact:** Account takeover, credential theft, impersonation.

### Common Examples

1. **Weak Passwords Allowed**
   - No minimum length
   - No complexity requirements

2. **Missing Brute Force Protection**
   - No account lockout
   - No rate limiting

3. **Insecure Session Management**
   - Session IDs in URLs
   - No session expiration

4. **Credential Exposure**
   - Passwords in logs
   - Credentials in URLs

### Detection Patterns

```javascript
// Weak password policy
if (password.length >= 4) {  // Too short!
  createUser(username, password);
}

// No brute force protection
app.post('/login', (req, res) => {
  // Unlimited attempts
  if (checkPassword(username, password)) { ... }
});

// Session ID in URL
res.redirect(`/dashboard?sessionId=${session.id}`);

// Credentials logged
console.log(`Login attempt: ${username}:${password}`);
```

### Remediation

```javascript
// Strong password policy
const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true
};

// Account lockout
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000;
if (user.failedAttempts >= MAX_ATTEMPTS &&
    Date.now() - user.lastAttempt < LOCKOUT_TIME) {
  return res.status(429).json({ error: 'Account locked' });
}

// Secure session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  name: '__Host-session',
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600000  // 1 hour
  },
  resave: false,
  saveUninitialized: false
}));

// Don't log sensitive data
console.log(`Login attempt: ${username}`);  // No password!
```

---

## A08: Software and Data Integrity Failures

**Description:** Failures to verify integrity of software updates, critical data, or CI/CD pipelines.

**Impact:** Supply chain attacks, code injection, unauthorized modifications.

### Common Examples

1. **Insecure Deserialization**
   - Deserializing untrusted data
   - eval() on user input

2. **Unverified Updates**
   - Auto-updates without signatures
   - No integrity checks on downloads

3. **CI/CD Pipeline Vulnerabilities**
   - Unsigned commits deployed
   - Compromised build systems

### Detection Patterns

```javascript
// Insecure deserialization
const data = JSON.parse(userInput);  // JSON is usually safe
const obj = yaml.load(userInput);     // Can be unsafe
const obj = eval(userInput);          // Always unsafe!
const obj = unserialize(userInput);   // PHP-style, unsafe

// Unverified external resources
const script = await fetch(url);
eval(script);  // Never do this!
```

### Remediation

```javascript
// Safe deserialization
const data = JSON.parse(userInput);  // JSON is generally safe
const obj = yaml.load(userInput, { schema: yaml.JSON_SCHEMA });  // Restrict YAML

// Verify integrity
const crypto = require('crypto');
const expectedHash = '...';
const actualHash = crypto.createHash('sha256').update(data).digest('hex');
if (actualHash !== expectedHash) {
  throw new Error('Integrity check failed');
}

// Subresource Integrity for CDN resources
<script src="https://cdn.example.com/lib.js"
        integrity="sha384-..."
        crossorigin="anonymous"></script>
```

---

## A09: Security Logging and Monitoring Failures

**Description:** Insufficient logging, detection, monitoring, and response capabilities.

**Impact:** Delayed breach detection, inability to investigate incidents.

### Common Examples

1. **Missing Security Logs**
   - No login attempt logging
   - No access logs

2. **Sensitive Data in Logs**
   - Passwords logged
   - PII in logs

3. **Logs Not Monitored**
   - No alerting on suspicious activity
   - Logs never reviewed

### Detection Patterns

```javascript
// No logging
app.post('/login', (req, res) => {
  authenticate(req.body);  // No logging!
});

// Sensitive data logged
console.log('User login:', { username, password });  // Password logged!
console.log('Processing payment:', creditCardNumber);

// Local-only logs
console.log('Event:', event);  // Lost when container restarts
```

### Remediation

```javascript
// Comprehensive logging
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'security.log' }),
    new winston.transports.Console()
  ]
});

app.post('/login', (req, res) => {
  const { username } = req.body;
  logger.info('Login attempt', {
    username,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
  // Don't log password!
});

// Alert on suspicious activity
if (failedAttempts > 5) {
  logger.warn('Possible brute force attack', {
    username,
    attempts: failedAttempts,
    ip: req.ip
  });
  alertSecurityTeam({ type: 'brute_force', username, ip: req.ip });
}
```

---

## A10: Server-Side Request Forgery (SSRF)

**Description:** Application fetches remote resources using user-supplied URLs without validation.

**Impact:** Internal service access, cloud metadata theft, port scanning.

### Common Examples

1. **User-Controlled URLs**
   - Fetch arbitrary URLs
   - Redirect to internal services

2. **Cloud Metadata Access**
   - Access to 169.254.169.254
   - AWS credentials theft

3. **Internal Port Scanning**
   - Using application to scan internal network

### Detection Patterns

```javascript
// Direct URL fetch from user input
app.get('/fetch', async (req, res) => {
  const response = await fetch(req.query.url);  // SSRF!
  res.send(await response.text());
});

// Image/webhook with user URL
app.post('/webhook', async (req, res) => {
  await fetch(req.body.callbackUrl, { method: 'POST', body: data });
});
```

### Remediation

```javascript
// URL allowlist
const ALLOWED_HOSTS = ['api.example.com', 'cdn.example.com'];

app.get('/fetch', async (req, res) => {
  const url = new URL(req.query.url);

  // Check allowlist
  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    return res.status(400).json({ error: 'Host not allowed' });
  }

  // Block internal addresses
  const ip = await dns.resolve(url.hostname);
  if (isInternalIP(ip)) {
    return res.status(400).json({ error: 'Internal addresses not allowed' });
  }

  const response = await fetch(req.query.url);
  res.send(await response.text());
});

// Helper to check internal IPs
function isInternalIP(ip) {
  return ip.startsWith('10.') ||
         ip.startsWith('172.16.') ||
         ip.startsWith('192.168.') ||
         ip.startsWith('127.') ||
         ip === '169.254.169.254' ||  // Cloud metadata
         ip === 'localhost';
}
```

---

## Quick Reference Checklist

Use this checklist during security reviews:

- [ ] **A01** - Authorization checked on all endpoints?
- [ ] **A02** - Sensitive data encrypted? Strong algorithms?
- [ ] **A03** - User input sanitized? Parameterized queries?
- [ ] **A04** - Rate limiting? Input validation? Security controls?
- [ ] **A05** - Production settings? Security headers? Safe errors?
- [ ] **A06** - Dependencies scanned? Up to date?
- [ ] **A07** - Strong passwords? MFA? Secure sessions?
- [ ] **A08** - Integrity checks? Safe deserialization?
- [ ] **A09** - Security logging? No sensitive data in logs?
- [ ] **A10** - User URLs validated? Internal access blocked?

## Related Resources

- [SecurityReview Workflow](../Workflows/SecurityReview.md)
- [OWASP Top 10 Official](https://owasp.org/Top10/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
