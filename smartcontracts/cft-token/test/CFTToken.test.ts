import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther, zeroAddress } from "viem";

async function deployFixture() {
  const { viem } = (await network.connect() as unknown) as { viem: any };
  const [admin, minter, burner, alice] = await viem.getWalletClients();

  const token = await viem.deployContract("CFTToken", ["CFT.live", "CFT", admin.account.address]);

  const adminToken = await viem.getContractAt("CFTToken", token.address, { client: { wallet: admin } });
  const minterToken = await viem.getContractAt("CFTToken", token.address, { client: { wallet: minter } });
  const burnerToken = await viem.getContractAt("CFTToken", token.address, { client: { wallet: burner } });

  return { token, adminToken, minterToken, burnerToken, admin, minter, burner, alice };
}

describe("CFTToken", function () {

  it("rejects deployment with a zero admin", async function () {
    const { viem } = (await network.connect() as unknown) as { viem: any };

    await assert.rejects(
      viem.deployContract("CFTToken", ["CFT.live", "CFT", zeroAddress]),
      /ZeroAdminAddress/
    );
  });

  it("allows a minter-role account to mint", async function () {
    const { token, adminToken, minterToken, minter, alice } = await deployFixture();
    const minterRole = await token.read.MINTER_ROLE();

    await adminToken.write.grantRole([minterRole, minter.account.address]);
    await minterToken.write.mint([alice.account.address, parseEther("25")]);

    assert.equal(await token.read.balanceOf([alice.account.address]), parseEther("25"));
    assert.equal(await token.read.totalSupply(), parseEther("25"));
  });

  it("rejects minting from an account without MINTER_ROLE", async function () {
    const { minterToken, alice } = await deployFixture();

    await assert.rejects(
      minterToken.write.mint([alice.account.address, BigInt(1)]),
      /AccessControlUnauthorizedAccount/
    );
  });

  it("allows a burner-role account to burn its own balance", async function () {
    const { token, adminToken, burnerToken, admin, burner } = await deployFixture();
    const minterRole = await token.read.MINTER_ROLE();
    const burnerRole = await token.read.BURNER_ROLE();

    await adminToken.write.grantRole([minterRole, admin.account.address]);
    await adminToken.write.grantRole([burnerRole, burner.account.address]);
    await adminToken.write.mint([burner.account.address, parseEther("10")]);

    await burnerToken.write.burnFromRole([burner.account.address, parseEther("4")]);

    assert.equal(await token.read.balanceOf([burner.account.address]), parseEther("6"));
    assert.equal(await token.read.totalSupply(), parseEther("6"));
  });

  it("rejects burner-role burns for another account", async function () {
    const { token, adminToken, burnerToken, burner, alice } = await deployFixture();
    const burnerRole = await token.read.BURNER_ROLE();

    await adminToken.write.grantRole([burnerRole, burner.account.address]);

    await assert.rejects(
      burnerToken.write.burnFromRole([alice.account.address, BigInt(1)]),
      /BurnFromMismatch/
    );
  });
});