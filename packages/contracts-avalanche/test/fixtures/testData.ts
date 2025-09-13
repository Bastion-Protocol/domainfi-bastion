import { ethers } from "hardhat";

/**
 * Test data constants for Avalanche contracts
 */

export const TEST_DOMAINS = {
  PREMIUM: "premium.doma",
  DEFI: "defi-protocol.doma",
  CRYPTO: "crypto-exchange.doma",
  NFT: "nft-marketplace.doma",
  GAMING: "gaming-platform.doma",
  DAO: "dao-governance.doma",
  TRADING: "trading-bot.doma",
  FINANCE: "decentralized-finance.doma",
  WEB3: "web3-application.doma",
  METAVERSE: "metaverse-world.doma"
};

export const TEST_VALUES = {
  // NFT Values
  PREMIUM_NFT_VALUE: ethers.parseEther("100"),
  STANDARD_NFT_VALUE: ethers.parseEther("50"),
  BASIC_NFT_VALUE: ethers.parseEther("25"),
  
  // Lending amounts
  MIN_BORROW: ethers.parseEther("1"),
  STANDARD_BORROW: ethers.parseEther("25"),
  LARGE_BORROW: ethers.parseEther("100"),
  
  // Collateral ratios (in basis points)
  CONSERVATIVE_LTV: 5000, // 50%
  STANDARD_LTV: 7000,     // 70%
  AGGRESSIVE_LTV: 8500,   // 85%
  
  // Interest rates (in basis points)
  LOW_INTEREST: 500,      // 5%
  STANDARD_INTEREST: 850, // 8.5%
  HIGH_INTEREST: 1200,    // 12%
  
  // Liquidation parameters
  LIQUIDATION_THRESHOLD: 7500, // 75%
  LIQUIDATION_BONUS: 1000,     // 10%
  LIQUIDATION_PENALTY: 500     // 5%
};

export const CROSS_CHAIN_CONFIG = {
  DOMA_CHAIN_ID: 12345,
  AVALANCHE_CHAIN_ID: 43113, // Fuji testnet
  BRIDGE_FEE: ethers.parseEther("0.01"),
  CONFIRMATION_BLOCKS: 6,
  TIMEOUT_PERIOD: 24 * 60 * 60 // 24 hours
};

/**
 * Generate test NFT metadata
 */
export function generateNFTMetadata(domain: string, value: bigint) {
  return {
    domain,
    value,
    category: getCategoryFromDomain(domain),
    length: domain.split('.')[0].length,
    createdAt: Math.floor(Date.now() / 1000),
    verified: true
  };
}

/**
 * Get category from domain name
 */
function getCategoryFromDomain(domain: string): string {
  const name = domain.toLowerCase();
  if (name.includes('defi') || name.includes('finance')) return 'finance';
  if (name.includes('crypto') || name.includes('trading')) return 'trading';
  if (name.includes('gaming') || name.includes('game')) return 'gaming';
  if (name.includes('nft') || name.includes('art')) return 'collectibles';
  if (name.includes('dao') || name.includes('governance')) return 'governance';
  if (name.includes('web3') || name.includes('metaverse')) return 'technology';
  if (name.includes('premium') || name.length <= 6) return 'premium';
  return 'generic';
}

/**
 * Generate borrowing position data
 */
export function generateBorrowingPosition(
  borrower: string,
  collateralTokenId: bigint,
  collateralValue: bigint,
  ltv: number = 70
): {
  borrower: string;
  collateralTokenId: bigint;
  borrowedAmount: bigint;
  maxBorrowable: bigint;
  healthFactor: number;
  interestRate: number;
} {
  const maxBorrowable = (collateralValue * BigInt(ltv)) / BigInt(100);
  const borrowedAmount = (maxBorrowable * BigInt(80)) / BigInt(100); // Borrow 80% of max
  const healthFactor = Number(collateralValue * BigInt(75)) / Number(borrowedAmount * BigInt(100));
  
  return {
    borrower,
    collateralTokenId,
    borrowedAmount,
    maxBorrowable,
    healthFactor,
    interestRate: TEST_VALUES.STANDARD_INTEREST
  };
}

/**
 * Generate liquidation scenario data
 */
