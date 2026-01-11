# Phone Number Reconnaissance Workflow

Comprehensive phone number investigation including carrier lookup, VOIP detection, and social platform correlation.

## Trigger Phrases
- "phone lookup"
- "investigate phone number"
- "carrier lookup"
- "reverse phone"
- "phone OSINT"
- "who owns this number"
- "phone reconnaissance"

## Input
- `phone`: The phone number to investigate (any format, will be normalized to E.164)

## Process

### Step 1: Phone Number Validation
```
Parse and validate the phone number:
- Normalize to E.164 format (+[country code][number])
- Identify country of origin
- Determine region/area code
- Validate number length for country
- Check formatting validity

Use libphonenumber or equivalent for parsing:
- Country: US, GB, DE, etc.
- Type hint: MOBILE, FIXED_LINE, VOIP, TOLL_FREE, PREMIUM_RATE
- Geographic region (if applicable)
```

### Step 2: Carrier Lookup
```
Identify carrier and line type:
- Mobile Network Operator (MNO)
- Original carrier vs current carrier (if ported)
- Line type classification:
  - Mobile
  - Landline/Fixed
  - VOIP
  - Toll-free
  - Premium rate
- Network country

APIs: NumVerify, Twilio Lookup, Telnyx
```

### Step 3: VOIP Detection
```
Distinguish traditional vs VOIP numbers:
- VOIP provider identification:
  - Google Voice
  - TextNow
  - Skype
  - Vonage
  - Bandwidth.com
  - Twilio
  - Plivo
- Burner/temporary number indicators
- Virtual number services
- Porting history hints

Red flags for fraud:
- Recently ported
- Known VOIP ranges
- Disposable number services
```

### Step 4: Caller ID / Reverse Lookup
```
Attempt to identify owner:
- Name associated with number
- Address lookup (if available)
- Business registration
- Public directory listings
- CNAM (Caller ID Name) lookup

Sources:
- White pages databases
- Business directories
- Public records
- Data aggregators (with consent/legal basis)

Note: Results vary by country and privacy laws
```

### Step 5: Social Platform Correlation
```
Check for accounts registered with this phone:

1. WhatsApp
   - Profile picture (if public)
   - Status message
   - About info
   - Last seen indicator
   - Business account info

2. Telegram
   - Username (if enabled)
   - Profile photo
   - Bio
   - Premium status

3. Signal
   - Registration status (exists/not)
   - Safety number verification option

4. Other Messaging Apps
   - Viber
   - WeChat (region dependent)
   - Line

5. Social Platforms with Phone Search
   - Facebook (if phone is public)
   - Instagram (password reset enumeration - ethical limits)
   - Twitter/X (account recovery hints)
   - LinkedIn (if associated)
   - Snapchat (quick add by phone)

6. Payment/Finance Apps
   - Venmo (if public profile)
   - Cash App
   - PayPal (email hints)
```

### Step 6: Spam/Fraud Database Check
```
Check against known spam/scam databases:
- Reported spam caller databases
- FTC complaint records
- Fraud reporting services
- Community reporting platforms
- Robocall databases

Sources:
- Hiya
- Truecaller
- Nomorobo
- FTC Consumer Sentinel
- WhoCalled databases
- Community spam reports

Risk indicators:
- Number of spam reports
- Fraud association
- Robocall history
- Telemarketing flags
```

### Step 7: Historical Data
```
Research number history:
- Porting history (carrier changes)
- Previous owner indicators
- Number age estimation
- Recycled number detection
- Historical associations

Data points:
- First seen date
- Carrier change timeline
- Associated addresses over time
- Previous business listings
```

### Step 8: Store to Knowledge Graph

Use the **knowledge** skill to persist the findings:

```
Store the following as structured episodes:

1. Phone Entity:
   - Name: "Phone: {e164_number}"
   - Data: E.164 format, country, region, line type, carrier
   - Group: "osint-phones"

2. Carrier Information:
   - Name: "Carrier: {phone}"
   - Data: Current carrier, original carrier, line type, VOIP status
   - Relationships: owned_by carrier

3. Owner Information:
   - Name: "PhoneOwner: {phone}"
   - Data: Associated name, address, confidence level
   - Relationships: belongs_to person entity (if linked)

4. Social Accounts:
   - Name: "PhoneSocial: {phone}"
   - Data: Platforms found, usernames, profile data
   - Relationships: registered_with platforms

5. Risk Assessment:
   - Name: "PhoneRisk: {phone}"
   - Data: Spam reports, fraud flags, VOIP indicator, risk score
   - Temporal: last checked date

6. Historical Data:
   - Name: "PhoneHistory: {phone}"
   - Data: Porting history, previous associations, first seen
   - Timeline of changes
```

## Output Format

```
Phone Number Reconnaissance Report

Target Phone Number: +1 (555) 123-4567
Scan Date: 2026-01-11

Phone Number Validation:
- E.164 Format: +15551234567
- Country: United States (+1)
- Region: California (555)
- Number Valid: Yes
- Number Type: Mobile

Carrier Information:
- Current Carrier: Verizon Wireless
- Original Carrier: AT&T Mobility
- Line Type: Mobile
- Ported: Yes (2023)
- Network Status: Active

VOIP Analysis:
- VOIP Detected: No
- Traditional Mobile: Yes
- Provider Type: Major MNO
- Risk Level: Low

Owner Lookup:
- Associated Name: John Doe (Medium Confidence)
- Location: Los Angeles, CA
- Business Listing: None found
- Public Directory: Partial match

Social Platform Findings:
- WhatsApp: Registered
  - Profile Picture: Yes (person photo)
  - Status: "Available"
  - Last Seen: Recently
- Telegram: Registered
  - Username: @johndoe
  - Bio: "Tech enthusiast"
- Signal: Registered
- Facebook: Associated account found
- Venmo: Public profile (john-doe-123)

Spam/Fraud Check:
- Spam Reports: 0
- Fraud Flags: None
- Robocall Database: Not listed
- Community Reports: Clean
- Risk Score: Low (2/100)

Historical Data:
- First Seen: 2019
- Carrier Changes: 1 (AT&T to Verizon, 2023)
- Previous Associations: None found
- Number Age: Approximately 6 years

Risk Summary:
- Overall Risk: LOW
- VOIP/Burner: No
- Spam History: Clean
- Fraud Association: None
- Identity Confidence: Medium

Stored to Knowledge Graph: Yes
Entity ID: phone_15551234567
```

## Tools & APIs Used
- libphonenumber (Google) - Phone parsing and validation
- NumVerify API - Carrier lookup and validation
- Twilio Lookup API - Carrier and caller ID
- Telnyx API - Number intelligence
- WhatsApp Business API - Registration check
- Telegram API - Username lookup
- Truecaller API - Spam database
- Hiya API - Caller identification
- Open Carrier databases - Carrier ranges
- CNAM databases - Caller ID name

## Ethical Notes
- Comply with TCPA and equivalent telecommunications privacy laws
- Respect GDPR and data protection regulations for EU numbers
- Only use for legitimate investigative purposes
- Do not use results for harassment or unsolicited contact
- Caller ID spoofing for verification is illegal in many jurisdictions
- Some reverse lookup services require consent or legal basis
- Rate limit queries to avoid service abuse
- Document sources for audit trail
- Protect collected personal data appropriately
