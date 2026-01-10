#!/usr/bin/env bun
/**
 * GetBalance - Query ETH and ERC-20 token balances
 *
 * Usage:
 *   bun run GetBalance.ts --address 0x...
 *   bun run GetBalance.ts --address 0x... --token USDC
 *   bun run GetBalance.ts --address 0x... --top-tokens
 *   bun run GetBalance.ts --address vitalik.eth
 */

import { parseArgs } from 'util';
import { formatUnits, erc20Abi, isAddress } from 'viem';
import { normalize } from 'viem/ens';
import { executeWithFallback, formatEth, type PublicClient } from './lib/rpc';

// Common token addresses (mainnet)
const TOKENS: Record<string, { address: `0x${string}`; decimals: number; symbol: string }> = {
  USDC: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    symbol: 'USDC',
  },
  USDT: {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    symbol: 'USDT',
  },
  WETH: {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    decimals: 18,
    symbol: 'WETH',
  },
  DAI: {
    address: '0x6B175474E89094C44Da98b954EescdeCB5BE3dD4',
    decimals: 18,
    symbol: 'DAI',
  },
  LINK: {
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    decimals: 18,
    symbol: 'LINK',
  },
  UNI: {
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    decimals: 18,
    symbol: 'UNI',
  },
  AAVE: {
    address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    decimals: 18,
    symbol: 'AAVE',
  },
  WBTC: {
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    decimals: 8,
    symbol: 'WBTC',
  },
};

interface BalanceOptions {
  address: string;
  token?: string;
  topTokens: boolean;
  json: boolean;
}

function parseArguments(): BalanceOptions {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      address: { type: 'string', short: 'a' },
      token: { type: 'string', short: 't' },
      'top-tokens': { type: 'boolean', default: false },
      json: { type: 'boolean', short: 'j', default: false },
    },
  });

  if (!values.address) {
    console.error('Error: --address is required');
    process.exit(1);
  }

  return {
    address: values.address,
    token: values.token,
    topTokens: values['top-tokens'] ?? false,
    json: values.json ?? false,
  };
}

async function resolveAddress(client: PublicClient, input: string): Promise<`0x${string}`> {
  // Check if it's already a valid address
  if (isAddress(input)) {
    return input as `0x${string}`;
  }

  // Try to resolve as ENS name
  if (input.endsWith('.eth')) {
    const address = await client.getEnsAddress({ name: normalize(input) });
    if (!address) {
      throw new Error(`Could not resolve ENS name: ${input}`);
    }
    return address;
  }

  throw new Error(`Invalid address or ENS name: ${input}`);
}

async function getEthBalance(client: PublicClient, address: `0x${string}`): Promise<bigint> {
  return await client.getBalance({ address });
}

async function getTokenBalance(
  client: PublicClient,
  tokenAddress: `0x${string}`,
  walletAddress: `0x${string}`
): Promise<bigint> {
  return await client.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [walletAddress],
  });
}

async function main() {
  const opts = parseArguments();

  try {
    // Resolve address (could be ENS name)
    const address = await executeWithFallback((client) => resolveAddress(client, opts.address));

    if (opts.token) {
      // Get specific token balance
      const tokenUpper = opts.token.toUpperCase();
      const tokenInfo = TOKENS[tokenUpper];

      if (!tokenInfo) {
        console.error(`Unknown token: ${opts.token}`);
        console.error(`Available tokens: ${Object.keys(TOKENS).join(', ')}`);
        process.exit(1);
      }

      const balance = await executeWithFallback((client) =>
        getTokenBalance(client, tokenInfo.address, address)
      );

      const formatted = formatUnits(balance, tokenInfo.decimals);

      if (opts.json) {
        console.log(
          JSON.stringify({
            address,
            token: tokenInfo.symbol,
            balance: formatted,
            raw: balance.toString(),
          })
        );
      } else {
        console.log(`${formatted} ${tokenInfo.symbol}`);
      }
    } else if (opts.topTokens) {
      // Get ETH + top tokens
      const ethBalance = await executeWithFallback((client) => getEthBalance(client, address));

      const tokenBalances: Record<string, string> = {};

      for (const [symbol, info] of Object.entries(TOKENS)) {
        try {
          const balance = await executeWithFallback((client) =>
            getTokenBalance(client, info.address, address)
          );

          if (balance > 0n) {
            tokenBalances[symbol] = formatUnits(balance, info.decimals);
          }
        } catch {
          // Skip failed token lookups
        }
      }

      if (opts.json) {
        console.log(
          JSON.stringify({
            address,
            eth: formatEth(ethBalance),
            tokens: tokenBalances,
          })
        );
      } else {
        console.log(`Address: ${address}`);
        console.log(`ETH: ${formatEth(ethBalance)}`);
        console.log('\nTokens:');
        for (const [symbol, balance] of Object.entries(tokenBalances)) {
          console.log(`  ${symbol}: ${balance}`);
        }
        if (Object.keys(tokenBalances).length === 0) {
          console.log('  (no token balances found)');
        }
      }
    } else {
      // Just ETH balance
      const balance = await executeWithFallback((client) => getEthBalance(client, address));

      if (opts.json) {
        console.log(
          JSON.stringify({
            address,
            eth: formatEth(balance),
            raw: balance.toString(),
          })
        );
      } else {
        console.log(`${formatEth(balance)} ETH`);
      }
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
