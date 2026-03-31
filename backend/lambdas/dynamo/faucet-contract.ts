import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { createWalletClient, http, parseUnits, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum, arbitrumSepolia } from "viem/chains";

const FAUCET_ABI = [
  {
    name: "addClaimAmount",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "amountToAdd", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

let cachedPrivateKey: `0x${string}` | null = null;

const getPrivateKey = async (): Promise<`0x${string}`> => {
  if (cachedPrivateKey) return cachedPrivateKey;

  const secretArn = process.env.FAUCET_ALLOCATOR_SECRET_ARN;
  if (!secretArn) throw new Error("FAUCET_ALLOCATOR_SECRET_ARN env variable not set");

  const client = new SecretsManagerClient({});
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));

  const key = response.SecretString;
  if (!key || !key.startsWith("0x")) {
    throw new Error("Private key secret must be a hex string starting with 0x");
  }

  cachedPrivateKey = key as `0x${string}`;
  return cachedPrivateKey;
};

const getChain = () => {
  const env = process.env.APP_ENVIRONMENT;
  return env === "prod" ? arbitrum : arbitrumSepolia;
};

const getRpcUrl = () => {
  const url = process.env.ARBITRUM_RPC_URL;
  if (!url) throw new Error("ARBITRUM_RPC_URL env variable not set");
  return url;
};

/**
 * Calls addClaimAmount on the TokenFaucet contract.
 * Waits for the transaction to be included in a block before returning.
 * @returns The transaction hash.
 */
export const addClaimAmountOnChain = async (
  walletAddress: `0x${string}`,
  tokenAmount: number,
  tokenDecimals = 18,
): Promise<`0x${string}`> => {
  const faucetAddress = process.env.TOKEN_FAUCET_CONTRACT_ADDRESS as `0x${string}`;
  if (!faucetAddress) throw new Error("TOKEN_FAUCET_CONTRACT_ADDRESS env variable not set");

  const privateKey = await getPrivateKey();
  const account = privateKeyToAccount(privateKey);
  const chain = getChain();
  const rpcUrl = getRpcUrl();

  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  const amountRaw = parseUnits(String(tokenAmount), tokenDecimals);

  const faucet = getContract({
    address: faucetAddress,
    abi: FAUCET_ABI,
    client: walletClient,
  });

  const txHash = await faucet.write.addClaimAmount([walletAddress, amountRaw]);

  // Wait for the transaction to be mined
  const { createPublicClient } = await import("viem");
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return txHash;
};
