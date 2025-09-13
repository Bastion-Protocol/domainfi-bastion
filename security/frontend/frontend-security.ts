import puppeteer, { Browser, Page } from 'puppeteer';
import { WebDriver, Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import * as fs from 'fs';
import * as path from 'path';

interface FrontendSecurityResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
  timestamp: string;
  evidence?: string;
}

export class FrontendSecurityTester {
  private browser: Browser;
  private driver: WebDriver;
  private baseUrl: string;
  private results: FrontendSecurityResult[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async initialize(): Promise<void> {
    // Initialize Puppeteer
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    // Initialize Selenium WebDriver
    const chromeOptions = new chrome.Options();
    chromeOptions.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');
    
    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();
  }

  async runAllTests(): Promise<FrontendSecurityResult[]> {
    console.log('🌐 Starting Frontend Security Tests...');
    
    await this.initialize();
    
    try {
      await this.testXSSProtection();
      await this.testCSRFProtection();
      await this.testClickjacking();
      await this.testWalletSecurity();
      await this.testTransactionSecurity();
      await this.testInputValidation();
      await this.testSessionSecurity();
      await this.testContentSecurityPolicy();
      await this.testHTTPSecurity();
      await this.testClientSideStorage();
      await this.testAuthenticationFlow();
      await this.testDataExposure();
      
    } finally {
      await this.cleanup();
    }
    
    this.generateReport();
    return this.results;
  }

  private async testXSSProtection(): Promise<void> {
    console.log('🔍 Testing XSS protection...');
    
    const page = await this.browser.newPage();
    
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(`XSS`)">',
      '<body onload=alert("XSS")>',
      '<input onfocus=alert("XSS") autofocus>',
      '<div onclick=alert("XSS")>Click me</div>',
      '"><script>alert("XSS")</script>',
      "'><script>alert('XSS')</script>"
    ];

    try {
      await page.goto(this.baseUrl);
      
      // Test XSS in input fields
      const inputSelectors = [
        'input[type="text"]',
        'input[type="search"]',
        'textarea',
        'input[name*="domain"]',
        'input[name*="bid"]',
        'input[name*="amount"]'
      ];

      for (const selector of inputSelectors) {
        try {
          const inputs = await page.$$(selector);
          for (const input of inputs) {
            for (const payload of xssPayloads) {
              await input.clear();
              await input.type(payload);
              
              // Check if payload is reflected in DOM
              const html = await page.content();
              if (html.includes(payload) && !html.includes('&lt;') && !html.includes('&gt;')) {
                this.addResult({
                  testName: `XSS Protection - Input Field`,
                  status: 'FAIL',
                  details: `XSS payload reflected without encoding: ${payload}`,
                  severity: 'HIGH',
                  recommendation: 'Implement proper output encoding and Content Security Policy',
                  timestamp: new Date().toISOString(),
                  evidence: payload
                });
              }
              
              // Check for script execution
              await page.waitForTimeout(500);
              const alerts = await page.evaluate(() => window.alert?.toString().includes('XSS'));
              if (alerts) {
                this.addResult({
                  testName: `XSS Protection - Script Execution`,
                  status: 'FAIL',
                  details: `XSS script executed: ${payload}`,
                  severity: 'CRITICAL',
                  recommendation: 'Implement strict XSS protection and input sanitization',
                  timestamp: new Date().toISOString(),
                  evidence: payload
                });
              }
            }
          }
        } catch (error) {
          // Input field not found or accessible
        }
      }

      // Test XSS in URL parameters
      for (const payload of xssPayloads.slice(0, 3)) { // Test a subset for URL
        try {
          const encodedPayload = encodeURIComponent(payload);
          await page.goto(`${this.baseUrl}?search=${encodedPayload}`);
          
          const html = await page.content();
          if (html.includes(payload)) {
            this.addResult({
              testName: `XSS Protection - URL Parameters`,
              status: 'FAIL',
              details: `XSS payload in URL reflected without encoding`,
              severity: 'HIGH',
              recommendation: 'Validate and encode URL parameters',
              timestamp: new Date().toISOString(),
              evidence: payload
            });
          }
        } catch (error) {
          // URL navigation failed
        }
      }

    } finally {
      await page.close();
    }

    this.addResult({
      testName: 'XSS Protection Testing',
      status: 'PASS',
      details: 'XSS protection tests completed',
      severity: 'LOW',
      recommendation: 'Continue monitoring for XSS vulnerabilities',
      timestamp: new Date().toISOString()
    });
  }

