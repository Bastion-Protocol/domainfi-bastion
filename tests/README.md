# Bastion Protocol - End-to-End Integration Tests

This comprehensive test suite provides end-to-end integration testing for the entire Bastion Protocol system, covering cross-chain interactions, relayer services, API integrations, and performance benchmarks.

## 🏗️ Test Architecture

The test suite is designed with a modular architecture that mirrors the production system:

```
tests/
├── integration/
│   ├── cross-chain/          # Cross-chain flow tests
│   ├── relayer/              # Relayer service tests
│   ├── api/                  # API integration tests
│   └── performance/          # Performance and load tests
├── utils/                    # Test utilities and helpers
├── docker/                   # Docker orchestration for test services
└── scripts/                  # Setup and utility scripts
```

## 🧪 Test Categories

### 1. Cross-Chain Flow Tests (`integration/cross-chain/`)
- **Domain Lifecycle**: Complete domain auction → custody → Mirror NFT minting workflow
- **Ownership Transfers**: Cross-chain state synchronization validation
- **Collateralization Flows**: Domain collateralization and lending operations
- **Liquidation Scenarios**: Edge cases and emergency procedures
- **State Consistency**: Cross-chain state verification and recovery

### 2. Relayer Service Tests (`integration/relayer/`)
- **Event Monitoring**: Real-time blockchain event detection and processing
- **Error Handling**: Retry mechanisms with exponential backoff
- **Database Consistency**: Transaction integrity during failures
- **Network Resilience**: Connection loss and recovery handling
- **Performance Under Load**: High-frequency event processing

### 3. API Integration Tests (`integration/api/`)
- **Frontend Workflows**: Complete user journey testing
- **Valuation Service**: Real-time domain valuation and trend analysis
- **WebSocket Connections**: Real-time updates and subscription management
- **Error Handling**: Invalid requests and rate limiting
- **Security**: Authentication and authorization flows

### 4. Performance Tests (`integration/performance/`)
- **Concurrent Users**: Multi-user scenario simulations
- **High-Frequency Trading**: Rapid auction bidding and valuation requests
- **Gas Optimization**: Transaction efficiency under load
- **System Stress**: Maximum load tolerance testing
- **Scalability**: Performance degradation analysis

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- pnpm 8+
- PostgreSQL client tools
- Redis client tools

### Installation

```bash
# Install dependencies
cd tests
pnpm install

# Setup environment
cp .env.test.example .env.test
# Edit .env.test with your configuration

# Start test services
docker-compose -f docker/docker-compose.test.yml up -d

# Setup databases
pnpm run db:setup

# Wait for all services to be ready
./scripts/wait-for-services.sh
```

### Running Tests

```bash
# Run all integration tests
pnpm run test:integration

# Run specific test categories
pnpm run test:cross-chain
pnpm run test:relayer
pnpm run test:api
pnpm run test:performance

# Run with coverage
pnpm run test:coverage

# Run performance benchmarks
pnpm run test:performance:full
```

## 🐳 Docker Services

The test environment includes the following containerized services:

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5433 | Test database |
| Redis | 6380 | Caching and session storage |
| DOMA Chain (Ganache) | 8545 | DOMA blockchain simulation |
| Avalanche Chain (Ganache) | 8546 | Avalanche blockchain simulation |
| Mock Price Oracle | 3003 | Price feed simulation |
| Relayer Service | 3001 | Event processing service |
| Valuation API | 3002 | Domain valuation API |

## 📊 Test Configuration

### Environment Variables

```bash
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=bastion_test

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6380

# Blockchain Configuration
DOMA_RPC_URL=http://localhost:8545
AVALANCHE_RPC_URL=http://localhost:8546

# Service URLs
RELAYER_API_URL=http://localhost:3001
RELAYER_WS_URL=ws://localhost:3001
VALUATION_API_URL=http://localhost:3002
VALUATION_API_WS_URL=ws://localhost:3002/ws
PRICE_ORACLE_URL=http://localhost:3003

# Test Configuration
TEST_TIMEOUT=300000
PERFORMANCE_MODE=development
LOG_LEVEL=info
```

### Jest Configuration

