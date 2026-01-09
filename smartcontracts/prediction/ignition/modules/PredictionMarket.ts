import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PredictionMarketModule", (m) => {
  
  // Payment token address (USDC on Arbitrum One)
  const paymentTokenAddress = m.getParameter("paymentTokenAddress", "0xaf88d065e77c8cc2239327c5edb3a432268e5831");

  const pythAddress = m.getParameter("pythAddress", "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C");

  // Pyth price feeds on Arbitrum One
  const priceFeedETH = m.getParameter("priceFeedETH", "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace");
  const priceFeedARB = m.getParameter("priceFeedARB", "0x3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5");
  const priceFeedAAVE = m.getParameter("priceFeedAAVE", "0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445");
  const priceFeedBTC = m.getParameter("priceFeedBTC", "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43");
  const priceFeedSOL = m.getParameter("priceFeedSOL", "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d");
  const priceFeedXRP = m.getParameter("priceFeedXRP", "0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8");
  const priceFeedBNB = m.getParameter("priceFeedBNB", "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f");
  const priceFeedDOGE = m.getParameter("priceFeedDOGE", "0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c");
  const priceFeedPEPE = m.getParameter("priceFeedPEPE", "0xd69731a2e74ac1ce884fc3890f7ee324b6deb66147055249568869ed700882e4");
  const priceFeedSHIB = m.getParameter("priceFeedSHIB", "0xf0d57deca57b3da2fe63a493f4c25925fdfd8edf834b20f93e1f84dbd1504d4a");

  // Bet lock buffer in seconds (betting closes this many seconds before round lock)
  const betLockBuffer = m.getParameter("betLockBuffer", 10);

  // Data wait window in seconds (grace period for oracle data delay)
  const dataWaitWindow = m.getParameter("dataWaitWindow", 15);

  // Fee collector address
  const feeCollector = m.getParameter("feeCollector", "0x919bd4C3B37B4Ffbb1566DFD8D83E1F087c659F4");

  // Fee in basis points (100 = 1%)
  const feeBps = m.getParameter("feeBps", 100);

  // Minimum bet amount (in token units, e.g., 1 USDC = 1000000 for 6 decimals)
  const minBetAmount = m.getParameter("minBetAmount", "1000000"); // 1 USDC

  // Maximum bet amount (in token units, e.g., 1000 USDC = 1000000000 for 6 decimals)
  const maxBetAmount = m.getParameter("maxBetAmount", "1000000000"); // 1000 USDC

  // Max open rounds per user
  const maxOpenRoundsPerUser = m.getParameter("maxOpenRoundsPerUser", 5);

  // Minimum open/lock times in seconds
  const minOpenTime = m.getParameter("minOpenTime", 60);
  const minLockTime = m.getParameter("minLockTime", 60);

  // Advance cooldown in seconds
  const advanceCooldown = m.getParameter("advanceCooldown", 5);

  // Maximum price age in seconds
  const priceMaxAge = m.getParameter("priceMaxAge", 60);

  const predictionMarket = m.contract("CFTPredictionMarket", [
    paymentTokenAddress,
    pythAddress,
    priceFeedETH,
    priceFeedARB,
    priceFeedAAVE,
    priceFeedBTC,
    priceFeedSOL,
    priceFeedXRP,
    priceFeedBNB,
    priceFeedDOGE,
    priceFeedPEPE,
    priceFeedSHIB,
    betLockBuffer,
    dataWaitWindow,
    feeCollector,
    feeBps,
    minBetAmount,
    maxBetAmount,
    maxOpenRoundsPerUser,
    minOpenTime,
    minLockTime,
    advanceCooldown,
    priceMaxAge
  ]);

  return { predictionMarket };
});