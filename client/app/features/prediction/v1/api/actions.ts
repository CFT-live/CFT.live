"use server";

import { HermesClient } from "@pythnetwork/hermes-client";
import { createPublicClient, createWalletClient, http, encodeFunctionData } from "viem";
import { arbitrum } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  PREDICTION_MARKET_ABI,
  PREDICTION_MARKET_ADDRESS,
  PYTH_CONTRACT,
  PYTH_ABI
} from "@/app/lib/contracts";
import { MILLIS, weiToUsdc } from "@/app/helpers";
import { ContractMetadata, ContractPriceFeeds } from "@/app/types";

// Create a public client for reading contract data
const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(process.env.SITE_INFURA_API_URL),
});

// Singleton wallet client to maintain consistent nonce tracking
let walletClientInstance: ReturnType<typeof createWalletClient> | null = null;
let walletAccount: ReturnType<typeof privateKeyToAccount> | null = null;

const getWalletClient = () => {
  if (!process.env.ARBITRUM_ONE_PRIVATE_KEY) {
    throw new Error("ARBITRUM_ONE_PRIVATE_KEY environment variable is not set");
  }

  walletAccount ??= privateKeyToAccount(
    process.env.ARBITRUM_ONE_PRIVATE_KEY as `0x${string}`
  );

  walletClientInstance ??= createWalletClient({
    account: walletAccount,
    chain: arbitrum,
    transport: http(process.env.SITE_INFURA_API_URL),
  });

  return walletClientInstance;
};

// Get the current nonce from the network
const getCurrentNonce = async (): Promise<number> => {
  if (!walletAccount) {
    getWalletClient(); // Initialize the account
  }
  
  // Try to get pending nonce first, fall back to latest
  try {
    const pendingNonce = await publicClient.getTransactionCount({
      address: walletAccount!.address,
      blockTag: "pending",
    });
    const latestNonce = await publicClient.getTransactionCount({
      address: walletAccount!.address,
      blockTag: "latest",
    });
    // Use the higher of the two to account for pending transactions
    const nonce = Math.max(pendingNonce, latestNonce);
    console.log(`Nonce check - pending: ${pendingNonce}, latest: ${latestNonce}, using: ${nonce}`);
    return nonce;
  } catch {
    // Fallback to latest only
    return await publicClient.getTransactionCount({
      address: walletAccount!.address,
      blockTag: "latest",
    });
  }
};

// Helper to execute a transaction with retry logic for nonce issues
const executeWithRetry = async <T>(
  fn: (nonce: number) => Promise<T>,
  maxRetries = 3
): Promise<T> => {
  let lastError: Error | null = null;
  let nonceOffset = 0;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const baseNonce = await getCurrentNonce();
      const nonce = baseNonce + nonceOffset;
      console.log(`Transaction attempt ${attempt + 1}/${maxRetries} with nonce ${nonce}`);
      return await fn(nonce);
    } catch (error) {
      lastError = error as Error;
      const errorMessage = String(error);
      
      // Check if it's a nonce-related error
      if (errorMessage.includes('nonce') || errorMessage.includes('Nonce')) {
        console.warn(`Nonce error on attempt ${attempt + 1}, retrying with higher nonce...`);
        nonceOffset++;
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // For non-nonce errors, throw immediately
      throw error;
    }
  }

  throw lastError;
};



const hermes = new HermesClient("https://hermes.pyth.network");

function to0x(hex: string): `0x${string}` {
  if (!hex) throw new Error('Empty update blob');
  return (hex.startsWith('0x') ? hex : `0x${hex}`) as `0x${string}`;
}

async function fetchUpdateBytes(feedIds: string[]): Promise<`0x${string}`[]> {
  const updates = await hermes.getLatestPriceUpdates(feedIds, { encoding: 'hex' });

  const raw = updates?.binary?.data;
  if (!raw) return [];

  if (Array.isArray(raw)) return raw.map(to0x);
  return [to0x(raw as string)];
}

