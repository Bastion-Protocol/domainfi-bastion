import { ethers } from "ethers";

export class AvalancheProvider extends ethers.JsonRpcProvider {
  constructor() {
    super(process.env.FUJI_RPC_URL);
  }
}

export class DomaProvider extends ethers.JsonRpcProvider {
  constructor() {
    super(process.env.DOMA_RPC_URL);
  }
}