export function generateLiquidationScenario(
  initialCollateralValue: bigint,
  borrowedAmount: bigint,
  priceDropPercentage: number
): {
  initialHealth: number;
  newCollateralValue: bigint;
  newHealth: number;
  isLiquidatable: boolean;
  maxLiquidation: bigint;
  liquidatorReward: bigint;
} {
  const initialHealth = Number(initialCollateralValue * BigInt(75)) / Number(borrowedAmount * BigInt(100));
  
  const newCollateralValue = initialCollateralValue - (initialCollateralValue * BigInt(priceDropPercentage)) / BigInt(100);
  const newHealth = Number(newCollateralValue * BigInt(75)) / Number(borrowedAmount * BigInt(100));
  
  const isLiquidatable = newHealth < 1.0;
  const maxLiquidation = isLiquidatable ? (borrowedAmount * BigInt(50)) / BigInt(100) : BigInt(0); // Max 50%
  const liquidatorReward = (maxLiquidation * BigInt(TEST_VALUES.LIQUIDATION_BONUS)) / BigInt(10000);
  
  return {
    initialHealth,
    newCollateralValue,
    newHealth,
    isLiquidatable,
    maxLiquidation,
    liquidatorReward
  };
}

/**
 * Cross-chain message data
 */
export function generateCrossChainMessage(
  messageType: 'MIRROR_MINT' | 'CUSTODY_DEPOSIT' | 'LIQUIDATION_NOTICE',
  payload: any
) {
  return {
    messageType,
    sourceChain: CROSS_CHAIN_CONFIG.DOMA_CHAIN_ID,
    destinationChain: CROSS_CHAIN_CONFIG.AVALANCHE_CHAIN_ID,
    payload,
    nonce: Math.floor(Math.random() * 1000000),
    timestamp: Math.floor(Date.now() / 1000),
    fee: CROSS_CHAIN_CONFIG.BRIDGE_FEE
  };
}

/**
 * Test scenarios for comprehensive testing
 */
export const LENDING_SCENARIOS = {
  HEALTHY_BORROWING: {
    collateralValue: TEST_VALUES.PREMIUM_NFT_VALUE,
    borrowAmount: ethers.parseEther("50"), // 50% LTV
    expectedHealth: 1.5,
    shouldSucceed: true
  },

  RISKY_BORROWING: {
    collateralValue: TEST_VALUES.STANDARD_NFT_VALUE,
    borrowAmount: ethers.parseEther("40"), // 80% LTV
    expectedHealth: 0.9375,
    shouldSucceed: false // Health < 1.0
  },

  LIQUIDATION_SCENARIO: {
    initialCollateral: TEST_VALUES.PREMIUM_NFT_VALUE,
    borrowAmount: ethers.parseEther("70"), // 70% LTV
    priceDropPercent: 30,
    finalHealth: 0.75,
    shouldLiquidate: true
  },

  CROSS_CHAIN_FLOW: {
    domainWon: TEST_DOMAINS.PREMIUM,
    custodyAmount: TEST_VALUES.PREMIUM_NFT_VALUE,
    mirrorTokenId: BigInt(1),
    borrowAmount: ethers.parseEther("50"),
    expectedSteps: ['CUSTODY', 'MIRROR_MINT', 'COLLATERAL_DEPOSIT', 'BORROW']
  }
};

/**
 * Interest calculation test data
 */
export const INTEREST_TEST_DATA = [
  {
    principal: ethers.parseEther("100"),
    rate: 850, // 8.5%
    timeInSeconds: 365 * 24 * 60 * 60, // 1 year
    expectedInterest: ethers.parseEther("8.5")
  },
  {
    principal: ethers.parseEther("50"),
    rate: 1200, // 12%
    timeInSeconds: 30 * 24 * 60 * 60, // 30 days
    expectedInterest: ethers.parseEther("0.493") // Approximately
  },
  {
    principal: ethers.parseEther("25"),
    rate: 500, // 5%
    timeInSeconds: 7 * 24 * 60 * 60, // 7 days
    expectedInterest: ethers.parseEther("0.024") // Approximately
  }
];

/**
 * Price volatility test scenarios
 */
export const PRICE_VOLATILITY_SCENARIOS = [
  {
    name: "Mild Volatility",
    priceChanges: [5, -3, 2, -1, 4], // Percentage changes
    triggerLiquidation: false
  },
  {
    name: "High Volatility", 
    priceChanges: [15, -20, 10, -25, 5],
    triggerLiquidation: true
  },
  {
    name: "Market Crash",
    priceChanges: [-30, -15, -10, -5, 2],
    triggerLiquidation: true,
    massLiquidations: true
  },
  {
    name: "Bull Market",
    priceChanges: [20, 15, 25, 10, 12],
    triggerLiquidation: false,
    improveHealth: true
  }
];

