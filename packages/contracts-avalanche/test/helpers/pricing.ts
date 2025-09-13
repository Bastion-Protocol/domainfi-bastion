import { ethers } from "hardhat";

/**
 * Pricing utilities for testing lending and collateral operations
 */
export class PricingHelpers {
  /**
   * Calculate loan-to-value ratio
   */
  static calculateLTV(loanAmount: bigint, collateralValue: bigint): number {
    if (collateralValue === BigInt(0)) return 0;
    return Number((loanAmount * BigInt(10000)) / collateralValue) / 100;
  }

  /**
   * Calculate health factor
   */
  static calculateHealthFactor(
    collateralValue: bigint,
    borrowedAmount: bigint,
    liquidationThreshold: number = 75
  ): number {
    if (borrowedAmount === BigInt(0)) return 999; // No debt
    const liquidationValue = (collateralValue * BigInt(liquidationThreshold)) / BigInt(100);
    return Number(liquidationValue) / Number(borrowedAmount);
  }

  /**
   * Calculate liquidation price for collateral
   */
  static calculateLiquidationPrice(
    borrowedAmount: bigint,
    collateralAmount: bigint,
    liquidationThreshold: number = 75
  ): bigint {
    if (collateralAmount === BigInt(0)) return BigInt(0);
    return (borrowedAmount * BigInt(100)) / (collateralAmount * BigInt(liquidationThreshold));
  }

  /**
   * Calculate interest accrued
   */
  static calculateInterest(
    principal: bigint,
    rate: number, // Annual rate in percentage
    timeInSeconds: number
  ): bigint {
    const annualRate = BigInt(Math.floor(rate * 100));
    const timeInYears = BigInt(timeInSeconds) * BigInt(100) / BigInt(365 * 24 * 60 * 60);
    return (principal * annualRate * timeInYears) / BigInt(1000000);
  }

  /**
   * Calculate compound interest
   */
  static calculateCompoundInterest(
    principal: bigint,
    rate: number,
    timeInSeconds: number,
    compoundingFrequency: number = 365 // Daily compounding
  ): bigint {
    const rateDecimal = rate / 100;
    const periodsPerYear = compoundingFrequency;
    const years = timeInSeconds / (365 * 24 * 60 * 60);
    
    // A = P(1 + r/n)^(nt)
    const factor = Math.pow(1 + rateDecimal / periodsPerYear, periodsPerYear * years);
    const amount = Number(principal) * factor;
    
    return BigInt(Math.floor(amount)) - principal;
  }

  /**
   * Calculate borrowing capacity based on collateral
   */
  static calculateBorrowingCapacity(
    collateralValue: bigint,
    maxLTV: number = 70
  ): bigint {
    return (collateralValue * BigInt(maxLTV)) / BigInt(100);
  }

  /**
   * Check if position is liquidatable
   */
  static isLiquidatable(
    collateralValue: bigint,
    borrowedAmount: bigint,
    liquidationThreshold: number = 75
  ): boolean {
    const healthFactor = this.calculateHealthFactor(collateralValue, borrowedAmount, liquidationThreshold);
    return healthFactor < 1.0;
  }

  /**
   * Calculate liquidation bonus
   */
  static calculateLiquidationBonus(
    liquidatedAmount: bigint,
    bonusPercentage: number = 10
  ): bigint {
    return (liquidatedAmount * BigInt(bonusPercentage)) / BigInt(100);
  }

  /**
   * Simulate price movement
   */
  static simulatePriceChange(currentPrice: bigint, changePercentage: number): bigint {
    const changeAmount = (currentPrice * BigInt(Math.abs(Math.floor(changePercentage * 100)))) / BigInt(10000);
    return changePercentage >= 0 ? currentPrice + changeAmount : currentPrice - changeAmount;
  }

  /**
   * Calculate domain valuation based on multiple factors
   */
  static calculateDomainValue(
    baseValue: bigint,
    length: number,
    category: string,
    ageInDays: number = 0
  ): bigint {
    let multiplier = 100; // Base 100%

    // Length factor
    if (length <= 3) multiplier += 50; // +50% for short domains
    else if (length <= 6) multiplier += 20; // +20% for medium domains
    else if (length > 15) multiplier -= 30; // -30% for long domains

    // Category factor
    const categoryMultipliers: { [key: string]: number } = {
      "premium": 100, // +100%
      "tech": 50,     // +50%
      "finance": 75,  // +75%
      "gaming": 30,   // +30%
      "generic": 0    // +0%
    };
    
    multiplier += categoryMultipliers[category.toLowerCase()] || 0;

    // Age factor (domains get more valuable over time)
    if (ageInDays > 365) multiplier += 25; // +25% for domains older than 1 year
    else if (ageInDays > 30) multiplier += 10; // +10% for domains older than 1 month

    return (baseValue * BigInt(multiplier)) / BigInt(100);
  }
}

