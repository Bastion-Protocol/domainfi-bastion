# Bastion Protocol Architecture

## Overview
Bastion Protocol is a cross-chain DeFi protocol built on Doma and Avalanche networks.

## Architecture Components

### Applications
- **Web App**: Next.js frontend for user interaction
- **Relayer**: Node.js service for cross-chain operations
- **Valuation API**: Express.js service for asset pricing

### Packages
- **contracts-doma**: Smart contracts for Doma network
- **contracts-avalanche**: Smart contracts for Avalanche network
- **ui**: Shared React components
- **types**: Shared TypeScript type definitions

## Development Setup
1. Install dependencies: `pnpm install`
2. Build all packages: `pnpm run build`
3. Start development: `pnpm run dev`

## Deployment
TBD - Deployment instructions will be added here.
