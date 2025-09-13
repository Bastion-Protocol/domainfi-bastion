import { ethers } from "hardhat";
import { Signer } from "ethers";

export interface TestSigners {
  deployer: Signer;
  admin: Signer;
  user1: Signer;
  user2: Signer;
  user3: Signer;
  borrower1: Signer;
  borrower2: Signer;
  liquidator1: Signer;
  liquidator2: Signer;
  unauthorized: Signer;
}

export interface DeployedContracts {
  bastionProtocol: any;
  mirrorDomainNFT: any;
  collateralManager: any;
  lendingPool: any;
}

export interface LendingPosition {
  borrower: string;
  collateralTokenId: bigint;
  borrowedAmount: bigint;
  interestRate: number;
  healthFactor: number;
  liquidationThreshold: number;
}

/**
 * Deploy all core contracts for Avalanche testing
 */
export async function deployAvalancheSystemFixture(): Promise<{
  contracts: DeployedContracts;
  signers: TestSigners;
}> {
  const signers = await getTestSigners();
  
  // Deploy BastionProtocol
  const BastionProtocol = await ethers.getContractFactory("BastionProtocol");
  const bastionProtocol = await BastionProtocol.deploy();
  await bastionProtocol.waitForDeployment();

  // Deploy MirrorDomainNFT
  const MirrorDomainNFT = await ethers.getContractFactory("MirrorDomainNFT");
  const mirrorDomainNFT = await MirrorDomainNFT.deploy();
  await mirrorDomainNFT.waitForDeployment();

  // Deploy CollateralManager
  const CollateralManager = await ethers.getContractFactory("CollateralManager");
  const collateralManager = await CollateralManager.deploy();
  await collateralManager.waitForDeployment();

  // Deploy LendingPool
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy();
  await lendingPool.waitForDeployment();

  const contracts: DeployedContracts = {
    bastionProtocol,
    mirrorDomainNFT,
    collateralManager,
    lendingPool,
  };

  return { contracts, signers };
}

/**
 * Deploy contracts with initial configuration and sample data
 */
export async function deployConfiguredLendingFixture(): Promise<{
  contracts: DeployedContracts;
  signers: TestSigners;
  sampleNFTs: Array<{ tokenId: bigint; owner: string; domain: string; value: bigint }>;
}> {
  const { contracts, signers } = await deployAvalancheSystemFixture();

  // Initialize system with default parameters
  const interestRate = 850; // 8.5% APR (basis points)
  const liquidationThreshold = 7500; // 75% (basis points)
  const liquidationBonus = 1000; // 10% (basis points)

  // Sample NFT data
  const sampleNFTs = [
    {
      tokenId: BigInt(1),
      owner: await signers.user1.getAddress(),
      domain: "premium.doma",
      value: ethers.parseEther("100")
    },
    {
      tokenId: BigInt(2),
      owner: await signers.user2.getAddress(),
      domain: "defi-protocol.doma",
      value: ethers.parseEther("50")
    },
    {
      tokenId: BigInt(3),
      owner: await signers.user3.getAddress(),
      domain: "crypto-exchange.doma",
      value: ethers.parseEther("75")
    }
  ];

  // Mint sample NFTs (simplified - actual implementation may vary)
  for (const nft of sampleNFTs) {
    // Note: These calls are placeholders - update with actual contract interfaces
    // await contracts.mirrorDomainNFT.mint(nft.owner, nft.tokenId, nft.domain);
  }

  return { contracts, signers, sampleNFTs };
}

/**
 * Deploy system with existing borrowing positions
 */
export async function deployWithBorrowingPositionsFixture(): Promise<{
  contracts: DeployedContracts;
  signers: TestSigners;
  positions: LendingPosition[];
}> {
  const { contracts, signers } = await deployConfiguredLendingFixture();

  const positions: LendingPosition[] = [
    {
      borrower: await signers.borrower1.getAddress(),
      collateralTokenId: BigInt(1),
      borrowedAmount: ethers.parseEther("50"),
      interestRate: 850, // 8.5%
      healthFactor: 1.5,
      liquidationThreshold: 7500 // 75%
    },
    {
      borrower: await signers.borrower2.getAddress(),
      collateralTokenId: BigInt(2),
      borrowedAmount: ethers.parseEther("35"),
      interestRate: 900, // 9%
      healthFactor: 1.07, // Close to liquidation
      liquidationThreshold: 7500
    }
  ];

  // Set up borrowing positions (placeholder implementation)
  // for (const position of positions) {
  //   await contracts.lendingPool.connect(signers.deployer).createPosition(
  //     position.borrower,
  //     position.collateralTokenId,
  //     position.borrowedAmount
  //   );
  // }

  return { contracts, signers, positions };
}

/**
 * Get test signers with labeled roles for lending scenarios
 */
export async function getTestSigners(): Promise<TestSigners> {
  const [
    deployer,
    admin,
    user1,
    user2,
    user3,
    borrower1,
    borrower2,
    liquidator1,
    liquidator2,
    unauthorized
  ] = await ethers.getSigners();

  return {
    deployer,
    admin,
    user1,
    user2,
    user3,
    borrower1,
    borrower2,
    liquidator1,
    liquidator2,
    unauthorized
  };
}

