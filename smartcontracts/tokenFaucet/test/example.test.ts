import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther, zeroAddress } from "viem";

async function deployFixture() {
  const { viem } = (await network.connect() as unknown) as { viem: any };
  const [admin, allocator, user, outsider] = await viem.getWalletClients();

  const token = await viem.deployContract("MockERC20", ["Test Token", "TTK"]);

  const faucet = await viem.deployContract("TokenFaucet", [
    token.address,
    admin.account.address,
    allocator.account.address,
  ]);

  // Fund the faucet with 1000 tokens
  await token.write.mint([faucet.address, parseEther("1000")]);

  const faucetAdmin = await viem.getContractAt("TokenFaucet", faucet.address, { client: { wallet: admin } });
  const faucetAllocator = await viem.getContractAt("TokenFaucet", faucet.address, { client: { wallet: allocator } });
  const faucetUser = await viem.getContractAt("TokenFaucet", faucet.address, { client: { wallet: user } });
  const faucetOutsider = await viem.getContractAt("TokenFaucet", faucet.address, { client: { wallet: outsider } });

  return { token, faucet, faucetAdmin, faucetAllocator, faucetUser, faucetOutsider, admin, allocator, user, outsider };
}

describe("TokenFaucet", function () {

  // ── Deployment ──────────────────────────────────────────────────────────────

  it("rejects zero address for token, admin, or allocator", async function () {
    const { viem } = (await network.connect() as unknown) as { viem: any };
    const [admin, allocator] = await viem.getWalletClients();

    const token = await viem.deployContract("MockERC20", ["T", "T"]);

    await assert.rejects(
      viem.deployContract("TokenFaucet", [zeroAddress, admin.account.address, allocator.account.address]),
      /ZeroAddress/
    );
    await assert.rejects(
      viem.deployContract("TokenFaucet", [token.address, zeroAddress, allocator.account.address]),
      /ZeroAddress/
    );
    await assert.rejects(
      viem.deployContract("TokenFaucet", [token.address, admin.account.address, zeroAddress]),
      /ZeroAddress/
    );
  });

  it("grants DEFAULT_ADMIN_ROLE to admin and ALLOCATOR_ROLE to allocator", async function () {
    const { faucet, admin, allocator } = await deployFixture();
    const ALLOCATOR_ROLE = await faucet.read.ALLOCATOR_ROLE();
    const DEFAULT_ADMIN_ROLE = await faucet.read.DEFAULT_ADMIN_ROLE();

    assert.equal(await faucet.read.hasRole([DEFAULT_ADMIN_ROLE, admin.account.address]), true);
    assert.equal(await faucet.read.hasRole([ALLOCATOR_ROLE, allocator.account.address]), true);
    assert.equal(await faucet.read.hasRole([ALLOCATOR_ROLE, admin.account.address]), false);
  });

  // ── addClaimAmount ───────────────────────────────────────────────────────────

  it("allocator can add claimable amount for a user", async function () {
    const { faucet, faucetAllocator, user } = await deployFixture();

    await faucetAllocator.write.addClaimAmount([user.account.address, parseEther("10")]);

    assert.equal(await faucet.read.claimableAmount([user.account.address]), parseEther("10"));
  });

  it("addClaimAmount accumulates on top of existing balance", async function () {
    const { faucet, faucetAllocator, user } = await deployFixture();

    await faucetAllocator.write.addClaimAmount([user.account.address, parseEther("5")]);
    await faucetAllocator.write.addClaimAmount([user.account.address, parseEther("3")]);

    assert.equal(await faucet.read.claimableAmount([user.account.address]), parseEther("8"));
  });

  it("rejects addClaimAmount from non-allocator", async function () {
    const { faucetOutsider, user } = await deployFixture();

    await assert.rejects(
      faucetOutsider.write.addClaimAmount([user.account.address, parseEther("1")]),
      /AccessControlUnauthorizedAccount/
    );
  });

  it("rejects addClaimAmount with zero address or zero amount", async function () {
    const { faucetAllocator, user } = await deployFixture();

    await assert.rejects(
      faucetAllocator.write.addClaimAmount([zeroAddress, parseEther("1")]),
      /ZeroAddress/
    );
    await assert.rejects(
      faucetAllocator.write.addClaimAmount([user.account.address, BigInt(0)]),
      /ZeroAmount/
    );
  });

  // ── setClaimAmount ───────────────────────────────────────────────────────────

  it("allocator can set claimable amount directly", async function () {
    const { faucet, faucetAllocator, user } = await deployFixture();

    await faucetAllocator.write.addClaimAmount([user.account.address, parseEther("5")]);
    await faucetAllocator.write.setClaimAmount([user.account.address, parseEther("2")]);

    assert.equal(await faucet.read.claimableAmount([user.account.address]), parseEther("2"));
  });

  it("rejects setClaimAmount from non-allocator", async function () {
    const { faucetOutsider, user } = await deployFixture();

    await assert.rejects(
      faucetOutsider.write.setClaimAmount([user.account.address, parseEther("1")]),
      /AccessControlUnauthorizedAccount/
    );
  });

  // ── batchAddClaimAmount ──────────────────────────────────────────────────────

  it("allocator can batch add claimable amounts", async function () {
    const { faucet, faucetAllocator, user, outsider } = await deployFixture();

    await faucetAllocator.write.batchAddClaimAmount(
      [[user.account.address, outsider.account.address], [parseEther("4"), parseEther("6")]]
    );

    assert.equal(await faucet.read.claimableAmount([user.account.address]), parseEther("4"));
    assert.equal(await faucet.read.claimableAmount([outsider.account.address]), parseEther("6"));
  });

  it("rejects batchAddClaimAmount with mismatched array lengths", async function () {
    const { faucetAllocator, user } = await deployFixture();

    await assert.rejects(
      faucetAllocator.write.batchAddClaimAmount([[user.account.address], [parseEther("1"), parseEther("2")]]),
      /ArrayLengthMismatch/
    );
  });

  it("rejects batchAddClaimAmount from non-allocator", async function () {
    const { faucetOutsider, user } = await deployFixture();

    await assert.rejects(
      faucetOutsider.write.batchAddClaimAmount([[user.account.address], [parseEther("1")]]),
      /AccessControlUnauthorizedAccount/
    );
  });

  // ── claim ────────────────────────────────────────────────────────────────────

  it("user can claim their full allocated amount", async function () {
    const { token, faucetAllocator, faucetUser, user } = await deployFixture();

    await faucetAllocator.write.addClaimAmount([user.account.address, parseEther("10")]);
    await faucetUser.write.claim([parseEther("10")]);

    assert.equal(await token.read.balanceOf([user.account.address]), parseEther("10"));
  });

  it("user can claim partial amount and remainder stays available", async function () {
    const { token, faucet, faucetAllocator, faucetUser, user } = await deployFixture();

    await faucetAllocator.write.addClaimAmount([user.account.address, parseEther("10")]);
    await faucetUser.write.claim([parseEther("3")]);

    assert.equal(await token.read.balanceOf([user.account.address]), parseEther("3"));
    assert.equal(await faucet.read.claimableAmount([user.account.address]), parseEther("7"));
  });

  it("rejects claim exceeding claimable balance", async function () {
    const { faucetAllocator, faucetUser, user } = await deployFixture();

    await faucetAllocator.write.addClaimAmount([user.account.address, parseEther("5")]);

    await assert.rejects(
      faucetUser.write.claim([parseEther("6")]),
      /ExceedsClaimableBalance/
    );
  });

  it("rejects claim of zero amount", async function () {
    const { faucetUser } = await deployFixture();

    await assert.rejects(
      faucetUser.write.claim([BigInt(0)]),
      /ZeroAmount/
    );
  });

  it("rejects claim when faucet has insufficient token balance", async function () {
    const { viem } = (await network.connect() as unknown) as { viem: any };
    const [admin, allocator, user] = await viem.getWalletClients();

    const token = await viem.deployContract("MockERC20", ["T", "T"]);
    // Deploy faucet with NO tokens funded
    const emptyFaucet = await viem.deployContract("TokenFaucet", [
      token.address, admin.account.address, allocator.account.address,
    ]);

    const faucetAllocator = await viem.getContractAt("TokenFaucet", emptyFaucet.address, { client: { wallet: allocator } });
    const faucetUser = await viem.getContractAt("TokenFaucet", emptyFaucet.address, { client: { wallet: user } });

    await faucetAllocator.write.addClaimAmount([user.account.address, parseEther("5")]);

    await assert.rejects(
      faucetUser.write.claim([parseEther("5")]),
      /InsufficientFaucetBalance/
    );
  });

  // ── pause / unpause ──────────────────────────────────────────────────────────

  it("admin can pause and unpause claims", async function () {
    const { faucetAdmin, faucetAllocator, faucetUser, user } = await deployFixture();

    await faucetAllocator.write.addClaimAmount([user.account.address, parseEther("5")]);

    await faucetAdmin.write.pause([]);

    await assert.rejects(
      faucetUser.write.claim([parseEther("5")]),
      /EnforcedPause/
    );

    await faucetAdmin.write.unpause([]);
    await faucetUser.write.claim([parseEther("5")]);
  });

  it("rejects pause/unpause from non-admin", async function () {
    const { faucetOutsider } = await deployFixture();

    await assert.rejects(
      faucetOutsider.write.pause([]),
      /AccessControlUnauthorizedAccount/
    );
    await assert.rejects(
      faucetOutsider.write.unpause([]),
      /AccessControlUnauthorizedAccount/
    );
  });

  // ── withdrawUnusedTokens ─────────────────────────────────────────────────────

  it("admin can withdraw tokens", async function () {
    const { token, faucet, faucetAdmin, admin } = await deployFixture();

    const balanceBefore = await token.read.balanceOf([admin.account.address]);
    await faucetAdmin.write.withdrawUnusedTokens([admin.account.address, parseEther("100")]);
    const balanceAfter = await token.read.balanceOf([admin.account.address]);

    assert.equal(balanceAfter - balanceBefore, parseEther("100"));
  });

  it("rejects withdrawUnusedTokens from non-admin", async function () {
    const { faucetAllocator, faucetOutsider, allocator } = await deployFixture();

    await assert.rejects(
      faucetAllocator.write.withdrawUnusedTokens([allocator.account.address, parseEther("1")]),
      /AccessControlUnauthorizedAccount/
    );
    await assert.rejects(
      faucetOutsider.write.withdrawUnusedTokens([allocator.account.address, parseEther("1")]),
      /AccessControlUnauthorizedAccount/
    );
  });

  it("rejects withdrawal exceeding faucet balance", async function () {
    const { faucetAdmin, admin } = await deployFixture();

    await assert.rejects(
      faucetAdmin.write.withdrawUnusedTokens([admin.account.address, parseEther("9999")]),
      /InsufficientFaucetBalance/
    );
  });

  // ── faucetTokenBalance ───────────────────────────────────────────────────────

  it("faucetTokenBalance reflects the faucet token holdings", async function () {
    const { faucet } = await deployFixture();

    assert.equal(await faucet.read.faucetTokenBalance([]), parseEther("1000"));
  });
});