Tests are configured with:
- **Timeout**: 5 minutes for complex integration tests
- **Setup/Teardown**: Automatic environment management
- **Sequential Execution**: Prevents test interference
- **Coverage Collection**: Comprehensive code coverage reporting

## 🔧 Test Utilities

### TestEnvironment Class
Manages the complete test environment including:
- Blockchain network providers (Ethers.js)
- Database connections (PostgreSQL, Redis)
- Service clients (HTTP, WebSocket)
- Contract deployment and management

### ContractManager Class
Handles smart contract operations:
- Automated contract deployment
- Cross-chain contract interaction
- Event emission and monitoring
- Gas optimization and error handling

## 📈 Performance Metrics

The test suite collects comprehensive performance metrics:

### Response Time Metrics
- Average response time
- 95th percentile response time
- 99th percentile response time
- Min/max response times

### Throughput Metrics
- Requests per second
- Transactions per second
- Event processing rate
- WebSocket message rate

### Error Metrics
- Error rate percentage
- Error categorization
- Retry success rate
- Recovery time

### System Metrics
- Memory usage
- CPU utilization
- Database performance
- Network latency

## 🚦 CI/CD Integration

The test suite includes comprehensive CI/CD integration:

### GitHub Actions Workflows
- **Integration Tests**: Run on every PR and push
- **Performance Benchmarks**: Scheduled daily runs
- **Security Tests**: Automated security scanning
- **Staging Deployment**: Automated staging environment testing
- **Production Smoke Tests**: Post-deployment validation

### Test Environments
- **Development**: Local testing with Docker services
- **CI**: Automated testing in GitHub Actions
- **Staging**: Full environment testing before production
- **Production**: Smoke tests and health checks

## 📋 Test Scenarios

### Cross-Chain Flow Test Scenarios

#### 1. Domain Auction → Custody → Mirror NFT Minting
```typescript
// Phase 1: Domain auction on DOMA chain
await createDomainAuction(domainId);
await submitWinningBid(domainId, bidAmount, winner);
await finalizeAuction(domainId);

// Phase 2: Custody change detection
await waitForCustodyEvent(domainId);
await verifyEventProcessing(domainId);

// Phase 3: Mirror NFT minting on Avalanche
await waitForMirrorNFTMinting(domainId);
await verifyMirrorNFTOwnership(domainId, winner);

// Phase 4: Cross-chain state verification
await verifyCrossChainConsistency(domainId);
```

#### 2. Collateralization → Borrowing → Repayment
```typescript
// Setup collateral position
await depositCollateral(domainId, collateralAmount, owner);
await verifyCollateralPosition(domainId, owner);

// Create loan
await createLoan(domainId, borrowAmount, borrower);
await verifyLoanCreation(loanId);

// Repayment flow
await repayLoan(loanId, repaymentAmount);
await verifyLoanStatus(loanId, 'REPAID');
```

### Relayer Service Test Scenarios

#### 1. High-Frequency Event Processing
```typescript
// Generate rapid events
const events = generateCustodyEvents(eventCount);
await Promise.all(events.map(emitCustodyEvent));

// Verify processing
const processedEvents = await waitForProcessing(events);
expect(processedEvents.every(e => e.processed)).toBe(true);
```

#### 2. Error Handling and Retry
```typescript
// Configure failure simulation
await configureFailures(failureCount);

// Emit event that will fail initially
await emitFailingEvent(testEvent);

// Monitor retry attempts
const retries = await monitorRetries(testEvent.id);
expect(retries.length).toBeGreaterThan(1);

// Verify eventual success
const finalResult = await waitForSuccess(testEvent.id);
expect(finalResult.processed).toBe(true);
```

### API Integration Test Scenarios

#### 1. Complete Bidding Workflow
```typescript
// Get auction info
const auction = await api.get(`/domains/${domainId}/auction`);

// Get valuation
const valuation = await api.get(`/domains/${domainId}/valuation`);

// Submit bid
const bid = await api.post('/bids', bidRequest);

// Monitor confirmation
await waitForConfirmation(bid.transactionHash);

// Verify bid recorded
const bids = await api.get(`/domains/${domainId}/bids`);
expect(bids.data.bids).toContainEqual(expect.objectContaining({
  bidder: bidRequest.bidderAddress,
  amount: bidRequest.bidAmount
}));
```

