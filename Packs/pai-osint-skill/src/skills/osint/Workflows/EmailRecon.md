# Email Reconnaissance Workflow

Comprehensive email address investigation including validation, breach exposure, social correlation, and domain analysis.

## Trigger Phrases
- "email lookup"
- "investigate email"
- "email OSINT"
- "check email breaches"
- "find accounts for email"
- "email reconnaissance"
- "who owns this email"

## Input
- `email`: The email address to investigate (e.g., john.doe@example.com)
- `headers`: (Optional) Raw email headers for header analysis

## Process

### Step 1: Email Validation
```
Verify email deliverability:
- Syntax validation (RFC 5322)
- MX record check for domain
- SMTP connection test (if authorized)
- Disposable email detection
- Role-based email detection (info@, support@, etc.)
```

### Step 2: Email Format Analysis
```
Parse and analyze email components:
- Local part: john.doe
- Domain: example.com
- Naming patterns detected (firstname.lastname, firstlast, etc.)
- Common variations generated:
  - j.doe@example.com
  - johndoe@example.com
  - john_doe@example.com
  - jdoe@example.com
```

### Step 3: Breach Database Check
```
Query breach databases:
- HaveIBeenPwned API
  - Breach names and dates
  - Data types exposed (passwords, phone, address)
  - Paste appearances
- Additional breach sources (if available)
  - DeHashed (with authorization)
  - IntelX (with API key)

Output:
- Number of breaches
- Breach timeline
- Severity assessment
- Exposed data categories
```

### Step 4: Email-to-Social Correlation
```
Discover linked accounts:

1. Gravatar:
   - Hash email (MD5) and query Gravatar API
   - Retrieve avatar image
   - Profile data if available

2. GitHub:
   - Search commits by email
   - Author/committer matching
   - Repository associations

3. Social Platforms:
   - Hunter.io profile search
   - EmailRep.io social indicators
   - LinkedIn (limited without auth)
   - Twitter/X email search (if authorized)

4. Professional Directories:
   - Domain-associated directories
   - Industry-specific lookups
   - Company employee pages

5. Password Reset Pages:
   - Check for account existence indicators
   - Platform-specific enumeration (ethical, no exploitation)
```

### Step 5: Domain Analysis
```
Analyze email domain:
- MX records (mail server infrastructure)
- SPF record (authorized senders)
- DMARC policy (email authentication)
- DKIM selectors (if discoverable)
- Domain registration (WHOIS)
- Organization type (corporate, personal, provider)
```

### Step 6: Email Header Analysis
```
If email sample headers provided:
- Trace routing path (Received headers)
- Originating IP address
- Mail client/User-Agent
- Authentication results (SPF, DKIM, DMARC)
- Time zone indicators
- X-headers analysis
- Detect spoofing indicators
```

### Step 7: Reputation Assessment
```
Email reputation scoring:
- EmailRep.io reputation check
- Spam database presence
- Blacklist status
- Trust score calculation
- Risk indicators
```

### Step 8: Store to Knowledge Graph

Use the **knowledge** skill to persist findings:

```
Store the following as structured episodes:

1. Email Entity:
   - Name: "Email: {email}"
   - Data: Email address, domain, local part, validation status, reputation score
   - Group: "osint-emails"

2. Breach Exposure:
   - Name: "Breaches: {email}"
   - Data: Breach list, dates, exposed data types, severity
   - Relationships: exposed_in breach entities
   - Temporal metadata for timeline

3. Linked Accounts:
   - Name: "Accounts: {email}"
   - Data: Platform name, URL, username, confidence level
   - Relationships: owns_account, linked_to email entity

4. Gravatar Profile:
   - Name: "Gravatar: {email}"
   - Data: Avatar URL, hash, profile data
   - Relationships: avatar_for email entity

5. Domain Association:
   - Name: "Domain: {domain}"
   - Data: MX records, SPF, DMARC, organization
   - Relationships: email_domain_of email entity

6. Header Analysis (if provided):
   - Name: "Headers: {email}/{date}"
   - Data: Routing path, originating IP, auth results, anomalies
   - Relationships: received_from, routed_through
```

## Output Format

```
📋 EMAIL RECONNAISSANCE REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 EMAIL: john.doe@example.com
📅 SCAN DATE: 2026-01-11

✅ VALIDATION:
• Syntax: Valid (RFC 5322)
• MX Record: Found (mail.example.com)
• Deliverable: Yes
• Disposable: No
• Role-based: No

📊 FORMAT ANALYSIS:
• Local Part: john.doe
• Domain: example.com
• Pattern: firstname.lastname
• Variations Generated: 4

⚠️ BREACH EXPOSURE:
• Breaches Found: 3
• First Breach: 2019-05-12 (CompanyX)
• Latest Breach: 2024-03-15 (DataLeakY)
• Data Exposed: Email, Password Hash, Phone, Address
• Severity: HIGH

🔍 LINKED ACCOUNTS:

1. Gravatar ✓
   Hash: d4c74594d841139328695756648b6bd6
   Avatar: Found
   Profile: https://gravatar.com/johndoe

2. GitHub ✓
   Username: johndoe
   Commits: 234 (using this email)
   Repos: 12 public repositories

3. Hunter.io ✓
   Confidence: 94%
   Sources: 3 web mentions
   Position: Software Engineer
   Company: Example Corp

4. EmailRep.io ✓
   Reputation: High
   Profiles: Twitter, LinkedIn detected
   Days Since Domain Created: 4,521

❌ NOT FOUND ON:
• Facebook, Instagram (no direct link)

📡 DOMAIN ANALYSIS:
• MX: mail.example.com (Priority: 10)
• SPF: v=spf1 include:_spf.google.com ~all
• DMARC: v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com
• Organization: Example Corporation
• Hosting: Google Workspace

📨 HEADER ANALYSIS: (if provided)
• Originating IP: 203.0.113.45
• Mail Client: Mozilla Thunderbird 115.0
• Routing Hops: 4
• SPF: Pass
• DKIM: Pass
• DMARC: Pass
• Anomalies: None detected

🛡️ REPUTATION:
• Trust Score: 85/100
• Blacklisted: No
• Spam Reports: 0
• Risk Level: LOW

📈 TIMELINE:
• 2019-05: First breach exposure
• 2022-08: Second breach exposure
• 2024-03: Latest breach exposure
• 2026-01: Current scan

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
🔗 Entity ID: email_john_doe_example_com
```

## Tools & APIs Used
- Hunter.io (email verification, company lookup)
- HaveIBeenPwned API (breach checking)
- Gravatar API (avatar and profile lookup)
- EmailRep.io (reputation and social indicators)
- DNS tools (MX, SPF, DMARC, DKIM)
- WHOIS APIs (domain registration)
- GitHub Search API (commit email search)

## Ethical Notes
- Only use breach data for awareness, not exploitation
- Respect API rate limits and terms of service
- Do not attempt credential stuffing or account takeover
- Email validation should not trigger spam filters
- SMTP checks should be non-intrusive (no delivery attempts)
- Store findings securely and limit access
- Document collection methods for audit trail
- Notify targets if conducting authorized security assessments
