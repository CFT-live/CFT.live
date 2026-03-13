export const abi = [
  {
    type: "function",
    name: "cft",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "quote",
    stateMutability: "view",
    inputs: [{ name: "cftAmountIn", type: "uint256" }],
    outputs: [{ name: "usdcOut", type: "uint256" }],
  },
  {
    type: "function",
    name: "redeem",
    stateMutability: "nonpayable",
    inputs: [
      { name: "cftAmountIn", type: "uint256" },
      { name: "minUsdcOut", type: "uint256" },
    ],
    outputs: [{ name: "usdcOut", type: "uint256" }],
  },
  {
    type: "function",
    name: "redeemWithPermit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "cftAmountIn", type: "uint256" },
      { name: "minUsdcOut", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [{ name: "usdcOut", type: "uint256" }],
  },
  {
    type: "function",
    name: "usdc",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;