/**
 * Oracle simulation helpers
 */
export class OracleHelpers {
  private static prices: Map<string, bigint> = new Map();

  /**
   * Set mock price for asset
   */
  static setPrice(asset: string, price: bigint): void {
    this.prices.set(asset.toLowerCase(), price);
  }

  /**
   * Get mock price for asset
   */
  static getPrice(asset: string): bigint {
    return this.prices.get(asset.toLowerCase()) || ethers.parseEther("1000"); // Default price
  }

  /**
   * Simulate price volatility
   */
  static simulateVolatility(asset: string, volatilityPercentage: number): bigint {
    const currentPrice = this.getPrice(asset);
    const maxChange = (currentPrice * BigInt(Math.floor(volatilityPercentage * 100))) / BigInt(10000);
    
    // Random change between -maxChange and +maxChange
    const random = Math.random() * 2 - 1; // -1 to 1
    const change = BigInt(Math.floor(Number(maxChange) * random));
    
    const newPrice = currentPrice + change;
    this.setPrice(asset, newPrice > 0 ? newPrice : currentPrice);
    
    return this.getPrice(asset);
  }

  /**
   * Initialize default prices
   */
  static initializeDefaultPrices(): void {
    this.setPrice("eth", ethers.parseEther("2000"));
    this.setPrice("avax", ethers.parseEther("25"));
    this.setPrice("btc", ethers.parseEther("45000"));
    
    // Domain categories
    this.setPrice("premium.doma", ethers.parseEther("100"));
    this.setPrice("tech.doma", ethers.parseEther("50"));
    this.setPrice("finance.doma", ethers.parseEther("75"));
    this.setPrice("gaming.doma", ethers.parseEther("30"));
    this.setPrice("generic.doma", ethers.parseEther("10"));
  }
}

/**
 * Risk management helpers
 */
export class RiskHelpers {
  /**
   * Calculate position risk score (0-100)
   */
  static calculateRiskScore(
    healthFactor: number,
    ltv: number,
    collateralVolatility: number
  ): number {
    let riskScore = 0;

    // Health factor risk (40% weight)
    if (healthFactor < 1.1) riskScore += 40;
    else if (healthFactor < 1.5) riskScore += 25;
    else if (healthFactor < 2.0) riskScore += 10;

    // LTV risk (30% weight)
    if (ltv > 80) riskScore += 30;
    else if (ltv > 60) riskScore += 20;
    else if (ltv > 40) riskScore += 10;

    // Volatility risk (30% weight)
    if (collateralVolatility > 50) riskScore += 30;
    else if (collateralVolatility > 25) riskScore += 20;
    else if (collateralVolatility > 10) riskScore += 10;

    return Math.min(riskScore, 100);
  }

  /**
   * Determine risk level
   */
  static getRiskLevel(riskScore: number): string {
    if (riskScore >= 70) return "HIGH";
    if (riskScore >= 40) return "MEDIUM";
    if (riskScore >= 20) return "LOW";
    return "MINIMAL";
  }

  /**
   * Calculate required collateral for safe borrowing
   */
  static calculateSafeCollateral(
    borrowAmount: bigint,
    targetHealthFactor: number = 2.0,
    liquidationThreshold: number = 75
  ): bigint {
    const requiredCollateralValue = (borrowAmount * BigInt(Math.floor(targetHealthFactor * 100))) / BigInt(liquidationThreshold);
    return requiredCollateralValue;
  }
}

/**
 * Testing constants for lending operations
 */
export const LENDING_CONSTANTS = {
  INTEREST_RATES: {
    STABLE: 5.0,    // 5% APR
    VARIABLE: 8.5,  // 8.5% APR
    HIGH_RISK: 15.0 // 15% APR
  },
  
  LTV_RATIOS: {
    CONSERVATIVE: 50,
    STANDARD: 70,
    AGGRESSIVE: 85
  },
  
  LIQUIDATION_THRESHOLDS: {
    CONSERVATIVE: 60,
    STANDARD: 75,
    AGGRESSIVE: 90
  },
  
  HEALTH_FACTOR_TARGETS: {
    SAFE: 3.0,
    MODERATE: 2.0,
    RISKY: 1.5,
    DANGER: 1.1
  }
};