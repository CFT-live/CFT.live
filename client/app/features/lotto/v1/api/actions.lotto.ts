"use server";

import { weiToUsdc } from "@/app/helpers";
import { LOTTO_ADDRESS, LOTTO_ABI } from "../../../../lib/contracts";
import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";

// Create a public client for reading contract data
const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(process.env.SITE_INFURA_API_URL),
});

// Lotto contract functions
export interface LottoMetadata {
  currentDrawId: number;
  feeCollector: string;
  feePool: number;
  ticketPrice: number;
  maxTicketAmount: number;
  minRoundDurationSeconds: number;
  callbackGasLimit: number;
  feeBps: number;
  paused: boolean;
  ownerAddress: string;
}

export const getMetadata = async (): Promise<LottoMetadata | undefined> => {
  try {
    console.log("Fetching Lotto contract metadata...");
    const [metadataResult, ownerAddress] = await Promise.all([
      publicClient.readContract({
        address: LOTTO_ADDRESS,
        abi: LOTTO_ABI,
        functionName: "getMetadata",
      }),
      publicClient.readContract({
        address: LOTTO_ADDRESS,
        abi: LOTTO_ABI,
        functionName: "owner",
      }),
    ]);

    return {
      currentDrawId: Number(metadataResult[0]),
      feeCollector: metadataResult[1],
      feePool: weiToUsdc(metadataResult[2]),
      ticketPrice: weiToUsdc(metadataResult[3]),
      maxTicketAmount: Number(metadataResult[4]),
      minRoundDurationSeconds: Number(metadataResult[5]),
      callbackGasLimit: Number(metadataResult[6]),
      feeBps: Number(metadataResult[7]) / 100,
      paused: metadataResult[8],
      ownerAddress: ownerAddress as string,
    };
  } catch (error) {
    console.error("Error fetching Lotto metadata:", error);
    return undefined;
  }
};