async function updatePriceFeeds(feedIds: string[]) {
  console.log('Updating price feeds for IDs:', feedIds);
  const bytesArray = await fetchUpdateBytes(feedIds);

  if (bytesArray.length === 0) {
    console.log('No fresh updates from Hermes (already up to date).');
    return;
  }

  // 1) Get fee estimate
  const fee = await publicClient.readContract({
    address: PYTH_CONTRACT,
    abi: PYTH_ABI,
    functionName: 'getUpdateFee',
    args: [bytesArray],
  });

  if (fee <= BigInt(0)) {
    // Very unusual; helps catch malformed payloads early
    throw new Error('getUpdateFee returned 0 — payloads likely malformed or wrong contract address.');
  }

  console.log(`Paying fee: ${fee.toString()} wei for ${bytesArray.length} updates`);

  // 2) Submit update with retry logic for nonce issues
  return await executeWithRetry(async (nonce) => {
    const walletClient = getWalletClient();
    
    const data = encodeFunctionData({
      abi: PYTH_ABI,
      functionName: 'updatePriceFeeds',
      args: [bytesArray],
    });

    const hash = await walletClient.sendTransaction({
      account: walletClient.account!,
      chain: arbitrum,
      to: PYTH_CONTRACT,
      data,
      value: fee,
      nonce,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ Updated ${bytesArray.length} feeds. tx=${hash} block=${receipt.blockNumber}`);
    return receipt;
  });
}

export const getContractMetadata = async (): Promise<
  ContractMetadata | undefined
> => {
  try {
    console.log("Fetching contract metadata...");
    const result = (await publicClient.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "getMetadata",
    }));
    return {
      ownerAddress: result[0],
      paymentTokenAddress: result[1],
      betLockBufferInSeconds: Number(result[2]),
      dataWaitWindowInSeconds: Number(result[3]),
      feeBpsPercentage: result[4] / 100,
      minBetAmount: weiToUsdc(result[5]),
      maxBetAmount: weiToUsdc(result[6]),
      maxOpenRoundsPerUser: Number(result[7]),
      minOpenTimeInSeconds: Number(result[8]),
      minLockTimeInSeconds: Number(result[9]),
      advanceCooldownInSeconds: Number(result[10]),
      priceMaxAge: Number(result[11]),
      paused: result[12],
    };
  } catch (error) {
    console.error("Error fetching contract metadata:", error);
    return undefined;
  }
};

export const getContractPriceFeeds = async (): Promise<
  ContractPriceFeeds | undefined
> => {
  try {
    console.log("Fetching contract price feeds...");
    const result = (await publicClient.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "getPriceFeeds",
    }));
    return {
            ETH: result[0],
            ARB: result[1],
            AAVE: result[2],
            BTC: result[3],
            SOL: result[4],
            XRP: result[5],
            BNB: result[6],
            DOGE: result[7],
            PEPE: result[8],
            SHIB: result[9]
    };
  } catch (error) {
    console.error("Error fetching contract price feeds:", error);
    return undefined;
  }
};

/**
 * Get the active round IDs from the contract
 * @returns Array of [openRoundIds, liveRoundIds]
 */
const getActiveRoundIds = async (): Promise<[bigint[], bigint[]]> => {
  try {
    const result = await publicClient.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "getActiveRoundIds",
    });
    return result as [bigint[], bigint[]];
  } catch (error) {
    console.error("Error fetching active round IDs:", (error as Error).message || error);
    throw new Error("Failed to fetch active round IDs");
  }
};

/**
 * Get the active round IDs from the contract
 * @returns Array of [openRoundIds, liveRoundIds]
 */
const getNextAdvanceDeadline = async (): Promise<unknown> => {
  try {
    const result = await publicClient.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "getNextAdvanceDeadline",
    });
    return result;
  } catch (error) {
    console.error("Error fetching next advance deadline:", (error as Error).message || error);
    throw new Error("Failed to fetch next advance deadline");
  }
};

/**
 * Call the advance function on the contract to progress rounds
 * @returns Transaction hash
 */
const runAdvance = async (): Promise<`0x${string}` | undefined> => {
  try {
    console.log("Advance action called");

    return await executeWithRetry(async (nonce) => {
      const walletClient = getWalletClient();

      // Simulate the transaction first (optional but recommended)
      await publicClient.simulateContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_ABI,
        functionName: "advance",
        args: [],
        account: walletClient.account,
      });

      const data = encodeFunctionData({
        abi: PREDICTION_MARKET_ABI,
        functionName: "advance",
        args: [],
      });

      // Execute the transaction with explicit nonce
      const hash = await walletClient.sendTransaction({
        account: walletClient.account!,
        chain: arbitrum,
        to: PREDICTION_MARKET_ADDRESS,
        data,
        nonce,
      });

      console.log("Advance transaction submitted:", hash);

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("Advance transaction confirmed:", receipt.status);

      return hash;
    });
  } catch (error) {
    console.error("Error running advance:", (error as Error).message || error);
    throw new Error("Failed to run advance transaction");
  }
};

export const runAdvanceCheck = async (): Promise<number | undefined> => {
  try {
    console.log("Running advance check...");
    const [openRoundIds, liveRoundIds] = await getActiveRoundIds();

    if (openRoundIds.length === 0 && liveRoundIds.length === 0) {
      console.log("No active rounds to advance.");
      return undefined;
    }

    console.log("Open round IDs:", openRoundIds);
    console.log("Live round IDs:", liveRoundIds);

    const nextAdvanceDeadline = await getNextAdvanceDeadline();

    if (
      !nextAdvanceDeadline ||
      typeof nextAdvanceDeadline !== "bigint" ||
      Number(nextAdvanceDeadline) === Number.MAX_SAFE_INTEGER
    ) {
      console.log(
        "No advance deadline available. Response:",
        nextAdvanceDeadline
      );
      return undefined;
    }

    const nextAdvanceDeadlineMillis =
      Number(nextAdvanceDeadline) * MILLIS.inSecond;

    console.log(
      "Next advance deadline (timestamp):",
      nextAdvanceDeadlineMillis,
      "Date:",
      new Date(nextAdvanceDeadlineMillis).toISOString()
    );

    const now = Date.now();
    const timeUntilDeadline = nextAdvanceDeadlineMillis - now;

    if (timeUntilDeadline <= 0) {
      console.log("Advancing rounds now...");
      try {

        const priceFeeds = await getContractPriceFeeds();
        console.log("Current contract price feeds before update:", priceFeeds);
        if (!priceFeeds) {
          console.warn("No price feeds available; skipping advance.");
          return now + 10 * MILLIS.inSecond;
        }

        const receipt = await updatePriceFeeds(Object.values(priceFeeds));
        if (receipt?.status !== "success") {
          console.warn("Price feed update failed; skipping advance.");
          return now + 10 * MILLIS.inSecond;
        }
        await runAdvance();
        console.log("Advance completed successfully");
      } catch (error) {
        console.error("Error during advance:", error);
      }
      // Check again soon after advancing to get the new deadline
      return now + 5 * MILLIS.inSecond;
    }

    console.log(
      "No rounds need advancing at this time (deadline in",
      timeUntilDeadline / MILLIS.inSecond,
      "seconds)"
    );
    return nextAdvanceDeadlineMillis;
  } catch (error) {
    console.error("Critical error in runAdvanceCheck:", (error as Error).message || error);
    return undefined; // Ensures no error propagates from this Server Action
  }
};
