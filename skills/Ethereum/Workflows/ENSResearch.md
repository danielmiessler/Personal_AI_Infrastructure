# ENSResearch Workflow

> **Trigger:** "resolve ENS", "ENS records", "who owns", "lookup .eth name"
> **Input:** ENS name (e.g., vitalik.eth) or Ethereum address
> **Output:** Complete ENS profile with records and metadata

## Step 1: Determine Direction

- If input is an ENS name (ends with .eth): do forward resolution
- If input is an address (starts with 0x): do reverse resolution first

## Step 2: Forward Resolution (name → address)

```bash
bun run $PAI_DIR/skills/Ethereum/Tools/ResolveENS.ts --name <name> --records --json
```

This returns:
- Resolved address
- Text records (avatar, description, url, twitter, github, email)
- Avatar URL if available

## Step 3: Reverse Resolution (address → name)

If starting with an address:

```bash
bun run $PAI_DIR/skills/Ethereum/Tools/ResolveENS.ts --address <addr>
```

Then proceed to get full records for the resolved name.

## Step 4: Get Wallet Summary

Optionally get a quick balance overview:

```bash
bun run $PAI_DIR/skills/Ethereum/Tools/GetBalance.ts --address <addr>
```

## Step 5: Format Report

Present findings:

```
ENS Name: vitalik.eth
Address: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

Records:
  avatar: <url>
  description: <text>
  url: <website>
  com.twitter: <handle>
  com.github: <username>
  email: <email>

ETH Balance: X.XXXXXX ETH
```

## Completion

Offer follow-up actions:
- "Want me to check token balances?" → WalletLookup workflow
- "Should I analyze this wallet's activity?" → (future capability)
- "Send this profile to Telegram?" → TelegramDelivery skill

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| User wants full wallet analysis | WalletLookup workflow |
| User requests delivery | TelegramDelivery |
