export const abi = [
  {
    type: "constructor",
    inputs: [
      { name: "cftToken_", internalType: "address", type: "address" },
      { name: "admin_", internalType: "address", type: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "error",
    name: "AccessControlUnauthorizedAccount",
    inputs: [
      { name: "account", internalType: "address", type: "address" },
      { name: "neededRole", internalType: "bytes32", type: "bytes32" },
    ],
  },
  {
    type: "error",
    name: "TaskAlreadyPaid",
    inputs: [{ name: "taskId", internalType: "bytes32", type: "bytes32" }],
  },
  {
    type: "error",
    name: "ZeroAmount",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroRecipientAddress",
    inputs: [],
  },
  {
    type: "function",
    name: "payout",
    inputs: [
      { name: "to", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "taskId", internalType: "bytes32", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "taskPaid",
    inputs: [{ name: "taskId", internalType: "bytes32", type: "bytes32" }],
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
] as const;