// Network types
export interface Network {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
}

// Token types
export interface Token {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
}

// Transaction types
export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  nonce: number;
  timestamp: number;
}

// Contract types
export interface Contract {
  address: string;
  abi: any[];
  network: Network;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// Price data types
export interface PriceData {
  token: string;
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: number;
}

export * from './networks';
export * from './contracts';
