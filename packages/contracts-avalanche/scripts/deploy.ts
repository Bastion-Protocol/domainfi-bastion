import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Avalanche contracts...");

  // Deploy mock tokens
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("USD Coin", "USDC.e", 6);
  const wavax = await MockERC20.deploy("Wrapped AVAX", "WAVAX", 18);
  console.log("USDC.e deployed to:", await usdc.getAddress());
  console.log("WAVAX deployed to:", await wavax.getAddress());

  // Deploy mock price feeds
  const MockChainlinkAggregator = await ethers.getContractFactory("MockChainlinkAggregator");
  const mirrorFeed = await MockChainlinkAggregator.deploy(1000000000); // $10 with 8 decimals
  const wavaxFeed = await MockChainlinkAggregator.deploy(4000000000); // $40 with 8 decimals
  const usdcFeed = await MockChainlinkAggregator.deploy(100000000); // $1 with 8 decimals

  console.log("Mirror NFT price feed deployed to:", await mirrorFeed.getAddress());
  console.log("WAVAX price feed deployed to:", await wavaxFeed.getAddress());
  console.log("USDC price feed deployed to:", await usdcFeed.getAddress());

  // Deploy MirrorDomainNFT
  const [deployer, relayer] = await ethers.getSigners();
  const MirrorDomainNFT = await ethers.getContractFactory("MirrorDomainNFT");
  const mirrorNFT = await MirrorDomainNFT.deploy(await relayer.getAddress());
  console.log("MirrorDomainNFT deployed to:", await mirrorNFT.getAddress());

  // Deploy CollateralManager
  const CollateralManager = await ethers.getContractFactory("CollateralManager");
  const collateralManager = await CollateralManager.deploy(
    await mirrorNFT.getAddress(),
    await wavax.getAddress(),
    await usdc.getAddress(),
    await mirrorFeed.getAddress(),
    await wavaxFeed.getAddress(),
    await usdcFeed.getAddress()
  );
  console.log("CollateralManager deployed to:", await collateralManager.getAddress());

  // Deploy LendingPool
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(
    await usdc.getAddress(),
    await wavax.getAddress(),
    await collateralManager.getAddress()
  );
  console.log("LendingPool deployed to:", await lendingPool.getAddress());

  console.log("All Avalanche contracts deployed successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
