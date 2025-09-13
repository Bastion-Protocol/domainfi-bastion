import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';
import { ethers } from 'ethers';
import WebSocket from 'ws';
import axios from 'axios';
import { testEnv, TestEnvironment } from '../../utils/test-environment';

describe('API Integration Tests', () => {
  let environment: TestEnvironment;
  let websocket: WebSocket;
  let userWallet: ethers.Wallet;

  beforeAll(async () => {
    environment = await testEnv.setup();
    
    // Create test user wallet
    userWallet = ethers.Wallet.createRandom().connect(environment.networks.doma.provider);
    
    // Fund the test wallet
    await environment.networks.doma.signer.sendTransaction({
      to: userWallet.address,
      value: ethers.parseEther('10.0')
    });
    
    // Setup WebSocket connection for real-time updates
    websocket = new WebSocket(process.env.VALUATION_API_WS_URL || 'ws://localhost:3002/ws');
    
    await new Promise((resolve) => {
      websocket.on('open', resolve);
    });
  }, 60000);

  afterAll(async () => {
    if (websocket) {
      websocket.close();
    }
    await testEnv.teardown();
  }, 30000);

  describe('Frontend to Contract Interactions', () => {
    test('should handle complete domain bidding flow through API', async () => {
      const domainId = 1000;
      const bidAmount = ethers.parseEther('1.0');
      
      console.log('🏛️ Testing complete domain bidding flow...');
      
      // Step 1: Get domain auction info
      const auctionInfo = await environment.services.valuationApi.client.get(`/domains/${domainId}/auction`);
      expect(auctionInfo.status).toBe(200);
      expect(auctionInfo.data.domainId).toBe(domainId);
      expect(auctionInfo.data.status).toBe('active');
      
      // Step 2: Get current valuation
      const valuation = await environment.services.valuationApi.client.get(`/domains/${domainId}/valuation`);
      expect(valuation.status).toBe(200);
      expect(valuation.data.estimatedValue).toBeGreaterThan(0);
      
      // Step 3: Submit bid through API
      const bidRequest = {
        domainId,
        bidAmount: bidAmount.toString(),
        bidderAddress: userWallet.address
      };
      
      const bidResponse = await environment.services.valuationApi.client.post('/bids', bidRequest);
      expect(bidResponse.status).toBe(201);
      expect(bidResponse.data.transactionHash).toBeDefined();
      
      // Step 4: Monitor transaction confirmation
      const txHash = bidResponse.data.transactionHash;
      let confirmed = false;
      let attempts = 0;
      
      while (!confirmed && attempts < 30) {
        const txStatus = await environment.services.valuationApi.client.get(`/transactions/${txHash}/status`);
        if (txStatus.data.confirmed) {
          confirmed = true;
          expect(txStatus.data.blockNumber).toBeGreaterThan(0);
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
      }
      
      expect(confirmed).toBe(true);
      
      // Step 5: Verify bid was recorded
      const domainBids = await environment.services.valuationApi.client.get(`/domains/${domainId}/bids`);
      const userBid = domainBids.data.bids.find((bid: any) => bid.bidder === userWallet.address);
      
      expect(userBid).toBeDefined();
      expect(userBid.amount).toBe(bidAmount.toString());
      
      console.log('✅ Domain bidding flow completed successfully');
    }, 120000);

    test('should handle collateralization workflow', async () => {
      const domainId = 1001;
      const collateralAmount = ethers.parseEther('2.0');
      
      console.log('💰 Testing collateralization workflow...');
      
      // Step 1: Create mock domain ownership
      await createMockDomainOwnership(domainId, userWallet.address);
      
      // Step 2: Get collateralization options
      const collateralOptions = await environment.services.valuationApi.client.get(
        `/domains/${domainId}/collateral-options`
      );
      expect(collateralOptions.status).toBe(200);
      expect(collateralOptions.data.maxCollateralRatio).toBeGreaterThan(0);
      
      // Step 3: Submit collateralization request
      const collateralRequest = {
        domainId,
        collateralAmount: collateralAmount.toString(),
        ownerAddress: userWallet.address
      };
      
      const collateralResponse = await environment.services.valuationApi.client.post(
        '/collateral/deposit', 
        collateralRequest
      );
      expect(collateralResponse.status).toBe(201);
      expect(collateralResponse.data.transactionHash).toBeDefined();
      
      // Step 4: Wait for transaction confirmation
      await waitForTransactionConfirmation(collateralResponse.data.transactionHash);
      
      // Step 5: Verify collateral position
      const position = await environment.services.valuationApi.client.get(
        `/users/${userWallet.address}/collateral-positions`
      );
      
      const domainPosition = position.data.positions.find((pos: any) => pos.domainId === domainId);
      expect(domainPosition).toBeDefined();
      expect(domainPosition.collateralAmount).toBe(collateralAmount.toString());
      
      console.log('✅ Collateralization workflow completed successfully');
    }, 90000);

    test('should handle borrowing against collateral', async () => {
      const domainId = 1002;
      const borrowAmount = ethers.parseEther('0.5');
      
      console.log('🏦 Testing borrowing workflow...');
      
      // Step 1: Setup collateral position
      await createMockCollateralPosition(domainId, userWallet.address, ethers.parseEther('2.0'));
      
      // Step 2: Get borrowing capacity
      const borrowCapacity = await environment.services.valuationApi.client.get(
        `/users/${userWallet.address}/borrow-capacity`
      );
      expect(borrowCapacity.status).toBe(200);
      expect(parseFloat(borrowCapacity.data.availableCredit)).toBeGreaterThan(0);
      
      // Step 3: Submit borrow request
      const borrowRequest = {
        collateralDomainId: domainId,
        borrowAmount: borrowAmount.toString(),
        borrowerAddress: userWallet.address
      };
      
      const borrowResponse = await environment.services.valuationApi.client.post('/loans/borrow', borrowRequest);
      expect(borrowResponse.status).toBe(201);
      expect(borrowResponse.data.loanId).toBeDefined();
      
      // Step 4: Wait for loan creation
      await waitForTransactionConfirmation(borrowResponse.data.transactionHash);
      
      // Step 5: Verify loan position
      const loans = await environment.services.valuationApi.client.get(
        `/users/${userWallet.address}/loans`
      );
      
      const newLoan = loans.data.loans.find((loan: any) => loan.id === borrowResponse.data.loanId);
      expect(newLoan).toBeDefined();
      expect(newLoan.principalAmount).toBe(borrowAmount.toString());
      expect(newLoan.status).toBe('active');
      
      console.log('✅ Borrowing workflow completed successfully');
    }, 90000);
  });

  describe('Valuation Service Integration', () => {
    test('should provide real-time domain valuations', async () => {
      const domainId = 2000;
      
      console.log('📈 Testing real-time domain valuations...');
      
      // Step 1: Get initial valuation
      const initialValuation = await environment.services.valuationApi.client.get(
        `/domains/${domainId}/valuation`
      );
      expect(initialValuation.status).toBe(200);
      expect(initialValuation.data.estimatedValue).toBeGreaterThan(0);
      
      // Step 2: Subscribe to valuation updates via WebSocket
      const valuationUpdates: any[] = [];
      websocket.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'valuation-update' && message.domainId === domainId) {
          valuationUpdates.push(message);
        }
      });
      
      websocket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'domain-valuations',
        domainId
      }));
      
      // Step 3: Trigger valuation update by creating market activity
      await simulateMarketActivity(domainId);
      
      // Step 4: Wait for real-time updates
      await waitForCondition(() => valuationUpdates.length > 0, 30000);
      
      expect(valuationUpdates).toHaveLength(1);
      expect(valuationUpdates[0].estimatedValue).toBeGreaterThan(0);
      expect(valuationUpdates[0].confidence).toBeGreaterThan(0);
      
      // Step 5: Verify updated valuation via REST API
      const updatedValuation = await environment.services.valuationApi.client.get(
        `/domains/${domainId}/valuation`
      );
      expect(updatedValuation.data.lastUpdated).not.toBe(initialValuation.data.lastUpdated);
      
      console.log('✅ Real-time domain valuations working correctly');
    }, 60000);

    test('should handle batch valuation requests', async () => {
      const domainIds = [2001, 2002, 2003, 2004, 2005];
      
      console.log('📊 Testing batch valuation requests...');
      
      // Request batch valuations
      const batchRequest = { domainIds };
      const batchResponse = await environment.services.valuationApi.client.post(
        '/valuations/batch',
        batchRequest
      );
      
      expect(batchResponse.status).toBe(200);
      expect(batchResponse.data.valuations).toHaveLength(domainIds.length);
      
      // Verify each valuation
      batchResponse.data.valuations.forEach((valuation: any, index: number) => {
        expect(valuation.domainId).toBe(domainIds[index]);
        expect(valuation.estimatedValue).toBeGreaterThan(0);
        expect(valuation.confidence).toBeGreaterThan(0);
        expect(valuation.factors).toBeDefined();
      });
      
      console.log('✅ Batch valuation requests working correctly');
    }, 30000);

    test('should provide valuation history and trends', async () => {
      const domainId = 2010;
      
      console.log('📈 Testing valuation history and trends...');
      
      // Step 1: Create historical valuation data
      await createHistoricalValuations(domainId, 30); // 30 days of data
      
      // Step 2: Get valuation history
      const historyResponse = await environment.services.valuationApi.client.get(
        `/domains/${domainId}/valuation-history?period=30d`
      );
      
      expect(historyResponse.status).toBe(200);
      expect(historyResponse.data.history).toHaveLength(30);
      
      // Verify data structure
      historyResponse.data.history.forEach((entry: any) => {
        expect(entry.date).toBeDefined();
        expect(entry.value).toBeGreaterThan(0);
        expect(entry.confidence).toBeGreaterThan(0);
      });
      
      // Step 3: Get trend analysis
      const trendResponse = await environment.services.valuationApi.client.get(
        `/domains/${domainId}/trends`
      );
      
      expect(trendResponse.status).toBe(200);
      expect(trendResponse.data.trend).toMatch(/^(increasing|decreasing|stable)$/);
      expect(trendResponse.data.volatility).toBeGreaterThanOrEqual(0);
      expect(trendResponse.data.momentum).toBeDefined();
      
      console.log('✅ Valuation history and trends working correctly');
    }, 45000);
  });

  describe('Real-time Updates and WebSocket Connections', () => {
    test('should handle WebSocket connection lifecycle', async () => {
      console.log('🔌 Testing WebSocket connection lifecycle...');
      
      // Test connection status
      expect(websocket.readyState).toBe(WebSocket.OPEN);
      
      // Test ping/pong
      const pingPromise = new Promise((resolve) => {
        websocket.on('pong', resolve);
      });
      
      websocket.ping();
      await pingPromise;
      
      // Test reconnection after disconnection
      const reconnectPromise = new Promise((resolve) => {
        const newWs = new WebSocket(process.env.VALUATION_API_WS_URL || 'ws://localhost:3002/ws');
        newWs.on('open', () => {
          newWs.close();
          resolve(true);
        });
      });
      
      await reconnectPromise;
      
      console.log('✅ WebSocket connection lifecycle working correctly');
    }, 30000);

    test('should broadcast auction updates in real-time', async () => {
      const domainId = 3000;
      const updates: any[] = [];
      
      console.log('📡 Testing real-time auction updates...');
      
      // Subscribe to auction updates
      websocket.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'auction-update' && message.domainId === domainId) {
          updates.push(message);
        }
      });
      
      websocket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'auction-updates',
        domainId
      }));
      
      // Simulate auction activity
      const bidAmounts = [ethers.parseEther('1.0'), ethers.parseEther('1.5'), ethers.parseEther('2.0')];
      
      for (const amount of bidAmounts) {
        await simulateAuctionBid(domainId, amount);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Verify updates were received
      await waitForCondition(() => updates.length >= bidAmounts.length, 30000);
      
      expect(updates).toHaveLength(bidAmounts.length);
      updates.forEach((update, index) => {
        expect(update.currentBid).toBe(bidAmounts[index].toString());
        expect(update.bidCount).toBe(index + 1);
      });
      
      console.log('✅ Real-time auction updates working correctly');
    }, 60000);

    test('should handle multiple concurrent WebSocket subscriptions', async () => {
      const domainIds = [3100, 3101, 3102, 3103, 3104];
      const updateCounts = new Map<number, number>();
      
      console.log('🎯 Testing multiple concurrent WebSocket subscriptions...');
      
      // Subscribe to multiple channels
      domainIds.forEach(domainId => {
        updateCounts.set(domainId, 0);
        
        websocket.send(JSON.stringify({
          type: 'subscribe',
          channel: 'domain-updates',
          domainId
        }));
      });
      
      // Listen for updates
      websocket.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'domain-update' && domainIds.includes(message.domainId)) {
          const currentCount = updateCounts.get(message.domainId) || 0;
          updateCounts.set(message.domainId, currentCount + 1);
        }
      });
      
      // Generate activity for each domain
      await Promise.all(domainIds.map(domainId => simulateDomainActivity(domainId)));
      
      // Wait for all updates
      await waitForCondition(
        () => Array.from(updateCounts.values()).every(count => count > 0),
        30000
      );
      
      // Verify all domains received updates
      domainIds.forEach(domainId => {
        expect(updateCounts.get(domainId)).toBeGreaterThan(0);
      });
      
      console.log('✅ Multiple concurrent WebSocket subscriptions working correctly');
    }, 45000);

    test('should handle WebSocket message queuing during disconnection', async () => {
      const domainId = 3200;
      const updates: any[] = [];
      
      console.log('📦 Testing WebSocket message queuing...');
      
      // Subscribe to updates
      websocket.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'domain-update' && message.domainId === domainId) {
          updates.push(message);
        }
      });
      
      websocket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'domain-updates',
        domainId
      }));
      
      // Simulate disconnection
      websocket.close();
      
      // Generate activity while disconnected
      await simulateDomainActivity(domainId);
      await simulateDomainActivity(domainId);
      
      // Reconnect
      websocket = new WebSocket(process.env.VALUATION_API_WS_URL || 'ws://localhost:3002/ws');
      
      await new Promise((resolve) => {
        websocket.on('open', resolve);
      });
      
      // Resubscribe
      websocket.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'domain-update' && message.domainId === domainId) {
          updates.push(message);
        }
      });
      
      websocket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'domain-updates',
        domainId
      }));
      
      // Verify queued messages are delivered
      await waitForCondition(() => updates.length >= 2, 30000);
      
      expect(updates.length).toBeGreaterThanOrEqual(2);
      
      console.log('✅ WebSocket message queuing working correctly');
    }, 60000);
  });

  describe('Error Handling and Resilience', () => {
    test('should handle API rate limiting gracefully', async () => {
      console.log('🚦 Testing API rate limiting...');
      
      const requests = Array.from({ length: 100 }, (_, i) => 
        environment.services.valuationApi.client.get(`/domains/${4000 + i}/valuation`)
      );
      
      const results = await Promise.allSettled(requests);
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const rateLimited = results.filter(result => 
        result.status === 'rejected' && 
        result.reason?.response?.status === 429
      ).length;
      
      // Should have some rate limiting
      expect(rateLimited).toBeGreaterThan(0);
      expect(successful).toBeGreaterThan(0);
      
      // Wait for rate limit reset and retry
      await new Promise(resolve => setTimeout(resolve, 60000));
      
      const retryResult = await environment.services.valuationApi.client.get('/domains/4000/valuation');
      expect(retryResult.status).toBe(200);
      
      console.log('✅ API rate limiting handled gracefully');
    }, 120000);

    test('should handle invalid request data', async () => {
      console.log('❌ Testing invalid request handling...');
      
      const invalidRequests = [
        // Invalid domain ID
        { method: 'get', url: '/domains/invalid/valuation' },
        
        // Invalid bid amount
        { method: 'post', url: '/bids', data: { domainId: 5000, bidAmount: 'invalid', bidderAddress: userWallet.address } },
        
        // Invalid address
        { method: 'post', url: '/bids', data: { domainId: 5000, bidAmount: '1000000000000000000', bidderAddress: 'invalid' } },
        
        // Missing required fields
        { method: 'post', url: '/collateral/deposit', data: { domainId: 5000 } }
      ];
      
      for (const request of invalidRequests) {
        try {
          if (request.method === 'get') {
            await environment.services.valuationApi.client.get(request.url);
            fail('Should have thrown an error');
          } else {
            await environment.services.valuationApi.client.post(request.url, request.data);
            fail('Should have thrown an error');
          }
        } catch (error: any) {
          expect(error.response.status).toBeGreaterThanOrEqual(400);
          expect(error.response.status).toBeLessThan(500);
        }
      }
      
      console.log('✅ Invalid request data handled correctly');
    }, 30000);
  });

  // Helper functions
  async function createMockDomainOwnership(domainId: number, owner: string): Promise<void> {
    // Mock domain ownership setup
    await environment.databases.postgres.query(
      'INSERT INTO domain_ownership (domain_id, owner, created_at) VALUES ($1, $2, NOW())',
      [domainId, owner]
    );
  }

  async function createMockCollateralPosition(domainId: number, owner: string, amount: bigint): Promise<void> {
    await environment.databases.postgres.query(
      'INSERT INTO collateral_positions (domain_id, owner, amount, created_at) VALUES ($1, $2, $3, NOW())',
      [domainId, owner, amount.toString()]
    );
  }

  async function waitForTransactionConfirmation(txHash: string): Promise<void> {
    let confirmed = false;
    let attempts = 0;
    
    while (!confirmed && attempts < 30) {
      try {
        const txStatus = await environment.services.valuationApi.client.get(`/transactions/${txHash}/status`);
        if (txStatus.data.confirmed) {
          confirmed = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
    }
    
    if (!confirmed) {
      throw new Error(`Transaction ${txHash} not confirmed within timeout`);
    }
  }

  async function simulateMarketActivity(domainId: number): Promise<void> {
    // Simulate market activity that would trigger valuation updates
    await environment.services.valuationApi.client.post('/test/simulate-market-activity', { domainId });
  }

  async function createHistoricalValuations(domainId: number, days: number): Promise<void> {
    const data = Array.from({ length: days }, (_, i) => ({
      domainId,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      value: Math.floor(Math.random() * 1000000) + 100000,
      confidence: Math.random() * 0.3 + 0.7
    }));
    
    await environment.services.valuationApi.client.post('/test/create-historical-valuations', { data });
  }

  async function simulateAuctionBid(domainId: number, amount: bigint): Promise<void> {
    await environment.services.valuationApi.client.post('/test/simulate-auction-bid', {
      domainId,
      amount: amount.toString()
    });
  }

  async function simulateDomainActivity(domainId: number): Promise<void> {
    await environment.services.valuationApi.client.post('/test/simulate-domain-activity', { domainId });
  }

  async function waitForCondition(condition: () => boolean, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Condition not met within timeout');
  }
});
