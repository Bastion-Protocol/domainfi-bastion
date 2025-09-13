# Security Best Practices Guide

## Overview

This guide provides comprehensive security best practices for developing, deploying, and maintaining secure DeFi applications on the Bastion Protocol. It covers smart contract security, infrastructure hardening, frontend security, and operational security procedures.

## 1. Smart Contract Security

### Development Best Practices

#### Access Control
```solidity
// ✅ Use OpenZeppelin's AccessControl
import "@openzeppelin/contracts/access/AccessControl.sol";

contract BastionProtocol is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Requires admin role");
        _;
    }
    
    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, msg.sender), "Requires operator role");
        _;
    }
}

// ❌ Avoid simple owner patterns
contract VulnerableContract {
    address public owner;
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
}
```

#### Reentrancy Protection
```solidity
// ✅ Use ReentrancyGuard
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecureLending is ReentrancyGuard {
    function withdraw(uint256 amount) external nonReentrant {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        
        // External call after state change
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}

// ❌ Vulnerable to reentrancy
contract VulnerableLending {
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // External call before state change - DANGEROUS!
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] -= amount;
    }
}
```

#### Integer Overflow Protection
```solidity
// ✅ Use SafeMath or Solidity 0.8+
pragma solidity ^0.8.0; // Built-in overflow protection

contract SecureCalculations {
    function safeAdd(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b; // Safe in 0.8+
    }
    
    function safeMultiply(uint256 a, uint256 b) public pure returns (uint256) {
        return a * b; // Safe in 0.8+
    }
}

// For older Solidity versions
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract LegacySafeCalculations {
    using SafeMath for uint256;
    
    function safeAdd(uint256 a, uint256 b) public pure returns (uint256) {
        return a.add(b);
    }
}
```

#### Oracle Security
```solidity
// ✅ Use multiple oracles with validation
contract SecureOracle {
    uint256 public constant MAX_PRICE_DEVIATION = 5; // 5%
    uint256 public constant MIN_ORACLES = 3;
    
    struct OracleData {
        address oracle;
        uint256 price;
        uint256 timestamp;
        bool isActive;
    }
    
    mapping(address => OracleData) public oracles;
    address[] public oracleList;
    
    function getPrice() external view returns (uint256) {
        require(oracleList.length >= MIN_ORACLES, "Insufficient oracles");
        
        uint256[] memory prices = new uint256[](oracleList.length);
        uint256 validPrices = 0;
        
        // Collect prices from active oracles
        for (uint256 i = 0; i < oracleList.length; i++) {
            OracleData memory oracle = oracles[oracleList[i]];
            if (oracle.isActive && block.timestamp - oracle.timestamp <= 300) {
                prices[validPrices] = oracle.price;
                validPrices++;
            }
        }
        
        require(validPrices >= MIN_ORACLES, "Insufficient valid prices");
        
        // Calculate median price
        uint256 medianPrice = calculateMedian(prices, validPrices);
        
        // Validate price deviation
        validatePriceDeviation(prices, validPrices, medianPrice);
        
        return medianPrice;
    }
    
    function validatePriceDeviation(
        uint256[] memory prices,
        uint256 count,
        uint256 median
    ) internal pure {
        for (uint256 i = 0; i < count; i++) {
            uint256 deviation = prices[i] > median 
                ? ((prices[i] - median) * 100) / median
                : ((median - prices[i]) * 100) / median;
                
            require(deviation <= MAX_PRICE_DEVIATION, "Price deviation too high");
        }
    }
}
```

#### Emergency Controls
```solidity
// ✅ Implement circuit breakers and emergency stops
import "@openzeppelin/contracts/security/Pausable.sol";

contract EmergencyControls is Pausable, AccessControl {
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    uint256 public emergencyThreshold = 1000000 * 10**18; // 1M tokens
    uint256 public dailyWithdrawalLimit = 100000 * 10**18; // 100K tokens
    mapping(address => uint256) public dailyWithdrawals;
    mapping(address => uint256) public lastWithdrawalDay;
    
    modifier circuitBreaker(uint256 amount) {
        require(amount <= emergencyThreshold, "Amount exceeds emergency threshold");
        _;
    }
    
    modifier dailyLimit(uint256 amount) {
        uint256 today = block.timestamp / 1 days;
        if (lastWithdrawalDay[msg.sender] != today) {
            dailyWithdrawals[msg.sender] = 0;
            lastWithdrawalDay[msg.sender] = today;
        }
        
        require(
            dailyWithdrawals[msg.sender] + amount <= dailyWithdrawalLimit,
            "Daily withdrawal limit exceeded"
        );
        
        dailyWithdrawals[msg.sender] += amount;
        _;
    }
    
    function emergencyPause() external {
        require(hasRole(EMERGENCY_ROLE, msg.sender), "Emergency role required");
        _pause();
    }
    
    function emergencyUnpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
```

