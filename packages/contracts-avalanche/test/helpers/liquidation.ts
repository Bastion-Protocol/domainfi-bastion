import { ethers } from "hardhat";
import { PricingHelpers } from "./pricing";

/**
 * Liquidation utilities for testing lending protocols
 */
export class LiquidationHelpers {
  /**
   * Calculate liquidation threshold breach
   */
  static isLiquidationTriggered(
    collateralValue: bigint,
    borrowedAmount: bigint,
    liquidationThreshold: number = 75
  ): boolean {
    if (borrowedAmount === BigInt(0)) return false;
    const healthFactor = PricingHelpers.calculateHealthFactor(collateralValue, borrowedAmount, liquidationThreshold);
    return healthFactor < 1.0;
  }

  /**
   * Calculate maximum liquidatable amount
   */
  static calculateMaxLiquidation(
    borrowedAmount: bigint,
    collateralValue: bigint,
    maxLiquidationRatio: number = 50 // Max 50% can be liquidated at once
  ): bigint {
    const maxByRatio = (borrowedAmount * BigInt(maxLiquidationRatio)) / BigInt(100);
    
    // Cannot liquidate more than the collateral can cover
    const maxByCollateral = collateralValue;
    
    return maxByRatio < maxByCollateral ? maxByRatio : maxByCollateral;
  }

  /**
   * Calculate liquidation penalty
   */
  static calculateLiquidationPenalty(
    liquidatedAmount: bigint,
    penaltyRate: number = 5 // 5% penalty
  ): bigint {
    return (liquidatedAmount * BigInt(penaltyRate)) / BigInt(100);
  }

  /**
   * Calculate liquidator reward
   */
  static calculateLiquidatorReward(
    liquidatedAmount: bigint,
    rewardRate: number = 10 // 10% reward
  ): bigint {
    return (liquidatedAmount * BigInt(rewardRate)) / BigInt(100);
  }

  /**
   * Simulate price drop that triggers liquidation
   */
  static calculatePriceDropForLiquidation(
    currentCollateralValue: bigint,
    borrowedAmount: bigint,
    liquidationThreshold: number = 75
  ): {
    targetPrice: bigint;
    priceDropPercentage: number;
  } {
    // Calculate the collateral value needed to trigger liquidation
    const liquidationCollateralValue = (borrowedAmount * BigInt(100)) / BigInt(liquidationThreshold);
    
    if (liquidationCollateralValue >= currentCollateralValue) {
      return { targetPrice: BigInt(0), priceDropPercentage: 100 };
    }

    const priceDropPercentage = Number(
      ((currentCollateralValue - liquidationCollateralValue) * BigInt(10000)) / currentCollateralValue
    ) / 100;

    return {
      targetPrice: liquidationCollateralValue,
      priceDropPercentage
    };
  }

  /**
   * Calculate partial liquidation scenario
   */
  static calculatePartialLiquidation(
    borrowedAmount: bigint,
    collateralValue: bigint,
    targetHealthFactor: number = 1.5,
    liquidationThreshold: number = 75
  ): {
    liquidationAmount: bigint;
    remainingDebt: bigint;
    remainingCollateral: bigint;
    newHealthFactor: number;
  } {
    // Calculate how much debt needs to be reduced to reach target health factor
    const targetCollateralNeeded = (borrowedAmount * BigInt(Math.floor(targetHealthFactor * 100))) / BigInt(liquidationThreshold);
    
    if (collateralValue >= targetCollateralNeeded) {
      // No liquidation needed
      return {
        liquidationAmount: BigInt(0),
        remainingDebt: borrowedAmount,
        remainingCollateral: collateralValue,
        newHealthFactor: PricingHelpers.calculateHealthFactor(collateralValue, borrowedAmount, liquidationThreshold)
      };
    }

    // Calculate required liquidation amount
    const excessDebt = borrowedAmount - (collateralValue * BigInt(liquidationThreshold)) / BigInt(Math.floor(targetHealthFactor * 100));
    const liquidationAmount = excessDebt > borrowedAmount ? borrowedAmount : excessDebt;
    
    const remainingDebt = borrowedAmount - liquidationAmount;
    const remainingCollateral = collateralValue; // Assuming collateral stays constant for this calculation
    
    const newHealthFactor = remainingDebt > 0 
      ? PricingHelpers.calculateHealthFactor(remainingCollateral, remainingDebt, liquidationThreshold)
      : 999;

    return {
      liquidationAmount,
      remainingDebt,
      remainingCollateral,
      newHealthFactor
    };
  }

  /**
   * Calculate collateral seizure amount
   */
  static calculateCollateralSeizure(
    liquidatedDebt: bigint,
    collateralPrice: bigint,
    liquidationBonus: number = 10 // 10% bonus
  ): bigint {
    const baseCollateral = liquidatedDebt / collateralPrice;
    const bonusCollateral = (baseCollateral * BigInt(liquidationBonus)) / BigInt(100);
    return baseCollateral + bonusCollateral;
  }

