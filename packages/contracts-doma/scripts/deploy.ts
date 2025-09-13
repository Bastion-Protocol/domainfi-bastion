import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Doma contracts...");

  // Deploy mock USDC
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
  console.log("USDC deployed to:", await usdc.getAddress());

  // Deploy mock domain NFT
  const MockERC721 = await ethers.getContractFactory("MockERC721");
  const domainNFT = await MockERC721.deploy();
  console.log("Domain NFT deployed to:", await domainNFT.getAddress());

  // Deploy CircleVault
  const [deployer, signer1, signer2] = await ethers.getSigners();
  const CircleVault = await ethers.getContractFactory("CircleVault");
  const vault = await CircleVault.deploy(
    await domainNFT.getAddress(),
    [await deployer.getAddress(), await signer1.getAddress(), await signer2.getAddress()],
    2
  );
  console.log("CircleVault deployed to:", await vault.getAddress());

  // Deploy mock auction contracts
  const MockAuction = await ethers.getContractFactory("MockAuction");
  const auction = await MockAuction.deploy();
  console.log("Mock Auction deployed to:", await auction.getAddress());

  const MockVault = await ethers.getContractFactory("MockVault");
  const mockVault = await MockVault.deploy();
  console.log("Mock Vault deployed to:", await mockVault.getAddress());

  // Deploy AuctionAdapter
  const AuctionAdapter = await ethers.getContractFactory("AuctionAdapter");
  const adapter = await AuctionAdapter.deploy(
    await auction.getAddress(),
    await mockVault.getAddress()
  );
  console.log("AuctionAdapter deployed to:", await adapter.getAddress());

  // Deploy CircleTreasury
  const CircleTreasury = await ethers.getContractFactory("CircleTreasury");
  const treasury = await CircleTreasury.deploy(
    await usdc.getAddress(),
    await adapter.getAddress(),
    [await deployer.getAddress(), await signer1.getAddress(), await signer2.getAddress()],
    2
  );
  console.log("CircleTreasury deployed to:", await treasury.getAddress());

  console.log("All Doma contracts deployed successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
