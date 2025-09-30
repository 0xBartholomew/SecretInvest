import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { ContractTransactionResponse, parseEther, formatEther } from "ethers";

describe("SecretInvest", function () {
  const UNIT_PRICE = ethers.parseEther("0.001");
  const TOKEN = "0x0000000000000000000000000000000000000001";

  before(function () {
    if (!fhevm.isMock) {
      console.warn("This test suite requires FHEVM mock environment");
      this.skip();
    }
  });

  it("full flow: set price, deposit, open & close", async function () {
    const [deployer, alice] = await ethers.getSigners();

    const factory = await ethers.getContractFactory("SecretInvest");
    const contract = await factory.deploy();
    const addr = await contract.getAddress();

    // owner sets token price
    await expect(contract.connect(deployer).setTokenPrice(TOKEN, 123456n)).to.emit(contract, "TokenPriceUpdated");
    expect(await contract.getTokenPrice(TOKEN)).to.eq(123456n);

    // alice deposit 0.1 ETH
    await expect(contract.connect(alice).deposit({ value: parseEther("0.1") }))
      .to.emit(contract, "Deposited");
    expect(await contract.balances(alice.address)).to.eq(parseEther("0.1"));

    // open position: dir=1(long), qty=3
    const enc = await fhevm
      .createEncryptedInput(addr, alice.address)
      .add32(1)
      .add32(3)
      .encrypt();

    await expect(
      contract.connect(alice).openPosition(TOKEN, enc.handles[0], enc.handles[1], enc.inputProof)
    ).to.emit(contract, "PositionOpened");

    expect(await contract.hasActivePosition(alice.address)).to.eq(true);

    // close position with clear params; due to randomness, assert outcomes set membership
    const stake = UNIT_PRICE * 3n; // 0.003 ETH
    const balBefore = await contract.balances(alice.address);
    const tx = await contract.connect(alice).closePosition(3, 1);
    await tx.wait();

    const balAfter = await contract.balances(alice.address);
    // Either lost (−stake) or won (+stake)
    expect([balBefore - stake, balBefore + stake]).to.include(balAfter);

    expect(await contract.hasActivePosition(alice.address)).to.eq(false);

    // withdraw small amount
    const withdrawAmount = parseEther("0.001");
    if (balAfter >= withdrawAmount) {
      await expect(contract.connect(alice).withdraw(withdrawAmount)).to.emit(contract, "Withdrawn");
    }
  });
});

