import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ExampleContractModule", (m) => {
  const deployer = m.getAccount(0);

  // Address of the ERC-20 token the faucet will distribute
  // Default is the Sepolia address for the ChainLink Token (LINK), but you can change it to any ERC-20 token you want
  const tokenAddress = m.getParameter<string>("tokenAddress", "0x779877A7B0D9E8603169DdbD7836e478b4624789");

  const contract = m.contract("ExampleContract", [tokenAddress, deployer], {
    from: deployer,
  });

  return { contract };
});
