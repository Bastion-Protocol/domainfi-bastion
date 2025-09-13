import { Wallet } from "ethers";

export function getHSMWallet(): Wallet {
  // ...existing code for HSM integration...
  // For now, use private key from env for dev
  return new Wallet(process.env.RELAYER_PRIVATE_KEY!);
}
