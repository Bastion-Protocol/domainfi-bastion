import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractTransactionReceipt, EventLog } from "ethers";

/**
 * Event testing utilities
 */
export class EventHelpers {
  /**
   * Extract event from transaction receipt
   */
  static async getEventFromTx(
    tx: any,
    contract: Contract,
    eventName: string,
    eventIndex: number = 0
  ): Promise<EventLog | null> {
    const receipt = await tx.wait();
    const events = receipt.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter((event: any) => event !== null && event.name === eventName);

    return events[eventIndex] || null;
  }

  /**
   * Extract all events of a specific type from transaction receipt
   */
  static async getAllEventsFromTx(
    tx: any,
    contract: Contract,
    eventName: string
  ): Promise<EventLog[]> {
    const receipt = await tx.wait();
    return receipt.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter((event: any) => event !== null && event.name === eventName);
  }

  /**
   * Expect event to be emitted with specific arguments
   */
  static async expectEvent(
    tx: any,
    contract: Contract,
    eventName: string,
    expectedArgs: any[]
  ): Promise<void> {
    const event = await this.getEventFromTx(tx, contract, eventName);
    expect(event).to.not.be.null;
    
    if (event) {
      for (let i = 0; i < expectedArgs.length; i++) {
        expect(event.args[i]).to.equal(expectedArgs[i]);
      }
    }
  }

  /**
   * Expect event NOT to be emitted
   */
  static async expectNoEvent(
    tx: any,
    contract: Contract,
    eventName: string
  ): Promise<void> {
    const event = await this.getEventFromTx(tx, contract, eventName);
    expect(event).to.be.null;
  }

  /**
   * Get event argument by name
   */
  static getEventArg(event: EventLog, argName: string): any {
    return event.args[argName];
  }

  /**
   * Expect multiple events in order
   */
  static async expectEventsInOrder(
    tx: any,
    contract: Contract,
    eventNames: string[]
  ): Promise<void> {
    const receipt = await tx.wait();
    const allEvents = receipt.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter((event: any) => event !== null);

    let eventIndex = 0;
    for (const expectedEventName of eventNames) {
      let found = false;
      while (eventIndex < allEvents.length) {
        if (allEvents[eventIndex].name === expectedEventName) {
          found = true;
          eventIndex++;
          break;
        }
        eventIndex++;
      }
      expect(found).to.be.true;
    }
  }
}

/**
 * Auction-specific event helpers
 */
export class AuctionEventHelpers {
  /**
   * Extract bid details from BidSubmitted event
   */
  static async getBidFromEvent(
    tx: any,
    auctionContract: Contract
  ): Promise<{
    bidder: string;
    amount: bigint;
    commitment: string;
    timestamp: number;
  } | null> {
    const event = await EventHelpers.getEventFromTx(tx, auctionContract, "BidSubmitted");
    if (!event) return null;

    return {
      bidder: event.args.bidder,
      amount: event.args.amount,
      commitment: event.args.commitment,
      timestamp: event.args.timestamp
    };
  }

  /**
   * Extract auction finalization details
   */
  static async getAuctionFinalizationFromEvent(
    tx: any,
    auctionContract: Contract
  ): Promise<{
    winner: string;
    winningBid: bigint;
    domain: string;
  } | null> {
    const event = await EventHelpers.getEventFromTx(tx, auctionContract, "AuctionFinalized");
    if (!event) return null;

    return {
      winner: event.args.winner,
      winningBid: event.args.winningBid,
      domain: event.args.domain
    };
  }
}

/**
 * Circle-specific event helpers
 */
export class CircleEventHelpers {
  /**
   * Extract circle creation details
   */
  static async getCircleCreationFromEvent(
    tx: any,
    factoryContract: Contract
  ): Promise<{
    circleAddress: string;
    creator: string;
    name: string;
    contributionThreshold: bigint;
  } | null> {
    const event = await EventHelpers.getEventFromTx(tx, factoryContract, "CircleCreated");
    if (!event) return null;

    return {
      circleAddress: event.args.circleAddress,
      creator: event.args.creator,
      name: event.args.name,
      contributionThreshold: event.args.contributionThreshold
    };
  }

  /**
   * Extract member addition details
   */
  static async getMemberAdditionFromEvent(
    tx: any,
    circleContract: Contract
  ): Promise<{
    member: string;
    contribution: bigint;
    newTotalContributions: bigint;
  } | null> {
    const event = await EventHelpers.getEventFromTx(tx, circleContract, "MemberAdded");
    if (!event) return null;

    return {
      member: event.args.member,
      contribution: event.args.contribution,
      newTotalContributions: event.args.newTotalContributions
    };
  }
}