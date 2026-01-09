import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("RouletteModule", (m) => {
  
  // Payment token address (USDC on Arbitrum One)
  const usdc = m.getParameter("usdc", "0xaf88d065e77c8cc2239327c5edb3a432268e5831");

  const vrfCoordinator = m.getParameter("vrfCoordinator", "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e");
  const keyHash = m.getParameter("keyHash", "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409");
  const subscriptionId = m.getParameter("subscriptionId", "86408957432666558315195197647360505857861818609609571127159217908480629896197");

  const minBetAmount = m.getParameter("minBetAmount", "1000000"); // 1 USDC
  const maxBetAmount = m.getParameter("maxBetAmount", "1000000000"); // 1000 USDC

  const feeCollector = m.getParameter("feeCollector", "0x919bd4C3B37B4Ffbb1566DFD8D83E1F087c659F4");
  const feeBps = m.getParameter("feeBps", 100); // 1%
  const callbackGasLimit = m.getParameter("callbackGasLimit", 500000); // 500,000 gas

  const roulette = m.contract("CFTRoulette", [
    usdc,
    vrfCoordinator,
    keyHash,
    subscriptionId,
    minBetAmount,
    maxBetAmount,
    feeCollector,
    feeBps,
    callbackGasLimit
  ]);

  return { roulette };
});