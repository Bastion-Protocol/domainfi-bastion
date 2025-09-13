# Hardhat Dual-Chain Deployment Setup

This document describes the Hardhat configuration for dual-chain deployment across Doma Testnet and Avalanche Fuji networks.

## 📋 Overview

The Bastion Protocol uses Hardhat for smart contract development, testing, and deployment across two networks:
- **Doma Testnet**: Primary chain for Bastion Protocol
- **Avalanche Fuji**: Secondary chain for cross-chain functionality

## 🔧 Configuration Features

### Networks Configured
- **Hardhat Local**: For local development and testing
- **Doma Testnet**: Chain ID 12345 (update with actual chain ID)
- **Avalanche Fuji**: Chain ID 43113

### Plugins Included
- `@nomicfoundation/hardhat-toolbox`: Complete Hardhat toolkit
- `hardhat-deploy`: Advanced deployment system
- `hardhat-gas-reporter`: Gas usage analysis
- `solidity-coverage`: Code coverage reports
- `@typechain/hardhat`: TypeScript type generation

### Solidity Configuration
- Version: 0.8.19
- Optimizer: Enabled with 200 runs
- IR optimization: Enabled for better gas efficiency

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Network RPC URLs
DOMA_RPC_URL=https://rpc.doma.testnet
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc

# Private Keys (use different keys for different purposes)
DOMA_PRIVATE_KEY=your_doma_private_key
FUJI_PRIVATE_KEY=your_fuji_private_key
DEPLOYER_PRIVATE_KEY=your_deployer_private_key
ADMIN_PRIVATE_KEY=your_admin_private_key

# API Keys for Contract Verification
DOMA_SCAN_API_KEY=your_doma_scan_api_key
SNOWTRACE_API_KEY=your_snowtrace_api_key

# Gas Reporter Configuration
REPORT_GAS=true
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key

# Deployment Settings
VERIFY_CONTRACTS=true
```

## 🚀 Usage Commands

### Compilation
```bash
# Compile contracts
pnpm run compile
pnpm run build
```

### Testing
```bash
# Run all tests
pnpm run test

# Run tests with gas reporting
REPORT_GAS=true pnpm run test

# Run coverage
pnpm run coverage
```

### Deployment

#### Local Network
```bash
pnpm run deploy
```

#### Doma Testnet
```bash
pnpm run deploy:doma
```

#### Avalanche Fuji
```bash
pnpm run deploy:fuji
```

### Contract Verification
```bash
# Verify on Doma (after deployment)
npx hardhat verify --network doma CONTRACT_ADDRESS

# Verify on Fuji (after deployment)
npx hardhat verify --network fuji CONTRACT_ADDRESS
```

## 📁 Project Structure

```
packages/contracts-{doma|avalanche}/
├── contracts/              # Solidity contracts
│   └── BastionProtocol.sol
├── deploy/                 # Deployment scripts
│   └── 01_deploy_bastion_protocol.ts
├── scripts/                # Utility scripts
│   └── verify.ts
├── test/                   # Test files
│   └── BastionProtocol.test.ts
├── hardhat.config.ts       # Hardhat configuration
├── .env.example           # Environment variables template
└── package.json           # Dependencies and scripts
```

## 🔍 Gas Settings

### Doma Testnet
- Gas Price: Auto-detection
- Gas Limit: Auto-detection
- Timeout: 60 seconds

### Avalanche Fuji
- Gas Price: 25 gwei
- Gas Limit: 8,000,000
- Timeout: 60 seconds

## 📊 Gas Reporter Configuration

When `REPORT_GAS=true`, the gas reporter will:
- Show gas usage for each contract method
- Calculate costs in USD (using AVAX price)
- Generate detailed reports during testing

## 🔐 Security Best Practices

1. **Never commit private keys** to version control
2. **Use different private keys** for different networks and purposes
3. **Store production keys** in secure key management systems
4. **Regularly rotate keys** and monitor for leaks
5. **Use hardware wallets** for mainnet deployments
6. **Verify contracts** on block explorers after deployment

## 🧪 Testing Strategy

1. **Unit Tests**: Test individual contract functions
2. **Integration Tests**: Test contract interactions
3. **Gas Optimization**: Monitor gas usage with gas reporter
4. **Coverage**: Ensure comprehensive test coverage
5. **Cross-chain Tests**: Test cross-chain functionality

## 🚨 Troubleshooting

### Common Issues

1. **RPC Timeout**: Increase timeout in network configuration
2. **Gas Estimation Errors**: Set manual gas limits
3. **Verification Failures**: Check API keys and contract addresses
4. **Deployment Failures**: Verify network connection and account balance

### Useful Commands

```bash
# Clean artifacts and cache
pnpm run clean

# Check TypeScript types
pnpm run type-check

# Get network information
npx hardhat run scripts/network-info.ts --network doma
```

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Avalanche Documentation](https://docs.avax.network/)
- [Doma Network Documentation](https://docs.doma.network/) (update with actual URL)
