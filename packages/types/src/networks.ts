import { Network } from './index';

export const DOMA_TESTNET: Network = {
  chainId: 12345, // Replace with actual Doma chainId
  name: 'Doma Testnet',
  rpcUrl: process.env.DOMA_RPC_URL || '',
  blockExplorer: 'https://doma.scan/', // Replace with actual URL
};

export const AVALANCHE_FUJI: Network = {
  chainId: 43113,
  name: 'Avalanche Fuji',
  rpcUrl: process.env.FUJI_RPC_URL || '',
  blockExplorer: 'https://testnet.snowtrace.io',
};

export const SUPPORTED_NETWORKS = [DOMA_TESTNET, AVALANCHE_FUJI] as const;
