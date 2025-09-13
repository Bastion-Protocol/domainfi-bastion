# Environment Configuration Guide - Bastion Protocol

## 🔐 Security Overview

This guide covers the comprehensive environment configuration for the Bastion Protocol monorepo. **Environment variables contain sensitive information and should be handled with extreme care.**

## 📁 Environment Files Structure

```
/workspaces/domainfi-bastion/
├── .env.example                           # Root shared variables
├── apps/
│   ├── web/.env.example                   # Frontend environment
│   ├── relayer/.env.example               # Relayer service environment
│   └── valuation-api/.env.example         # Valuation API environment
└── packages/
    ├── contracts-doma/.env.example        # Doma contracts environment
    └── contracts-avalanche/.env.example   # Avalanche contracts environment
```

## 🚀 Quick Setup

### 1. Copy Environment Files
```bash
# Root configuration
cp .env.example .env

# Application configurations
cp apps/web/.env.example apps/web/.env.local
cp apps/relayer/.env.example apps/relayer/.env
cp apps/valuation-api/.env.example apps/valuation-api/.env

# Contract configurations
cp packages/contracts-doma/.env.example packages/contracts-doma/.env
cp packages/contracts-avalanche/.env.example packages/contracts-avalanche/.env
```

### 2. Configure Required Variables
Fill in the following **minimum required** variables in each `.env` file:

#### Root `.env`
```bash
DOMA_RPC_URL=https://rpc.doma.testnet
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
ALCHEMY_API_KEY=your_alchemy_api_key
```

#### Web `.env.local`
```bash
NEXT_PUBLIC_DOMA_RPC_URL=https://rpc.doma.testnet
NEXT_PUBLIC_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

#### Relayer `.env`
```bash
RELAYER_PRIVATE_KEY=your_relayer_private_key
DATABASE_URL=postgresql://user:password@localhost:5432/bastion_relayer
REDIS_URL=redis://localhost:6379
```

#### Valuation API `.env`
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/bastion_valuation
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
COINGECKO_API_KEY=your_coingecko_api_key
```

#### Contract `.env` files
```bash
DEPLOYER_PRIVATE_KEY=your_deployer_private_key
SNOWTRACE_API_KEY=your_snowtrace_api_key
VERIFY_CONTRACTS=true
```

## 🔑 Private Key Management

### Development Environment
```bash
# Generate test private keys (DO NOT USE IN PRODUCTION)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Production Environment
Use hardware wallets or secure key management services:
- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Hardware Wallets** (Ledger, Trezor)

### Key Rotation Strategy
1. **Regular Rotation**: Rotate keys every 90 days
2. **Separate Keys**: Use different keys for different purposes
3. **Access Control**: Limit key access to essential personnel only
4. **Monitoring**: Monitor key usage and set up alerts

## 🌐 Network Configuration

### Doma Testnet
```bash
DOMA_RPC_URL=https://rpc.doma.testnet
DOMA_CHAIN_ID=12345  # Update with actual chain ID
```

### Avalanche Fuji
```bash
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
FUJI_CHAIN_ID=43113
```

### RPC Provider Redundancy
Configure multiple RPC providers for reliability:
```bash
# Primary
DOMA_RPC_URL=https://rpc.doma.testnet
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc

# Backups
ALCHEMY_DOMA_URL=https://doma-testnet.g.alchemy.com/v2/YOUR_API_KEY
ALCHEMY_FUJI_URL=https://avalanche-fuji.g.alchemy.com/v2/YOUR_API_KEY
INFURA_FUJI_URL=https://avalanche-fuji.infura.io/v3/YOUR_PROJECT_ID
```

## 🔧 Service-Specific Configuration

### Frontend (Next.js)
- All public variables must be prefixed with `NEXT_PUBLIC_`
- Server-side variables are accessible only during build and runtime
- Use `.env.local` for local development overrides

### Relayer Service
- Requires robust database configuration
- Redis for job queues and caching
- Multiple private keys for different operations
- Monitoring and alerting integration

### Valuation API
- Price feed API integrations
- Database for historical data storage
- Rate limiting configuration
- Real-time update intervals

### Smart Contracts
- Network-specific deployment configuration
- Gas optimization settings
- Contract verification setup
- Multi-signature wallet integration

## 🛡️ Security Best Practices

### 1. Environment Isolation
```bash
# Development
NODE_ENV=development
DEBUG_MODE=true