### Testing Best Practices

#### Comprehensive Test Coverage
```typescript
// ✅ Test all edge cases and attack vectors
describe("Lending Pool Security Tests", () => {
  it("should prevent reentrancy attacks", async () => {
    const attacker = await ReentrancyAttacker.deploy(lendingPool.address);
    
    await expect(
      attacker.attack({ value: ethers.utils.parseEther("1") })
    ).to.be.revertedWith("ReentrancyGuard: reentrant call");
  });
  
  it("should handle integer overflow", async () => {
    const maxUint = ethers.constants.MaxUint256;
    
    await expect(
      lendingPool.deposit(maxUint)
    ).to.be.revertedWith("SafeMath: addition overflow");
  });
  
  it("should enforce access controls", async () => {
    await expect(
      lendingPool.connect(attacker).setInterestRate(1000)
    ).to.be.revertedWith("AccessControl: account is missing role");
  });
});
```

#### Fuzzing Tests
```typescript
// ✅ Use property-based testing
import { FuzzedTestEnvironment } from "@eth-optimism/smock";

describe("Fuzz Tests", () => {
  it("should maintain invariants under random inputs", async () => {
    const fuzzedPool = await FuzzedTestEnvironment.create(LendingPool);
    
    // Property: Total deposits should always equal sum of user balances
    await fuzzedPool.fuzz("deposit", {
      amount: { type: "uint256", max: "1000000" },
      user: { type: "address" }
    });
    
    const totalDeposits = await fuzzedPool.totalDeposits();
    const sumOfBalances = await fuzzedPool.getSumOfBalances();
    
    expect(totalDeposits).to.equal(sumOfBalances);
  });
});
```

## 2. Infrastructure Security

### Server Hardening

#### Operating System Security
```bash
# ✅ System hardening checklist
#!/bin/bash

# Update system packages
apt update && apt upgrade -y

# Disable root login
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Enable firewall
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Install fail2ban
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban

# Configure automatic security updates
apt install unattended-upgrades -y
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades

# Set up log monitoring
apt install auditd -y
systemctl enable auditd

# Disable unnecessary services
systemctl disable bluetooth
systemctl disable cups
systemctl disable avahi-daemon

# Set file permissions
chmod 600 /etc/ssh/sshd_config
chmod 644 /etc/passwd
chmod 600 /etc/shadow
```

#### Container Security
```dockerfile
# ✅ Secure Dockerfile practices
FROM node:18-alpine AS builder

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --chown=nextjs:nodejs . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

# Install security updates
RUN apk add --no-cache \
    && apk upgrade \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

#### Kubernetes Security
```yaml
# ✅ Secure Pod Security Standards
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
  labels:
    app: bastion-protocol
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    runAsGroup: 1001
    fsGroup: 1001
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: bastion-protocol:latest
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
    resources:
      limits:
        memory: "512Mi"
        cpu: "500m"
      requests:
        memory: "256Mi"
        cpu: "250m"
    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: cache
      mountPath: /app/.cache
  volumes:
  - name: tmp
    emptyDir: {}
  - name: cache
    emptyDir: {}

---
# Network Policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: bastion-protocol-netpol
spec:
  podSelector:
    matchLabels:
      app: bastion-protocol
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx-ingress
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
  - to: []
    ports:
    - protocol: TCP
      port: 443 # HTTPS
    - protocol: TCP
      port: 53  # DNS
    - protocol: UDP
      port: 53  # DNS
```

### Database Security

#### PostgreSQL Hardening
```sql
-- ✅ Database security configuration
-- Create application-specific user
CREATE USER bastion_app WITH PASSWORD 'complex_password_here';

