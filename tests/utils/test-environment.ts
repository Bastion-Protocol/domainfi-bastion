import { ethers } from 'ethers';
import axios from 'axios';
import Redis from 'ioredis';
import { Client } from 'pg';

export interface TestEnvironment {
  networks: {
    doma: {
      provider: ethers.JsonRpcProvider;
      signer: ethers.Wallet;
      contracts: Record<string, ethers.Contract>;
    };
    avalanche: {
      provider: ethers.JsonRpcProvider;
      signer: ethers.Wallet;
      contracts: Record<string, ethers.Contract>;
    };
  };
  services: {
    relayer: {
      url: string;
      client: axios.AxiosInstance;
    };
    valuationApi: {
      url: string;
      client: axios.AxiosInstance;
    };
    webApp: {
      url: string;
      client: axios.AxiosInstance;
    };
  };
  databases: {
    postgres: Client;
    redis: Redis;
  };
}

export class TestEnvironmentManager {
  private environment?: TestEnvironment;

  async setup(): Promise<TestEnvironment> {
    console.log('🏗️ Setting up test environment...');

    // Setup blockchain networks
    const networks = await this.setupNetworks();
    
    // Setup service clients
    const services = await this.setupServices();
    
    // Setup database connections
    const databases = await this.setupDatabases();

    this.environment = {
      networks,
      services,
      databases
    };

    console.log('✅ Test environment ready');
    return this.environment;
  }

  async teardown(): Promise<void> {
    if (!this.environment) return;

    console.log('🧹 Tearing down test environment...');

    // Close database connections
    await this.environment.databases.postgres.end();
    await this.environment.databases.redis.quit();

    console.log('✅ Test environment cleaned up');
  }

  getEnvironment(): TestEnvironment {
    if (!this.environment) {
      throw new Error('Test environment not initialized. Call setup() first.');
    }
    return this.environment;
  }

  private async setupNetworks() {
    // DOMA network
    const domaProvider = new ethers.JsonRpcProvider(
      process.env.DOMA_RPC_URL || 'http://localhost:8545'
    );
    const domaSigner = new ethers.Wallet(
      process.env.DOMA_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      domaProvider
    );

    // Avalanche network
    const avalancheProvider = new ethers.JsonRpcProvider(
      process.env.AVALANCHE_RPC_URL || 'http://localhost:8546'
    );
    const avalancheSigner = new ethers.Wallet(
      process.env.AVALANCHE_PRIVATE_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
      avalancheProvider
    );

    // Wait for networks to be ready
    await Promise.all([
      domaProvider.getNetwork(),
      avalancheProvider.getNetwork()
    ]);

    return {
      doma: {
        provider: domaProvider,
        signer: domaSigner,
        contracts: {} // Will be populated with deployed contracts
      },
      avalanche: {
        provider: avalancheProvider,
        signer: avalancheSigner,
        contracts: {} // Will be populated with deployed contracts
      }
    };
  }

  private async setupServices() {
    const relayerUrl = process.env.RELAYER_API_URL || 'http://localhost:3001';
    const valuationApiUrl = process.env.VALUATION_API_URL || 'http://localhost:3002';
    const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:3000';

    // Wait for services to be ready
    await this.waitForService(relayerUrl);
    await this.waitForService(valuationApiUrl);

    return {
      relayer: {
        url: relayerUrl,
        client: axios.create({
          baseURL: relayerUrl,
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      },
      valuationApi: {
        url: valuationApiUrl,
        client: axios.create({
          baseURL: valuationApiUrl,
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      },
      webApp: {
        url: webAppUrl,
        client: axios.create({
          baseURL: webAppUrl,
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }
    };
  }

  private async setupDatabases() {
    // PostgreSQL connection
    const postgres = new Client({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      user: process.env.TEST_DB_USER || 'test_user',
      password: process.env.TEST_DB_PASSWORD || 'test_password',
      database: process.env.TEST_DB_NAME || 'bastion_test'
    });

    await postgres.connect();

    // Redis connection
    const redis = new Redis({
      host: process.env.TEST_REDIS_HOST || 'localhost',
      port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
      db: parseInt(process.env.TEST_REDIS_DB || '1')
    });

    return {
      postgres,
      redis
    };
  }

  private async waitForService(url: string, maxRetries = 30, delay = 2000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await axios.get(`${url}/health`, { timeout: 5000 });
        console.log(`✅ Service at ${url} is ready`);
        return;
      } catch (error) {
        console.log(`⏳ Waiting for service at ${url}... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error(`Service at ${url} failed to become ready after ${maxRetries} attempts`);
  }
}

// Singleton instance
export const testEnv = new TestEnvironmentManager();