# Staging
NODE_ENV=staging
DEBUG_MODE=false

# Production
NODE_ENV=production
DEBUG_MODE=false
```

### 2. Secret Management
- **Never commit** `.env` files to version control
- Use **encrypted storage** for production secrets
- Implement **secret rotation** policies
- Set up **access logging** for sensitive operations

### 3. Access Control
```bash
# Role-based access
ADMIN_ADDRESSES=0x...,0x...
PAUSER_ADDRESSES=0x...,0x...
UPGRADER_ADDRESSES=0x...,0x...

# Multi-signature requirements
MULTISIG_THRESHOLD=2
MULTISIG_OWNERS=0x...,0x...,0x...
```

### 4. Monitoring Setup
```bash
# Error tracking
SENTRY_DSN=your_sentry_dsn

# Application monitoring
DATADOG_API_KEY=your_datadog_api_key

# Alert thresholds
LOW_BALANCE_THRESHOLD=0.1
HIGH_GAS_PRICE_THRESHOLD=50000000000
```

## 📊 Database Configuration

### PostgreSQL Setup
```bash
# Development
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/bastion_dev

# Production (use connection pooling)
DATABASE_URL=postgresql://prod_user:secure_password@prod-db.example.com:5432/bastion_prod?sslmode=require
```

### Redis Configuration
```bash
# Development
REDIS_URL=redis://localhost:6379

# Production (with authentication)
REDIS_URL=redis://username:password@redis-cluster.example.com:6380/0
```

## 🚨 Emergency Procedures

### 1. Key Compromise Response
```bash
# Immediately pause affected contracts
EMERGENCY_PAUSE_ENABLED=true

# Rotate compromised keys
RELAYER_PRIVATE_KEY=new_secure_private_key

# Update all dependent services
```

### 2. Service Recovery
```bash
# Backup configuration
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Restore from backup
cp .env.backup.20240906_120000 .env
```

## 📋 Environment Validation

### Validation Script
```bash
#!/bin/bash
# validate-env.sh

# Check required variables
required_vars=(
  "DOMA_RPC_URL"
  "FUJI_RPC_URL"
  "DEPLOYER_PRIVATE_KEY"
  "DATABASE_URL"
)

for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo "ERROR: $var is not set"
    exit 1
  fi
done

echo "✅ Environment validation passed"
```

### Health Checks
```bash
# Check RPC connectivity
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  $DOMA_RPC_URL

# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check Redis connectivity
redis-cli -u $REDIS_URL ping
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
env:
  DOMA_RPC_URL: ${{ secrets.DOMA_RPC_URL }}
  DEPLOYER_PRIVATE_KEY: ${{ secrets.DEPLOYER_PRIVATE_KEY }}
  SNOWTRACE_API_KEY: ${{ secrets.SNOWTRACE_API_KEY }}
```

### Deployment Checklist
- [ ] Environment variables validated
- [ ] Database migrations applied
- [ ] Private keys rotated (if needed)
- [ ] Monitoring alerts configured
- [ ] Backup procedures tested
- [ ] Emergency contacts notified

## 📞 Support

For environment configuration issues:
1. Check this documentation first
2. Validate environment files using the validation script
3. Review service logs for specific error messages
4. Contact the DevOps team for production issues

---

⚠️ **CRITICAL REMINDER**: Never expose private keys, API secrets, or database credentials in logs, error messages, or version control.
