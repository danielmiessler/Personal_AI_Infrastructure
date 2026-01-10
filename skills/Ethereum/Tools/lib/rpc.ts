#!/usr/bin/env bun
/**
 * Shared RPC client for Ethereum skill
 * Provides viem client with automatic fallback to public RPCs
 */

import { createPublicClient, http, type PublicClient, type Chain } from 'viem';
import { mainnet } from 'viem/chains';

// Public RPC endpoints (fallback chain)
const PUBLIC_RPCS = [
  'https://cloudflare-eth.com',
  'https://rpc.ankr.com/eth',
  'https://eth.llamarpc.com',
  'https://ethereum.publicnode.com',
];

/**
 * Get RPC URL with fallback support
 * Tries ETHEREUM_RPC_URL first, then falls back to public RPCs
 */
export function getRpcUrl(): string {
  const envRpc = process.env.ETHEREUM_RPC_URL;
  if (envRpc) {
    return envRpc;
  }
  // Return first public RPC (could add health checking later)
  return PUBLIC_RPCS[0];
}

/**
 * Get all available RPC URLs for fallback
 */
export function getAllRpcUrls(): string[] {
  const envRpc = process.env.ETHEREUM_RPC_URL;
  if (envRpc) {
    return [envRpc, ...PUBLIC_RPCS];
  }
  return PUBLIC_RPCS;
}

// Cached client instance
let cachedClient: PublicClient | null = null;
let cachedRpcUrl: string | null = null;

/**
 * Create or get cached viem public client
 */
export function getClient(): PublicClient {
  const rpcUrl = getRpcUrl();

  // Return cached client if RPC hasn't changed
  if (cachedClient && cachedRpcUrl === rpcUrl) {
    return cachedClient;
  }

  cachedClient = createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl, {
      timeout: 30_000, // 30 second timeout
      retryCount: 3,
      retryDelay: 1000,
    }),
  });

  cachedRpcUrl = rpcUrl;
  return cachedClient;
}

/**
 * Create client with specific RPC URL (for fallback attempts)
 */
export function createClientWithRpc(rpcUrl: string): PublicClient {
  return createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl, {
      timeout: 30_000,
      retryCount: 2,
      retryDelay: 500,
    }),
  });
}

/**
 * Execute with fallback - tries each RPC until one succeeds
 */
export async function executeWithFallback<T>(
  operation: (client: PublicClient) => Promise<T>
): Promise<T> {
  const rpcs = getAllRpcUrls();
  let lastError: Error | null = null;

  for (const rpcUrl of rpcs) {
    try {
      const client = createClientWithRpc(rpcUrl);
      return await operation(client);
    } catch (error) {
      lastError = error as Error;
      console.error(`RPC ${rpcUrl} failed:`, (error as Error).message);
      continue;
    }
  }

  throw new Error(`All RPCs failed. Last error: ${lastError?.message}`);
}

/**
 * Format ETH value from wei to human-readable
 */
export function formatEth(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(6);
}

/**
 * Format token value with decimals
 */
export function formatToken(value: bigint, decimals: number): string {
  const divisor = 10 ** decimals;
  const formatted = Number(value) / divisor;
  return formatted.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

// Re-export useful viem types
export { mainnet } from 'viem/chains';
export type { PublicClient, Chain } from 'viem';
