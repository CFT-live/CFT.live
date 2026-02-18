import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CFTMVP", (m) => {
  const deployer = m.getAccount(0);

  // Parameters (override via --parameters)
  const usdc = m.getParameter<string>("usdc"); // required
  const signer = m.getParameter<string>("signer"); // required

  const name = m.getParameter<string>("name", "CFT.live");
  const symbol = m.getParameter<string>("symbol", "CFT");

  // Bigint params must be passed as strings with an "n" suffix in the parameters file
  const maxSupply = m.getParameter<bigint>("maxSupply", 100_000_000n * 10n ** 18n);

  const low = m.getParameter<bigint>("low", 2_500n * 10n ** 18n);
  const medium = m.getParameter<bigint>("medium", 10_000n * 10n ** 18n);
  const high = m.getParameter<bigint>("high", 40_000n * 10n ** 18n);

  // For MVP, set admin to deployer so role wiring can happen inside the module.
  const admin = deployer;

  const cft = m.contract("CFTToken", [name, symbol, maxSupply, admin], { from: deployer });

  const distributor = m.contract(
    "ContributorDistributor",
    [cft, admin, signer, low, medium, high],
    { from: deployer }
  );

  const pool = m.contract("RedemptionPool", [usdc, cft], { from: deployer });

  // Read role ids from the token (public constants)
  const MINTER_ROLE = m.staticCall(cft, "MINTER_ROLE", []);
  const BURNER_ROLE = m.staticCall(cft, "BURNER_ROLE", []);

  // Wire roles
  m.call(cft, "grantRole", [MINTER_ROLE, distributor], { from: admin });
  m.call(cft, "grantRole", [BURNER_ROLE, pool], { from: admin });

  return { cft, distributor, pool };
});