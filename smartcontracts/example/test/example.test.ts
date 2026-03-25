import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther, zeroAddress } from "viem";

async function deployFixture() {
  const { viem } = (await network.connect() as unknown) as { viem: any };
  const publicClient = await viem.getPublicClient();
  const [owner, alice] = await viem.getWalletClients();

  const token = await viem.deployContract("MockERC20", []);
  const contract = await viem.deployContract("ExampleContract", [token.address, owner.account.address]);

  const tokenOwner = await viem.getContractAt("MockERC20", token.address, { client: { wallet: owner } });
  const contractAsOwner = await viem.getContractAt("ExampleContract", contract.address, { client: { wallet: owner } });
  const contractAsAlice = await viem.getContractAt("ExampleContract", contract.address, { client: { wallet: alice } });

  return { token, tokenOwner, contract, contractAsOwner, contractAsAlice, publicClient, owner, alice };
}

describe("ExampleContract", function () {

  it("rejects deployment with a zero token address", async function () {
    const { viem } = (await network.connect() as unknown) as { viem: any };
    const [owner] = await viem.getWalletClients();

    await assert.rejects(
      viem.deployContract("ExampleContract", [zeroAddress, owner.account.address]),
      /ZeroAddress/
    );
  });

  it("rejects deployment with a zero owner address", async function () {
    const { viem } = (await network.connect() as unknown) as { viem: any };
    const token = await viem.deployContract("MockERC20", []);

    await assert.rejects(
      viem.deployContract("ExampleContract", [token.address, zeroAddress]),
      /OwnableInvalidOwner/
    );
  });

  it("returns the caller's token balance", async function () {
    const { tokenOwner, contractAsOwner, owner } = await deployFixture();

    await tokenOwner.write.mint([owner.account.address, parseEther("100")]);

    const balance = await contractAsOwner.write.balance();
    assert.ok(balance, "transaction hash should be defined");
  });

  it("returns zero balance when caller holds no tokens", async function () {
    const { contractAsAlice, publicClient } = await deployFixture();

    const hash = await contractAsAlice.write.balance();
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const events = receipt.logs;
    assert.equal(events.length, 1);
  });

  it("emits BalanceChecked with caller address and token amount", async function () {
    const { token, tokenOwner, contractAsOwner, publicClient, owner } = await deployFixture();

    await tokenOwner.write.mint([owner.account.address, parseEther("42")]);

    const hash = await contractAsOwner.write.balance();
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const events = await publicClient.getContractEvents({
      address: token.address.toLowerCase() !== contractAsOwner.address.toLowerCase()
        ? contractAsOwner.address
        : contractAsOwner.address,
      abi: contractAsOwner.abi,
      eventName: "BalanceChecked",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    assert.equal(events.length, 1);
    assert.equal(events[0].args.caller?.toLowerCase(), owner.account.address.toLowerCase());
    assert.equal(events[0].args.amount, parseEther("42"));
  });

  it("emits BalanceChecked reflecting the correct caller for different accounts", async function () {
    const { tokenOwner, contractAsOwner, contractAsAlice, publicClient, owner, alice } = await deployFixture();

    await tokenOwner.write.mint([owner.account.address, parseEther("10")]);
    await tokenOwner.write.mint([alice.account.address, parseEther("25")]);

    const hashOwner = await contractAsOwner.write.balance();
    const hashAlice = await contractAsAlice.write.balance();

    const receiptOwner = await publicClient.waitForTransactionReceipt({ hash: hashOwner });
    const receiptAlice = await publicClient.waitForTransactionReceipt({ hash: hashAlice });

    const [ownerEvent] = await publicClient.getContractEvents({
      address: contractAsOwner.address,
      abi: contractAsOwner.abi,
      eventName: "BalanceChecked",
      fromBlock: receiptOwner.blockNumber,
      toBlock: receiptOwner.blockNumber,
    });

    const [aliceEvent] = await publicClient.getContractEvents({
      address: contractAsAlice.address,
      abi: contractAsAlice.abi,
      eventName: "BalanceChecked",
      fromBlock: receiptAlice.blockNumber,
      toBlock: receiptAlice.blockNumber,
    });

    assert.equal(ownerEvent.args.caller?.toLowerCase(), owner.account.address.toLowerCase());
    assert.equal(ownerEvent.args.amount, parseEther("10"));

    assert.equal(aliceEvent.args.caller?.toLowerCase(), alice.account.address.toLowerCase());
    assert.equal(aliceEvent.args.amount, parseEther("25"));
  });
});