  /**
   * Simulate liquidation cascade scenario
   */
  static simulateLiquidationCascade(
    positions: Array<{
      borrowedAmount: bigint;
      collateralValue: bigint;
      owner: string;
    }>,
    priceDropPercentage: number,
    liquidationThreshold: number = 75
  ): Array<{
    owner: string;
    originalHealth: number;
    newHealth: number;
    isLiquidatable: boolean;
    liquidationAmount: bigint;
  }> {
    return positions.map(position => {
      const originalHealth = PricingHelpers.calculateHealthFactor(
        position.collateralValue,
        position.borrowedAmount,
        liquidationThreshold
      );

      const newCollateralValue = PricingHelpers.simulatePriceChange(
        position.collateralValue,
        -priceDropPercentage
      );

      const newHealth = PricingHelpers.calculateHealthFactor(
        newCollateralValue,
        position.borrowedAmount,
        liquidationThreshold
      );

      const isLiquidatable = newHealth < 1.0;
      const liquidationAmount = isLiquidatable 
        ? this.calculateMaxLiquidation(position.borrowedAmount, newCollateralValue)
        : BigInt(0);

      return {
        owner: position.owner,
        originalHealth,
        newHealth,
        isLiquidatable,
        liquidationAmount
      };
    });
  }

  /**
   * Calculate protocol losses from bad debt
   */
  static calculateBadDebt(
    borrowedAmount: bigint,
    collateralValue: bigint,
    liquidationCosts: bigint = BigInt(0)
  ): bigint {
    if (collateralValue + liquidationCosts >= borrowedAmount) {
      return BigInt(0); // No bad debt
    }
    
    return borrowedAmount - collateralValue - liquidationCosts;
  }
}

/**
 * Liquidation event simulation helpers
 */
export class LiquidationEventHelpers {
  /**
   * Generate liquidation event data
   */
  static generateLiquidationEvent(
    borrower: string,
    liquidator: string,
    collateralAsset: string,
    debtAsset: string,
    liquidatedAmount: bigint,
    collateralSeized: bigint
  ) {
    return {
      borrower,
      liquidator,
      collateralAsset,
      debtAsset,
      liquidatedAmount,
      collateralSeized,
      timestamp: Math.floor(Date.now() / 1000),
      healthFactorBefore: 0.95, // Below 1.0
      healthFactorAfter: 1.25,   // Above 1.0
      liquidationBonus: LiquidationHelpers.calculateLiquidatorReward(liquidatedAmount, 10),
      protocolFee: (liquidatedAmount * BigInt(5)) / BigInt(1000) // 0.5% protocol fee
    };
  }

  /**
   * Validate liquidation parameters
   */
  static validateLiquidation(
    borrowedAmount: bigint,
    collateralValue: bigint,
    liquidationAmount: bigint,
    liquidationThreshold: number = 75
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if liquidation is actually needed
    const healthFactor = PricingHelpers.calculateHealthFactor(collateralValue, borrowedAmount, liquidationThreshold);
    if (healthFactor >= 1.0) {
      errors.push("Position is not liquidatable - health factor above 1.0");
    }

    // Check liquidation amount limits
    const maxLiquidation = LiquidationHelpers.calculateMaxLiquidation(borrowedAmount, collateralValue);
    if (liquidationAmount > maxLiquidation) {
      errors.push("Liquidation amount exceeds maximum allowed");
    }

    if (liquidationAmount > borrowedAmount) {
      errors.push("Cannot liquidate more than total debt");
    }

    if (liquidationAmount <= 0) {
      errors.push("Liquidation amount must be positive");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Testing scenarios for liquidation
 */
export const LIQUIDATION_SCENARIOS = {
  HEALTHY_POSITION: {
    collateralValue: ethers.parseEther("100"),
    borrowedAmount: ethers.parseEther("50"),
    expectedHealthFactor: 1.5,
    shouldLiquidate: false
  },

  RISKY_POSITION: {
    collateralValue: ethers.parseEther("100"),
    borrowedAmount: ethers.parseEther("85"),
    expectedHealthFactor: 0.88,
    shouldLiquidate: true
  },

  UNDERWATER_POSITION: {
    collateralValue: ethers.parseEther("50"),
    borrowedAmount: ethers.parseEther("100"),
    expectedHealthFactor: 0.375,
    shouldLiquidate: true,
    hasBadDebt: true
  },

  PARTIAL_LIQUIDATION: {
    collateralValue: ethers.parseEther("100"),
    borrowedAmount: ethers.parseEther("90"),
    liquidationAmount: ethers.parseEther("20"),
    expectedHealthFactor: 1.07, // After partial liquidation
    shouldReachTarget: 1.5
  }
};

/**
 * Liquidation test constants
 */
export const LIQUIDATION_CONSTANTS = {
  DEFAULT_LIQUIDATION_THRESHOLD: 75,
  DEFAULT_LIQUIDATION_BONUS: 10,
  DEFAULT_LIQUIDATION_PENALTY: 5,
  MAX_LIQUIDATION_RATIO: 50,
  MIN_HEALTH_FACTOR: 1.0,
  TARGET_HEALTH_FACTOR: 1.5,
  PROTOCOL_FEE_RATE: 0.5
};