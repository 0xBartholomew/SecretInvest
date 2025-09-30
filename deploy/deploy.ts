import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedSecretInvest = await deploy("SecretInvest", {
    from: deployer,
    log: true,
    // ensure we don't skip if there was a previous artifact
    skipIfAlreadyDeployed: false,
  });

  console.log(`Deployer: ${deployer}`);
  console.log(`SecretInvest contract: ${deployedSecretInvest.address}`);

  // Initialize token prices at deploy time
  const initialTokens = [
    "0xa9fb0c21e4d3b7f5a8c2d1e3f4b5a6c7d8e9f0a1",
    "0x7c3e2a19b5f4d6c8a1e0b2d3c4f5a6978e1d2c3b",
    "0x5b1d3f7a9c2e4d6f8a0b1c2d3e4f5061728394ab",
    "0xd4c3b2a1908f7e6d5c4b3a291817263544332211",
    "0x2e9f8d7c6b5a4c3d2b1a09182736455463728190",
  ];
  const initialPrices = [
    1000n,        // arbitrary units (wei)
    2000n,
    3000n,
    4000n,
    5000n,
  ];

  const secret = await hre.ethers.getContractAt("SecretInvest", deployedSecretInvest.address);
  for (let i = 0; i < initialTokens.length; i++) {
    const t = initialTokens[i];
    const p = initialPrices[i];
    const tx = await secret.connect((await hre.ethers.getSigner(deployer))).setTokenPrice(t, p);
    await tx.wait();
    console.log(`Set price ${p} for token ${t}`);
  }
};
export default func;
func.id = "deploy_secretInvest"; // id required to prevent reexecution
func.tags = ["SecretInvest"];
