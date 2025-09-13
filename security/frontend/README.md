# Frontend Security Testing Framework

## Overview

The Frontend Security Testing Framework provides comprehensive security testing capabilities for web applications, specifically designed for DeFi protocols and applications handling cryptocurrency transactions. This framework tests for common web vulnerabilities including XSS, CSRF, clickjacking, and wallet-specific security issues.

## Features

### 🔒 Security Test Categories

1. **Cross-Site Scripting (XSS) Protection**
   - Reflected XSS detection
   - Stored XSS testing
   - DOM-based XSS validation
   - Output encoding verification
   - Script injection attempts

2. **Cross-Site Request Forgery (CSRF) Protection**
   - CSRF token validation
   - SameSite cookie attributes
   - Origin/Referer header validation
   - State-changing operation protection

3. **Clickjacking Protection**
   - X-Frame-Options header validation
   - CSP frame-ancestors directive
   - Actual iframe embedding tests

4. **Wallet Security**
   - Private key exposure detection
   - Wallet connection flow validation
   - localStorage/sessionStorage security
   - Wallet provider integration security

5. **Transaction Security**
   - Transaction parameter validation
   - Negative amount prevention
   - Large amount handling
   - Transaction confirmation flows

6. **Input Validation**
   - Malicious input detection
   - Template injection prevention
   - Path traversal protection
   - Command injection prevention

7. **Session Security**
   - Secure cookie flags
   - HttpOnly cookie validation
   - SameSite attribute checks
   - Session timeout validation

8. **Content Security Policy (CSP)**
   - CSP header presence
   - Required directive validation
   - Unsafe directive detection
   - CSP bypass attempts

9. **HTTPS Security**
   - HTTPS enforcement
   - Security header validation
   - HSTS implementation
   - Certificate validation

10. **Client-Side Storage Security**
    - localStorage sensitive data
    - sessionStorage validation
    - Cookie security attributes
    - Data exposure prevention

11. **Authentication Security**
    - Password field security
    - Autocomplete attributes
    - HTTPS for auth forms
    - Wallet-based authentication

12. **Data Exposure Prevention**
    - Sensitive data in source code
    - Environment variable exposure
    - API key detection
    - Private key scanning

## Installation

```bash
# Install dependencies
npm install puppeteer selenium-webdriver chrome-driver
npm install --save-dev @types/puppeteer @types/selenium-webdriver

# For additional security tools
npm install owasp-zap burp-suite sqlmap
```

## Configuration

### Basic Configuration

```typescript
import { FrontendSecurityConfig } from './config';

const config: Partial<FrontendSecurityConfig> = {
  baseUrl: 'https://your-app.com',
  headless: true,
  timeout: 30000,
  generateReports: true,
  reportFormats: ['json', 'html']
};
```

### Advanced Configuration

```typescript
const advancedConfig: FrontendSecurityConfig = {
  baseUrl: 'https://your-app.com',
  testUrls: [
    '/',
    '/circles',
    '/auctions',
    '/portfolio'
  ],
  
  // Enable/disable specific test categories
  enableXSSTests: true,
  enableCSRFTests: true,
  enableWalletTests: true,
  
  // Custom XSS payloads
  xssPayloads: [
    '<script>alert("custom")</script>',
    '<img src=x onerror=alert("custom")>'
  ],
  
  // Security thresholds
  thresholds: {
    maxCritical: 0,
    maxHigh: 0,
    maxMedium: 3,
    maxLow: 10
  }
};
```

## Usage

### Command Line Interface

```bash
# Run all security tests
npm run frontend:security

# Test specific URL
npm run frontend:security -- --url https://your-app.com

# Run in visible browser mode
npm run frontend:security -- --no-headless

# Custom timeout
npm run frontend:security -- --timeout 60000

# Skip report generation
npm run frontend:security -- --no-report
```

### Programmatic Usage

```typescript
import FrontendSecurityTester from './frontend-security';

const tester = new FrontendSecurityTester('https://your-app.com');

// Run all tests
const results = await tester.runAllTests();

// Check for critical issues
const criticalIssues = results.filter(r => 
  r.status === 'FAIL' && r.severity === 'CRITICAL'
);

if (criticalIssues.length > 0) {
  console.error('Critical security issues found!');
  process.exit(1);
}
```

### Jest Integration

```typescript
import FrontendSecurityTester from '../frontend-security';

describe('Security Tests', () => {
  let tester: FrontendSecurityTester;

  beforeAll(async () => {
    tester = new FrontendSecurityTester('http://localhost:3000');
  });

  test('should prevent XSS attacks', async () => {
    const results = await tester.runAllTests();
    const xssIssues = results.filter(r => 
      r.testName.includes('XSS') && r.status === 'FAIL'
    );
    expect(xssIssues.length).toBe(0);
  });
});
```

