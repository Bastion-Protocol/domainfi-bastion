import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { verify } from "../scripts/verify";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log(`Deploying to ${network.name} with account: ${deployer}`);

  // Deploy BastionProtocol contract
  const bastionProtocol = await deploy("BastionProtocol", {
    from: deployer,
    args: [], // Add constructor arguments here
    log: true,
    waitConfirmations: network.live ? 5 : 1,
  });

  console.log(`BastionProtocol deployed to: ${bastionProtocol.address}`);

  // Verify contract if on live network
  if (network.live && process.env.VERIFY_CONTRACTS === "true") {
    console.log("Verifying contract...");
    await verify(bastionProtocol.address, []);
  }

  // Add delay for network propagation
  if (network.live) {
    console.log("Waiting for network propagation...");
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
};

func.tags = ["BastionProtocol"];
func.id = "deploy_bastion_protocol";

export default func;
