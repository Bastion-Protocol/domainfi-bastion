import dotenv from 'dotenv';
import { Config } from './types';

dotenv.config();

const config: Config = {
  doma: {
    rpcUrl: process.env.DOMA_RPC_URL || '',
    wsUrl: process.env.DOMA_WS_URL || '',
    vaultAddress: process.env.DOMA_VAULT_ADDRESS || '',
    chainId: parseInt(process.env.DOMA_CHAIN_ID || '0'),
  },
  avalanche: {
    rpcUrl: process.env.FUJI_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    mirrorNftAddress: process.env.FUJI_MIRROR_NFT_ADDRESS || '',
    chainId: 43113,
    relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY || '',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/bastion_relayer',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  server: {
    port: parseInt(process.env.PORT || '3001'),
  },
};

export default config;