-- Grant minimal required permissions
GRANT CONNECT ON DATABASE bastion_db TO bastion_app;
GRANT USAGE ON SCHEMA public TO bastion_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bastion_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bastion_app;

-- Enable row-level security
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY user_accounts_policy ON user_accounts
    FOR ALL TO bastion_app
    USING (owner_id = current_user_id());

-- Enable audit logging
CREATE EXTENSION IF NOT EXISTS pg_audit;
ALTER SYSTEM SET pg_audit.log = 'all';
ALTER SYSTEM SET pg_audit.log_catalog = 'off';
ALTER SYSTEM SET pg_audit.log_parameter = 'on';

-- Configure connection limits
ALTER ROLE bastion_app CONNECTION LIMIT 50;

-- Enable SSL
ALTER SYSTEM SET ssl = 'on';
ALTER SYSTEM SET ssl_cert_file = '/etc/ssl/certs/server.crt';
ALTER SYSTEM SET ssl_key_file = '/etc/ssl/private/server.key';
```

```bash
# ✅ PostgreSQL configuration
# /etc/postgresql/14/main/postgresql.conf

# Connection settings
listen_addresses = 'localhost'
port = 5432
max_connections = 100
superuser_reserved_connections = 3

# SSL settings
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'all'
log_connections = on
log_disconnections = on
log_lock_waits = on
log_min_duration_statement = 1000

# Security
shared_preload_libraries = 'pg_audit'
```

### API Security

#### Rate Limiting
```typescript
// ✅ Implement comprehensive rate limiting
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// General API rate limiting
const generalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for sensitive endpoints
const strictLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each IP to 100 requests per hour
  message: {
    error: 'Rate limit exceeded for sensitive operations',
    retryAfter: '1 hour'
  }
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/', strictLimiter);
app.use('/api/admin/', strictLimiter);
```

#### Input Validation
```typescript
// ✅ Comprehensive input validation
import { body, param, query, validationResult } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';

// Validation middleware
const validateInput = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Sanitization middleware
const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize string inputs
  for (const key in req.body) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = DOMPurify.sanitize(req.body[key]);
    }
  }
  next();
};

// Route with validation
app.post('/api/users',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email format'),
    body('password')
      .isLength({ min: 12 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be at least 12 characters with mixed case, numbers, and symbols'),
    body('username')
      .isAlphanumeric()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be 3-20 alphanumeric characters'),
  ],
  validateInput,
  sanitizeInput,
  async (req: Request, res: Response) => {
    // Handler logic
  }
);
```

#### Authentication & Authorization
```typescript
// ✅ Secure JWT implementation
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET!;
  private static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
  private static readonly SALT_ROUNDS = 12;
  
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }
  
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  static generateTokens(userId: string, email: string) {
    const tokenId = crypto.randomUUID();
    
    const accessToken = jwt.sign(
      { 
        userId, 
        email, 
        tokenId,
        type: 'access' 
      },
      this.JWT_SECRET,
      { 
        expiresIn: '15m',
        issuer: 'bastion-protocol',
        audience: 'bastion-api'
      }
    );
    
    const refreshToken = jwt.sign(
      { 
        userId, 
        tokenId,
        type: 'refresh' 
      },
      this.JWT_REFRESH_SECRET,
      { 
        expiresIn: '7d',
        issuer: 'bastion-protocol',
        audience: 'bastion-api'
      }
    );
    
    return { accessToken, refreshToken, tokenId };
  }
  
  static verifyToken(token: string, type: 'access' | 'refresh'): any {
    const secret = type === 'access' ? this.JWT_SECRET : this.JWT_REFRESH_SECRET;
    
    return jwt.verify(token, secret, {
      issuer: 'bastion-protocol',
      audience: 'bastion-api'
    });
  }
}

// Authentication middleware
const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const decoded = AuthService.verifyToken(token, 'access');
    
    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${decoded.tokenId}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
```

## 3. Frontend Security

### XSS Prevention
```typescript
// ✅ Prevent XSS attacks
import DOMPurify from 'dompurify';

// Sanitize user input before rendering
const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false
  });
};

// Safe rendering component
const SafeHTML: React.FC<{ content: string }> = ({ content }) => {
  const sanitizedContent = sanitizeHTML(content);
  
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};

