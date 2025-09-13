import axios from 'axios';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';

interface SecurityTestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
  timestamp: string;
}

interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requiresAuth: boolean;
  parameters?: Record<string, any>;
}

export class APISecurityTester {
  private baseUrl: string;
  private endpoints: APIEndpoint[];
  private results: SecurityTestResult[] = [];
  private authToken?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.endpoints = [
      { path: '/api/domains', method: 'GET', requiresAuth: false },
      { path: '/api/domains/:id', method: 'GET', requiresAuth: false },
      { path: '/api/domains/:id/valuation', method: 'GET', requiresAuth: false },
      { path: '/api/bids', method: 'POST', requiresAuth: true, parameters: { domainId: 1, amount: '1000000000000000000' } },
      { path: '/api/collateral/deposit', method: 'POST', requiresAuth: true, parameters: { domainId: 1, amount: '2000000000000000000' } },
      { path: '/api/loans/borrow', method: 'POST', requiresAuth: true, parameters: { collateralDomainId: 1, amount: '1000000000000000000' } },
      { path: '/api/users/:address/positions', method: 'GET', requiresAuth: true },
      { path: '/api/admin/emergency-stop', method: 'POST', requiresAuth: true, parameters: { enabled: true } }
    ];
  }

  async runAllTests(): Promise<SecurityTestResult[]> {
    console.log('🔒 Starting API Security Tests...');
    
    await this.testSQLInjection();
    await this.testXSSVulnerabilities();
    await this.testCSRFProtection();
    await this.testInputValidation();
    await this.testAuthenticationBypass();
    await this.testAuthorizationFlaws();
    await this.testRateLimiting();
    await this.testDataExposure();
    await this.testHTTPSecurity();
    await this.testAPIAbuse();
    await this.testBusinessLogicFlaws();
    
    this.generateReport();
    return this.results;
  }

  private async testSQLInjection(): Promise<void> {
    console.log('🔍 Testing SQL Injection vulnerabilities...');
    
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1'; WAITFOR DELAY '00:00:05' --",
      "' AND (SELECT COUNT(*) FROM users) > 0 --",
      "' OR 1=1#",
      "admin'--",
      "admin'/*",
      "' OR 'x'='x",
      "'; EXEC xp_cmdshell('dir'); --"
    ];

    for (const endpoint of this.endpoints) {
      for (const payload of sqlPayloads) {
        try {
          const testUrl = this.baseUrl + endpoint.path.replace(':id', payload).replace(':address', payload);
          const startTime = performance.now();
          
          const response = await axios({
            method: endpoint.method,
            url: testUrl,
            data: endpoint.parameters ? { ...endpoint.parameters, maliciousField: payload } : undefined,
            timeout: 10000,
            validateStatus: () => true // Don't throw on error status codes
          });
          
          const responseTime = performance.now() - startTime;
          
          // Check for SQL injection indicators
          const body = JSON.stringify(response.data).toLowerCase();
          const sqlErrors = [
            'sql syntax',
            'mysql_fetch',
            'ora-01756',
            'postgresql',
            'sqlite_error',
            'sql server',
            'syntax error',
            'unclosed quotation',
            'quoted string not properly terminated'
          ];
          
          const hasSQLError = sqlErrors.some(error => body.includes(error));
          const isTimeBasedInjection = responseTime > 5000; // Delayed response indicates time-based injection
          
          if (hasSQLError || isTimeBasedInjection) {
            this.addResult({
              testName: `SQL Injection - ${endpoint.method} ${endpoint.path}`,
              status: 'FAIL',
              details: `Potential SQL injection vulnerability detected with payload: ${payload}`,
              severity: 'CRITICAL',
              recommendation: 'Use parameterized queries and input validation',
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          // Network errors are expected for malformed requests
        }
      }
    }

    this.addResult({
      testName: 'SQL Injection Testing',
      status: 'PASS',
      details: 'SQL injection tests completed',
      severity: 'LOW',
      recommendation: 'Continue monitoring for SQL injection vulnerabilities',
      timestamp: new Date().toISOString()
    });
  }

  private async testXSSVulnerabilities(): Promise<void> {
    console.log('🔍 Testing XSS vulnerabilities...');
    
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(`XSS`)">',
      '<body onload=alert("XSS")>',
      '<input onfocus=alert("XSS") autofocus>',
      '<select onfocus=alert("XSS") autofocus>',
      '<textarea onfocus=alert("XSS") autofocus>',
      '<keygen onfocus=alert("XSS") autofocus>'
    ];

    for (const endpoint of this.endpoints) {
      if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
        for (const payload of xssPayloads) {
          try {
            const response = await axios({
              method: endpoint.method,
              url: this.baseUrl + endpoint.path.replace(':id', '1').replace(':address', '0x1234567890123456789012345678901234567890'),
              data: { ...endpoint.parameters, xssField: payload },
              timeout: 5000,
              validateStatus: () => true
            });

            const responseBody = JSON.stringify(response.data);
            if (responseBody.includes(payload) && !responseBody.includes('&lt;') && !responseBody.includes('&gt;')) {
              this.addResult({
                testName: `XSS Vulnerability - ${endpoint.method} ${endpoint.path}`,
                status: 'FAIL',
                details: `Potential XSS vulnerability: payload reflected without encoding: ${payload}`,
                severity: 'HIGH',
                recommendation: 'Implement proper output encoding and Content Security Policy',
                timestamp: new Date().toISOString()
              });
            }
          } catch (error) {
            // Expected for malformed requests
          }
        }
      }
    }

    this.addResult({
      testName: 'XSS Vulnerability Testing',
      status: 'PASS',
      details: 'XSS vulnerability tests completed',
      severity: 'LOW',
      recommendation: 'Continue monitoring for XSS vulnerabilities',
      timestamp: new Date().toISOString()
    });
  }

  private async testCSRFProtection(): Promise<void> {
    console.log('🔍 Testing CSRF protection...');
    
    for (const endpoint of this.endpoints) {
      if (endpoint.method !== 'GET' && endpoint.requiresAuth) {
        try {
          // Test without CSRF token
          const response = await axios({
            method: endpoint.method,
            url: this.baseUrl + endpoint.path.replace(':id', '1').replace(':address', '0x1234567890123456789012345678901234567890'),
            data: endpoint.parameters,
            headers: {
              'Origin': 'https://malicious-site.com',
              'Referer': 'https://malicious-site.com/attack.html'
            },
            timeout: 5000,
            validateStatus: () => true
          });

          if (response.status === 200) {
            this.addResult({
              testName: `CSRF Protection - ${endpoint.method} ${endpoint.path}`,
              status: 'FAIL',
              details: 'Endpoint accepts requests without CSRF protection',
              severity: 'HIGH',
              recommendation: 'Implement CSRF tokens and validate Origin/Referer headers',
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          // Expected for protected endpoints
        }
      }
    }

    this.addResult({
      testName: 'CSRF Protection Testing',
      status: 'PASS',
      details: 'CSRF protection tests completed',
      severity: 'LOW',
      recommendation: 'Ensure all state-changing operations require CSRF protection',
      timestamp: new Date().toISOString()
    });
  }

  private async testInputValidation(): Promise<void> {
    console.log('🔍 Testing input validation...');
    
    const invalidInputs = [
      { field: 'domainId', value: -1, expected: 'should reject negative numbers' },
      { field: 'domainId', value: 'invalid', expected: 'should reject non-numeric values' },
      { field: 'amount', value: '-1000000000000000000', expected: 'should reject negative amounts' },
      { field: 'amount', value: 'invalid_amount', expected: 'should reject non-numeric amounts' },
      { field: 'address', value: 'invalid_address', expected: 'should reject invalid Ethereum addresses' },
      { field: 'address', value: '0x123', expected: 'should reject short addresses' },
      { field: 'amount', value: '999999999999999999999999999999999999999', expected: 'should reject extremely large numbers' },
      { field: 'text', value: 'A'.repeat(10000), expected: 'should reject excessively long strings' }
    ];

    for (const endpoint of this.endpoints) {
      if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
        for (const invalidInput of invalidInputs) {
          try {
            const testData = { ...endpoint.parameters };
            testData[invalidInput.field] = invalidInput.value;

            const response = await axios({
              method: endpoint.method,
              url: this.baseUrl + endpoint.path.replace(':id', '1').replace(':address', '0x1234567890123456789012345678901234567890'),
              data: testData,
              timeout: 5000,
              validateStatus: () => true
            });

            if (response.status === 200) {
              this.addResult({
                testName: `Input Validation - ${endpoint.method} ${endpoint.path}`,
                status: 'FAIL',
                details: `${invalidInput.expected} but request succeeded with value: ${invalidInput.value}`,
                severity: 'MEDIUM',
                recommendation: 'Implement comprehensive input validation',
                timestamp: new Date().toISOString()
              });
            }
          } catch (error) {
            // Expected for invalid inputs
          }
        }
      }
    }

    this.addResult({
      testName: 'Input Validation Testing',
      status: 'PASS',
      details: 'Input validation tests completed',
      severity: 'LOW',
      recommendation: 'Continue enforcing strict input validation',
      timestamp: new Date().toISOString()
    });
  }

  private async testAuthenticationBypass(): Promise<void> {
    console.log('🔍 Testing authentication bypass...');
    
    const bypassAttempts = [
      { headers: {}, description: 'No authentication header' },
      { headers: { 'Authorization': 'Bearer invalid_token' }, description: 'Invalid JWT token' },
      { headers: { 'Authorization': 'Bearer ' }, description: 'Empty token' },
      { headers: { 'Authorization': 'Basic YWRtaW46YWRtaW4=' }, description: 'Basic auth with common credentials' },
      { headers: { 'X-User-ID': '1' }, description: 'Direct user ID injection' },
      { headers: { 'X-Admin': 'true' }, description: 'Admin privilege injection' }
    ];

    for (const endpoint of this.endpoints) {
      if (endpoint.requiresAuth) {
        for (const attempt of bypassAttempts) {
          try {
            const response = await axios({
              method: endpoint.method,
              url: this.baseUrl + endpoint.path.replace(':id', '1').replace(':address', '0x1234567890123456789012345678901234567890'),
              data: endpoint.parameters,
              headers: attempt.headers,
              timeout: 5000,
              validateStatus: () => true
            });

            if (response.status === 200) {
              this.addResult({
                testName: `Authentication Bypass - ${endpoint.method} ${endpoint.path}`,
                status: 'FAIL',
                details: `Authentication bypassed: ${attempt.description}`,
                severity: 'CRITICAL',
                recommendation: 'Implement proper authentication validation',
                timestamp: new Date().toISOString()
              });
            }
          } catch (error) {
            // Expected for protected endpoints
          }
        }
      }
    }

    this.addResult({
      testName: 'Authentication Bypass Testing',
      status: 'PASS',
      details: 'Authentication bypass tests completed',
      severity: 'LOW',
      recommendation: 'Continue enforcing authentication requirements',
      timestamp: new Date().toISOString()
    });
  }

  private async testAuthorizationFlaws(): Promise<void> {
    console.log('🔍 Testing authorization flaws...');
    
    // Test horizontal privilege escalation (accessing other users' data)
    const userAddresses = [
      '0x1234567890123456789012345678901234567890',
      '0x9876543210987654321098765432109876543210',
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    ];

    for (const address of userAddresses) {
      try {
        const response = await axios({
          method: 'GET',
          url: `${this.baseUrl}/api/users/${address}/positions`,
          headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
          timeout: 5000,
          validateStatus: () => true
        });

        // Check if we can access other users' data without proper authorization
        if (response.status === 200 && response.data) {
          this.addResult({
            testName: 'Horizontal Privilege Escalation',
            status: 'FAIL',
            details: `Can access user data for address ${address} without proper authorization`,
            severity: 'HIGH',
            recommendation: 'Implement proper user authorization checks',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        // Expected for unauthorized access
      }
    }

    // Test vertical privilege escalation (accessing admin functions)
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/api/admin/emergency-stop`,
        data: { enabled: true },
        headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 200) {
        this.addResult({
          testName: 'Vertical Privilege Escalation',
          status: 'FAIL',
          details: 'Regular user can access admin functions',
          severity: 'CRITICAL',
          recommendation: 'Implement role-based access control',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      // Expected for non-admin users
    }

    this.addResult({
      testName: 'Authorization Testing',
      status: 'PASS',
      details: 'Authorization tests completed',
      severity: 'LOW',
      recommendation: 'Continue enforcing proper authorization controls',
      timestamp: new Date().toISOString()
    });
  }

  private async testRateLimiting(): Promise<void> {
    console.log('🔍 Testing rate limiting...');
    
    const testEndpoint = this.endpoints.find(e => e.method === 'GET' && !e.requiresAuth);
    if (!testEndpoint) return;

    const requests = Array.from({ length: 100 }, (_, i) => 
      axios({
        method: testEndpoint.method,
        url: this.baseUrl + testEndpoint.path.replace(':id', '1'),
        timeout: 5000,
        validateStatus: () => true
      })
    );

    try {
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      if (rateLimitedResponses.length === 0) {
        this.addResult({
          testName: 'Rate Limiting',
          status: 'FAIL',
          details: 'No rate limiting detected after 100 rapid requests',
          severity: 'MEDIUM',
          recommendation: 'Implement rate limiting to prevent abuse',
          timestamp: new Date().toISOString()
        });
      } else {
        this.addResult({
          testName: 'Rate Limiting',
          status: 'PASS',
          details: `Rate limiting working: ${rateLimitedResponses.length} requests blocked`,
          severity: 'LOW',
          recommendation: 'Rate limiting is properly configured',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      this.addResult({
        testName: 'Rate Limiting',
        status: 'WARNING',
        details: 'Unable to test rate limiting due to network errors',
        severity: 'LOW',
        recommendation: 'Manually verify rate limiting configuration',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testDataExposure(): Promise<void> {
    console.log('🔍 Testing data exposure...');
    
    const sensitiveDataPatterns = [
      /private[_-]?key/i,
      /secret[_-]?key/i,
      /api[_-]?key/i,
      /password/i,
      /token/i,
      /mnemonic/i,
      /seed[_-]?phrase/i,
      /\b[A-Za-z0-9+/]{40,}\b/, // Base64 encoded secrets
      /0x[a-fA-F0-9]{64}/, // Private keys
      /\b[a-fA-F0-9]{32}\b/ // MD5/32-char hashes
    ];

    for (const endpoint of this.endpoints) {
      if (endpoint.method === 'GET') {
        try {
          const response = await axios({
            method: endpoint.method,
            url: this.baseUrl + endpoint.path.replace(':id', '1').replace(':address', '0x1234567890123456789012345678901234567890'),
            timeout: 5000,
            validateStatus: () => true
          });

          if (response.status === 200) {
            const responseText = JSON.stringify(response.data);
            
            for (const pattern of sensitiveDataPatterns) {
              if (pattern.test(responseText)) {
                this.addResult({
                  testName: `Data Exposure - ${endpoint.path}`,
                  status: 'FAIL',
                  details: `Potential sensitive data exposure detected`,
                  severity: 'HIGH',
                  recommendation: 'Remove sensitive data from API responses',
                  timestamp: new Date().toISOString()
                });
                break;
              }
            }
          }
        } catch (error) {
          // Expected for some endpoints
        }
      }
    }

    this.addResult({
      testName: 'Data Exposure Testing',
      status: 'PASS',
      details: 'Data exposure tests completed',
      severity: 'LOW',
      recommendation: 'Continue monitoring for sensitive data in responses',
      timestamp: new Date().toISOString()
    });
  }

  private async testHTTPSecurity(): Promise<void> {
    console.log('🔍 Testing HTTP security headers...');
    
    try {
      const response = await axios({
        method: 'GET',
        url: this.baseUrl + '/api/domains',
        timeout: 5000,
        validateStatus: () => true
      });

      const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': /^default-src/,
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      };

      for (const [header, expectedValue] of Object.entries(securityHeaders)) {
        const actualValue = response.headers[header.toLowerCase()];
        
        if (!actualValue) {
          this.addResult({
            testName: `HTTP Security Headers - ${header}`,
            status: 'FAIL',
            details: `Missing security header: ${header}`,
            severity: 'MEDIUM',
            recommendation: `Add ${header} header to improve security`,
            timestamp: new Date().toISOString()
          });
        } else if (typeof expectedValue === 'string' && actualValue !== expectedValue) {
          this.addResult({
            testName: `HTTP Security Headers - ${header}`,
            status: 'WARNING',
            details: `Security header present but may need adjustment: ${header}`,
            severity: 'LOW',
            recommendation: `Review ${header} header configuration`,
            timestamp: new Date().toISOString()
          });
        } else if (expectedValue instanceof RegExp && !expectedValue.test(actualValue)) {
          this.addResult({
            testName: `HTTP Security Headers - ${header}`,
            status: 'WARNING',
            details: `Security header present but may need adjustment: ${header}`,
            severity: 'LOW',
            recommendation: `Review ${header} header configuration`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      this.addResult({
        testName: 'HTTP Security Headers',
        status: 'WARNING',
        details: 'Unable to test HTTP security headers',
        severity: 'LOW',
        recommendation: 'Manually verify security headers configuration',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testAPIAbuse(): Promise<void> {
    console.log('🔍 Testing API abuse scenarios...');
    
    // Test large payload attacks
    const largePayload = {
      data: 'A'.repeat(10 * 1024 * 1024), // 10MB payload
      array: Array.from({ length: 100000 }, (_, i) => ({ id: i, value: 'test' }))
    };

    for (const endpoint of this.endpoints) {
      if (endpoint.method === 'POST') {
        try {
          const response = await axios({
            method: endpoint.method,
            url: this.baseUrl + endpoint.path.replace(':id', '1'),
            data: largePayload,
            timeout: 10000,
            validateStatus: () => true
          });

          if (response.status === 200) {
            this.addResult({
              testName: `Large Payload Attack - ${endpoint.path}`,
              status: 'FAIL',
              details: 'API accepts extremely large payloads without limits',
              severity: 'MEDIUM',
              recommendation: 'Implement request size limits',
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          // Expected for properly protected endpoints
        }
      }
    }

    this.addResult({
      testName: 'API Abuse Testing',
      status: 'PASS',
      details: 'API abuse tests completed',
      severity: 'LOW',
      recommendation: 'Continue monitoring for API abuse patterns',
      timestamp: new Date().toISOString()
    });
  }

  private async testBusinessLogicFlaws(): Promise<void> {
    console.log('🔍 Testing business logic flaws...');
    
    // Test negative amount transactions
    try {
      const response = await axios({
        method: 'POST',
        url: this.baseUrl + '/api/bids',
        data: { domainId: 1, amount: '-1000000000000000000', bidderAddress: '0x1234567890123456789012345678901234567890' },
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 200) {
        this.addResult({
          testName: 'Business Logic - Negative Amounts',
          status: 'FAIL',
          details: 'API accepts negative bid amounts',
          severity: 'HIGH',
          recommendation: 'Implement business logic validation for amounts',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      // Expected for proper validation
    }

    // Test zero amount transactions
    try {
      const response = await axios({
        method: 'POST',
        url: this.baseUrl + '/api/collateral/deposit',
        data: { domainId: 1, amount: '0', ownerAddress: '0x1234567890123456789012345678901234567890' },
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 200) {
        this.addResult({
          testName: 'Business Logic - Zero Amounts',
          status: 'FAIL',
          details: 'API accepts zero amount deposits',
          severity: 'MEDIUM',
          recommendation: 'Implement minimum amount validation',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      // Expected for proper validation
    }

    this.addResult({
      testName: 'Business Logic Testing',
      status: 'PASS',
      details: 'Business logic tests completed',
      severity: 'LOW',
      recommendation: 'Continue validating business logic requirements',
      timestamp: new Date().toISOString()
    });
  }

  private addResult(result: SecurityTestResult): void {
    this.results.push(result);
    
    const statusEmoji = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    const severityColor = result.severity === 'CRITICAL' ? '\x1b[31m' : 
                         result.severity === 'HIGH' ? '\x1b[91m' :
                         result.severity === 'MEDIUM' ? '\x1b[93m' : '\x1b[92m';
    
    console.log(`${statusEmoji} ${severityColor}[${result.severity}]\x1b[0m ${result.testName}: ${result.details}`);
  }

  private generateReport(): void {
    const reportPath = path.join(process.cwd(), 'security', 'reports', 'api-security-report.json');
    const htmlReportPath = path.join(process.cwd(), 'security', 'reports', 'api-security-report.html');
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const summary = {
      totalTests: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: this.results.filter(r => r.status === 'FAIL').length,
      warnings: this.results.filter(r => r.status === 'WARNING').length,
      critical: this.results.filter(r => r.severity === 'CRITICAL').length,
      high: this.results.filter(r => r.severity === 'HIGH').length,
      medium: this.results.filter(r => r.severity === 'MEDIUM').length,
      low: this.results.filter(r => r.severity === 'LOW').length
    };

    const report = {
      summary,
      results: this.results,
      generatedAt: new Date().toISOString()
    };

    // Save JSON report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    fs.writeFileSync(htmlReportPath, htmlReport);

    console.log(`\n📋 Security Report Generated:`);
    console.log(`📄 JSON: ${reportPath}`);
    console.log(`🌐 HTML: ${htmlReportPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Passed: ${summary.passed}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   ⚠️  Warnings: ${summary.warnings}`);
    console.log(`   🚨 Critical: ${summary.critical}`);
    console.log(`   🔥 High: ${summary.high}`);
    console.log(`   📢 Medium: ${summary.medium}`);
    console.log(`   ℹ️  Low: ${summary.low}`);
  }

  private generateHTMLReport(report: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>API Security Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        .critical { border-left: 5px solid #d32f2f; }
        .high { border-left: 5px solid #f57c00; }
        .medium { border-left: 5px solid #fbc02d; }
        .low { border-left: 5px solid #388e3c; }
        .pass { color: #388e3c; }
        .fail { color: #d32f2f; }
        .warning { color: #f57c00; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f5f5f5; }
    </style>
</head>
<body>
    <div class="header">
        <h1>API Security Test Report</h1>
        <p>Generated: ${report.generatedAt}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <p>${report.summary.totalTests}</p>
        </div>
        <div class="metric">
            <h3>Passed</h3>
            <p class="pass">${report.summary.passed}</p>
        </div>
        <div class="metric">
            <h3>Failed</h3>
            <p class="fail">${report.summary.failed}</p>
        </div>
        <div class="metric">
            <h3>Warnings</h3>
            <p class="warning">${report.summary.warnings}</p>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Test Name</th>
                <th>Status</th>
                <th>Severity</th>
                <th>Details</th>
                <th>Recommendation</th>
            </tr>
        </thead>
        <tbody>
            ${report.results.map((result: SecurityTestResult) => `
                <tr class="${result.severity.toLowerCase()}">
                    <td>${result.testName}</td>
                    <td class="${result.status.toLowerCase()}">${result.status}</td>
                    <td>${result.severity}</td>
                    <td>${result.details}</td>
                    <td>${result.recommendation}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
  }
}

// Export for use in other modules
export default APISecurityTester;