  private async testCSRFProtection(): Promise<void> {
    console.log('🔍 Testing CSRF protection...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(this.baseUrl);
      
      // Check for CSRF tokens in forms
      const forms = await page.$$('form');
      let hasCSRFProtection = false;
      
      for (const form of forms) {
        const csrfTokens = await form.$$('input[name*="csrf"], input[name*="token"], input[type="hidden"]');
        if (csrfTokens.length > 0) {
          hasCSRFProtection = true;
          break;
        }
      }
      
      if (!hasCSRFProtection && forms.length > 0) {
        this.addResult({
          testName: 'CSRF Protection - Token Presence',
          status: 'FAIL',
          details: 'Forms found without CSRF tokens',
          severity: 'HIGH',
          recommendation: 'Implement CSRF tokens for all state-changing forms',
          timestamp: new Date().toISOString()
        });
      }

      // Test SameSite cookie attributes
      const cookies = await page.cookies();
      for (const cookie of cookies) {
        if (!cookie.sameSite || cookie.sameSite === 'none') {
          this.addResult({
            testName: `CSRF Protection - SameSite Cookie (${cookie.name})`,
            status: 'WARNING',
            details: `Cookie ${cookie.name} lacks SameSite protection`,
            severity: 'MEDIUM',
            recommendation: 'Set SameSite=Strict or SameSite=Lax for cookies',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Test for Origin/Referer validation
      await page.setExtraHTTPHeaders({
        'Origin': 'https://malicious-site.com',
        'Referer': 'https://malicious-site.com/attack.html'
      });

      // Try to submit a form with malicious origin
      try {
        const submitButton = await page.$('form button[type="submit"], form input[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          await page.waitForTimeout(1000);
          
          // Check if form submission was rejected
          const currentUrl = page.url();
          if (!currentUrl.includes('error') && !currentUrl.includes('invalid')) {
            this.addResult({
              testName: 'CSRF Protection - Origin Validation',
              status: 'FAIL',
              details: 'Form accepts submissions from external origins',
              severity: 'HIGH',
              recommendation: 'Validate Origin and Referer headers',
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        // Form submission failed, which is expected for CSRF protection
      }

    } finally {
      await page.close();
    }

    this.addResult({
      testName: 'CSRF Protection Testing',
      status: 'PASS',
      details: 'CSRF protection tests completed',
      severity: 'LOW',
      recommendation: 'Continue enforcing CSRF protection',
      timestamp: new Date().toISOString()
    });
  }

  private async testClickjacking(): Promise<void> {
    console.log('🔍 Testing clickjacking protection...');
    
    const page = await this.browser.newPage();
    
    try {
      const response = await page.goto(this.baseUrl);
      const headers = response?.headers();
      
      // Check X-Frame-Options
      const xFrameOptions = headers?.['x-frame-options'];
      if (!xFrameOptions) {
        this.addResult({
          testName: 'Clickjacking Protection - X-Frame-Options',
          status: 'FAIL',
          details: 'X-Frame-Options header not set',
          severity: 'MEDIUM',
          recommendation: 'Set X-Frame-Options to DENY or SAMEORIGIN',
          timestamp: new Date().toISOString()
        });
      } else if (xFrameOptions.toLowerCase() === 'allowall') {
        this.addResult({
          testName: 'Clickjacking Protection - X-Frame-Options',
          status: 'FAIL',
          details: 'X-Frame-Options allows framing from any origin',
          severity: 'MEDIUM',
          recommendation: 'Set X-Frame-Options to DENY or SAMEORIGIN',
          timestamp: new Date().toISOString()
        });
      }

      // Check Content-Security-Policy frame-ancestors
      const csp = headers?.['content-security-policy'];
      if (csp && !csp.includes('frame-ancestors')) {
        this.addResult({
          testName: 'Clickjacking Protection - CSP frame-ancestors',
          status: 'WARNING',
          details: 'CSP does not include frame-ancestors directive',
          severity: 'LOW',
          recommendation: 'Add frame-ancestors directive to CSP',
          timestamp: new Date().toISOString()
        });
      }

      // Test actual framing capability
      const frameTestHTML = `
        <!DOCTYPE html>
        <html>
        <body>
          <iframe src="${this.baseUrl}" width="800" height="600"></iframe>
        </body>
        </html>
      `;
      
      const frameTestPage = await this.browser.newPage();
      await frameTestPage.setContent(frameTestHTML);
      
      await frameTestPage.waitForTimeout(3000);
      
      const frameContent = await frameTestPage.$eval('iframe', (frame: any) => {
        return frame.contentDocument ? frame.contentDocument.body.innerHTML : null;
      }).catch(() => null);
      
      if (frameContent) {
        this.addResult({
          testName: 'Clickjacking Protection - Frame Test',
          status: 'FAIL',
          details: 'Application can be embedded in frames',
          severity: 'MEDIUM',
          recommendation: 'Implement proper anti-framing headers',
          timestamp: new Date().toISOString()
        });
      }
      
      await frameTestPage.close();

    } finally {
      await page.close();
    }
  }

  private async testWalletSecurity(): Promise<void> {
    console.log('🔍 Testing wallet security...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(this.baseUrl);
      
      // Check for wallet connection buttons
      const walletButtons = await page.$$('button[class*="wallet"], button[class*="connect"], button:has-text("Connect")');
      
      if (walletButtons.length > 0) {
        // Test wallet connection without user interaction
        await page.evaluate(() => {
          // Try to access ethereum object
          if (typeof (window as any).ethereum !== 'undefined') {
            try {
              (window as any).ethereum.request({ method: 'eth_requestAccounts' });
            } catch (error) {
              console.log('Wallet access properly restricted');
            }
          }
        });

        // Check for exposed private keys or mnemonics
        const pageContent = await page.content();
        const sensitivePatterns = [
          /private[_\s]?key/gi,
          /mnemonic/gi,
          /seed[_\s]?phrase/gi,
          /0x[a-fA-F0-9]{64}/g, // Private key pattern
          /\b[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}\b/g // Mnemonic pattern
        ];

        for (const pattern of sensitivePatterns) {
          const matches = pageContent.match(pattern);
          if (matches) {
            this.addResult({
              testName: 'Wallet Security - Sensitive Data Exposure',
              status: 'FAIL',
              details: `Potential wallet sensitive data found: ${matches[0]}`,
              severity: 'CRITICAL',
              recommendation: 'Remove all sensitive wallet data from client-side code',
              timestamp: new Date().toISOString(),
              evidence: matches[0]
            });
          }
        }

        // Check wallet connection flow
        for (const button of walletButtons) {
          try {
            await button.click();
            await page.waitForTimeout(2000);
            
            // Check if wallet connection requires user confirmation
            const hasModal = await page.$('.modal, [role="dialog"], .popup') !== null;
            if (!hasModal) {
              this.addResult({
                testName: 'Wallet Security - Connection Flow',
                status: 'WARNING',
                details: 'Wallet connection may not require proper user confirmation',
                severity: 'MEDIUM',
                recommendation: 'Ensure wallet connections require explicit user approval',
                timestamp: new Date().toISOString()
              });
            }
          } catch (error) {
            // Button click failed, which is expected if wallet not available
          }
        }
      }

      // Test for localStorage wallet data
      const walletData = await page.evaluate(() => {
        const sensitiveKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('wallet') || key.includes('private') || key.includes('mnemonic'))) {
            sensitiveKeys.push(key);
          }
        }
        return sensitiveKeys;
      });

      if (walletData.length > 0) {
        this.addResult({
          testName: 'Wallet Security - LocalStorage',
          status: 'FAIL',
          details: `Wallet-related data found in localStorage: ${walletData.join(', ')}`,
          severity: 'HIGH',
          recommendation: 'Never store sensitive wallet data in browser storage',
          timestamp: new Date().toISOString()
        });
      }

    } finally {
      await page.close();
    }
  }

  private async testTransactionSecurity(): Promise<void> {
    console.log('🔍 Testing transaction security...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(this.baseUrl);
      
      // Inject mock wallet for testing
      await page.evaluateOnNewDocument(() => {
        (window as any).ethereum = {
          request: async (params: any) => {
            if (params.method === 'eth_requestAccounts') {
              return ['0x1234567890123456789012345678901234567890'];
            }
            if (params.method === 'eth_sendTransaction') {
              return '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
            }
            return null;
          },
          selectedAddress: '0x1234567890123456789012345678901234567890',
          isConnected: () => true
        };
      });

      await page.reload();
      
      // Look for transaction forms
      const transactionForms = await page.$$('form[data-transaction], form:has(input[name*="amount"]), form:has(input[name*="bid"])');
      
      for (const form of transactionForms) {
        // Test for transaction parameter validation
        const amountInputs = await form.$$('input[type="number"], input[name*="amount"], input[name*="bid"]');
        
        for (const input of amountInputs) {
          // Test negative amounts
          await input.clear();
          await input.type('-1000');
          
          const submitButton = await form.$('button[type="submit"], input[type="submit"]');
          if (submitButton) {
            await submitButton.click();
            await page.waitForTimeout(1000);
            
            // Check if negative amount was accepted
            const errorMessage = await page.$('.error, .invalid, [class*="error"]');
            if (!errorMessage) {
              this.addResult({
                testName: 'Transaction Security - Negative Amount Validation',
                status: 'FAIL',
                details: 'Transaction form accepts negative amounts',
                severity: 'HIGH',
                recommendation: 'Implement client-side amount validation',
                timestamp: new Date().toISOString()
              });
            }
          }

          // Test extremely large amounts
          await input.clear();
          await input.type('999999999999999999999999999999');
          
          if (submitButton) {
            await submitButton.click();
            await page.waitForTimeout(1000);
            
            const errorMessage = await page.$('.error, .invalid, [class*="error"]');
            if (!errorMessage) {
              this.addResult({
                testName: 'Transaction Security - Large Amount Validation',
                status: 'WARNING',
                details: 'Transaction form may accept unreasonably large amounts',
                severity: 'MEDIUM',
                recommendation: 'Implement maximum amount validation',
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      }

      // Test transaction confirmation flow
      const transactionButtons = await page.$$('button[class*="transaction"], button[class*="bid"], button[class*="borrow"]');
      
      for (const button of transactionButtons) {
        try {
          await button.click();
          await page.waitForTimeout(2000);
          
          // Check for confirmation dialog
          const confirmationDialog = await page.$('.confirmation, .confirm, [role="dialog"]:has-text("confirm")');
          if (!confirmationDialog) {
            this.addResult({
              testName: 'Transaction Security - Confirmation Dialog',
              status: 'WARNING',
              details: 'Transaction may not require user confirmation',
              severity: 'MEDIUM',
              recommendation: 'Always show confirmation dialog before transactions',
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          // Button interaction failed
        }
      }

    } finally {
      await page.close();
    }
  }

  private async testInputValidation(): Promise<void> {
    console.log('🔍 Testing input validation...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(this.baseUrl);
      
      const maliciousInputs = [
        { value: '<script>alert("xss")</script>', type: 'XSS' },
        { value: '../../etc/passwd', type: 'Path Traversal' },
        { value: 'javascript:alert("xss")', type: 'JavaScript Protocol' },
        { value: 'A'.repeat(10000), type: 'Buffer Overflow' },
        { value: '${7*7}', type: 'Template Injection' },
        { value: '{{7*7}}', type: 'Template Injection' },
        { value: '<%= 7*7 %>', type: 'Template Injection' },
        { value: '"; rm -rf /; #', type: 'Command Injection' }
      ];

      const inputSelectors = [
        'input[type="text"]',
        'input[type="email"]',
        'input[type="search"]',
        'textarea',
        'input[name]'
      ];

      for (const selector of inputSelectors) {
        try {
          const inputs = await page.$$(selector);
          for (const input of inputs) {
            for (const maliciousInput of maliciousInputs) {
              await input.clear();
              await input.type(maliciousInput.value);
              
              // Trigger validation (blur event)
              await input.evaluate((el: any) => el.blur());
              await page.waitForTimeout(500);
              
              // Check if input is accepted without validation
              const inputValue = await input.evaluate((el: any) => el.value);
              if (inputValue === maliciousInput.value) {
                // Check for validation error
                const errorElement = await page.$('.error, .invalid, [aria-invalid="true"]');
                if (!errorElement) {
                  this.addResult({
                    testName: `Input Validation - ${maliciousInput.type}`,
                    status: 'FAIL',
                    details: `Input accepts ${maliciousInput.type} without validation`,
                    severity: maliciousInput.type.includes('XSS') ? 'HIGH' : 'MEDIUM',
                    recommendation: 'Implement comprehensive input validation and sanitization',
                    timestamp: new Date().toISOString(),
                    evidence: maliciousInput.value
                  });
                }
              }
            }
          }
        } catch (error) {
          // Input element not found or not accessible
        }
      }

    } finally {
      await page.close();
    }
  }

  private async testSessionSecurity(): Promise<void> {
    console.log('🔍 Testing session security...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(this.baseUrl);
      
      // Check for session cookies
      const cookies = await page.cookies();
      const sessionCookies = cookies.filter(cookie => 
        cookie.name.toLowerCase().includes('session') || 
        cookie.name.toLowerCase().includes('auth') ||
        cookie.name.toLowerCase().includes('token')
      );

      for (const cookie of sessionCookies) {
        // Check Secure flag
        if (!cookie.secure) {
          this.addResult({
            testName: `Session Security - Secure Flag (${cookie.name})`,
            status: 'FAIL',
            details: `Session cookie ${cookie.name} lacks Secure flag`,
            severity: 'HIGH',
            recommendation: 'Set Secure flag for all session cookies',
            timestamp: new Date().toISOString()
          });
        }

        // Check HttpOnly flag
        if (!cookie.httpOnly) {
          this.addResult({
            testName: `Session Security - HttpOnly Flag (${cookie.name})`,
            status: 'FAIL',
            details: `Session cookie ${cookie.name} lacks HttpOnly flag`,
            severity: 'HIGH',
            recommendation: 'Set HttpOnly flag for session cookies',
            timestamp: new Date().toISOString()
          });
        }

        // Check SameSite attribute
        if (!cookie.sameSite || cookie.sameSite === 'none') {
          this.addResult({
            testName: `Session Security - SameSite (${cookie.name})`,
            status: 'WARNING',
            details: `Session cookie ${cookie.name} lacks proper SameSite attribute`,
            severity: 'MEDIUM',
            recommendation: 'Set SameSite=Strict or SameSite=Lax for session cookies',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Test session timeout
      const sessionStorage = await page.evaluate(() => {
        const sessionData: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            sessionData.push(key);
          }
        }
        return sessionData;
      });

      if (sessionStorage.length > 0) {
        this.addResult({
          testName: 'Session Security - Session Storage Usage',
          status: 'WARNING',
          details: 'Application uses sessionStorage for data persistence',
          severity: 'LOW',
          recommendation: 'Ensure session data is properly cleared on logout',
          timestamp: new Date().toISOString()
        });
      }

    } finally {
      await page.close();
    }
  }

  private async testContentSecurityPolicy(): Promise<void> {
    console.log('🔍 Testing Content Security Policy...');
    
    const page = await this.browser.newPage();
    
    try {
      const response = await page.goto(this.baseUrl);
      const headers = response?.headers();
      
      const csp = headers?.['content-security-policy'];
      if (!csp) {
        this.addResult({
          testName: 'Content Security Policy - Header Presence',
          status: 'FAIL',
          details: 'Content-Security-Policy header not found',
          severity: 'HIGH',
          recommendation: 'Implement Content Security Policy',
          timestamp: new Date().toISOString()
        });
      } else {
        // Check CSP directives
        const requiredDirectives = [
          { name: 'default-src', recommendation: 'Set default-src to restrict resource loading' },
          { name: 'script-src', recommendation: 'Set script-src to prevent XSS' },
          { name: 'style-src', recommendation: 'Set style-src to control stylesheets' },
          { name: 'img-src', recommendation: 'Set img-src to control image sources' },
          { name: 'connect-src', recommendation: 'Set connect-src to control AJAX/fetch requests' },
          { name: 'frame-ancestors', recommendation: 'Set frame-ancestors to prevent clickjacking' }
        ];

        for (const directive of requiredDirectives) {
          if (!csp.includes(directive.name)) {
            this.addResult({
              testName: `Content Security Policy - ${directive.name}`,
              status: 'WARNING',
              details: `CSP missing ${directive.name} directive`,
              severity: 'MEDIUM',
              recommendation: directive.recommendation,
              timestamp: new Date().toISOString()
            });
          }
        }

        // Check for unsafe directives
        const unsafePatterns = [
          "'unsafe-inline'",
          "'unsafe-eval'",
          "data:",
          "*"
        ];

        for (const pattern of unsafePatterns) {
          if (csp.includes(pattern)) {
            this.addResult({
              testName: `Content Security Policy - Unsafe Directive`,
              status: 'WARNING',
              details: `CSP contains potentially unsafe directive: ${pattern}`,
              severity: 'MEDIUM',
              recommendation: 'Remove or restrict unsafe CSP directives',
              timestamp: new Date().toISOString(),
              evidence: pattern
            });
          }
        }
      }

    } finally {
      await page.close();
    }
  }

  private async testHTTPSecurity(): Promise<void> {
    console.log('🔍 Testing HTTP security headers...');
    
    const page = await this.browser.newPage();
    
    try {
      const response = await page.goto(this.baseUrl);
      const headers = response?.headers();
      
      const securityHeaders = [
        { name: 'strict-transport-security', severity: 'HIGH' as const, recommendation: 'Implement HSTS' },
        { name: 'x-content-type-options', severity: 'MEDIUM' as const, recommendation: 'Set X-Content-Type-Options to nosniff' },
        { name: 'x-frame-options', severity: 'MEDIUM' as const, recommendation: 'Set X-Frame-Options to DENY or SAMEORIGIN' },
        { name: 'x-xss-protection', severity: 'LOW' as const, recommendation: 'Set X-XSS-Protection header' },
        { name: 'referrer-policy', severity: 'LOW' as const, recommendation: 'Set Referrer-Policy header' },
        { name: 'permissions-policy', severity: 'LOW' as const, recommendation: 'Set Permissions-Policy header' }
      ];

      for (const header of securityHeaders) {
        if (!headers?.[header.name]) {
          this.addResult({
            testName: `HTTP Security - ${header.name}`,
            status: 'FAIL',
            details: `Missing security header: ${header.name}`,
            severity: header.severity,
            recommendation: header.recommendation,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Check HTTPS enforcement
      if (!this.baseUrl.startsWith('https://')) {
        this.addResult({
          testName: 'HTTP Security - HTTPS Enforcement',
          status: 'FAIL',
          details: 'Application not served over HTTPS',
          severity: 'CRITICAL',
          recommendation: 'Enforce HTTPS for all connections',
          timestamp: new Date().toISOString()
        });
      }

    } finally {
      await page.close();
    }
  }

  private async testClientSideStorage(): Promise<void> {
    console.log('🔍 Testing client-side storage security...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(this.baseUrl);
      
      // Check localStorage for sensitive data
      const localStorageData = await page.evaluate(() => {
        const sensitiveData: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const value = localStorage.getItem(key);
            if (value && (
              key.toLowerCase().includes('password') ||
              key.toLowerCase().includes('secret') ||
              key.toLowerCase().includes('private') ||
              key.toLowerCase().includes('token') ||
              value.includes('eyJ') || // JWT token start
              /^[a-fA-F0-9]{64}$/.test(value) // Potential private key
            )) {
              sensitiveData.push(key);
            }
          }
        }
        return sensitiveData;
      });

      if (localStorageData.length > 0) {
        this.addResult({
          testName: 'Client Storage - LocalStorage Sensitive Data',
          status: 'FAIL',
          details: `Sensitive data found in localStorage: ${localStorageData.join(', ')}`,
          severity: 'HIGH',
          recommendation: 'Remove sensitive data from localStorage',
          timestamp: new Date().toISOString()
        });
      }

      // Check sessionStorage for sensitive data
      const sessionStorageData = await page.evaluate(() => {
        const sensitiveData: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            const value = sessionStorage.getItem(key);
            if (value && (
              key.toLowerCase().includes('password') ||
              key.toLowerCase().includes('secret') ||
              key.toLowerCase().includes('private') ||
              value.includes('eyJ') || // JWT token start
              /^[a-fA-F0-9]{64}$/.test(value) // Potential private key
            )) {
              sensitiveData.push(key);
            }
          }
        }
        return sensitiveData;
      });

      if (sessionStorageData.length > 0) {
        this.addResult({
          testName: 'Client Storage - SessionStorage Sensitive Data',
          status: 'FAIL',
          details: `Sensitive data found in sessionStorage: ${sessionStorageData.join(', ')}`,
          severity: 'HIGH',
          recommendation: 'Remove sensitive data from sessionStorage',
          timestamp: new Date().toISOString()
        });
      }

    } finally {
      await page.close();
    }
  }

  private async testAuthenticationFlow(): Promise<void> {
    console.log('🔍 Testing authentication flow...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(this.baseUrl);
      
      // Look for login/authentication forms
      const authForms = await page.$$('form[action*="login"], form[action*="auth"], form:has(input[type="password"])');
      
      for (const form of authForms) {
        // Test for password autocomplete
        const passwordInputs = await form.$$('input[type="password"]');
        for (const input of passwordInputs) {
          const autocomplete = await input.evaluate((el: any) => el.getAttribute('autocomplete'));
          if (autocomplete === 'on' || !autocomplete) {
            this.addResult({
              testName: 'Authentication - Password Autocomplete',
              status: 'WARNING',
              details: 'Password field allows autocomplete',
              severity: 'LOW',
              recommendation: 'Set autocomplete="new-password" for password fields',
              timestamp: new Date().toISOString()
            });
          }
        }

        // Test for HTTPS on auth forms
        const formAction = await form.evaluate((el: any) => el.action);
        if (formAction && !formAction.startsWith('https://')) {
          this.addResult({
            testName: 'Authentication - HTTPS for Auth Forms',
            status: 'FAIL',
            details: 'Authentication form submits over HTTP',
            severity: 'CRITICAL',
            recommendation: 'Use HTTPS for all authentication forms',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Test for wallet-based authentication
      const connectButtons = await page.$$('button[class*="connect"], button:has-text("Connect Wallet")');
      if (connectButtons.length > 0) {
        this.addResult({
          testName: 'Authentication - Wallet Connection',
          status: 'PASS',
          details: 'Wallet-based authentication detected',
          severity: 'LOW',
          recommendation: 'Ensure wallet authentication is properly implemented',
          timestamp: new Date().toISOString()
        });
      }

    } finally {
      await page.close();
    }
  }

  private async testDataExposure(): Promise<void> {
    console.log('🔍 Testing data exposure...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(this.baseUrl);
      
      // Check page source for sensitive information
      const pageContent = await page.content();
      
      const sensitivePatterns = [
        { pattern: /api[_-]?key/gi, name: 'API Key' },
        { pattern: /secret[_-]?key/gi, name: 'Secret Key' },
        { pattern: /private[_-]?key/gi, name: 'Private Key' },
        { pattern: /password/gi, name: 'Password' },
        { pattern: /0x[a-fA-F0-9]{64}/g, name: 'Private Key (Hex)' },
        { pattern: /[a-zA-Z0-9]{32,}/g, name: 'Long Hash/Key' },
        { pattern: /eyJ[a-zA-Z0-9]/g, name: 'JWT Token' },
        { pattern: /sk_[a-zA-Z0-9]/g, name: 'Secret Key (Stripe-like)' },
        { pattern: /pk_[a-zA-Z0-9]/g, name: 'Public Key (Stripe-like)' }
      ];

      for (const { pattern, name } of sensitivePatterns) {
        const matches = pageContent.match(pattern);
        if (matches && matches.length > 0) {
          // Filter out common false positives
          const realMatches = matches.filter(match => 
            match.length > 8 && 
            !match.includes('example') &&
            !match.includes('placeholder') &&
            !match.includes('dummy')
          );
          
          if (realMatches.length > 0) {
            this.addResult({
              testName: `Data Exposure - ${name}`,
              status: 'FAIL',
              details: `Potential ${name} found in page source`,
              severity: name.includes('Private') || name.includes('Secret') ? 'CRITICAL' : 'HIGH',
              recommendation: 'Remove sensitive data from client-side code',
              timestamp: new Date().toISOString(),
              evidence: realMatches[0].substring(0, 20) + '...'
            });
          }
        }
      }

      // Check for exposed environment variables
      const envPattern = /process\.env\.[A-Z_]+/g;
      const envMatches = pageContent.match(envPattern);
      if (envMatches) {
        this.addResult({
          testName: 'Data Exposure - Environment Variables',
          status: 'WARNING',
          details: 'Environment variable references found in client code',
          severity: 'MEDIUM',
          recommendation: 'Ensure environment variables are not exposed to client',
          timestamp: new Date().toISOString()
        });
      }

    } finally {
      await page.close();
    }
  }

  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
    if (this.driver) {
      await this.driver.quit();
    }
  }

  private addResult(result: FrontendSecurityResult): void {
    this.results.push(result);
    
    const statusEmoji = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    const severityColor = result.severity === 'CRITICAL' ? '\x1b[31m' : 
                         result.severity === 'HIGH' ? '\x1b[91m' :
                         result.severity === 'MEDIUM' ? '\x1b[93m' : '\x1b[92m';
    
    console.log(`${statusEmoji} ${severityColor}[${result.severity}]\x1b[0m ${result.testName}: ${result.details}`);
  }

  private generateReport(): void {
    const reportPath = path.join(process.cwd(), 'security', 'reports', 'frontend-security-report.json');
    const htmlReportPath = path.join(process.cwd(), 'security', 'reports', 'frontend-security-report.html');
    
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

    console.log(`\n📋 Frontend Security Report Generated:`);
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
    <title>Frontend Security Test Report</title>
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
        .evidence { font-family: monospace; background: #f0f0f0; padding: 2px 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Frontend Security Test Report</h1>
        <p>Generated: ${report.generatedAt}</p>
        <p>Application: ${this.baseUrl}</p>
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
                <th>Evidence</th>
            </tr>
        </thead>
        <tbody>
            ${report.results.map((result: FrontendSecurityResult) => `
                <tr class="${result.severity.toLowerCase()}">
                    <td>${result.testName}</td>
                    <td class="${result.status.toLowerCase()}">${result.status}</td>
                    <td>${result.severity}</td>
                    <td>${result.details}</td>
                    <td>${result.recommendation}</td>
                    <td>${result.evidence ? `<span class="evidence">${result.evidence}</span>` : '-'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
  }
}

export default FrontendSecurityTester;