// Input validation hook
const useSecureInput = (initialValue: string = '') => {
  const [value, setValue] = useState(initialValue);
  
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    
    // Basic XSS prevention
    const sanitized = inputValue
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
    
    setValue(sanitized);
  };
  
  return [value, handleChange] as const;
};
```

### Content Security Policy
```typescript
// ✅ Implement strict CSP
import { NextResponse } from 'next/server';

export function middleware(request: Request) {
  const response = NextResponse.next();
  
  // Strict Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.bastion.finance wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Additional security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
}
```

### Wallet Security
```typescript
// ✅ Secure wallet integration
import { ethers } from 'ethers';

class WalletSecurity {
  private static readonly ALLOWED_CHAINS = [1, 5, 137, 80001]; // Mainnet, Goerli, Polygon, Mumbai
  
  static async validateWalletConnection(provider: any): Promise<boolean> {
    try {
      // Verify provider is available
      if (!provider || !provider.request) {
        throw new Error('No wallet provider available');
      }
      
      // Check network
      const chainId = await provider.request({ method: 'eth_chainId' });
      const numericChainId = parseInt(chainId, 16);
      
      if (!this.ALLOWED_CHAINS.includes(numericChainId)) {
        throw new Error(`Unsupported network: ${numericChainId}`);
      }
      
      // Verify accounts
      const accounts = await provider.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts available');
      }
      
      // Validate account format
      for (const account of accounts) {
        if (!ethers.utils.isAddress(account)) {
          throw new Error(`Invalid account address: ${account}`);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Wallet validation failed:', error);
      return false;
    }
  }
  
  static async secureSignTransaction(
    provider: any,
    transaction: any
  ): Promise<string> {
    // Validate transaction parameters
    this.validateTransactionParams(transaction);
    
    // Add security checks
    const secureTransaction = {
      ...transaction,
      gasLimit: ethers.utils.hexlify(500000), // Set reasonable gas limit
      type: 2 // Use EIP-1559 transactions
    };
    
    // Request signature with user confirmation
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [secureTransaction]
    });
    
    return txHash;
  }
  
  private static validateTransactionParams(transaction: any): void {
    // Validate recipient address
    if (!ethers.utils.isAddress(transaction.to)) {
      throw new Error('Invalid recipient address');
    }
    
    // Validate value
    if (transaction.value) {
      const value = ethers.BigNumber.from(transaction.value);
      if (value.lt(0)) {
        throw new Error('Invalid transaction value');
      }
    }
    
    // Validate gas parameters
    if (transaction.gasPrice) {
      const gasPrice = ethers.BigNumber.from(transaction.gasPrice);
      const maxGasPrice = ethers.utils.parseUnits('100', 'gwei');
      if (gasPrice.gt(maxGasPrice)) {
        throw new Error('Gas price too high');
      }
    }
  }
}

// React hook for secure wallet operations
const useSecureWallet = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const connectWallet = useCallback(async () => {
    try {
      setError(null);
      
      if (!window.ethereum) {
        throw new Error('No wallet provider found');
      }
      
      // Validate wallet connection
      const isValid = await WalletSecurity.validateWalletConnection(window.ethereum);
      if (!isValid) {
        throw new Error('Wallet validation failed');
      }
      
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      setAccount(accounts[0]);
      setIsConnected(true);
      
    } catch (err: any) {
      setError(err.message);
      setIsConnected(false);
    }
  }, []);
  
  const signTransaction = useCallback(async (transaction: any) => {
    if (!isConnected || !window.ethereum) {
      throw new Error('Wallet not connected');
    }
    
    return WalletSecurity.secureSignTransaction(window.ethereum, transaction);
  }, [isConnected]);
  
  return {
    isConnected,
    account,
    error,
    connectWallet,
    signTransaction
  };
};
```

## 4. Operational Security

### Secrets Management
```bash
# ✅ Use proper secrets management
#!/bin/bash

# HashiCorp Vault integration
export VAULT_ADDR="https://vault.company.com:8200"
export VAULT_TOKEN="$(vault auth -method=aws)"

# Retrieve secrets from Vault
DB_PASSWORD=$(vault kv get -field=password secret/database)
API_KEY=$(vault kv get -field=api_key secret/external_service)
JWT_SECRET=$(vault kv get -field=secret secret/jwt)

