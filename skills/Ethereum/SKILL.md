---
name: Ethereum
description: Ethereum blockchain read operations. USE WHEN resolving ENS names OR checking wallet balances OR reading smart contract state OR looking up Ethereum addresses.
---

# Ethereum

Read-only Ethereum primitives: ENS resolution, balance queries, and smart contract view calls.

**Announce at start:** "I'm using the Ethereum skill to query the blockchain."

## Workflow Routing

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **WalletLookup** | "lookup wallet", "check address", "what tokens" | Full wallet analysis with balances |
| **ENSResearch** | "resolve ENS", "ENS records", "who owns" | Deep ENS name exploration |

## CLI Tools

### ResolveENS

Resolve ENS names to addresses and vice versa.

```bash
# Name to address
bun run $PAI_DIR/skills/Ethereum/Tools/ResolveENS.ts --name vitalik.eth

# Address to name (reverse)
bun run $PAI_DIR/skills/Ethereum/Tools/ResolveENS.ts --address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

# Get all records
bun run $PAI_DIR/skills/Ethereum/Tools/ResolveENS.ts --name vitalik.eth --records

# JSON output
bun run $PAI_DIR/skills/Ethereum/Tools/ResolveENS.ts --name vitalik.eth --json
```

### GetBalance

Query ETH and ERC-20 token balances.

```bash
# ETH balance
bun run $PAI_DIR/skills/Ethereum/Tools/GetBalance.ts --address 0x...

# Specific token
bun run $PAI_DIR/skills/Ethereum/Tools/GetBalance.ts --address 0x... --token USDC

# Top tokens
bun run $PAI_DIR/skills/Ethereum/Tools/GetBalance.ts --address 0x... --top-tokens

# Also works with ENS names
bun run $PAI_DIR/skills/Ethereum/Tools/GetBalance.ts --address vitalik.eth --top-tokens
```

**Supported tokens:** USDC, USDT, WETH, DAI, LINK, UNI, AAVE, WBTC

### ReadContract

Call view functions on any smart contract.

```bash
# Read totalSupply
bun run $PAI_DIR/skills/Ethereum/Tools/ReadContract.ts \
  --contract 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  --function "totalSupply()"

# Read with arguments
bun run $PAI_DIR/skills/Ethereum/Tools/ReadContract.ts \
  --contract 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  --function "balanceOf(address)" \
  --args 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

# Get token name
bun run $PAI_DIR/skills/Ethereum/Tools/ReadContract.ts \
  --contract 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  --function "name()"
```

## Configuration

Uses public RPCs by default. Set `ETHEREUM_RPC_URL` for custom RPC:

```bash
export ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
```

**Public fallback chain:** Cloudflare → Ankr → LlamaRPC → PublicNode

## Examples

**Example 1: Resolve an ENS name**
```
User: "Who owns vitalik.eth?"
→ Invokes ResolveENS tool
→ Returns: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

**Example 2: Check wallet balance**
```
User: "What's in this wallet: 0xd8dA..."
→ Invokes WalletLookup workflow
→ Returns: ETH balance + top token holdings
```

**Example 3: Read contract state**
```
User: "What's the total supply of USDC?"
→ Invokes ReadContract with totalSupply()
→ Returns: 26000000000000000 (raw) or formatted
```

## Related Skills

**Calls:**
- **TelegramDelivery** - Send wallet analysis reports

**Called by:**
- **Nansen** - May use for address resolution
