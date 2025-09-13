import { ethers } from 'ethers';
import { Job } from 'bullmq';
import DatabaseClient from './database';
import config from './config';
import logger from './logger';
import { MirrorOperationJob } from './types';

class EventProcessor {
  private avalancheProvider: ethers.JsonRpcProvider;
  private mirrorContract: ethers.Contract;
  private relayerWallet: ethers.Wallet;

  private readonly mirrorNFTABI = [
    'function mint(address circle, uint256 domaChainId, uint256 domaTokenId, bytes32 proofHash, string calldata uri, uint256 tokenId) external',
    'function burn(uint256 tokenId) external',
    'function source(uint256 tokenId) external view returns (address domaCircle, uint256 domaChainId, uint256 domaTokenId, bytes32 proofHash)',
  ];

  constructor(private db: DatabaseClient) {
    this.avalancheProvider = new ethers.JsonRpcProvider(config.avalanche.rpcUrl);
    this.relayerWallet = new ethers.Wallet(config.avalanche.relayerPrivateKey, this.avalancheProvider);
    this.mirrorContract = new ethers.Contract(
      config.avalanche.mirrorNftAddress,
      this.mirrorNFTABI,
      this.relayerWallet
    );
  }

  public async processJob(job: Job<MirrorOperationJob>): Promise<void> {
    const { custodyEventId, operation, domainTokenId, circleAddress } = job.data;
    
    logger.info(`Processing mirror operation: ${operation} for token ${domainTokenId}`);

    try {
      // Get custody event details
      const custodyEvent = await this.db.prisma.custodyEvent.findUnique({
        where: { id: custodyEventId },
      });

      if (!custodyEvent) {
        throw new Error(`Custody event not found: ${custodyEventId}`);
      }

      let mirrorOperation;
      
      if (operation === 'mint') {
        mirrorOperation = await this.processMintOperation(custodyEvent, domainTokenId, circleAddress);
      } else if (operation === 'burn') {
        mirrorOperation = await this.processBurnOperation(custodyEvent, domainTokenId);
      } else {
        throw new Error(`Unknown operation: ${operation}`);
      }

      // Update custody event as processed
      await this.db.prisma.custodyEvent.update({
        where: { id: custodyEventId },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });

      logger.info(`Mirror operation completed successfully: ${operation} for token ${domainTokenId}`);
    } catch (error) {
      logger.error(`Mirror operation failed: ${operation} for token ${domainTokenId}:`, error);
      
      // Update mirror operation with error
      await this.db.prisma.mirrorOperation.updateMany({
        where: { custodyEventId },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      
      throw error;
    }
  }

  private async processMintOperation(
    custodyEvent: any,
    domainTokenId: string,
    circleAddress: string
  ): Promise<any> {
    try {
      // Create mirror operation record
      const mirrorOperation = await this.db.prisma.mirrorOperation.create({
        data: {
          custodyEventId: custodyEvent.id,
          operation: 'mint',
          status: 'pending',
        },
      });

      // Generate proof hash from custody event
      const proofHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['string', 'uint256', 'uint256'],
          [custodyEvent.txHash, custodyEvent.blockNumber, custodyEvent.logIndex]
        )
      );

      // Generate metadata URI
      const metadataUri = `https://metadata.bastion.protocol/doma/${domainTokenId}`;
      
      // Generate unique mirror token ID
      const mirrorTokenId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint256', 'string'],
          [config.doma.chainId, domainTokenId, custodyEvent.txHash]
        )
      );

      // Execute mint transaction
      const tx = await this.mirrorContract.mint(
        circleAddress,
        config.doma.chainId,
        domainTokenId,
        proofHash,
        metadataUri,
        mirrorTokenId
      );

      logger.info(`Mint transaction sent: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status !== 1) {
        throw new Error('Transaction failed');
      }

      // Update mirror operation with success
      await this.db.prisma.mirrorOperation.update({
        where: { id: mirrorOperation.id },
        data: {
          mirrorTokenId: mirrorTokenId.toString(),
          avalancheTxHash: tx.hash,
          status: 'success',
        },
      });

      logger.info(`Mirror NFT minted successfully: ${mirrorTokenId} (tx: ${tx.hash})`);
      return mirrorOperation;
    } catch (error) {
      logger.error('Mint operation failed:', error);
      throw error;
    }
  }

  private async processBurnOperation(
    custodyEvent: any,
    domainTokenId: string
  ): Promise<any> {
    try {
      // Find existing mirror operation for this token
      const existingMirrorOp = await this.db.prisma.mirrorOperation.findFirst({
        where: {
          custodyEvent: {
            domainTokenId,
          },
          operation: 'mint',
          status: 'success',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!existingMirrorOp || !existingMirrorOp.mirrorTokenId) {
        throw new Error(`No mirror token found for domain token ${domainTokenId}`);
      }

      // Create mirror operation record
      const mirrorOperation = await this.db.prisma.mirrorOperation.create({
        data: {
          custodyEventId: custodyEvent.id,
          operation: 'burn',
          mirrorTokenId: existingMirrorOp.mirrorTokenId,
          status: 'pending',
        },
      });

      // Execute burn transaction
      const tx = await this.mirrorContract.burn(existingMirrorOp.mirrorTokenId);
      
      logger.info(`Burn transaction sent: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status !== 1) {
        throw new Error('Transaction failed');
      }

      // Update mirror operation with success
      await this.db.prisma.mirrorOperation.update({
        where: { id: mirrorOperation.id },
        data: {
          avalancheTxHash: tx.hash,
          status: 'success',
        },
      });

      logger.info(`Mirror NFT burned successfully: ${existingMirrorOp.mirrorTokenId} (tx: ${tx.hash})`);
      return mirrorOperation;
    } catch (error) {
      logger.error('Burn operation failed:', error);
      throw error;
    }
  }

  public async getProcessorStatus(): Promise<{ 
    connected: boolean; 
    blockNumber?: number;
    pendingJobs?: number;
  }> {
    try {
      const blockNumber = await this.avalancheProvider.getBlockNumber();
      
      // Get pending jobs count
      const pendingJobs = await this.db.prisma.mirrorOperation.count({
        where: { status: 'pending' },
      });

      return { 
        connected: true, 
        blockNumber,
        pendingJobs,
      };
    } catch (error) {
      logger.error('Processor status check failed:', error);
      return { connected: false };
    }
  }
}

export default EventProcessor;
