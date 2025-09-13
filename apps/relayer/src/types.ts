export interface CustodyChangedEvent {
  domainTokenId: string;
  newCustodian: string;
  action: string;
  txHash: string;
  blockNumber: number;
  logIndex: number;
}

export interface MirrorOperationJob {
  custodyEventId: string;
  operation: 'mint' | 'burn';
  domainTokenId: string;
  circleAddress: string;
}

export interface Config {
  doma: {
    rpcUrl: string;
    wsUrl: string;
    vaultAddress: string;
    chainId: number;
  };
  avalanche: {
    rpcUrl: string;
    mirrorNftAddress: string;
    chainId: number;
    relayerPrivateKey: string;
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  server: {
    port: number;
  };
}

export interface EventProcessorOptions {
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
}
