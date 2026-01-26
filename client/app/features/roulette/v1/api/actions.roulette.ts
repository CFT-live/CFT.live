import { weiToUsdc } from "@/app/helpers";
import { ROULETTE_ADDRESS, ROULETTE_ABI } from "@/app/lib/contracts";
import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";

// Create a public client for reading contract data
const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(process.env.NEXT_PUBLIC_SITE_INFURA_API_URL),
});

// Roulette contract metadata interface
export interface RouletteMetadata {
  nextTableId: number;
  minBetAmount: number;
  maxBetAmount: number;
  callbackGasLimit: number;
  feeBps: number;
  paused: boolean;
  ownerAddress: string;
}

export const getMetadata = async (): Promise<RouletteMetadata | undefined> => {
  try {
    console.log("Fetching Roulette contract metadata...");
    const [metadataResult, ownerAddress] = await Promise.all([
      publicClient.readContract({
        address: ROULETTE_ADDRESS,
        abi: ROULETTE_ABI,
        functionName: "getMetadata",
      }),
      publicClient.readContract({
        address: ROULETTE_ADDRESS,
        abi: ROULETTE_ABI,
        functionName: "owner",
      }),
    ]);

    return {
      nextTableId: Number(metadataResult[0]),
      minBetAmount: weiToUsdc(metadataResult[1]),
      maxBetAmount: weiToUsdc(metadataResult[2]),
      callbackGasLimit: Number(metadataResult[3]),
      feeBps: Number(metadataResult[4]) / 100,
      paused: metadataResult[5],
      ownerAddress: ownerAddress as string,
    };
  } catch (error) {
    console.error("Error fetching Roulette metadata:", error);
    return undefined;
  }
};
