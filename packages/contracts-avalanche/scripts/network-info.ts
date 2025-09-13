import { ethers, network } from "hardhat";

async function main() {
  console.log("=".repeat(50));
  console.log("Network Information");
  console.log("=".repeat(50));
  
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${network.config.chainId}`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  
  const gasPrice = await ethers.provider.getFeeData();
  console.log(`Gas Price: ${ethers.formatUnits(gasPrice.gasPrice || 0, "gwei")} gwei`);
  
  console.log("=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
