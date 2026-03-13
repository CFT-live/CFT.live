import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { keccak256, parseEther, stringToHex, zeroAddress } from "viem";

async function deployFixture() {
  const { viem } = (await network.connect() as unknown) as { viem: any };
  const [admin, outsider, contributor] = await viem.getWalletClients();

  const token = await viem.deployContract("CFTToken", ["CFT.live", "CFT", admin.account.address]);
  const distributor = await viem.deployContract("ContributorDistributor", [token.address, admin.account.address]);

  const tokenAdmin = await viem.getContractAt("CFTToken", token.address, { client: { wallet: admin } });
  const distributorAdmin = await viem.getContractAt("ContributorDistributor", distributor.address, {
    client: { wallet: admin },
  });
  const distributorOutsider = await viem.getContractAt("ContributorDistributor", distributor.address, {
    client: { wallet: outsider },
  });

  await tokenAdmin.write.grantRole([await token.read.MINTER_ROLE(), distributor.address]);

  return {
    token,
    distributor,
    distributorAdmin,
    distributorOutsider,
    admin,
    outsider,
    contributor,
  };
}

describe("ContributorDistributor", function () {

  it("rejects deployment with a zero token or zero admin", async function () {
    const { viem } = (await network.connect() as unknown) as { viem: any };
    const [admin] = await viem.getWalletClients();

    await assert.rejects(
      viem.deployContract("ContributorDistributor", [zeroAddress, admin.account.address]),
      /ZeroCftAddress/
    );

    const token = await viem.deployContract("CFTToken", ["CFT.live", "CFT", admin.account.address]);

    await assert.rejects(
      viem.deployContract("ContributorDistributor", [token.address, zeroAddress]),
      /ZeroAdminAddress/
    );
  });

  it("mints a payout and records the task as paid", async function () {
    const { token, distributor, distributorAdmin, contributor } = await deployFixture();
    const taskId = keccak256(stringToHex("task-1"));

    await distributorAdmin.write.payout([contributor.account.address, parseEther("12"), taskId]);

    assert.equal(await token.read.balanceOf([contributor.account.address]), parseEther("12"));
    assert.equal(await distributor.read.taskPaid([taskId]), true);
  });

  it("rejects payouts from accounts without PAYOUT_ROLE", async function () {
    const { distributorOutsider, contributor } = await deployFixture();
    const taskId = keccak256(stringToHex("task-2"));

    await assert.rejects(
      distributorOutsider.write.payout([contributor.account.address, BigInt(1), taskId]),
      /AccessControlUnauthorizedAccount/
    );
  });

  it("rejects paying the same task twice", async function () {
    const { distributorAdmin, contributor } = await deployFixture();
    const taskId = keccak256(stringToHex("task-3"));

    await distributorAdmin.write.payout([contributor.account.address, parseEther("5"), taskId]);

    await assert.rejects(
      distributorAdmin.write.payout([contributor.account.address, parseEther("5"), taskId]),
      /TaskAlreadyPaid/
    );
  });
});