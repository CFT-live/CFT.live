import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TokenFaucetModule", (m) => {
  const deployer = m.getAccount(0);

  // CFT token address — set to Arbitrum One CFT address in production
  const tokenAddress = m.getParameter<string>("0x7418BDe610143879180ff8C5f6C64A0a3d85d722");

  // Backend wallet address that will be granted ALLOCATOR_ROLE
  // This wallet signs the addClaimAmount() transactions
  const allocatorAddress = m.getParameter<string>("allocatorAddress");

  const faucet = m.contract("TokenFaucet", [tokenAddress, deployer, allocatorAddress], {
    from: deployer,
  });

  return { faucet };
});
