import { expect } from "chai";
import { ethers, fhevm, network } from "hardhat";
import type { FhevmType } from "@fhevm/hardhat-plugin";
import type { SecretInvest } from "../types";

describe("SecretInvest", function () {
  let secretInvest: SecretInvest;
  let signers: any[];

  beforeEach(async function () {
    signers = await ethers.getSigners();

    const contractFactory = await ethers.getContractFactory("SecretInvest");
    secretInvest = await contractFactory.deploy();
    await secretInvest.waitForDeployment();
  });

  it("should allow users to deposit ETH", async function () {
    const depositAmount = ethers.parseEther("1.0");

    await secretInvest.connect(signers[1]).deposit({ value: depositAmount });

    const balance = await secretInvest.getUserBalance(signers[1].address);
    expect(balance).to.equal(depositAmount);
  });

  it("should allow owner to set token prices", async function () {
    const tokenAddress = "0x1234567890123456789012345678901234567890";
    const price = ethers.parseEther("100");

    await secretInvest.setTokenPrice(tokenAddress, price);

    const storedPrice = await secretInvest.getTokenPrice(tokenAddress);
    expect(storedPrice).to.equal(price);
  });

  it("should not allow non-owner to set token prices", async function () {
    const tokenAddress = "0x1234567890123456789012345678901234567890";
    const price = ethers.parseEther("100");

    await expect(
      secretInvest.connect(signers[1]).setTokenPrice(tokenAddress, price)
    ).to.be.revertedWith("Only owner can call this function");
  });

  it("should allow users to open positions with encrypted inputs", async function () {
    const tokenAddress = "0x1234567890123456789012345678901234567890";
    const price = ethers.parseEther("100");
    const depositAmount = ethers.parseEther("1.0");

    // Set token price
    await secretInvest.setTokenPrice(tokenAddress, price);

    // Deposit funds
    await secretInvest.connect(signers[1]).deposit({ value: depositAmount });

    // Create encrypted inputs
    const input = fhevm.createEncryptedInput(secretInvest.target, signers[1].address);
    input.add8(1); // direction (1 for long)
    input.add32(10); // amount
    const encryptedInput = await input.encrypt();

    await secretInvest.connect(signers[1]).openPosition(
      tokenAddress,
      encryptedInput.handles[0],
      encryptedInput.handles[1],
      encryptedInput.inputProof
    );

    const positionCount = await secretInvest.getUserPositionCount(signers[1].address);
    expect(positionCount).to.equal(1);
  });

  it("should allow users to withdraw funds", async function () {
    const depositAmount = ethers.parseEther("1.0");
    const withdrawAmount = ethers.parseEther("0.5");

    await secretInvest.connect(signers[1]).deposit({ value: depositAmount });

    const initialBalance = await ethers.provider.getBalance(signers[1].address);

    await secretInvest.connect(signers[1]).withdraw(withdrawAmount);

    const contractBalance = await secretInvest.getUserBalance(signers[1].address);
    expect(contractBalance).to.equal(depositAmount - withdrawAmount);
  });

  it("should not allow withdrawal of more than balance", async function () {
    const depositAmount = ethers.parseEther("1.0");
    const withdrawAmount = ethers.parseEther("2.0");

    await secretInvest.connect(signers[1]).deposit({ value: depositAmount });

    await expect(
      secretInvest.connect(signers[1]).withdraw(withdrawAmount)
    ).to.be.revertedWith("Insufficient balance");
  });

  it("should not allow opening position without sufficient balance", async function () {
    const tokenAddress = "0x1234567890123456789012345678901234567890";
    const price = ethers.parseEther("100");

    // Set token price
    await secretInvest.setTokenPrice(tokenAddress, price);

    // Don't deposit any funds

    // Create encrypted inputs
    const input = fhevm.createEncryptedInput(secretInvest.target, signers[1].address);
    input.add8(1); // direction
    input.add32(10); // amount
    const encryptedInput = await input.encrypt();

    await expect(
      secretInvest.connect(signers[1]).openPosition(
        tokenAddress,
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.inputProof
      )
    ).to.be.revertedWith("Insufficient balance");
  });

  it("should not allow opening position for token without price", async function () {
    const tokenAddress = "0x1234567890123456789012345678901234567890";
    const depositAmount = ethers.parseEther("1.0");

    // Deposit funds but don't set token price
    await secretInvest.connect(signers[1]).deposit({ value: depositAmount });

    // Create encrypted inputs
    const input = fhevm.createEncryptedInput(secretInvest.target, signers[1].address);
    input.add8(1); // direction
    input.add32(10); // amount
    const encryptedInput = await input.encrypt();

    await expect(
      secretInvest.connect(signers[1]).openPosition(
        tokenAddress,
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.inputProof
      )
    ).to.be.revertedWith("Token price not set");
  });
});