# WalletLookup Workflow

> **Trigger:** "lookup wallet", "check address", "what tokens does X have"
> **Input:** Ethereum address or ENS name
> **Output:** Formatted wallet analysis with balances

## Step 1: Resolve Input

If input is ENS name, resolve to address using ResolveENS tool:

```bash
bun run $PAI_DIR/skills/Ethereum/Tools/ResolveENS.ts --name <input>
```

If input is already an address (starts with 0x), use directly.

## Step 2: Get ETH Balance

```bash
bun run $PAI_DIR/skills/Ethereum/Tools/GetBalance.ts --address <addr>
```

Record the ETH balance.

## Step 3: Get Token Balances

```bash
bun run $PAI_DIR/skills/Ethereum/Tools/GetBalance.ts --address <addr> --top-tokens --json
```

This checks balances for: USDC, USDT, WETH, DAI, LINK, UNI, AAVE, WBTC

## Step 4: Format Report

Present findings in a clean format:

```
Wallet: <address>
ENS: <name if available>

ETH Balance: X.XXXXXX ETH

Token Holdings:
  USDC: X,XXX.XX
  WETH: X.XXXX
  (etc.)

Total tokens with balance: N
```

## Completion

Offer follow-up actions:
- "Want me to check ENS records for this address?"
- "Should I look up any specific token?"
- "Should I send this to Telegram?"

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| User requests delivery | TelegramDelivery |
| User wants ENS deep dive | ENSResearch workflow |
