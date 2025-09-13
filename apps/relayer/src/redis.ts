import Redis from 'ioredis';
import { Queue, Worker, Job } from 'bullmq';
import config from './config';
import logger from './logger';
import { MirrorOperationJob } from './types';

class RedisClient {
  private static instance: RedisClient;
  public redis: Redis;
  public mirrorQueue: Queue<MirrorOperationJob>;
  private worker: Worker<MirrorOperationJob> | null = null;

  private constructor() {
    this.redis = new Redis(config.redis.url, {
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    this.mirrorQueue = new Queue<MirrorOperationJob>('mirror-operations', {
      connection: this.redis,
    });

    this.setupEventListeners();
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  private setupEventListeners(): void {
    this.redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    this.redis.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  public async addMirrorOperation(job: MirrorOperationJob): Promise<void> {
    try {
      await this.mirrorQueue.add('process-mirror', job, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
      logger.info(`Added mirror operation job: ${job.operation} for token ${job.domainTokenId}`);
    } catch (error) {
      logger.error('Failed to add mirror operation job:', error);
      throw error;
    }
  }

  public startWorker(processor: (job: Job<MirrorOperationJob>) => Promise<void>): void {
    this.worker = new Worker<MirrorOperationJob>('mirror-operations', processor, {
      connection: this.redis,
      concurrency: 5,
    });

    this.worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, error) => {
      logger.error(`Job ${job?.id} failed:`, error);
    });

    logger.info('Mirror operations worker started');
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.worker) {
        await this.worker.close();
      }
      await this.mirrorQueue.close();
      this.redis.disconnect();
      logger.info('Redis disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect from Redis:', error);
      throw error;
    }
  }
}

export default RedisClient;
