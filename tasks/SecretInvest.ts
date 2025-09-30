import { task } from "hardhat/config";

task("secret:price", "Set token price")
  .addParam("token", "Token address")
  .addParam("price", "Price in wei")
  .setAction(async ({ token, price }, hre) => {
    const { deployments, ethers: eths, getNamedAccounts } = hre as any;
    const { deployer } = await getNamedAccounts();
    const signer = await eths.getSigner(deployer);
    const d = await deployments.get("SecretInvest");
    const c = await eths.getContractAt("SecretInvest", d.address, signer);
    const tx = await c.setTokenPrice(token, BigInt(price));
    console.log("tx:", tx.hash);
    await tx.wait();
    console.log("New price:", (await c.getTokenPrice(token)).toString());
  });

task("secret:balance", "Show internal balance")
  .addParam("user", "User address")
  .setAction(async ({ user }, hre) => {
    const { deployments, ethers: eths } = hre as any;
    const d = await deployments.get("SecretInvest");
    const c = await eths.getContractAt("SecretInvest", d.address);
    const bal = await c.balances(user);
    console.log("balance:", bal.toString());
  });

task("secret:deposit", "Deposit ETH into platform")
  .addParam("amount", "Amount in ether")
  .setAction(async ({ amount }, hre) => {
    const { deployments, ethers: eths, getNamedAccounts } = hre as any;
    const { deployer } = await getNamedAccounts();
    const signer = await eths.getSigner(deployer);
    const d = await deployments.get("SecretInvest");
    const c = await eths.getContractAt("SecretInvest", d.address, signer);
    const tx = await c.deposit({ value: eths.parseEther(amount) });
    console.log("tx:", tx.hash);
    await tx.wait();
    console.log("done");
  });

task("secret:withdraw", "Withdraw ETH from platform")
  .addParam("amount", "Amount in ether")
  .setAction(async ({ amount }, hre) => {
    const { deployments, ethers: eths, getNamedAccounts } = hre as any;
    const { deployer } = await getNamedAccounts();
    const signer = await eths.getSigner(deployer);
    const d = await deployments.get("SecretInvest");
    const c = await eths.getContractAt("SecretInvest", d.address, signer);
    const tx = await c.withdraw(ethers.parseEther(amount));
    console.log("tx:", tx.hash);
    await tx.wait();
    console.log("done");
  });

task("secret:open", "Open encrypted position")
  .addParam("token", "Token address")
  .addParam("direction", "1=long, 2=short")
  .addParam("quantity", "Units (uint32)")
  .setAction(async ({ token, direction, quantity }, hre) => {
    const { deployments, ethers: eths, getNamedAccounts } = hre as any;
    const mock = (hre as any).fhevm?.isMock;
    if (!mock) {
      console.warn("This task requires mock FHEVM to generate input handles");
    }
    const { deployer } = await getNamedAccounts();
    const signer = await eths.getSigner(deployer);
    const d = await deployments.get("SecretInvest");
    const c = await eths.getContractAt("SecretInvest", d.address, signer);
    const enc = await (hre as any).fhevm
      .createEncryptedInput(d.address, signer.address)
      .add32(Number(direction))
      .add32(Number(quantity))
      .encrypt();
    const tx = await c.openPosition(token, enc.handles[0], enc.handles[1], enc.inputProof);
    console.log("tx:", tx.hash);
    await tx.wait();
    console.log("opened");
  });

task("secret:close", "Close position")
  .addParam("direction", "1 or 2")
  .addParam("quantity", "Units")
  .setAction(async ({ direction, quantity }, hre) => {
    const { deployments, ethers: eths, getNamedAccounts } = hre as any;
    const { deployer } = await getNamedAccounts();
    const signer = await eths.getSigner(deployer);
    const d = await deployments.get("SecretInvest");
    const c = await eths.getContractAt("SecretInvest", d.address, signer);
    const tx = await c.closePosition(Number(quantity), Number(direction));
    console.log("tx:", tx.hash);
    await tx.wait();
    console.log("closed");
  });

task("secret:status", "Show position status for user")
  .addParam("user", "Address")
  .setAction(async ({ user }, hre) => {
    const { deployments, ethers: eths } = hre as any;
    const d = await deployments.get("SecretInvest");
    const c = await eths.getContractAt("SecretInvest", d.address);
    const has = await c.hasActivePosition(user);
    console.log("active:", has);
    if (has) {
      const p = await c.getPosition(user);
      console.log("position:", p);
    }
  });
