import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CFT", (m) => {
  const deployer = m.getAccount(0);

  // Parameters (override via --parameters)
  // Payment token address (USDC on Arbitrum One)
  const usdc = m.getParameter<string>("usdc", "0xaf88d065e77c8cc2239327c5edb3a432268e5831");

  // const name = m.getParameter<string>("name", "CFT.live");
  // const symbol = m.getParameter<string>("symbol", "CFT");
  const name = m.getParameter<string>("name", "TEST.live");
  const symbol = m.getParameter<string>("symbol", "TEST");

  // Set admin to deployer so role wiring can happen inside the module.
  const admin = deployer;

  const cft = m.contract("CFTToken", [name, symbol, admin], { from: deployer });

  const distributor = m.contract(
    "ContributorDistributor",
    [cft, admin],
    { from: deployer }
  );

  const pool = m.contract("RedemptionPool", [usdc, cft], { from: deployer });

  // Read role ids from the token (public constants)
  const MINTER_ROLE = m.staticCall(cft, "MINTER_ROLE", []);
  const BURNER_ROLE = m.staticCall(cft, "BURNER_ROLE", []);

  // Wire roles
  m.call(cft, "grantRole", [MINTER_ROLE, distributor], {
    from: admin,
    id: "GrantMinterRoleToDistributor",
  });

  m.call(cft, "grantRole", [BURNER_ROLE, pool], {
    from: admin,
    id: "GrantBurnerRoleToPool",
  });

  return { cft, distributor, pool };
});