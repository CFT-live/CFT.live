import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther, parseSignature, zeroAddress } from "viem";

async function deployFixture() {
  const { viem } = (await network.connect() as unknown) as { viem: any };
  const publicClient = await viem.getPublicClient();
  const [admin, treasury, contributor] = await viem.getWalletClients();

  const cft = await viem.deployContract("CFTToken", ["CFT.live", "CFT", admin.account.address]);
  const usdc = await viem.deployContract("CFTToken", ["USD Coin", "USDC", admin.account.address]);
  const pool = await viem.deployContract("RedemptionPool", [usdc.address, cft.address]);

  const cftAdmin = await viem.getContractAt("CFTToken", cft.address, { client: { wallet: admin } });
  const cftContributor = await viem.getContractAt("CFTToken", cft.address, { client: { wallet: contributor } });
  const usdcAdmin = await viem.getContractAt("CFTToken", usdc.address, { client: { wallet: admin } });
  const usdcTreasury = await viem.getContractAt("CFTToken", usdc.address, { client: { wallet: treasury } });
  const poolTreasury = await viem.getContractAt("RedemptionPool", pool.address, { client: { wallet: treasury } });
  const poolContributor = await viem.getContractAt("RedemptionPool", pool.address, {
    client: { wallet: contributor },
  });

  await cftAdmin.write.grantRole([await cft.read.MINTER_ROLE(), admin.account.address]);
  await cftAdmin.write.grantRole([await cft.read.BURNER_ROLE(), pool.address]);
  await usdcAdmin.write.grantRole([await usdc.read.MINTER_ROLE(), admin.account.address]);

  return {
    cft,
    cftAdmin,
    cftContributor,
    usdc,
    usdcAdmin,
    usdcTreasury,
    pool,
    poolTreasury,
    poolContributor,
    publicClient,
    treasury,
    contributor,
  };
}

describe("RedemptionPool", function () {

  it("rejects deployment with zero token addresses", async function () {
    const { viem } = (await network.connect() as unknown) as { viem: any };
    const cft = await viem.deployContract("CFTToken", ["CFT.live", "CFT", (await viem.getWalletClients())[0].account.address]);

    await assert.rejects(
      viem.deployContract("RedemptionPool", [zeroAddress, cft.address]),
      /ZeroUsdcAddress/
    );

    await assert.rejects(
      viem.deployContract("RedemptionPool", [cft.address, zeroAddress]),
      /ZeroCftAddress/
    );
  });

  it("redeems CFT for USDC using an approval", async function () {
    const {
      cft,
      cftAdmin,
      cftContributor,
      usdc,
      usdcAdmin,
      usdcTreasury,
      pool,
      poolTreasury,
      poolContributor,
      treasury,
      contributor,
    } = await deployFixture();

    await cftAdmin.write.mint([contributor.account.address, parseEther("100")]);
    await usdcAdmin.write.mint([treasury.account.address, parseEther("100")]);
    await usdcTreasury.write.approve([pool.address, parseEther("100")]);
    await poolTreasury.write.depositRevenue([parseEther("100")]);

    assert.equal(await pool.read.quote([parseEther("50")]), parseEther("50"));

    await cftContributor.write.approve([pool.address, parseEther("50")]);
    await poolContributor.write.redeem([parseEther("50"), parseEther("50")]);

    assert.equal(await cft.read.balanceOf([contributor.account.address]), parseEther("50"));
    assert.equal(await usdc.read.balanceOf([contributor.account.address]), parseEther("50"));
    assert.equal(await cft.read.totalSupply(), parseEther("50"));
  });

  it("redeems CFT for USDC with permit in a single call", async function () {
    const {
      cft,
      cftAdmin,
      usdc,
      usdcAdmin,
      usdcTreasury,
      pool,
      poolTreasury,
      poolContributor,
      publicClient,
      treasury,
      contributor,
    } = await deployFixture();

    await cftAdmin.write.mint([contributor.account.address, parseEther("100")]);
    await usdcAdmin.write.mint([treasury.account.address, parseEther("100")]);
    await usdcTreasury.write.approve([pool.address, parseEther("100")]);
    await poolTreasury.write.depositRevenue([parseEther("100")]);

    const deadline = BigInt(4102444800);
    const nonce = await cft.read.nonces([contributor.account.address]);
    const chainId = BigInt(await publicClient.getChainId());
    const signature = await contributor.signTypedData({
      account: contributor.account,
      domain: {
        name: "CFT.live",
        version: "1",
        chainId,
        verifyingContract: cft.address,
      },
      types: {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      primaryType: "Permit",
      message: {
        owner: contributor.account.address,
        spender: pool.address,
        value: parseEther("40"),
        nonce,
        deadline,
      },
    });
    const { v, r, s } = parseSignature(signature);

    await poolContributor.write.redeemWithPermit([parseEther("40"), parseEther("40"), deadline, v, r, s]);

    assert.equal(await cft.read.balanceOf([contributor.account.address]), parseEther("60"));
    assert.equal(await usdc.read.balanceOf([contributor.account.address]), parseEther("40"));
    assert.equal(await cft.read.allowance([contributor.account.address, pool.address]), BigInt(0));
  });

  it("rejects zero deposits and zero-output redemptions", async function () {
    const { cftAdmin, poolTreasury, poolContributor, contributor } = await deployFixture();

    await assert.rejects(poolTreasury.write.depositRevenue([BigInt(0)]), /ZeroAmount/);

    await cftAdmin.write.mint([contributor.account.address, parseEther("1")]);

    await assert.rejects(
      poolContributor.write.redeem([parseEther("1"), BigInt(0)]),
      /ZeroUsdcOut/
    );
  });
});