/**
 * Setup mock NFT collection for testing
 */
export async function createMockNFTCollection(
  contracts: DeployedContracts,
  signers: TestSigners,
  count: number = 10
): Promise<Array<{ tokenId: bigint; owner: string; domain: string; value: bigint }>> {
  const collection = [];
  
  const domains = [
    "premium.doma",
    "defi.doma", 
    "crypto.doma",
    "nft.doma",
    "trading.doma",
    "finance.doma",
    "tech.doma",
    "gaming.doma",
    "web3.doma",
    "dao.doma"
  ];

  const baseValues = [
    ethers.parseEther("100"),
    ethers.parseEther("75"),
    ethers.parseEther("50"),
    ethers.parseEther("25"),
    ethers.parseEther("150"),
    ethers.parseEther("80"),
    ethers.parseEther("60"),
    ethers.parseEther("40"),
    ethers.parseEther("120"),
    ethers.parseEther("90")
  ];

  const owners = [
    signers.user1,
    signers.user2,
    signers.user3,
    signers.borrower1,
    signers.borrower2
  ];

  for (let i = 0; i < count; i++) {
    const tokenId = BigInt(i + 1);
    const owner = owners[i % owners.length];
    const domain = domains[i % domains.length];
    const value = baseValues[i % baseValues.length];

    collection.push({
      tokenId,
      owner: await owner.getAddress(),
      domain,
      value
    });

    // Mint NFT (placeholder - update with actual contract interface)
    // await contracts.mirrorDomainNFT.mint(await owner.getAddress(), tokenId, domain);
  }

  return collection;
}

/**
 * Fund lending pool with liquidity
 */
export async function fundLendingPool(
  contracts: DeployedContracts,
  signers: TestSigners,
  amount: string = "1000"
): Promise<void> {
  const fundAmount = ethers.parseEther(amount);
  
  // Add liquidity to lending pool
  await signers.deployer.sendTransaction({
    to: await contracts.lendingPool.getAddress(),
    value: fundAmount
  });

  // Additional funding from other users
  const funders = [signers.user1, signers.user2, signers.user3];
  for (const funder of funders) {
    await funder.sendTransaction({
      to: await contracts.lendingPool.getAddress(),
      value: ethers.parseEther("100")
    });
  }
}

/**
 * Setup price oracle with mock prices
 */
export async function setupMockOracle(
  contracts: DeployedContracts
): Promise<void> {
  // Mock price setup - update with actual oracle interface
  const mockPrices = [
    { asset: "premium.doma", price: ethers.parseEther("100") },
    { asset: "defi.doma", price: ethers.parseEther("75") },
    { asset: "crypto.doma", price: ethers.parseEther("50") },
    { asset: "eth", price: ethers.parseEther("2000") },
    { asset: "avax", price: ethers.parseEther("25") }
  ];

  // Set mock prices (placeholder implementation)
  // for (const priceData of mockPrices) {
  //   await contracts.priceOracle.setPrice(priceData.asset, priceData.price);
  // }
}

/**
 * Deploy minimal contracts for unit testing
 */
export async function deployMinimalAvalancheFixture(): Promise<{
  contracts: Partial<DeployedContracts>;
  signers: TestSigners;
}> {
  const signers = await getTestSigners();
  
  // Deploy only essential contract for focused testing
  const MirrorDomainNFT = await ethers.getContractFactory("MirrorDomainNFT");
  const mirrorDomainNFT = await MirrorDomainNFT.deploy();
  await mirrorDomainNFT.waitForDeployment();

  const contracts: Partial<DeployedContracts> = {
    mirrorDomainNFT,
  };

  return { contracts, signers };
}

/**
 * Create test scenario with underwater positions for liquidation testing
 */
export async function deployLiquidationTestFixture(): Promise<{
  contracts: DeployedContracts;
  signers: TestSigners;
  underwaterPositions: LendingPosition[];
}> {
  const { contracts, signers } = await deployWithBorrowingPositionsFixture();

  // Create positions that are underwater or close to liquidation
  const underwaterPositions: LendingPosition[] = [
    {
      borrower: await signers.borrower1.getAddress(),
      collateralTokenId: BigInt(1),
      borrowedAmount: ethers.parseEther("85"), // High LTV
      interestRate: 850,
      healthFactor: 0.88, // Below 1.0 - liquidatable
      liquidationThreshold: 7500
    },
    {
      borrower: await signers.borrower2.getAddress(),
      collateralTokenId: BigInt(2),
      borrowedAmount: ethers.parseEther("60"), // Very high LTV
      interestRate: 1000,
      healthFactor: 0.625, // Well below 1.0
      liquidationThreshold: 7500
    }
  ];

  return { contracts, signers, underwaterPositions };
}

/**
 * Deploy lending system for testing
 */
export async function deployLendingFixture(): Promise<{
  contracts: DeployedContracts;
  signers: TestSigners;
}> {
  return await deployAvalancheSystemFixture();
}