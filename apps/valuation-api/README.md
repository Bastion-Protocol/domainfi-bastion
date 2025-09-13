# DomainFi Valuation API

A professional domain valuation service built with NestJS for the DomainFi protocol. This API provides comprehensive domain appraisals using multiple valuation methodologies, market analysis, and machine learning algorithms.

## Features

### 🎯 Core Valuation Services
- **Multi-methodology Valuation**: Comparable, cost-based, income-based, and hybrid approaches
- **Real-time Market Analysis**: Live market conditions and trends
- **Batch Processing**: Valuate multiple domains efficiently
- **Portfolio Management**: Calculate total portfolio values for domain circles
- **Historical Tracking**: Track valuation changes over time

### 🔒 Security & Authentication
- **Wallet-based Authentication**: Sign-in with Ethereum wallet signatures
- **JWT Token Management**: Secure API access with configurable expiration
- **API Key Support**: Programmatic access for automated systems
- **Rate Limiting**: Configurable request throttling
- **Cryptographic Signatures**: Signed valuations for on-chain verification

### 📊 Advanced Analytics
- **ML-powered Algorithms**: Machine learning models for accurate pricing
- **Market Comparables**: Analysis of similar domain sales
- **SEO Score Assessment**: Domain brandability and marketing value
- **Rarity Calculations**: Unique characteristics and scarcity metrics
- **Social Media Integration**: Mentions and brand recognition analysis

### 🏗️ Enterprise Architecture
- **NestJS Framework**: Scalable, modular backend architecture
- **PostgreSQL Database**: Robust data persistence with TypeORM
- **Redis Caching**: High-performance caching layer
- **Swagger Documentation**: Comprehensive API documentation
- **Docker Support**: Containerized deployment ready

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- pnpm (recommended) or npm

### Installation

1. **Clone and setup the project:**
```bash
cd apps/valuation-api
cp .env.example .env
```

2. **Configure environment variables:**
```bash
# Edit .env with your configuration
nano .env
```

3. **Install dependencies:**
```bash
pnpm install
```

4. **Setup database:**
```bash
# Start PostgreSQL and Redis
docker-compose up postgres redis -d

# Run migrations (auto-sync in development)
pnpm start:dev
```

5. **Start the development server:**
```bash
pnpm start:dev
```

The API will be available at `http://localhost:3001`

### Docker Deployment

For production deployment using Docker:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f valuation-api

# Scale the API service
docker-compose up -d --scale valuation-api=3
```

## API Documentation

### Interactive Documentation
Once running, visit `http://localhost:3001/api/docs` for the complete Swagger documentation.

### Authentication

#### 1. Wallet Authentication
```bash
# Generate message to sign
POST /auth/message
{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D2C4dE1b"
}

# Login with signed message
POST /auth/login
{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D2C4dE1b",
  "signature": "0x...",
  "message": "Sign this message to authenticate...",
  "timestamp": 1640995200
}
```

#### 2. API Key Authentication
```bash
# Create API key (requires JWT)
POST /auth/api-key
Authorization: Bearer <jwt-token>
{
  "name": "Portfolio Manager"
}
```

### Core Endpoints

#### Domain Valuation
```bash
# Single domain valuation
POST /valuation/domain
Authorization: Bearer <jwt-token>
{
  "domainTokenId": "12345",
  "domainName": "example.com",
  "methodology": "hybrid"
}

# Batch valuation
POST /valuation/batch
Authorization: Bearer <jwt-token>
{
  "domains": [
    {"domainTokenId": "1", "domainName": "example.com"},
    {"domainTokenId": "2", "domainName": "test.eth"}
  ],
  "methodology": "comparable"
}

# Portfolio valuation
POST /valuation/portfolio
Authorization: Bearer <jwt-token>
{
  "circleId": "circle-123",
  "includeHistorical": true,
  "timeframe": "30d"
}
```

#### Signed Valuations
```bash
# Create cryptographically signed valuation
POST /valuation/signed
Authorization: Bearer <jwt-token>
{
  "domainTokenId": "12345",
  "purpose": "lending"
}
```

#### Market Data
```bash
# Current market conditions
GET /valuation/market/conditions
Authorization: Bearer <jwt-token>

# Valuation trends
GET /valuation/analytics/trends?tld=com&timeframe=30d
Authorization: Bearer <jwt-token>
```

## Valuation Methodologies

### 1. Comparable Sales Approach
Analyzes recent sales of similar domains considering:
- Domain length and structure
- TLD (top-level domain) type
- Market activity and volume
- Seasonal trends

### 2. Cost-Based Approach
Calculates value based on:
- Acquisition and development costs
- Brand building investment
- SEO optimization value
- Marketing potential

### 3. Income-Based Approach
Projects future income potential from:
- Traffic monetization
- Brand licensing opportunities
- Advertising revenue potential
- E-commerce applications

### 4. Hybrid Methodology (Recommended)
Combines all approaches with intelligent weighting:
- 50% Comparable sales analysis
- 30% Cost-based assessment
- 20% Income projection

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | API server port | `3001` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | - |
| `DB_DATABASE` | Database name | `bastion_valuation` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Token expiration | `24h` |
| `VALUATION_SIGNING_KEY` | Private key for signing valuations | - |

### Database Schema

The API uses PostgreSQL with the following key entities:
- `domain_valuations`: Current domain valuations
- `valuation_history`: Historical valuation records
- User and API key management tables

## Performance & Scaling

### Caching Strategy
- **Redis caching**: 5-minute TTL for valuations
- **Database indexing**: Optimized queries on token IDs and domains
- **Rate limiting**: 100 requests/minute per user

### Monitoring
- Health check endpoint: `GET /health`
- Metrics collection ready for Prometheus
- Structured logging with Winston

### Scaling Considerations
- Stateless design for horizontal scaling
- Redis for shared caching across instances
- Database connection pooling
- Load balancer ready

## Security Best Practices

### Authentication
- Wallet signature verification
- JWT with configurable expiration
- API key rotation support

### Rate Limiting
- Per-user request limits
- DDoS protection
- Graceful degradation

### Data Protection
- Input validation with class-validator
- SQL injection prevention with TypeORM
- XSS protection with helmet
- CORS configuration

## Development

### Project Structure
```
src/
├── config/          # Configuration files
├── decorators/      # Custom decorators
├── dto/            # Data transfer objects
├── entities/       # Database entities
├── modules/        # Feature modules
│   ├── auth/       # Authentication module
│   └── valuation/  # Valuation module
├── types/          # TypeScript interfaces
├── utils/          # Utility functions
└── main.ts         # Application entry point
```

### Testing
```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

### Code Quality
```bash
# Linting
pnpm lint

# Format code
pnpm format

# Type checking
pnpm build
```

## API Rate Limits

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Authentication | 10 req/min | Per IP |
| Valuation | 100 req/min | Per user |
| Batch operations | 10 req/min | Per user |
| Market data | 50 req/min | Per user |

## Error Handling

The API uses standard HTTP status codes:
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

Error responses include detailed information:
```json
{
  "statusCode": 400,
  "message": "Invalid domain name format",
  "error": "Bad Request",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/valuation/domain"
}
```

## Support

For issues, questions, or contributions:
- Check the API documentation at `/api/docs`
- Review the error logs for debugging
- Ensure all environment variables are properly configured
- Verify database and Redis connectivity

## License

This project is part of the DomainFi protocol. See the main repository for license information.