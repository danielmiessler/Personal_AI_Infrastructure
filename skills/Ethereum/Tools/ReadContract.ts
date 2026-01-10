#!/usr/bin/env bun
/**
 * ReadContract - Call view functions on smart contracts
 *
 * Usage:
 *   bun run ReadContract.ts --contract 0x... --function "totalSupply()"
 *   bun run ReadContract.ts --contract 0x... --function "balanceOf(address)" --args 0x...
 *   bun run ReadContract.ts --contract 0x... --function "name()"
 */

import { parseArgs } from 'util';
import { type Abi } from 'viem';
import { executeWithFallback, type PublicClient } from './lib/rpc';

interface ReadContractOptions {
  contract: string;
  function: string;
  args?: string;
  json: boolean;
}

function parseArguments(): ReadContractOptions {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      contract: { type: 'string', short: 'c' },
      function: { type: 'string', short: 'f' },
      args: { type: 'string', short: 'a' },
      json: { type: 'boolean', short: 'j', default: false },
    },
  });

  if (!values.contract) {
    console.error('Error: --contract is required');
    process.exit(1);
  }

  if (!values.function) {
    console.error('Error: --function is required');
    process.exit(1);
  }

  return {
    contract: values.contract,
    function: values.function,
    args: values.args,
    json: values.json ?? false,
  };
}

export function parseFunction(funcSig: string): { name: string; inputs: string[] } {
  // Parse function signature like "balanceOf(address)" or "totalSupply()"
  const match = funcSig.match(/^(\w+)\((.*)\)$/);

  if (!match) {
    // Simple function name without parens
    return { name: funcSig, inputs: [] };
  }

  const name = match[1];
  const inputsStr = match[2];

  if (!inputsStr) {
    return { name, inputs: [] };
  }

  const inputs = inputsStr.split(',').map((s) => s.trim());
  return { name, inputs };
}

function buildAbiItem(funcName: string, inputTypes: string[]): Abi {
  // Build a minimal ABI for the function call
  const inputs = inputTypes.map((type, i) => ({
    name: `arg${i}`,
    type,
  }));

  return [
    {
      type: 'function',
      name: funcName,
      inputs,
      outputs: [{ name: '', type: 'uint256' }], // Default to uint256, will work for most cases
      stateMutability: 'view',
    },
  ];
}

function parseArgsString(argsStr: string | undefined): unknown[] {
  if (!argsStr) {
    return [];
  }

  // Split by comma, but handle addresses and other values
  const parts = argsStr.split(',').map((s) => s.trim());

  return parts.map((part) => {
    // If it looks like a number, parse it as bigint
    if (/^\d+$/.test(part)) {
      return BigInt(part);
    }
    // Otherwise return as string (addresses, etc.)
    return part;
  });
}

async function readContract(
  client: PublicClient,
  contractAddress: `0x${string}`,
  funcName: string,
  inputTypes: string[],
  args: unknown[]
): Promise<unknown> {
  const abi = buildAbiItem(funcName, inputTypes);

  try {
    const result = await client.readContract({
      address: contractAddress,
      abi,
      functionName: funcName,
      args: args.length > 0 ? args : undefined,
    });

    return result;
  } catch (error) {
    // If default ABI fails, try with different output types
    const altAbis = [
      [
        {
          type: 'function' as const,
          name: funcName,
          inputs: inputTypes.map((type, i) => ({ name: `arg${i}`, type })),
          outputs: [{ name: '', type: 'string' }],
          stateMutability: 'view' as const,
        },
      ],
      [
        {
          type: 'function' as const,
          name: funcName,
          inputs: inputTypes.map((type, i) => ({ name: `arg${i}`, type })),
          outputs: [{ name: '', type: 'address' }],
          stateMutability: 'view' as const,
        },
      ],
      [
        {
          type: 'function' as const,
          name: funcName,
          inputs: inputTypes.map((type, i) => ({ name: `arg${i}`, type })),
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'view' as const,
        },
      ],
    ];

    for (const altAbi of altAbis) {
      try {
        const result = await client.readContract({
          address: contractAddress,
          abi: altAbi,
          functionName: funcName,
          args: args.length > 0 ? args : undefined,
        });
        return result;
      } catch {
        continue;
      }
    }

    // If all alternatives fail, throw original error
    throw error;
  }
}

async function main() {
  const opts = parseArguments();

  try {
    const contractAddress = opts.contract as `0x${string}`;
    const { name: funcName, inputs: inputTypes } = parseFunction(opts.function);
    const args = parseArgsString(opts.args);

    const result = await executeWithFallback((client) =>
      readContract(client, contractAddress, funcName, inputTypes, args)
    );

    // Format result
    let formattedResult: string;
    if (typeof result === 'bigint') {
      formattedResult = result.toString();
    } else if (typeof result === 'object') {
      formattedResult = JSON.stringify(result, (_, v) => (typeof v === 'bigint' ? v.toString() : v));
    } else {
      formattedResult = String(result);
    }

    if (opts.json) {
      console.log(
        JSON.stringify({
          contract: opts.contract,
          function: opts.function,
          args: opts.args || null,
          result: formattedResult,
        })
      );
    } else {
      console.log(formattedResult);
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
