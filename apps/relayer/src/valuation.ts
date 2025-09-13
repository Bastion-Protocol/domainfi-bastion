import { CustodyEvent } from "@prisma/client";
import { Wallet } from "ethers";

export function signValuation(event: CustodyEvent, wallet: Wallet): string {
  // ...existing code for signing valuation message...
  return "signed-message";
}
