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
};
export default func;
func.id = "deploy_secretInvest"; // id required to prevent reexecution
func.tags = ["SecretInvest"];