## Test Results

### Result Structure

```typescript
interface FrontendSecurityResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
  timestamp: string;
  evidence?: string;
}
```

### Report Formats

#### JSON Report
```json
{
  "summary": {
    "totalTests": 45,
    "passed": 38,
    "failed": 5,
    "warnings": 2,
    "critical": 1,
    "high": 2,
    "medium": 3,
    "low": 1
  },
  "results": [...],
  "generatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### HTML Report
Generated as a comprehensive HTML dashboard with:
- Executive summary
- Severity breakdown
- Detailed test results
- Recommendations
- Evidence and screenshots

## CI/CD Integration

### GitHub Actions

```yaml
name: Frontend Security Tests

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Start application
        run: npm run dev &
        
      - name: Wait for application
        run: npx wait-on http://localhost:3000
        
      - name: Run security tests
        run: npm run frontend:security
        
      - name: Upload security report
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: security/reports/
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    stages {
        stage('Frontend Security Tests') {
            steps {
                sh 'npm install'
                sh 'npm run dev &'
                sh 'sleep 30' // Wait for app to start
                sh 'npm run frontend:security'
            }
            
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'security/reports',
                        reportFiles: 'frontend-security-report.html',
                        reportName: 'Frontend Security Report'
                    ])
                }
            }
        }
    }
}
```

## Security Best Practices

### XSS Prevention
```typescript
// ❌ Vulnerable
element.innerHTML = userInput;

// ✅ Secure
element.textContent = userInput;
// or
element.innerHTML = DOMPurify.sanitize(userInput);
```

### CSRF Protection
```typescript
// Add CSRF token to forms
<form>
  <input type="hidden" name="_token" value="${csrfToken}" />
  <!-- form fields -->
</form>

// Validate Origin header
if (request.headers.origin !== allowedOrigin) {
  return res.status(403).json({ error: 'Invalid origin' });
}
```

### Wallet Security
```typescript
// ❌ Never store private keys
localStorage.setItem('privateKey', key); // DON'T DO THIS

// ✅ Use secure wallet providers
const accounts = await window.ethereum.request({
  method: 'eth_requestAccounts'
});
```

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               connect-src 'self' wss: https:;">
```

## Troubleshooting

### Common Issues

1. **Browser Launch Failed**
   ```bash
   # Install missing dependencies
   sudo apt-get install -y chromium-browser
   
   # Or use custom Chromium path
   export CHROME_BIN=/usr/bin/chromium-browser
   ```

2. **Test Timeouts**
   ```typescript
   // Increase timeout for slow applications
   const config = {
     timeout: 60000, // 60 seconds
     headless: true
   };
   ```

3. **Network Issues**
   ```bash
   # Check if application is running
   curl http://localhost:3000
   
   # Use correct URL
   npm run frontend:security -- --url http://localhost:3000
   ```

### Debug Mode

```bash
# Run with debug output
DEBUG=security:* npm run frontend:security

# Run in visible browser
npm run frontend:security -- --no-headless

# Save screenshots
npm run frontend:security -- --screenshots
```

## Contributing

### Adding New Tests

1. **Create Test Method**
   ```typescript
   private async testCustomSecurity(): Promise<void> {
     console.log('🔍 Testing custom security...');
     
     const page = await this.browser.newPage();
     
     try {
       await page.goto(this.baseUrl);
       
       // Your test logic here
       
       this.addResult({
         testName: 'Custom Security Test',
         status: 'PASS',
         details: 'Custom security validation passed',
         severity: 'MEDIUM',
         recommendation: 'Continue monitoring',
         timestamp: new Date().toISOString()
       });
       
     } finally {
       await page.close();
     }
   }
   ```

2. **Add to Test Suite**
   ```typescript
   async runAllTests(): Promise<FrontendSecurityResult[]> {
     // ... existing tests
     await this.testCustomSecurity();
     // ...
   }
   ```

3. **Update Configuration**
   ```typescript
   export interface FrontendSecurityConfig {
     // ... existing config
     enableCustomTests: boolean;
   }
   ```

### Reporting Issues

When reporting security test issues:

1. Include test configuration
2. Provide application URL (if public)
3. Include browser version and OS
4. Attach generated reports
5. Describe expected vs actual behavior

## License

This security testing framework is part of the Bastion Protocol security infrastructure.

## Contact

For security-related questions or to report vulnerabilities:
- Security Team: security@bastionprotocol.com
- Documentation: https://docs.bastionprotocol.com/security
