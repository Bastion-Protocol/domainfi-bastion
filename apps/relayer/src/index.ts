import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import DatabaseClient from './database';
import RedisClient from './redis';
import EventMonitor from './monitor';
import EventProcessor from './processor';
import config from './config';
import logger from './logger';

const app: express.Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Initialize services
const db = DatabaseClient.getInstance();
const redis = RedisClient.getInstance();
const eventMonitor = new EventMonitor(db, redis);
const eventProcessor = new EventProcessor(db);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const [dbHealth, redisHealth, monitorStatus, processorStatus] = await Promise.all([
      db.healthCheck(),
      redis.healthCheck(),
      eventMonitor.getStatus(),
      eventProcessor.getProcessorStatus(),
    ]);

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth ? 'healthy' : 'unhealthy',
        redis: redisHealth ? 'healthy' : 'unhealthy',
        monitor: monitorStatus.connected ? 'healthy' : 'unhealthy',
        processor: processorStatus.connected ? 'healthy' : 'unhealthy',
      },
      details: {
        monitor: monitorStatus,
        processor: processorStatus,
      },
    };

    const isHealthy = dbHealth && redisHealth && monitorStatus.connected && processorStatus.connected;
    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const [custodyEvents, mirrorOperations] = await Promise.all([
      db.prisma.custodyEvent.groupBy({
        by: ['processed'],
        _count: { _all: true },
      }),
      db.prisma.mirrorOperation.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const metrics = {
      timestamp: new Date().toISOString(),
      custodyEvents: custodyEvents.reduce((acc, item) => {
        acc[item.processed ? 'processed' : 'pending'] = item._count._all;
        return acc;
      }, {} as Record<string, number>),
      mirrorOperations: mirrorOperations.reduce((acc, item) => {
        acc[item.status] = item._count._all;
        return acc;
      }, {} as Record<string, number>),
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Metrics endpoint failed:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics',
    });
  }
});

// Events endpoint
app.get('/events', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      db.prisma.custodyEvent.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          mirrorOperations: true,
        },
      }),
      db.prisma.custodyEvent.count(),
    ]);

    res.json({
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Events endpoint failed:', error);
    res.status(500).json({
      error: 'Failed to fetch events',
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await shutdown();
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await shutdown();
});

async function shutdown() {
  try {
    await eventMonitor.stop();
    await redis.disconnect();
    await db.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

async function startServer() {
  try {
    // Initialize database
    await db.connect();

    // Start Redis worker
    redis.startWorker(async (job) => {
      await eventProcessor.processJob(job);
    });

    // Start event monitor
    await eventMonitor.start();

    // Start HTTP server
    const server = app.listen(config.server.port, () => {
      logger.info(`Relayer service started on port ${config.server.port}`);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export { app, startServer };
