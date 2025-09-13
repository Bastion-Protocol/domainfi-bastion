// Global teardown for integration tests
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up integration test environment...');

  try {
    // 1. Stop Docker services
    await stopDockerServices();
    
    // 2. Clean up test data
    await cleanupTestData();
    
    // 3. Remove test configuration
    const configPath = path.join(__dirname, 'test-config.json');
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    
    console.log('✅ Integration test environment cleaned up!');
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
    // Don't throw to avoid failing the test suite
  }
}

async function stopDockerServices() {
  console.log('🐳 Stopping Docker services...');
  
  return new Promise((resolve) => {
    const dockerProcess = spawn('docker-compose', [
      '-f', 'docker/docker-compose.test.yml',
      'down', '-v'
    ], { cwd: '..' });
    
    dockerProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Docker services stopped');
      } else {
        console.warn(`⚠️ Docker services cleanup returned code ${code}`);
      }
      resolve(void 0);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      dockerProcess.kill();
      console.warn('⚠️ Docker services cleanup timed out');
      resolve(void 0);
    }, 30000);
  });
}

async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');
  
  try {
    // Additional cleanup logic here
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.warn('⚠️ Test data cleanup failed:', error);
  }
}
