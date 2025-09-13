import { ethers } from "hardhat";

/**
 * Test data constants and helpers
 */

export const TEST_DOMAINS = {
  BASIC: "example.doma",
  PREMIUM: "premium.doma",
  DEFI: "defi-protocol.doma",
  CRYPTO: "crypto-exchange.doma",
  LONG: "very-long-domain-name-for-testing.doma",
  NUMBERS: "test123.doma",
  SPECIAL: "test-domain_v2.doma"
};

export const TEST_VALUES = {
  MIN_BID: ethers.parseEther("0.1"),
  STANDARD_BID: ethers.parseEther("1.0"),
  HIGH_BID: ethers.parseEther("10.0"),
  PREMIUM_BID: ethers.parseEther("100.0"),
  CONTRIBUTION_THRESHOLD: ethers.parseEther("0.5"),
  LARGE_CONTRIBUTION: ethers.parseEther("5.0"),
  SMALL_CONTRIBUTION: ethers.parseEther("0.01")
};

export const TEST_TIMEFRAMES = {
  AUCTION_DURATION: 7 * 24 * 60 * 60, // 7 days
  REVEAL_DURATION: 24 * 60 * 60, // 1 day
  GRACE_PERIOD: 60 * 60, // 1 hour
  SHORT_PERIOD: 60, // 1 minute
  LONG_PERIOD: 30 * 24 * 60 * 60 // 30 days
};

export const CIRCLE_NAMES = [
  "DeFi Enthusiasts",
  "Domain Collectors",
  "Crypto Investors",
  "NFT Community",
  "Tech Innovators",
  "Trading Circle",
  "Yield Farmers",
  "DAO Builders"
];

/**
 * Generate test bid commitment
 */
export function generateBidCommitment(
  bidAmount: bigint,
  salt: string,
  bidder: string
): string {
  return ethers.solidityPackedKeccak256(
    ["uint256", "bytes32", "address"],
    [bidAmount, ethers.id(salt), bidder]
  );
}

/**
 * Generate random salt for bid commitment
 */
export function generateRandomSalt(): string {
  return ethers.hexlify(ethers.randomBytes(32));
}

/**
 * Generate test auction data
 */
export function generateAuctionData(domain: string, startBid: bigint = TEST_VALUES.MIN_BID) {
  return {
    domain,
    startingBid: startBid,
    auctionDuration: TEST_TIMEFRAMES.AUCTION_DURATION,
    revealDuration: TEST_TIMEFRAMES.REVEAL_DURATION,
    creator: ethers.ZeroAddress, // Will be set in tests
    isActive: true
  };
}

/**
 * Generate test circle data
 */
export function generateCircleData(name: string, threshold: bigint = TEST_VALUES.CONTRIBUTION_THRESHOLD) {
  return {
    name,
    contributionThreshold: threshold,
    maxMembers: 50,
    isActive: true,
    creator: ethers.ZeroAddress // Will be set in tests
  };
}

/**
 * Generate multiple test bids
 */
export function generateTestBids(count: number, baseAmount: bigint = TEST_VALUES.STANDARD_BID) {
  const bids = [];
  for (let i = 0; i < count; i++) {
    const amount = baseAmount + ethers.parseEther((i * 0.1).toString());
    const salt = generateRandomSalt();
    bids.push({
      amount,
      salt,
      commitment: "", // Will be generated with actual bidder address
      revealed: false
    });
  }
  return bids;
}

/**
 * Test error messages
 */
