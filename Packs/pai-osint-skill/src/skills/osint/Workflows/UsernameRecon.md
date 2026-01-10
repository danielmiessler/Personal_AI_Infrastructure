# Username Reconnaissance Workflow

Enumerate a username across 400+ platforms to discover digital footprint.

## Trigger Phrases
- "find username"
- "check username across platforms"
- "username lookup"
- "where is this user"
- "digital footprint for username"

## Input
- `username`: The username/handle to search

## Process

### Step 1: Validate Input
```
Ensure username is provided and sanitized
Remove @ prefix if present
Check for invalid characters
```

### Step 2: Platform Categories
Search across these categories:

**Social Media (Major)**
- Twitter/X, Facebook, Instagram, TikTok, LinkedIn, Reddit, Pinterest, Tumblr

**Developer Platforms**
- GitHub, GitLab, Bitbucket, Stack Overflow, Dev.to, Codepen, HackerRank

**Professional/Business**
- LinkedIn, AngelList, Crunchbase, About.me

**Gaming**
- Steam, Xbox, PlayStation, Twitch, Discord (if public)

**Forums & Communities**
- Reddit, Hacker News, Medium, Quora, ProductHunt

**Creative**
- Behance, Dribbble, DeviantArt, SoundCloud, Spotify (if public)

**Messaging (Public)**
- Telegram (public channels), Keybase

### Step 3: Execute Search
For each platform:
1. Check if username exists (HTTP status, profile page)
2. Capture profile metadata if found
3. Note account creation indicators if available
4. Screenshot profile if Browser Pack available

### Step 4: Compile Results
```
Found on [X] platforms:
- Platform: [URL] - [Status: Active/Inactive/Uncertain]
  - Profile Name: [if different from username]
  - Bio: [if available]
  - Followers/Following: [if available]
  - Last Activity: [if detectable]
```

### Step 5: Store to Knowledge Graph

Use the **knowledge** skill to persist the findings:

```
Store the following as structured episodes:

1. Username Entity:
   - Name: "Username: {username}"
   - Data: Username, scan date, platforms found, confidence
   - Group: "osint-usernames"

2. Platform Accounts:
   - For each found account:
   - Name: "Account: {platform}/{username}"
   - Data: URL, bio, followers, status, last active
   - Relationships: belongs_to username entity

3. Profile Metadata:
   - Name: "Profile: {username}"
   - Data: Aggregated bio info, common themes, locations mentioned
   - Relationships: linked accounts
```

## Output Format

```
📋 USERNAME RECONNAISSANCE REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 USERNAME: johndoe
📅 SCAN DATE: 2026-01-09

📊 SUMMARY:
• Platforms Checked: 400+
• Accounts Found: 15
• Confidence: High

🔍 FOUND ACCOUNTS:

1. GitHub ✓
   URL: https://github.com/johndoe
   Bio: "Software Developer"
   Repos: 42 | Followers: 150

2. Twitter/X ✓
   URL: https://twitter.com/johndoe
   Bio: "Tech enthusiast"
   Tweets: 1,234 | Followers: 500

[... additional platforms ...]

❌ NOT FOUND ON:
• Facebook, LinkedIn, Instagram (username available)

⚠️ UNCERTAIN:
• TikTok (profile private)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
🔗 Entity ID: usr_johndoe_2026
```

## Tools Used
- Sherlock-style username checking
- Browser Pack for dynamic pages
- Knowledge Pack for storage

## Ethical Notes
- Only access publicly available profiles
- Respect rate limits
- Do not attempt to bypass privacy settings
