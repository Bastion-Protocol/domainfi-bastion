export const appConfig = () => ({
  app: {
    port: parseInt(process.env.PORT || '3002', 10),
    environment: process.env.NODE_ENV || 'development',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  blockchain: {
    domaRpcUrl: process.env.DOMA_RPC_URL || '',
    avalancheRpcUrl: process.env.FUJI_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    relayerAddress: process.env.RELAYER_ADDRESS || '',
  },
  valuation: {
    baseCurrency: 'USD',
    cacheTtl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes
    marketDataSource: process.env.MARKET_DATA_SOURCE || 'internal',
  },
});