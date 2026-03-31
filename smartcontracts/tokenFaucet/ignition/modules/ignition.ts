import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TokenFaucetModule", (m) => {
  const deployer = m.getAccount(0);

  // CFT token address — set to Arbitrum One CFT address in production
  const tokenAddress = m.getParameter<string>("tokenAddress");

  // Backend wallet address that will be granted ALLOCATOR_ROLE
  // This wallet signs the addClaimAmount() transactions
  const allocatorAddress = m.getParameter<string>("allocatorAddress");

  const faucet = m.contract("TokenFaucet", [tokenAddress, deployer, allocatorAddress], {
    from: deployer,
  });

  return { faucet };
});