# Use secrets in application
export DATABASE_URL="postgresql://user:${DB_PASSWORD}@localhost/db"
export EXTERNAL_API_KEY="${API_KEY}"
export JWT_SECRET="${JWT_SECRET}"
```

```typescript
// ✅ Runtime secrets validation
class SecretsValidator {
  static validateEnvironment(): void {
    const requiredSecrets = [
      'DATABASE_URL',
      'JWT_SECRET',
      'REDIS_URL',
      'ENCRYPTION_KEY'
    ];
    
    const missing = requiredSecrets.filter(secret => !process.env[secret]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Validate secret complexity
    this.validateSecretComplexity('JWT_SECRET', process.env.JWT_SECRET!);
    this.validateSecretComplexity('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY!);
  }
  
  private static validateSecretComplexity(name: string, value: string): void {
    if (value.length < 32) {
      throw new Error(`${name} must be at least 32 characters long`);
    }
    
    if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value)) {
      throw new Error(`${name} must contain uppercase, lowercase, and numeric characters`);
    }
  }
}

// Initialize at application startup
SecretsValidator.validateEnvironment();
```

### Monitoring and Alerting
```typescript
// ✅ Security monitoring system
import { createLogger, transports, format } from 'winston';

const securityLogger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'bastion-security' },
  transports: [
    new transports.File({ filename: 'security-error.log', level: 'error' }),
    new transports.File({ filename: 'security-combined.log' }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

class SecurityMonitor {
  static logSecurityEvent(event: {
    type: 'authentication' | 'authorization' | 'suspicious_activity' | 'error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    details: string;
    metadata?: any;
  }): void {
    securityLogger.info('Security Event', {
      ...event,
      timestamp: new Date().toISOString()
    });
    
    // Send alert for high/critical events
    if (event.severity === 'high' || event.severity === 'critical') {
      this.sendAlert(event);
    }
  }
  
  private static async sendAlert(event: any): Promise<void> {
    // Send to PagerDuty, Slack, etc.
    try {
      await fetch(process.env.ALERT_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Security Alert: ${event.type}`,
          attachments: [{
            color: 'danger',
            fields: [
              { title: 'Severity', value: event.severity, short: true },
              { title: 'Details', value: event.details, short: false },
              { title: 'User ID', value: event.userId || 'N/A', short: true },
              { title: 'IP Address', value: event.ipAddress || 'N/A', short: true }
            ]
          }]
        })
      });
    } catch (error) {
      securityLogger.error('Failed to send security alert', { error, event });
    }
  }
}

// Middleware to monitor requests
const securityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log request
  SecurityMonitor.logSecurityEvent({
    type: 'authentication',
    severity: 'low',
    details: `API request: ${req.method} ${req.path}`,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    metadata: {
      method: req.method,
      path: req.path,
      query: req.query
    }
  });
  
  // Monitor response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Alert on suspicious patterns
    if (res.statusCode === 401 || res.statusCode === 403) {
      SecurityMonitor.logSecurityEvent({
        type: 'authorization',
        severity: 'medium',
        details: `Unauthorized access attempt: ${req.method} ${req.path}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    if (duration > 10000) { // > 10 seconds
      SecurityMonitor.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        details: `Slow request detected: ${duration}ms`,
        ipAddress: req.ip,
        metadata: { duration, path: req.path }
      });
    }
  });
  
  next();
};
```

### Backup and Recovery
```bash
# ✅ Secure backup procedures
#!/bin/bash

BACKUP_DIR="/secure/backups"
ENCRYPTION_KEY="/etc/backup/encryption.key"
S3_BUCKET="bastion-protocol-backups"

# Database backup with encryption
backup_database() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${BACKUP_DIR}/db_backup_${timestamp}.sql.gpg"
    
    # Create encrypted backup
    pg_dump bastion_db | gpg --symmetric --cipher-algo AES256 --output "${backup_file}"
    
    # Upload to S3 with encryption
    aws s3 cp "${backup_file}" "s3://${S3_BUCKET}/database/" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256
    
    # Verify backup integrity
    aws s3api head-object --bucket "${S3_BUCKET}" --key "database/$(basename ${backup_file})"
    
    echo "Database backup completed: ${backup_file}"
}

