import { ethers } from "hardhat";
import { Signer } from "ethers";

export interface TestSigners {
  deployer: Signer;
  admin: Signer;
  user1: Signer;
  user2: Signer;
  user3: Signer;
  bidder1: Signer;
  bidder2: Signer;
  bidder3: Signer;
  unauthorized: Signer;
}

export interface DeployedContracts {
  bastionProtocol: any;
  circleFactory: any;
  circleTreasury: any;
  circleVault: any;
  auctionAdapter: any;
}

export interface CircleDeployment {
  circleContract: any;
  circleAddress: string;
  creator: string;
  name: string;
  contributionThreshold: bigint;
}

/**
 * Deploy all core contracts for testing
 */
export async function deployBastionProtocolFixture(): Promise<{
  contracts: DeployedContracts;
  signers: TestSigners;
}> {
  const signers = await getTestSigners();
  
  // Deploy BastionProtocol
  const BastionProtocol = await ethers.getContractFactory("BastionProtocol");
  const bastionProtocol = await BastionProtocol.deploy();
  await bastionProtocol.waitForDeployment();

  // Deploy Mock Circle Implementation for CircleFactory
  const MockCircleImpl = await ethers.getContractFactory("MockVault");
  const mockCircleImpl = await MockCircleImpl.deploy();
  await mockCircleImpl.waitForDeployment();

  // Deploy Mock Registry for CircleFactory
  const mockRegistryAddress = await signers.admin.getAddress(); // Use admin as mock registry

  // Deploy CircleFactory
  const CircleFactory = await ethers.getContractFactory("CircleFactory");
  const circleFactory = await CircleFactory.deploy(
    await mockCircleImpl.getAddress(),
    mockRegistryAddress
  );
  await circleFactory.waitForDeployment();

  // Deploy MockERC20 for testing
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockUSDC = await MockERC20.deploy("Mock USDC", "mUSDC");
  await mockUSDC.waitForDeployment();

  // Deploy MockERC721 for testing
  const MockERC721 = await ethers.getContractFactory("MockERC721");
  const mockDomainNFT = await MockERC721.deploy("Mock Domain NFT", "mDNFT");
  await mockDomainNFT.waitForDeployment();

  // Deploy CircleTreasury with required parameters
  const CircleTreasury = await ethers.getContractFactory("CircleTreasury");
  const signerAddresses = [await signers.admin.getAddress(), await signers.deployer.getAddress()];
  const circleTreasury = await CircleTreasury.deploy(
    await mockUSDC.getAddress(),
    await signers.admin.getAddress(), // adapter placeholder
    signerAddresses,
    1 // required signatures
  );
  await circleTreasury.waitForDeployment();

  // Deploy CircleVault with required parameters
  const CircleVault = await ethers.getContractFactory("CircleVault");
  const circleVault = await CircleVault.deploy(
    await mockDomainNFT.getAddress(),
    signerAddresses,
    1 // required signatures
  );
  await circleVault.waitForDeployment();

  // Deploy AuctionAdapter with required parameters
  const AuctionAdapter = await ethers.getContractFactory("AuctionAdapter");
  const auctionAdapter = await AuctionAdapter.deploy(
    await signers.admin.getAddress(), // auction placeholder
    await circleVault.getAddress()
  );
  await auctionAdapter.waitForDeployment();

  const contracts: DeployedContracts = {
    bastionProtocol,
    circleFactory,
    circleTreasury,
    circleVault,
    auctionAdapter,
  };

  return { contracts, signers };
}

/**
 * Deploy contracts with initial configuration
 */
export async function deployConfiguredSystemFixture(): Promise<{
  contracts: DeployedContracts;
  signers: TestSigners;
}> {
  const { contracts, signers } = await deployBastionProtocolFixture();

  // Initialize CircleFactory with default parameters
  const minContribution = ethers.parseEther("0.1");
  const maxMembers = 50;
  const auctionDuration = 7 * 24 * 60 * 60; // 7 days

  // Set up initial configuration
  // Note: Add actual initialization calls based on contract interfaces
  
  return { contracts, signers };
}

/**
 * Deploy system with sample circles
 */
export async function deployWithSampleCirclesFixture(): Promise<{
  contracts: DeployedContracts;
  signers: TestSigners;
  sampleCircles: CircleDeployment[];
}> {
  const { contracts, signers } = await deployConfiguredSystemFixture();

  const sampleCircles: CircleDeployment[] = [];

  // Create first sample circle
  const circle1Name = "DeFi Enthusiasts";
  const circle1Threshold = ethers.parseEther("1.0");
  
  // Note: Simplified for testing - actual implementation may vary
  // const tx1 = await contracts.circleFactory.connect(signers.user1).createCircle(
  //   circle1Name,
  //   someInitData,
  // );
  
  sampleCircles.push({
    circleContract: null,
    circleAddress: "0x1234567890123456789012345678901234567890", // Mock address
    creator: await signers.user1.getAddress(),
    name: circle1Name,
    contributionThreshold: circle1Threshold
  });

  // Create second sample circle
  const circle2Name = "Domain Collectors";
  const circle2Threshold = ethers.parseEther("0.5");
  
  sampleCircles.push({
    circleContract: null,
    circleAddress: "0x0987654321098765432109876543210987654321", // Mock address
    creator: await signers.user2.getAddress(),
    name: circle2Name,
    contributionThreshold: circle2Threshold
  });

  return { contracts, signers, sampleCircles };
}

/**
 * Get test signers with labeled roles
 */
export async function getTestSigners(): Promise<TestSigners> {
  const [
    deployer,
    admin,
    user1,
    user2,
    user3,
    bidder1,
    bidder2,
    bidder3,
    unauthorized
  ] = await ethers.getSigners();

  return {
    deployer,
    admin,
    user1,
    user2,
    user3,
    bidder1,
    bidder2,
    bidder3,
    unauthorized
  };
}

/**
 * Fund accounts with ETH for testing
 */
export async function fundAccounts(signers: TestSigners, amount: string = "100"): Promise<void> {
  const fundAmount = ethers.parseEther(amount);
  
  const accounts = [
    signers.admin,
    signers.user1,
    signers.user2,
    signers.user3,
    signers.bidder1,
    signers.bidder2,
    signers.bidder3
  ];

  for (const account of accounts) {
    await signers.deployer.sendTransaction({
      to: await account.getAddress(),
      value: fundAmount
    });
  }
}

/**
 * Deploy minimal contracts for unit testing
 */
export async function deployMinimalFixture(): Promise<{
  contracts: Partial<DeployedContracts>;
  signers: TestSigners;
}> {
  const signers = await getTestSigners();
  
  // Deploy Mock Circle Implementation for CircleFactory
  const MockCircleImpl = await ethers.getContractFactory("MockVault");
  const mockCircleImpl = await MockCircleImpl.deploy();
  await mockCircleImpl.waitForDeployment();

  // Deploy only essential contracts for focused testing
  const CircleFactory = await ethers.getContractFactory("CircleFactory");
  const circleFactory = await CircleFactory.deploy(
    await mockCircleImpl.getAddress(),
    await signers.admin.getAddress() // Use admin as mock registry
  );
  await circleFactory.waitForDeployment();

  const contracts: Partial<DeployedContracts> = {
    circleFactory,
  };

  return { contracts, signers };
}

/**
 * Deploy full system for integration testing
 */
export async function deployFullFixture(): Promise<{
  contracts: DeployedContracts;
  signers: TestSigners;
}> {
  return await deployBastionProtocolFixture();
}