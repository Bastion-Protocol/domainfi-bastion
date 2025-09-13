import { ethers } from 'ethers';
import WebSocket from 'ws';
import DatabaseClient from './database';
import RedisClient from './redis';
import config from './config';
import logger from './logger';
import { CustodyChangedEvent } from './types';

class EventMonitor {
  private provider: ethers.WebSocketProvider | null = null;
  private contract: ethers.Contract | null = null;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;
  private isRunning = false;

  private readonly vaultABI = [
    'event CustodyChanged(uint256 indexed domainTokenId, address indexed newCustodian, string action)'
  ];

  constructor(
    private db: DatabaseClient,
    private redis: RedisClient
  ) {}

  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Event monitor is already running');
      return;
    }

    try {
      await this.connectToNetwork();
      await this.setupEventListeners();
      this.isRunning = true;
      logger.info('Event monitor started successfully');
    } catch (error) {
      logger.error('Failed to start event monitor:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    
    if (this.contract) {
      this.contract.removeAllListeners();
    }
    
    if (this.provider) {
      await this.provider.destroy();
    }
    
    if (this.ws) {
      this.ws.close();
    }

    logger.info('Event monitor stopped');
  }

  private async connectToNetwork(): Promise<void> {
    try {
      // Use WebSocket provider for real-time events
      this.provider = new ethers.WebSocketProvider(config.doma.wsUrl);
      
      // Create contract instance
      this.contract = new ethers.Contract(
        config.doma.vaultAddress,
        this.vaultABI,
        this.provider
      );

      // Test connection
      await this.provider.getNetwork();
      logger.info('Connected to Doma network successfully');
      
      this.reconnectAttempts = 0;
    } catch (error) {
      logger.error('Failed to connect to Doma network:', error);
      await this.handleReconnection();
    }
  }

  private async setupEventListeners(): Promise<void> {
    if (!this.contract || !this.provider) {
      throw new Error('Contract or provider not initialized');
    }

    // Listen for CustodyChanged events
    this.contract.on('CustodyChanged', async (domainTokenId, newCustodian, action, event) => {
      try {
        await this.processCustodyEvent({
          domainTokenId: domainTokenId.toString(),
          newCustodian,
          action,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          logIndex: event.logIndex,
        });
      } catch (error) {
        logger.error('Error processing custody event:', error);
      }
    });

    // Handle provider events
    this.provider.on('error', (error) => {
      logger.error('Provider error:', error);
      this.handleReconnection();
    });

    this.provider.on('close', () => {
      logger.warn('Provider connection closed');
      if (this.isRunning) {
        this.handleReconnection();
      }
    });

    logger.info('Event listeners setup completed');
  }

  private async processCustodyEvent(event: CustodyChangedEvent): Promise<void> {
    const { domainTokenId, newCustodian, action, txHash, blockNumber, logIndex } = event;
    
    logger.info(`Processing custody event: ${action} for token ${domainTokenId}`);

    try {
      // Check if event already processed
      const existingEvent = await this.db.prisma.custodyEvent.findUnique({
        where: {
          txHash_logIndex: {
            txHash,
            logIndex,
          },
        },
      });

      if (existingEvent) {
        logger.info(`Event already processed: ${txHash}:${logIndex}`);
        return;
      }

      // Determine if domain is entering or leaving vault
      const inVault = newCustodian.toLowerCase() === config.doma.vaultAddress.toLowerCase();
      
      // Store custody event
      const custodyEvent = await this.db.prisma.custodyEvent.create({
        data: {
          domainTokenId,
          circleAddress: inVault ? 'vault' : newCustodian,
          inVault,
          txHash,
          blockNumber: BigInt(blockNumber),
          logIndex,
        },
      });

      // Queue mirror operation
      const operation = inVault ? 'mint' : 'burn';
      await this.redis.addMirrorOperation({
        custodyEventId: custodyEvent.id,
        operation,
        domainTokenId,
        circleAddress: newCustodian,
      });

      logger.info(`Custody event processed and queued: ${operation} for token ${domainTokenId}`);
    } catch (error) {
      logger.error('Failed to process custody event:', error);
      throw error;
    }
  }

  private async handleReconnection(): Promise<void> {
    if (!this.isRunning) return;

    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached. Stopping monitor.');
      this.isRunning = false;
      return;
    }

    logger.warn(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    
    try {
      await this.connectToNetwork();
      await this.setupEventListeners();
      logger.info('Reconnection successful');
    } catch (error) {
      logger.error('Reconnection failed:', error);
      await this.handleReconnection();
    }
  }

  public async getStatus(): Promise<{ connected: boolean; blockNumber?: number }> {
    try {
      if (!this.provider) {
        return { connected: false };
      }

      const blockNumber = await this.provider.getBlockNumber();
      return { connected: true, blockNumber };
    } catch (error) {
      return { connected: false };
    }
  }
}

export default EventMonitor;
