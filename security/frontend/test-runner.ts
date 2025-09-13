import FrontendSecurityTester from './frontend-security';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface TestConfig {
  baseUrl: string;
  timeout: number;
  headless: boolean;
  generateReport: boolean;
}

class FrontendSecurityTestRunner {
  private config: TestConfig;

  constructor(config: Partial<TestConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || process.env.FRONTEND_URL || 'http://localhost:3000',
      timeout: config.timeout || 30000,
      headless: config.headless !== false,
      generateReport: config.generateReport !== false
    };
  }

  async run(): Promise<void> {
    console.log('🚀 Starting Frontend Security Test Suite...');
    console.log(`🌐 Testing URL: ${this.config.baseUrl}`);
    
    const tester = new FrontendSecurityTester(this.config.baseUrl);
    
    try {
      const results = await tester.runAllTests();
      
      console.log('\n🎯 Test Results Summary:');
      
      const summary = {
        total: results.length,
        passed: results.filter(r => r.status === 'PASS').length,
        failed: results.filter(r => r.status === 'FAIL').length,
        warnings: results.filter(r => r.status === 'WARNING').length,
        critical: results.filter(r => r.severity === 'CRITICAL').length,
        high: results.filter(r => r.severity === 'HIGH').length,
        medium: results.filter(r => r.severity === 'MEDIUM').length,
        low: results.filter(r => r.severity === 'LOW').length
      };
      
      console.log(`📊 Total Tests: ${summary.total}`);
      console.log(`✅ Passed: ${summary.passed}`);
      console.log(`❌ Failed: ${summary.failed}`);
      console.log(`⚠️  Warnings: ${summary.warnings}`);
      console.log('\n🚨 Severity Breakdown:');
      console.log(`🔴 Critical: ${summary.critical}`);
      console.log(`🟠 High: ${summary.high}`);
      console.log(`🟡 Medium: ${summary.medium}`);
      console.log(`🟢 Low: ${summary.low}`);
      
      // Exit with error code if critical or high severity issues found
      if (summary.critical > 0 || summary.high > 0) {
        console.log('\n❌ Security tests failed due to critical or high severity issues!');
        process.exit(1);
      } else if (summary.failed > 0) {
        console.log('\n⚠️  Some security tests failed, but no critical issues found.');
        process.exit(0);
      } else {
        console.log('\n✅ All security tests passed!');
        process.exit(0);
      }
      
    } catch (error) {
      console.error('💥 Frontend security tests failed with error:', error);
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const config: Partial<TestConfig> = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        config.baseUrl = args[++i];
        break;
      case '--timeout':
        config.timeout = parseInt(args[++i]);
        break;
      case '--no-headless':
        config.headless = false;
        break;
      case '--no-report':
        config.generateReport = false;
        break;
      case '--help':
        console.log(`
Frontend Security Test Runner

Usage: npm run frontend:security [options]

Options:
  --url <url>        Base URL to test (default: http://localhost:3000)
  --timeout <ms>     Test timeout in milliseconds (default: 30000)
  --no-headless      Run browsers in visible mode
  --no-report        Skip report generation
  --help             Show this help message

Examples:
  npm run frontend:security
  npm run frontend:security -- --url https://app.example.com
  npm run frontend:security -- --url http://localhost:3000 --no-headless
        `);
        process.exit(0);
    }
  }
  
  const runner = new FrontendSecurityTestRunner(config);
  runner.run();
}

export default FrontendSecurityTestRunner;