# Smart contract backup
backup_contracts() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local contracts_dir="/app/contracts"
    local backup_file="${BACKUP_DIR}/contracts_${timestamp}.tar.gz.gpg"
    
    # Create encrypted archive
    tar -czf - "${contracts_dir}" | gpg --symmetric --cipher-algo AES256 --output "${backup_file}"
    
    # Upload to S3
    aws s3 cp "${backup_file}" "s3://${S3_BUCKET}/contracts/" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256
    
    echo "Contracts backup completed: ${backup_file}"
}

# Automated backup schedule
backup_database
backup_contracts

# Clean up old local backups (keep 7 days)
find "${BACKUP_DIR}" -name "*.gpg" -mtime +7 -delete
```

## 5. Compliance and Governance

### Security Policies
```markdown
# Security Policy Template

## Access Control Policy

### Principle of Least Privilege
- Users granted minimum access necessary for job function
- Regular access reviews conducted quarterly
- Temporary access automatically expires after 24 hours

### Multi-Factor Authentication
- Required for all admin accounts
- Required for production system access
- TOTP preferred over SMS

### Password Policy
- Minimum 12 characters
- Mixed case, numbers, and symbols required
- No password reuse for last 12 passwords
- Password rotation every 90 days for privileged accounts

## Data Protection Policy

### Encryption Requirements
- All data encrypted at rest using AES-256
- All data encrypted in transit using TLS 1.3
- Encryption keys managed through HSM

### Data Classification
- Public: Marketing materials, public documentation
- Internal: Business operations, non-sensitive user data
- Confidential: Financial data, personal information
- Restricted: Private keys, authentication secrets

### Data Retention
- User data retained as required by law
- Audit logs retained for 7 years
- Backup data retained for 5 years
- Development data purged after 30 days
```

### Audit Procedures
```typescript
// ✅ Automated compliance checking
class ComplianceAuditor {
  static async runSecurityAudit(): Promise<AuditReport> {
    const report: AuditReport = {
      timestamp: new Date().toISOString(),
      checks: [],
      score: 0,
      passed: 0,
      failed: 0
    };
    
    // Check 1: SSL/TLS Configuration
    const sslCheck = await this.checkSSLConfiguration();
    report.checks.push(sslCheck);
    
    // Check 2: Database Security
    const dbCheck = await this.checkDatabaseSecurity();
    report.checks.push(dbCheck);
    
    // Check 3: API Security
    const apiCheck = await this.checkAPISecurityHeaders();
    report.checks.push(apiCheck);
    
    // Check 4: Smart Contract Security
    const contractCheck = await this.checkSmartContractSecurity();
    report.checks.push(contractCheck);
    
    // Calculate score
    report.passed = report.checks.filter(c => c.passed).length;
    report.failed = report.checks.filter(c => !c.passed).length;
    report.score = (report.passed / report.checks.length) * 100;
    
    return report;
  }
  
  private static async checkSSLConfiguration(): Promise<AuditCheck> {
    try {
      const response = await fetch('https://api.bastion.finance', {
        method: 'HEAD'
      });
      
      const hasHSTS = response.headers.get('strict-transport-security');
      const tlsVersion = response.headers.get('tls-version');
      
      return {
        name: 'SSL/TLS Configuration',
        passed: !!hasHSTS && tlsVersion === '1.3',
        details: `HSTS: ${hasHSTS ? 'Enabled' : 'Disabled'}, TLS: ${tlsVersion || 'Unknown'}`,
        severity: 'high'
      };
    } catch (error) {
      return {
        name: 'SSL/TLS Configuration',
        passed: false,
        details: `Error checking SSL: ${error}`,
        severity: 'critical'
      };
    }
  }
}

interface AuditReport {
  timestamp: string;
  checks: AuditCheck[];
  score: number;
  passed: number;
  failed: number;
}

interface AuditCheck {
  name: string;
  passed: boolean;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}
```

---

This comprehensive security best practices guide provides the foundation for maintaining a secure DeFi protocol. Regular review and updates of these practices are essential as the threat landscape evolves.

**Document Version**: 1.0  
**Last Updated**: 2024-01-15  
**Next Review**: 2024-04-15  
**Owner**: Security Team  
**Approved By**: CISO
