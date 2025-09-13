import { ethers } from "hardhat";

/**
 * Time manipulation utilities for testing
 */
export class TimeHelpers {
  /**
   * Increase time by the given number of seconds
   */
  static async increaseTime(seconds: number): Promise<void> {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  /**
   * Set the next block timestamp
   */
  static async setNextBlockTimestamp(timestamp: number): Promise<void> {
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
    await ethers.provider.send("evm_mine", []);
  }

  /**
   * Get the current block timestamp
   */
  static async latest(): Promise<number> {
    const block = await ethers.provider.getBlock("latest");
    return block!.timestamp;
  }

  /**
   * Move to a specific timestamp
   */
  static async increaseTo(timestamp: number): Promise<void> {
    const currentTime = await this.latest();
    if (timestamp > currentTime) {
      await this.increaseTime(timestamp - currentTime);
    }
  }

  /**
   * Get timestamp from duration (helpful for setting deadlines)
   */
  static async duration(days: number): Promise<number> {
    return days * 24 * 60 * 60;
  }

  /**
   * Get timestamp for future date
   */
  static async futureTimestamp(daysFromNow: number): Promise<number> {
    const latest = await this.latest();
    return latest + await this.duration(daysFromNow);
  }

  /**
   * Get timestamp for past date
   */
  static async pastTimestamp(daysAgo: number): Promise<number> {
    const latest = await this.latest();
    return latest - await this.duration(daysAgo);
  }
}

/**
 * Common time constants
 */
export const TIME_CONSTANTS = {
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 24 * 60 * 60,
  WEEK: 7 * 24 * 60 * 60,
  MONTH: 30 * 24 * 60 * 60,
  YEAR: 365 * 24 * 60 * 60,
};

/**
 * Auction-specific time helpers
 */
export class AuctionTimeHelpers {
  /**
   * Get standard auction duration (7 days)
   */
  static auctionDuration(): number {
    return TIME_CONSTANTS.WEEK;
  }

  /**
   * Get reveal phase duration (1 day)
   */
  static revealDuration(): number {
    return TIME_CONSTANTS.DAY;
  }

  /**
   * Get grace period (1 hour)
   */
  static gracePeriod(): number {
    return TIME_CONSTANTS.HOUR;
  }

  /**
   * Move to auction end
   */
  static async moveToAuctionEnd(startTime: number): Promise<void> {
    const endTime = startTime + this.auctionDuration();
    await TimeHelpers.increaseTo(endTime);
  }

  /**
   * Move to reveal phase
   */
  static async moveToRevealPhase(endTime: number): Promise<void> {
    await TimeHelpers.increaseTo(endTime + 1);
  }

  /**
   * Move past grace period
   */
  static async movePastGracePeriod(revealEnd: number): Promise<void> {
    await TimeHelpers.increaseTo(revealEnd + this.gracePeriod() + 1);
  }
}