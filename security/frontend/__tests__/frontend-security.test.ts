import FrontendSecurityTester from '../frontend-security';

describe('Frontend Security Tests', () => {
  let tester: FrontendSecurityTester;
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  beforeAll(async () => {
    tester = new FrontendSecurityTester(baseUrl);
    await tester.initialize();
  });

  afterAll(async () => {
    if (tester) {
      await tester.cleanup();
    }
  });

  describe('Cross-Site Scripting (XSS) Protection', () => {
    test('should prevent XSS in input fields', async () => {
      const results = await tester.runAllTests();
      const xssResults = results.filter(r => r.testName.includes('XSS Protection'));
      
      const criticalXSSIssues = xssResults.filter(r => 
        r.status === 'FAIL' && r.severity === 'CRITICAL'
      );
      
      expect(criticalXSSIssues.length).toBe(0);
    }, 30000);

    test('should properly encode output', async () => {
      const results = await tester.runAllTests();
      const encodingResults = results.filter(r => 
        r.testName.includes('XSS') && r.details.includes('encoding')
      );
      
      const failedEncoding = encodingResults.filter(r => r.status === 'FAIL');
      expect(failedEncoding.length).toBe(0);
    }, 30000);
  });

  describe('Cross-Site Request Forgery (CSRF) Protection', () => {
    test('should implement CSRF tokens', async () => {
      const results = await tester.runAllTests();
      const csrfResults = results.filter(r => r.testName.includes('CSRF Protection'));
      
      const missingTokens = csrfResults.filter(r => 
        r.status === 'FAIL' && r.details.includes('token')
      );
      
      expect(missingTokens.length).toBe(0);
    }, 30000);

    test('should validate Origin headers', async () => {
      const results = await tester.runAllTests();
      const originResults = results.filter(r => 
        r.testName.includes('Origin Validation')
      );
      
      const failedOriginValidation = originResults.filter(r => r.status === 'FAIL');
      expect(failedOriginValidation.length).toBe(0);
    }, 30000);
  });

  describe('Wallet Security', () => {
    test('should not expose private keys', async () => {
      const results = await tester.runAllTests();
      const walletResults = results.filter(r => r.testName.includes('Wallet Security'));
      
      const exposedKeys = walletResults.filter(r => 
        r.status === 'FAIL' && r.details.includes('private')
      );
      
      expect(exposedKeys.length).toBe(0);
    }, 30000);

    test('should require user confirmation for connections', async () => {
      const results = await tester.runAllTests();
      const connectionResults = results.filter(r => 
        r.testName.includes('Connection Flow')
      );
      
      const missingConfirmation = connectionResults.filter(r => 
        r.status === 'FAIL' && r.details.includes('confirmation')
      );
      
      expect(missingConfirmation.length).toBe(0);
    }, 30000);
  });

  describe('Input Validation', () => {
    test('should validate all user inputs', async () => {
      const results = await tester.runAllTests();
      const inputResults = results.filter(r => r.testName.includes('Input Validation'));
      
      const unvalidatedInputs = inputResults.filter(r => 
        r.status === 'FAIL' && r.severity === 'HIGH'
      );
      
      expect(unvalidatedInputs.length).toBe(0);
    }, 30000);

    test('should prevent injection attacks', async () => {
      const results = await tester.runAllTests();
      const injectionResults = results.filter(r => 
        r.testName.includes('Injection') || r.details.includes('injection')
      );
      
      const successfulInjections = injectionResults.filter(r => r.status === 'FAIL');
      expect(successfulInjections.length).toBe(0);
    }, 30000);
  });

  describe('Session Security', () => {
    test('should use secure session cookies', async () => {
      const results = await tester.runAllTests();
      const sessionResults = results.filter(r => r.testName.includes('Session Security'));
      
      const insecureCookies = sessionResults.filter(r => 
        r.status === 'FAIL' && (r.details.includes('Secure') || r.details.includes('HttpOnly'))
      );
      
      expect(insecureCookies.length).toBe(0);
    }, 30000);
  });

  describe('Content Security Policy', () => {
    test('should implement CSP headers', async () => {
      const results = await tester.runAllTests();
      const cspResults = results.filter(r => r.testName.includes('Content Security Policy'));
      
      const missingCSP = cspResults.filter(r => 
        r.status === 'FAIL' && r.details.includes('not found')
      );
      
      expect(missingCSP.length).toBe(0);
    }, 30000);

    test('should not use unsafe CSP directives', async () => {
      const results = await tester.runAllTests();
      const unsafeResults = results.filter(r => 
        r.testName.includes('Unsafe Directive')
      );
      
      const criticalUnsafe = unsafeResults.filter(r => 
        r.status === 'FAIL' && r.severity === 'HIGH'
      );
      
      expect(criticalUnsafe.length).toBe(0);
    }, 30000);
  });

  describe('HTTPS Security', () => {
    test('should enforce HTTPS', async () => {
      const results = await tester.runAllTests();
      const httpsResults = results.filter(r => r.testName.includes('HTTPS'));
      
      const nonHTTPS = httpsResults.filter(r => 
        r.status === 'FAIL' && r.severity === 'CRITICAL'
      );
      
      expect(nonHTTPS.length).toBe(0);
    }, 30000);

    test('should implement security headers', async () => {
      const results = await tester.runAllTests();
      const headerResults = results.filter(r => r.testName.includes('HTTP Security'));
      
      const missingCriticalHeaders = headerResults.filter(r => 
        r.status === 'FAIL' && r.severity === 'HIGH'
      );
      
      expect(missingCriticalHeaders.length).toBe(0);
    }, 30000);
  });

  describe('Data Protection', () => {
    test('should not expose sensitive data in client storage', async () => {
      const results = await tester.runAllTests();
      const storageResults = results.filter(r => r.testName.includes('Client Storage'));
      
      const exposedData = storageResults.filter(r => 
        r.status === 'FAIL' && r.severity === 'HIGH'
      );
      
      expect(exposedData.length).toBe(0);
    }, 30000);

    test('should not expose sensitive data in page source', async () => {
      const results = await tester.runAllTests();
      const exposureResults = results.filter(r => r.testName.includes('Data Exposure'));
      
      const criticalExposures = exposureResults.filter(r => 
        r.status === 'FAIL' && r.severity === 'CRITICAL'
      );
      
      expect(criticalExposures.length).toBe(0);
    }, 30000);
  });

  describe('Transaction Security', () => {
    test('should validate transaction parameters', async () => {
      const results = await tester.runAllTests();
      const transactionResults = results.filter(r => r.testName.includes('Transaction Security'));
      
      const invalidTransactions = transactionResults.filter(r => 
        r.status === 'FAIL' && r.details.includes('validation')
      );
      
      expect(invalidTransactions.length).toBe(0);
    }, 30000);

    test('should require transaction confirmation', async () => {
      const results = await tester.runAllTests();
      const confirmationResults = results.filter(r => 
        r.testName.includes('Confirmation Dialog')
      );
      
      const missingConfirmations = confirmationResults.filter(r => 
        r.status === 'FAIL'
      );
      
      expect(missingConfirmations.length).toBe(0);
    }, 30000);
  });

  describe('Clickjacking Protection', () => {
    test('should prevent clickjacking attacks', async () => {
      const results = await tester.runAllTests();
      const clickjackingResults = results.filter(r => r.testName.includes('Clickjacking'));
      
      const vulnerableToClickjacking = clickjackingResults.filter(r => 
        r.status === 'FAIL' && r.severity === 'MEDIUM'
      );
      
      expect(vulnerableToClickjacking.length).toBe(0);
    }, 30000);
  });

  describe('Authentication Security', () => {
    test('should secure authentication flow', async () => {
      const results = await tester.runAllTests();
      const authResults = results.filter(r => r.testName.includes('Authentication'));
      
      const insecureAuth = authResults.filter(r => 
        r.status === 'FAIL' && r.severity === 'CRITICAL'
      );
      
      expect(insecureAuth.length).toBe(0);
    }, 30000);
  });
});
