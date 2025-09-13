// Global setup for integration tests
import { spawn } from 'child_process';
import { createConnection } from 'pg';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

export default async function globalSetup() {
  console.log('🚀 Setting up integration test environment...');

  try {
    // 1. Setup test database
    await setupTestDatabase();
    
    // 2. Setup Redis for testing
    await setupTestRedis();
    
    // 3. Start Docker services
    await startDockerServices();
    
    // 4. Deploy test contracts to local networks
    await deployTestContracts();
    
    // 5. Setup test data
    await seedTestData();
    
    console.log('✅ Integration test environment ready!');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
}

async function setupTestDatabase() {
  console.log('📊 Setting up test database...');
  
  const dbConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    user: process.env.TEST_DB_USER || 'test_user',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
    database: process.env.TEST_DB_NAME || 'bastion_test'
  };

  try {
    // Create test database if it doesn't exist
    const client = await createConnection({
      ...dbConfig,
      database: 'postgres' // Connect to default database first
    });
    
    await client.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await client.end();
    
    // Run migrations
    const migrateProcess = spawn('npm', ['run', 'db:migrate'], {
      cwd: '../apps/relayer',
      env: { ...process.env, DATABASE_URL: buildDatabaseUrl(dbConfig) }
    });
    
    await new Promise((resolve, reject) => {
      migrateProcess.on('close', (code) => {
        if (code === 0) resolve(void 0);
        else reject(new Error(`Database migration failed with code ${code}`));
      });
    });
    
    console.log('✅ Test database ready');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

async function setupTestRedis() {
  console.log('🔴 Setting up test Redis...');
  
  const redisConfig = {
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
    db: parseInt(process.env.TEST_REDIS_DB || '1') // Use different DB for tests
  };

  try {
    const redis = new Redis(redisConfig);
    await redis.flushdb(); // Clear test database
    await redis.quit();
    console.log('✅ Test Redis ready');
  } catch (error) {
    console.error('❌ Redis setup failed:', error);
    throw error;
  }
}

async function startDockerServices() {
  console.log('🐳 Starting Docker services for testing...');
  
  return new Promise((resolve, reject) => {
    const dockerProcess = spawn('docker-compose', [
      '-f', 'docker/docker-compose.test.yml',
      'up', '-d'
    ], { cwd: '..' });
    
    dockerProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Docker services started');
        resolve(void 0);
      } else {
        reject(new Error(`Docker services failed to start with code ${code}`));
      }
    });
    
    // Timeout after 2 minutes
    setTimeout(() => {
      dockerProcess.kill();
      reject(new Error('Docker services startup timed out'));
    }, 120000);
  });
}

async function deployTestContracts() {
  console.log('📜 Deploying test contracts...');
  
  try {
    // Deploy DOMA contracts
    const domaProcess = spawn('npx', ['hardhat', 'deploy', '--network', 'localhost'], {
      cwd: '../packages/contracts-doma'
    });
    
    await new Promise((resolve, reject) => {
      domaProcess.on('close', (code) => {
        if (code === 0) resolve(void 0);
        else reject(new Error(`DOMA contract deployment failed with code ${code}`));
      });
    });
    
    // Deploy Avalanche contracts
    const avalancheProcess = spawn('npx', ['hardhat', 'deploy', '--network', 'localhost'], {
      cwd: '../packages/contracts-avalanche'
    });
    
    await new Promise((resolve, reject) => {
      avalancheProcess.on('close', (code) => {
        if (code === 0) resolve(void 0);
        else reject(new Error(`Avalanche contract deployment failed with code ${code}`));
      });
    });
    
    console.log('✅ Test contracts deployed');
  } catch (error) {
    console.error('❌ Contract deployment failed:', error);
    throw error;
  }
}

async function seedTestData() {
  console.log('🌱 Seeding test data...');
  
  // Store test configuration in a global file
  const testConfig = {
    startTime: Date.now(),
    databases: {
      postgres: process.env.TEST_DB_NAME || 'bastion_test',
      redis: parseInt(process.env.TEST_REDIS_DB || '1')
    },
    networks: {
      doma: {
        rpc: 'http://localhost:8545',
        chainId: 31337
      },
      avalanche: {
        rpc: 'http://localhost:8546',
        chainId: 31338
      }
    }
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'test-config.json'),
    JSON.stringify(testConfig, null, 2)
  );
  
  console.log('✅ Test data seeded');
}

function buildDatabaseUrl(config: any): string {
  return `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
}