#### 2. Real-time WebSocket Updates
```typescript
// Subscribe to updates
websocket.send(JSON.stringify({
  type: 'subscribe',
  channel: 'auction-updates',
  domainId
}));

// Monitor incoming messages
const updates = [];
websocket.on('message', (data) => {
  const message = JSON.parse(data.toString());
  if (message.type === 'auction-update') {
    updates.push(message);
  }
});

// Generate activity
await simulateAuctionActivity(domainId);

// Verify updates received
await waitForCondition(() => updates.length > 0);
expect(updates[0]).toMatchObject({
  type: 'auction-update',
  domainId,
  currentBid: expect.any(String),
  bidCount: expect.any(Number)
});
```

## 🔍 Debugging and Troubleshooting

### Common Issues

#### 1. Service Startup Failures
```bash
# Check service logs
docker-compose -f docker/docker-compose.test.yml logs [service-name]

# Verify port availability
netstat -tulpn | grep :3001

# Check service health
curl http://localhost:3001/health
```

#### 2. Database Connection Issues
```bash
# Test database connectivity
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d bastion_test -c "SELECT 1;"

# Check database logs
docker-compose logs postgres-test

# Reset database
pnpm run db:reset
```

#### 3. Test Timeouts
```bash
# Increase test timeout in Jest config
# jest.config.ts
export default {
  testTimeout: 600000, // 10 minutes
  ...
};

# Or set environment variable
TEST_TIMEOUT=600000 pnpm run test:integration
```

### Logging and Monitoring

Tests include comprehensive logging:
```typescript
// Structured logging
console.log('🏛️ Testing complete domain bidding flow...');
console.log('📡 Emitting custody change event...');
console.log('✅ Domain bidding flow completed successfully');

// Performance metrics
console.log('📊 Concurrent Bidding Metrics:');
console.log(`  Total Requests: ${metrics.totalRequests}`);
console.log(`  Success Rate: ${(100 - metrics.errorRate * 100).toFixed(2)}%`);
console.log(`  Average Response Time: ${metrics.averageResponseTime}ms`);
```

## 📚 Best Practices

### 1. Test Isolation
- Each test creates its own isolated environment
- Tests use unique identifiers to prevent conflicts
- Database state is reset between test suites

### 2. Realistic Testing
- Tests use actual blockchain transactions
- Real database operations with proper constraints
- Authentic WebSocket connections and message handling

### 3. Performance Awareness
- Tests measure actual performance metrics
- Realistic load scenarios based on expected usage
- Performance regression detection

### 4. Error Simulation
- Network failures and reconnection scenarios
- Database transaction failures and rollbacks
- Service degradation and recovery testing

## 🤝 Contributing

### Adding New Tests

1. **Create test files** in the appropriate category directory
2. **Follow naming conventions**: `*.test.ts`
3. **Use the TestEnvironment** utility for setup/teardown
4. **Include performance metrics** where relevant
5. **Add documentation** for complex test scenarios

### Test Structure Template

```typescript
import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';
import { testEnv, TestEnvironment } from '../../utils/test-environment';

describe('Feature Integration Tests', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await testEnv.setup();
  }, 60000);

  afterAll(async () => {
    await testEnv.teardown();
  }, 30000);

  describe('Feature Category', () => {
    test('should handle specific scenario', async () => {
      // Arrange
      const testData = createTestData();

      // Act
      const result = await performAction(testData);

      // Assert
      expect(result).toMatchExpectedOutcome();

      // Cleanup
      await cleanupTestData(testData);
    }, 30000);
  });
});
```

## 📖 Additional Resources

- [Bastion Protocol Architecture](../docs/architecture.md)
- [Environment Setup Guide](../docs/environment-setup.md)
- [Contract Documentation](../packages/contracts-doma/README.md)
- [API Documentation](../apps/valuation-api/README.md)
- [Relayer Service Documentation](../apps/relayer/README.md)

## 🆘 Support

For issues with the test suite:
1. Check the [troubleshooting section](#debugging-and-troubleshooting)
2. Review service logs for error details
3. Verify environment configuration
4. Create an issue with detailed reproduction steps

---

**Happy Testing!** 🧪✨
