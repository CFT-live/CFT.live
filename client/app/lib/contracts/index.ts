

export const LOTTO_ADDRESS = process.env.NEXT_PUBLIC_LOTTO_CONTRACT_ADDRESS! as `0x${string}`;
export { abi as LOTTO_ABI } from './abis/Lotto';

export const PREDICTION_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_CONTRACT_ADDRESS! as `0x${string}`;
export { abi as PREDICTION_MARKET_ABI } from './abis/PredictionMarket';

export const ROULETTE_ADDRESS = process.env.NEXT_PUBLIC_ROULETTE_CONTRACT_ADDRESS! as `0x${string}`;
export { abi as ROULETTE_ABI } from './abis/Roulette';

export const CFT_REDEMPTION_POOL_ADDRESS = process.env.NEXT_PUBLIC_CFT_REDEMPTION_POOL_CONTRACT_ADDRESS! as `0x${string}`;
export { abi as CFT_REDEMPTION_POOL_ABI } from './abis/RedemptionPool';
export const CFT_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_CFT_TOKEN_CONTRACT_ADDRESS! as `0x${string}`;
export { abi as CFT_TOKEN_ABI } from './abis/CftToken';
export const CONTRIBUTOR_DISTRIBUTOR_ADDRESS = process.env.NEXT_PUBLIC_CONTRIBUTOR_DISTRIBUTOR_CONTRACT_ADDRESS! as `0x${string}`;
export { abi as CONTRIBUTOR_DISTRIBUTOR_ABI } from './abis/ContributorDistributor';

// Arbitrum USDC address
export const USDC_ADDRESS = '0xaf88d065e77c8cc2239327c5edb3a432268e5831' as const;

export const erc20Abi = [
  { type: "function", name: "allowance", stateMutability: "view", inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" }
    ], outputs: [{ type: "bool" }] },
] as const;

export const PYTH_ABI = [
  {
    type: "function",
    name: "getUpdateFee",
    stateMutability: "view",
    inputs: [{ name: "updateData", type: "bytes[]" }],
    outputs: [{ name: "feeAmount", type: "uint256" }],
  },
  {
    type: "function",
    name: "updatePriceFeeds",
    stateMutability: "payable",
    inputs: [{ name: "updateData", type: "bytes[]" }],
    outputs: [],
  },
] as const;

// The Pyth contract address on Arbitrum mainnet
export const PYTH_CONTRACT = (process.env.PYTH_CONTRACT ??
  "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C") as `0x${string}`;