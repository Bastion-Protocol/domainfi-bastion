# Bastion Protocol Relayer Service

## Overview

The Bastion Protocol Relayer Service is a robust event monitoring and cross-chain operation service that bridges Doma testnet and Avalanche Fuji. It monitors domain custody changes on Doma and automatically mints/burns corresponding Mirror NFTs on Avalanche.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Doma Chain    │    │  Relayer Service │    │ Avalanche Fuji  │
│                 │    │                  │    │                 │
│ CircleVault ────┼───▶│ Event Monitor    │    │                 │
│ (CustodyChanged)│    │       │          │    │                 │
│                 │    │       ▼          │    │                 │
│                 │    │ Database Storage │    │                 │
│                 │    │       │          │    │                 │
│                 │    │       ▼          │    │                 │
│                 │    │ Redis Queue ─────┼───▶│ MirrorDomainNFT │
│                 │    │       │          │    │ (mint/burn)     │
│                 │    │       ▼          │    │                 │
│                 │    │ Event Processor  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components

### 1. Event Monitor (`src/monitor.ts`)
- **WebSocket Connection**: Real-time monitoring of Doma CircleVault events
- **Event Processing**: Detects CustodyChanged events and processes them
- **Duplicate Prevention**: Prevents processing of duplicate events
- **Auto-Reconnection**: Handles network disconnections with exponential backoff

### 2. Event Processor (`src/processor.ts`)
- **Mirror NFT Operations**: Handles minting and burning of Mirror NFTs on Avalanche
- **Transaction Management**: Manages Avalanche transactions with proper error handling
- **Proof Generation**: Creates cryptographic proofs for cross-chain verification

### 3. Database Layer (`src/database.ts`)
- **Prisma ORM**: Type-safe database operations
- **Event Storage**: Persistent storage of custody events and mirror operations
- **Health Monitoring**: Database connection health checks

### 4. Redis Queue (`src/redis.ts`)
- **Job Queue**: Reliable job processing with BullMQ
- **Retry Logic**: Automatic retry with exponential backoff
- **Worker Management**: Scalable job processing

## Installation

```bash
cd apps/relayer
pnpm install
```

## Environment Setup

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bastion_relayer"

# Redis
REDIS_URL="redis://localhost:6379"

# Doma Network
DOMA_RPC_URL="https://rpc.doma.testnet"
DOMA_WS_URL="wss://ws.doma.testnet"
DOMA_VAULT_ADDRESS="0x..."
DOMA_CHAIN_ID="12345"

# Avalanche Fuji
FUJI_RPC_URL="https://api.avax-test.network/ext/bc/C/rpc"
FUJI_MIRROR_NFT_ADDRESS="0x..."
RELAYER_PRIVATE_KEY="0x..."

# Server
PORT="3001"
LOG_LEVEL="info"
```

## Database Setup

```bash
# Initialize Prisma
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

## Running the Service

### Development
```bash
pnpm dev
```

### Production
```bash
pnpm build
pnpm start
```

## API Endpoints

### Health Check
```http
GET /health
```

Returns service health status including all components.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-09-11T10:00:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "monitor": "healthy",
    "processor": "healthy"
  },
  "details": {
    "monitor": {
      "connected": true,
      "blockNumber": 12345
    },
    "processor": {
      "connected": true,
      "blockNumber": 67890,
      "pendingJobs": 0
    }
  }
}
```

### Metrics
```http
GET /metrics
```

Returns processing metrics and statistics.

**Response:**
```json
{
  "timestamp": "2025-09-11T10:00:00Z",
  "custodyEvents": {
    "processed": 150,
    "pending": 5
  },
  "mirrorOperations": {
    "success": 140,
    "pending": 8,
    "failed": 2
  }
}
```

### Events
```http
GET /events?page=1&limit=20
```

Returns paginated custody events with their mirror operations.

## Monitoring and Logging

### Log Files
- `logs/combined.log` - All log entries
- `logs/error.log` - Error-level logs only

### Log Levels
- `error` - System errors and failures
- `warn` - Warning conditions
- `info` - General information (default)
- `debug` - Detailed debug information

### Monitoring Dashboard

The service provides comprehensive monitoring through:
1. Health check endpoints
2. Metrics endpoints  
3. Structured logging
4. Database event storage

## Error Handling

### Event Processing Errors
- **Duplicate Events**: Automatically detected and skipped
- **Network Failures**: Auto-reconnection with exponential backoff
- **Transaction Failures**: Automatic retry with job queue
- **Invalid Data**: Logged and marked as failed

### Recovery Mechanisms
- **Database Recovery**: Connection pooling and health checks
- **Redis Recovery**: Automatic reconnection and job persistence
- **Network Recovery**: WebSocket reconnection with backoff
- **Transaction Recovery**: Job retry with exponential backoff

## Security Considerations

### Private Key Management
- Store relayer private keys securely (environment variables, secrets manager)
- Use different keys for different environments
- Implement key rotation procedures

### Network Security
- Use WSS (secure WebSocket) connections
- Implement rate limiting on API endpoints
- Use HTTPS in production
- Validate all incoming data

### Access Control
- Restrict database access
- Monitor API endpoints
- Implement audit logging

## Deployment

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  relayer:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/bastion
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=bastion
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password

  redis:
    image: redis:7-alpine
```

## Testing

### Unit Tests
```bash
pnpm test
```

### Integration Tests
```bash
pnpm test:integration
```

### Load Testing
```bash
pnpm test:load
```

## Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Check RPC endpoint availability
   - Verify network connectivity
   - Review firewall settings

2. **Transaction Failures**
   - Verify relayer account has sufficient funds
   - Check gas price settings
   - Review contract addresses

3. **Database Issues**
   - Verify PostgreSQL is running
   - Check connection string format
   - Review migration status

4. **Redis Issues**
   - Verify Redis server is running
   - Check Redis configuration
   - Review job queue status

### Debug Mode
Enable debug logging:
```env
LOG_LEVEL=debug
```

### Performance Monitoring
Monitor key metrics:
- Event processing latency
- Transaction confirmation times
- Database query performance
- Redis job queue depth

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details