/**
 * Error messages for testing
 */
export const ERROR_MESSAGES = {
  // NFT errors
  NFT_NOT_OWNER: "Not the owner of this NFT",
  NFT_NOT_EXISTS: "NFT does not exist",
  NFT_ALREADY_COLLATERAL: "NFT already used as collateral",
  
  // Lending errors
  INSUFFICIENT_COLLATERAL: "Insufficient collateral value",
  POSITION_NOT_EXISTS: "Borrowing position does not exist",
  POSITION_UNDERWATER: "Position is underwater",
  EXCEED_BORROW_LIMIT: "Borrow amount exceeds limit",
  
  // Liquidation errors
  POSITION_HEALTHY: "Position is healthy, cannot liquidate",
  INVALID_LIQUIDATION_AMOUNT: "Invalid liquidation amount",
  LIQUIDATION_FAILED: "Liquidation failed",
  
  // Cross-chain errors
  INVALID_CHAIN_ID: "Invalid chain ID",
  MESSAGE_EXPIRED: "Cross-chain message expired",
  BRIDGE_PAUSED: "Bridge is paused",
  INSUFFICIENT_BRIDGE_FEE: "Insufficient bridge fee",
  
  // Access control
  UNAUTHORIZED: "Unauthorized access",
  ONLY_LIQUIDATOR: "Only liquidators can perform this action",
  ONLY_BRIDGE: "Only bridge can call this function"
};

/**
 * Gas limit expectations for different operations
 */
export const GAS_LIMITS = {
  MINT_MIRROR_NFT: 200000,
  DEPOSIT_COLLATERAL: 150000,
  BORROW_FUNDS: 180000,
  REPAY_LOAN: 120000,
  LIQUIDATE_POSITION: 250000,
  CROSS_CHAIN_MESSAGE: 300000,
  WITHDRAW_COLLATERAL: 140000
};

/**
 * Mock contract addresses for testing
 */
export const MOCK_ADDRESSES = {
  DOMA_REGISTRY: "0x1111111111111111111111111111111111111111",
  PRICE_ORACLE: "0x2222222222222222222222222222222222222222",
  BRIDGE_CONTRACT: "0x3333333333333333333333333333333333333333",
  TREASURY: "0x4444444444444444444444444444444444444444",
  LIQUIDATOR_BOT: "0x5555555555555555555555555555555555555555"
};

/**
 * Helper to generate consistent test data
 */
export class LendingTestDataGenerator {
  static generatePosition(index: number, healthy: boolean = true) {
    const collateralValue = TEST_VALUES.PREMIUM_NFT_VALUE;
    const borrowAmount = healthy 
      ? (collateralValue * BigInt(50)) / BigInt(100) // 50% LTV - healthy
      : (collateralValue * BigInt(85)) / BigInt(100); // 85% LTV - risky

    return {
      tokenId: BigInt(index + 1),
      collateralValue,
      borrowAmount,
      interestRate: TEST_VALUES.STANDARD_INTEREST,
      createdAt: Math.floor(Date.now() / 1000) - (index * 24 * 60 * 60) // Stagger creation times
    };
  }

  static generateNFTCollection(count: number) {
    const domains = Object.values(TEST_DOMAINS);
    const values = [
      TEST_VALUES.PREMIUM_NFT_VALUE,
      TEST_VALUES.STANDARD_NFT_VALUE,
      TEST_VALUES.BASIC_NFT_VALUE
    ];

    return Array.from({ length: count }, (_, i) => ({
      tokenId: BigInt(i + 1),
      domain: domains[i % domains.length],
      value: values[i % values.length],
      metadata: generateNFTMetadata(domains[i % domains.length], values[i % values.length])
    }));
  }

  static generateLiquidationEvent(tokenId: bigint, severe: boolean = false) {
    const priceDropPercent = severe ? 40 : 20;
    const collateralValue = TEST_VALUES.PREMIUM_NFT_VALUE;
    const borrowAmount = (collateralValue * BigInt(70)) / BigInt(100);

    return generateLiquidationScenario(collateralValue, borrowAmount, priceDropPercent);
  }
}