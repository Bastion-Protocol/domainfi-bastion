import { Contract } from './index';

// Contract addresses will be populated after deployment
export const DOMA_CONTRACTS = {
  BASTION_PROTOCOL: '',
  USDC: '',
  WAVAX: '',
} as const;

export const AVALANCHE_CONTRACTS = {
  BASTION_PROTOCOL: '',
  USDC: '0x5425890298aed601595a70AB815c96711a31Bc65', // USDC on Fuji
  WAVAX: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', // WAVAX on Fuji
} as const;