export const ERROR_MESSAGES = {
  // Access control
  UNAUTHORIZED: "Unauthorized",
  ONLY_OWNER: "Ownable: caller is not the owner",
  ONLY_ADMIN: "Only admin can perform this action",
  
  // Auction errors
  AUCTION_NOT_ACTIVE: "Auction is not active",
  AUCTION_ENDED: "Auction has ended",
  BID_TOO_LOW: "Bid amount too low",
  ALREADY_REVEALED: "Bid already revealed",
  INVALID_COMMITMENT: "Invalid bid commitment",
  
  // Circle errors
  CIRCLE_FULL: "Circle has reached maximum members",
  INSUFFICIENT_CONTRIBUTION: "Contribution below threshold",
  ALREADY_MEMBER: "Already a member of this circle",
  CIRCLE_NOT_ACTIVE: "Circle is not active",
  
  // Domain errors
  DOMAIN_NOT_AVAILABLE: "Domain not available",
  INVALID_DOMAIN: "Invalid domain name",
  DOMAIN_ALREADY_OWNED: "Domain already owned",
  
  // General
  INSUFFICIENT_BALANCE: "Insufficient balance",
  INVALID_ADDRESS: "Invalid address",
  ZERO_AMOUNT: "Amount cannot be zero",
  REENTRANCY: "ReentrancyGuard: reentrant call"
};

/**
 * Test scenarios for comprehensive testing
 */
export const TEST_SCENARIOS = {
  SIMPLE_AUCTION: {
    domain: TEST_DOMAINS.BASIC,
    bids: [
      { amount: TEST_VALUES.MIN_BID, winner: false },
      { amount: TEST_VALUES.STANDARD_BID, winner: true }
    ],
    expectedWinner: 1
  },
  
  COMPLEX_AUCTION: {
    domain: TEST_DOMAINS.PREMIUM,
    bids: [
      { amount: ethers.parseEther("1.0"), winner: false },
      { amount: ethers.parseEther("2.5"), winner: false },
      { amount: ethers.parseEther("5.0"), winner: false },
      { amount: ethers.parseEther("10.0"), winner: true },
      { amount: ethers.parseEther("7.5"), winner: false }
    ],
    expectedWinner: 3
  },
  
  CIRCLE_FORMATION: {
    name: CIRCLE_NAMES[0],
    threshold: TEST_VALUES.CONTRIBUTION_THRESHOLD,
    members: [
      { contribution: ethers.parseEther("1.0"), success: true },
      { contribution: ethers.parseEther("0.3"), success: false }, // Below threshold
      { contribution: ethers.parseEther("2.0"), success: true },
      { contribution: ethers.parseEther("0.5"), success: true }
    ],
    expectedMembers: 3
  }
};

/**
 * Gas optimization test thresholds
 */
export const GAS_LIMITS = {
  CIRCLE_CREATION: 500000,
  BID_SUBMISSION: 150000,
  BID_REVEAL: 100000,
  DOMAIN_TRANSFER: 200000,
  VAULT_DEPOSIT: 180000,
  TREASURY_DEPOSIT: 120000
};

/**
 * Mock external contract addresses for testing
 */
export const MOCK_ADDRESSES = {
  DOMA_REGISTRY: "0x1234567890123456789012345678901234567890",
  AVALANCHE_BRIDGE: "0x0987654321098765432109876543210987654321",
  ORACLE: "0x1111111111111111111111111111111111111111",
  TREASURY: "0x2222222222222222222222222222222222222222"
};

/**
 * Helper to generate consistent test data
 */
export class TestDataGenerator {
  static generateDomainAuction(index: number) {
    const domains = Object.values(TEST_DOMAINS);
    return {
      domain: domains[index % domains.length],
      startingBid: TEST_VALUES.MIN_BID + ethers.parseEther((index * 0.1).toString()),
      duration: TEST_TIMEFRAMES.AUCTION_DURATION
    };
  }

  static generateCircle(index: number) {
    return {
      name: CIRCLE_NAMES[index % CIRCLE_NAMES.length],
      threshold: TEST_VALUES.CONTRIBUTION_THRESHOLD + ethers.parseEther((index * 0.1).toString()),
      maxMembers: 50 + index * 10
    };
  }

  static generateUser(index: number) {
    return {
      name: `User${index}`,
      contribution: TEST_VALUES.CONTRIBUTION_THRESHOLD + ethers.parseEther((index * 0.5).toString()),
      bidAmount: TEST_VALUES.STANDARD_BID + ethers.parseEther((index * 0.2).toString())
    };
  }
}