import { Client } from 'pg';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface DatabaseSecurityResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
  timestamp: string;
}

export class DatabaseSecurityTester {
  private postgresClient: Client;
  private redisClient: Redis;
  private results: DatabaseSecurityResult[] = [];

  constructor(postgresConfig: any, redisConfig: any) {
    this.postgresClient = new Client(postgresConfig);
    this.redisClient = new Redis(redisConfig);
  }

  async runAllTests(): Promise<DatabaseSecurityResult[]> {
    console.log('🗄️ Starting Database Security Tests...');
    
    try {
      await this.postgresClient.connect();
      
      await this.testSQLInjectionProtection();
      await this.testAccessControls();
      await this.testDataEncryption();
      await this.testPasswordSecurity();
      await this.testDatabaseConfiguration();
      await this.testAuditLogging();
      await this.testBackupSecurity();
      await this.testRedisecurity();
      await this.testDataLeakage();
      await this.testPrivilegeEscalation();
      
    } finally {
      await this.postgresClient.end();
      await this.redisClient.quit();
    }
    
    this.generateReport();
    return this.results;
  }

  private async testSQLInjectionProtection(): Promise<void> {
    console.log('🔍 Testing SQL injection protection...');
    
    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; EXEC xp_cmdshell('dir'); --",
      "' AND (SELECT COUNT(*) FROM information_schema.tables) > 0 --"
    ];

    for (const input of maliciousInputs) {
      try {
        // Test parameterized query (should be safe)
        const safeQuery = 'SELECT * FROM custody_events WHERE domain_id = $1';
        await this.postgresClient.query(safeQuery, [input]);
        
        // This should not fail - parameterized queries protect against injection
        this.addResult({
          testName: 'SQL Injection Protection - Parameterized Queries',
          status: 'PASS',
          details: 'Parameterized queries properly handle malicious input',
          severity: 'LOW',
          recommendation: 'Continue using parameterized queries',
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        // Unexpected error with parameterized query
        this.addResult({
          testName: 'SQL Injection Protection - Error Handling',
          status: 'WARNING',
          details: `Unexpected error with parameterized query: ${error.message}`,
          severity: 'MEDIUM',
          recommendation: 'Investigate query error handling',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Test dynamic query construction (should be avoided)
    try {
      const dynamicQuery = `SELECT * FROM custody_events WHERE domain_id = '${maliciousInputs[0]}'`;
      await this.postgresClient.query(dynamicQuery);
      
      this.addResult({
        testName: 'SQL Injection Protection - Dynamic Queries',
        status: 'FAIL',
        details: 'Dynamic query construction allows potential SQL injection',
        severity: 'CRITICAL',
        recommendation: 'Replace dynamic queries with parameterized queries',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Expected - dynamic queries should fail with malicious input
      this.addResult({
        testName: 'SQL Injection Protection - Dynamic Query Rejection',
        status: 'PASS',
        details: 'Dynamic queries properly reject malicious input',
        severity: 'LOW',
        recommendation: 'Ensure all queries use parameterization',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testAccessControls(): Promise<void> {
    console.log('🔍 Testing database access controls...');
    
    // Test user permissions
    try {
      const userQuery = `
        SELECT 
          usename,
          usesuper,
          usecreatedb,
          usecanlogin,
          useconnlimit
        FROM pg_user
      `;
      
      const result = await this.postgresClient.query(userQuery);
      const superUsers = result.rows.filter(user => user.usesuper);
      
      if (superUsers.length > 1) {
        this.addResult({
          testName: 'Database Access Controls - Superuser Accounts',
          status: 'FAIL',
          details: `Multiple superuser accounts detected: ${superUsers.map(u => u.usename).join(', ')}`,
          severity: 'HIGH',
          recommendation: 'Limit superuser accounts to minimum necessary',
          timestamp: new Date().toISOString()
        });
      }
      
      // Check for users without login capability
      const noLoginUsers = result.rows.filter(user => !user.usecanlogin);
      if (noLoginUsers.length === 0) {
        this.addResult({
          testName: 'Database Access Controls - Service Accounts',
          status: 'WARNING',
          details: 'All database users have login capability',
          severity: 'MEDIUM',
          recommendation: 'Consider creating service accounts without login capability',
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      this.addResult({
        testName: 'Database Access Controls - Permission Check',
        status: 'WARNING',
        details: `Unable to check user permissions: ${error.message}`,
        severity: 'MEDIUM',
        recommendation: 'Manually verify database user permissions',
        timestamp: new Date().toISOString()
      });
    }

    // Test table permissions
    try {
      const permissionQuery = `
        SELECT 
          schemaname,
          tablename,
          tableowner,
          hasinserts,
          hasselects,
          hasupdates,
          hasdeletes
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
      `;
      
      const result = await this.postgresClient.query(permissionQuery);
      
      // Check for tables with overly permissive access
      for (const table of result.rows) {
        if (table.hasinserts && table.hasupdates && table.hasdeletes) {
          this.addResult({
            testName: `Table Permissions - ${table.tablename}`,
            status: 'WARNING',
            details: `Table ${table.tablename} has full CRUD permissions`,
            severity: 'MEDIUM',
            recommendation: 'Review table permissions and apply principle of least privilege',
            timestamp: new Date().toISOString()
          });
        }
      }
      
    } catch (error) {
      this.addResult({
        testName: 'Database Access Controls - Table Permissions',
        status: 'WARNING',
        details: `Unable to check table permissions: ${error.message}`,
        severity: 'MEDIUM',
        recommendation: 'Manually verify table permissions',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testDataEncryption(): Promise<void> {
    console.log('🔍 Testing data encryption...');
    
    // Check for encryption at rest
    try {
      const encryptionQuery = `
        SELECT name, setting 
        FROM pg_settings 
        WHERE name LIKE '%ssl%' OR name LIKE '%encrypt%'
      `;
      
      const result = await this.postgresClient.query(encryptionQuery);
      const sslEnabled = result.rows.find(row => row.name === 'ssl' && row.setting === 'on');
      
      if (!sslEnabled) {
        this.addResult({
          testName: 'Data Encryption - SSL/TLS',
          status: 'FAIL',
          details: 'SSL/TLS is not enabled for database connections',
          severity: 'HIGH',
          recommendation: 'Enable SSL/TLS for all database connections',
          timestamp: new Date().toISOString()
        });
      } else {
        this.addResult({
          testName: 'Data Encryption - SSL/TLS',
          status: 'PASS',
          details: 'SSL/TLS is enabled for database connections',
          severity: 'LOW',
          recommendation: 'Ensure strong SSL/TLS configuration',
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      this.addResult({
        testName: 'Data Encryption - Configuration Check',
        status: 'WARNING',
        details: `Unable to check encryption settings: ${error.message}`,
        severity: 'MEDIUM',
        recommendation: 'Manually verify encryption configuration',
        timestamp: new Date().toISOString()
      });
    }

    // Test for sensitive data in plain text
    try {
      const sensitiveDataQuery = `
        SELECT column_name, table_name
        FROM information_schema.columns 
        WHERE column_name ILIKE ANY(ARRAY['%password%', '%secret%', '%key%', '%token%', '%private%'])
        AND table_schema NOT IN ('information_schema', 'pg_catalog')
      `;
      
      const result = await this.postgresClient.query(sensitiveDataQuery);
      
      if (result.rows.length > 0) {
        for (const row of result.rows) {
          // Check if data appears to be encrypted (base64, hex, etc.)
          const sampleQuery = `SELECT ${row.column_name} FROM ${row.table_name} LIMIT 1`;
          try {
            const sampleResult = await this.postgresClient.query(sampleQuery);
            if (sampleResult.rows.length > 0) {
              const value = sampleResult.rows[0][row.column_name];
              if (value && typeof value === 'string') {
                const isEncrypted = this.appearsToBEncrypted(value);
                if (!isEncrypted) {
                  this.addResult({
                    testName: `Data Encryption - ${row.table_name}.${row.column_name}`,
                    status: 'FAIL',
                    details: `Sensitive column contains plain text data`,
                    severity: 'CRITICAL',
                    recommendation: 'Encrypt sensitive data before storing',
                    timestamp: new Date().toISOString()
                  });
                }
              }
            }
          } catch (error) {
            // Column might be empty or access restricted
          }
        }
      }
      
    } catch (error) {
      this.addResult({
        testName: 'Data Encryption - Sensitive Data Check',
        status: 'WARNING',
        details: `Unable to check for sensitive data: ${error.message}`,
        severity: 'MEDIUM',
        recommendation: 'Manually verify sensitive data encryption',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testPasswordSecurity(): Promise<void> {
    console.log('🔍 Testing password security...');
    
    // Test password policy
    try {
      const passwordQuery = `
        SELECT rolname, rolpassword 
        FROM pg_authid 
        WHERE rolcanlogin = true
      `;
      
      const result = await this.postgresClient.query(passwordQuery);
      
      for (const user of result.rows) {
        if (!user.rolpassword) {
          this.addResult({
            testName: `Password Security - ${user.rolname}`,
            status: 'FAIL',
            details: `User ${user.rolname} has no password set`,
            severity: 'CRITICAL',
            recommendation: 'Set strong passwords for all user accounts',
            timestamp: new Date().toISOString()
          });
        } else if (user.rolpassword.startsWith('md5')) {
          this.addResult({
            testName: `Password Security - ${user.rolname}`,
            status: 'WARNING',
            details: `User ${user.rolname} uses MD5 password hashing`,
            severity: 'MEDIUM',
            recommendation: 'Upgrade to SCRAM-SHA-256 password authentication',
            timestamp: new Date().toISOString()
          });
        }
      }
      
    } catch (error) {
      this.addResult({
        testName: 'Password Security - Authentication Check',
        status: 'WARNING',
        details: `Unable to check password security: ${error.message}`,
        severity: 'MEDIUM',
        recommendation: 'Manually verify password security settings',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testDatabaseConfiguration(): Promise<void> {
    console.log('🔍 Testing database configuration...');
    
    const securitySettings = [
      { name: 'log_statement', expected: 'all', severity: 'MEDIUM' as const },
      { name: 'log_connections', expected: 'on', severity: 'MEDIUM' as const },
      { name: 'log_disconnections', expected: 'on', severity: 'MEDIUM' as const },
      { name: 'log_checkpoints', expected: 'on', severity: 'LOW' as const },
      { name: 'log_lock_waits', expected: 'on', severity: 'LOW' as const },
      { name: 'shared_preload_libraries', expected: 'pg_stat_statements', severity: 'LOW' as const }
    ];

    for (const setting of securitySettings) {
      try {
        const result = await this.postgresClient.query(
          'SELECT setting FROM pg_settings WHERE name = $1',
          [setting.name]
        );
        
        if (result.rows.length === 0) {
          this.addResult({
            testName: `Database Configuration - ${setting.name}`,
            status: 'WARNING',
            details: `Setting ${setting.name} not found`,
            severity: setting.severity,
            recommendation: `Configure ${setting.name} for better security`,
            timestamp: new Date().toISOString()
          });
        } else {
          const actualValue = result.rows[0].setting;
          if (setting.expected === 'pg_stat_statements') {
            if (!actualValue.includes('pg_stat_statements')) {
              this.addResult({
                testName: `Database Configuration - ${setting.name}`,
                status: 'WARNING',
                details: `pg_stat_statements not loaded`,
                severity: setting.severity,
                recommendation: 'Enable pg_stat_statements for query monitoring',
                timestamp: new Date().toISOString()
              });
            }
          } else if (actualValue !== setting.expected) {
            this.addResult({
              testName: `Database Configuration - ${setting.name}`,
              status: 'WARNING',
              details: `${setting.name} is set to '${actualValue}', expected '${setting.expected}'`,
              severity: setting.severity,
              recommendation: `Set ${setting.name} to '${setting.expected}'`,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        this.addResult({
          testName: `Database Configuration - ${setting.name}`,
          status: 'WARNING',
          details: `Unable to check ${setting.name}: ${error.message}`,
          severity: 'LOW',
          recommendation: `Manually verify ${setting.name} configuration`,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  private async testAuditLogging(): Promise<void> {
    console.log('🔍 Testing audit logging...');
    
    try {
      // Check if audit logging is enabled
      const logSettings = await this.postgresClient.query(`
        SELECT name, setting 
        FROM pg_settings 
        WHERE name IN ('log_statement', 'log_min_duration_statement', 'log_connections', 'log_disconnections')
      `);
      
      const settings = Object.fromEntries(
        logSettings.rows.map(row => [row.name, row.setting])
      );
      
      if (settings.log_statement !== 'all') {
        this.addResult({
          testName: 'Audit Logging - Statement Logging',
          status: 'FAIL',
          details: 'Statement logging is not comprehensive',
          severity: 'MEDIUM',
          recommendation: 'Set log_statement to "all" for complete audit trail',
          timestamp: new Date().toISOString()
        });
      }
      
      if (settings.log_connections !== 'on') {
        this.addResult({
          testName: 'Audit Logging - Connection Logging',
          status: 'FAIL',
          details: 'Connection logging is disabled',
          severity: 'MEDIUM',
          recommendation: 'Enable connection logging for security monitoring',
          timestamp: new Date().toISOString()
        });
      }
      
      // Test log file permissions (if accessible)
      try {
        const logQuery = `SELECT setting FROM pg_settings WHERE name = 'log_directory'`;
        const logDirResult = await this.postgresClient.query(logQuery);
        
        if (logDirResult.rows.length > 0) {
          const logDir = logDirResult.rows[0].setting;
          this.addResult({
            testName: 'Audit Logging - Log Directory',
            status: 'PASS',
            details: `Log directory configured: ${logDir}`,
            severity: 'LOW',
            recommendation: 'Ensure log files have appropriate permissions',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        // Log directory check failed
      }
      
    } catch (error) {
      this.addResult({
        testName: 'Audit Logging - Configuration Check',
        status: 'WARNING',
        details: `Unable to check audit logging: ${error.message}`,
        severity: 'MEDIUM',
        recommendation: 'Manually verify audit logging configuration',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testBackupSecurity(): Promise<void> {
    console.log('🔍 Testing backup security...');
    
    // Test for backup-related configurations
    try {
      const backupSettings = await this.postgresClient.query(`
        SELECT name, setting 
        FROM pg_settings 
        WHERE name IN ('archive_mode', 'archive_command', 'wal_level')
      `);
      
      const settings = Object.fromEntries(
        backupSettings.rows.map(row => [row.name, row.setting])
      );
      
      if (settings.archive_mode !== 'on') {
        this.addResult({
          testName: 'Backup Security - Archive Mode',
          status: 'WARNING',
          details: 'WAL archiving is not enabled',
          severity: 'MEDIUM',
          recommendation: 'Enable WAL archiving for point-in-time recovery',
          timestamp: new Date().toISOString()
        });
      }
      
      if (settings.wal_level === 'minimal') {
        this.addResult({
          testName: 'Backup Security - WAL Level',
          status: 'WARNING',
          details: 'WAL level is set to minimal',
          severity: 'MEDIUM',
          recommendation: 'Set WAL level to replica or logical for better backup capabilities',
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      this.addResult({
        testName: 'Backup Security - Configuration Check',
        status: 'WARNING',
        details: `Unable to check backup settings: ${error.message}`,
        severity: 'MEDIUM',
        recommendation: 'Manually verify backup configuration',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testRedisecurity(): Promise<void> {
    console.log('🔍 Testing Redis security...');
    
    try {
      // Test Redis authentication
      const info = await this.redisClient.info('server');
      
      // Test for default configuration issues
      try {
        await this.redisClient.config('get', '*');
        
        this.addResult({
          testName: 'Redis Security - CONFIG Command',
          status: 'FAIL',
          details: 'CONFIG command is not disabled',
          severity: 'HIGH',
          recommendation: 'Disable CONFIG command in production',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.addResult({
          testName: 'Redis Security - CONFIG Command',
          status: 'PASS',
          details: 'CONFIG command is properly restricted',
          severity: 'LOW',
          recommendation: 'Continue restricting dangerous commands',
          timestamp: new Date().toISOString()
        });
      }
      
      // Test for dangerous commands
      const dangerousCommands = ['FLUSHDB', 'FLUSHALL', 'EVAL', 'DEBUG'];
      
      for (const command of dangerousCommands) {
        try {
          await this.redisClient.sendCommand([command.toLowerCase(), '--help']);
          
          this.addResult({
            testName: `Redis Security - ${command} Command`,
            status: 'WARNING',
            details: `${command} command is available`,
            severity: 'MEDIUM',
            recommendation: `Consider disabling ${command} in production`,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          // Command is disabled or restricted
        }
      }
      
      // Test Redis persistence security
      const persistenceConfig = await this.redisClient.config('get', 'save');
      if (persistenceConfig[1] !== '') {
        this.addResult({
          testName: 'Redis Security - Persistence',
          status: 'WARNING',
          details: 'Redis persistence is enabled',
          severity: 'LOW',
          recommendation: 'Ensure Redis dump files are properly secured',
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      this.addResult({
        testName: 'Redis Security - Connection Test',
        status: 'WARNING',
        details: `Unable to test Redis security: ${error.message}`,
        severity: 'MEDIUM',
        recommendation: 'Manually verify Redis security configuration',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testDataLeakage(): Promise<void> {
    console.log('🔍 Testing for data leakage...');
    
    try {
      // Test for overly permissive views
      const viewsQuery = `
        SELECT schemaname, viewname, definition
        FROM pg_views
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
      `;
      
      const result = await this.postgresClient.query(viewsQuery);
      
      for (const view of result.rows) {
        // Check if view exposes sensitive data
        if (view.definition.toLowerCase().includes('password') || 
            view.definition.toLowerCase().includes('secret') ||
            view.definition.toLowerCase().includes('private')) {
          this.addResult({
            testName: `Data Leakage - View ${view.viewname}`,
            status: 'FAIL',
            details: `View ${view.viewname} may expose sensitive data`,
            severity: 'HIGH',
            recommendation: 'Review view definition and restrict sensitive data access',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Test for public schema usage
      const publicTablesQuery = `
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `;
      
      const publicTables = await this.postgresClient.query(publicTablesQuery);
      
      if (publicTables.rows.length > 0) {
        this.addResult({
          testName: 'Data Leakage - Public Schema',
          status: 'WARNING',
          details: `${publicTables.rows.length} tables in public schema`,
          severity: 'MEDIUM',
          recommendation: 'Consider using specific schemas instead of public',
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      this.addResult({
        testName: 'Data Leakage - Schema Analysis',
        status: 'WARNING',
        details: `Unable to analyze schema for data leakage: ${error.message}`,
        severity: 'MEDIUM',
        recommendation: 'Manually review database schema for data exposure',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testPrivilegeEscalation(): Promise<void> {
    console.log('🔍 Testing for privilege escalation...');
    
    try {
      // Test for SECURITY DEFINER functions
      const functionQuery = `
        SELECT proname, prosecdef, proowner
        FROM pg_proc
        WHERE prosecdef = true
      `;
      
      const result = await this.postgresClient.query(functionQuery);
      
      if (result.rows.length > 0) {
        this.addResult({
          testName: 'Privilege Escalation - SECURITY DEFINER Functions',
          status: 'WARNING',
          details: `${result.rows.length} SECURITY DEFINER functions found`,
          severity: 'MEDIUM',
          recommendation: 'Review SECURITY DEFINER functions for privilege escalation risks',
          timestamp: new Date().toISOString()
        });
      }
      
      // Test for functions with elevated privileges
      const elevatedFuncsQuery = `
        SELECT f.proname, r.rolname as owner, r.rolsuper
        FROM pg_proc f
        JOIN pg_roles r ON f.proowner = r.oid
        WHERE r.rolsuper = true AND f.prosecdef = true
      `;
      
      const elevatedResult = await this.postgresClient.query(elevatedFuncsQuery);
      
      if (elevatedResult.rows.length > 0) {
        this.addResult({
          testName: 'Privilege Escalation - Superuser Functions',
          status: 'FAIL',
          details: `SECURITY DEFINER functions owned by superuser`,
          severity: 'HIGH',
          recommendation: 'Change ownership of SECURITY DEFINER functions to non-superuser',
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      this.addResult({
        testName: 'Privilege Escalation - Function Analysis',
        status: 'WARNING',
        details: `Unable to analyze functions: ${error.message}`,
        severity: 'MEDIUM',
        recommendation: 'Manually review database functions for privilege issues',
        timestamp: new Date().toISOString()
      });
    }
  }

  private appearsToBEncrypted(value: string): boolean {
    // Check if value appears to be encrypted/hashed
    if (value.length < 8) return false;
    
    // Check for base64 encoding
    if (/^[A-Za-z0-9+/]+=*$/.test(value) && value.length % 4 === 0) return true;
    
    // Check for hex encoding
    if (/^[a-fA-F0-9]+$/.test(value) && value.length >= 32) return true;
    
    // Check for bcrypt/scrypt hashes
    if (value.startsWith('$2') || value.startsWith('$scrypt')) return true;
    
    // Check for high entropy (likely encrypted)
    const entropy = this.calculateEntropy(value);
    return entropy > 4.5; // High entropy threshold
  }

  private calculateEntropy(str: string): number {
    const charCounts = new Map<string, number>();
    for (const char of str) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }
    
    let entropy = 0;
    for (const count of charCounts.values()) {
      const probability = count / str.length;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy;
  }

  private addResult(result: DatabaseSecurityResult): void {
    this.results.push(result);
    
    const statusEmoji = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    const severityColor = result.severity === 'CRITICAL' ? '\x1b[31m' : 
                         result.severity === 'HIGH' ? '\x1b[91m' :
                         result.severity === 'MEDIUM' ? '\x1b[93m' : '\x1b[92m';
    
    console.log(`${statusEmoji} ${severityColor}[${result.severity}]\x1b[0m ${result.testName}: ${result.details}`);
  }

  private generateReport(): void {
    const reportPath = path.join(process.cwd(), 'security', 'reports', 'database-security-report.json');
    
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

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📋 Database Security Report Generated: ${reportPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Passed: ${summary.passed}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   ⚠️  Warnings: ${summary.warnings}`);
    console.log(`   🚨 Critical: ${summary.critical}`);
    console.log(`   🔥 High: ${summary.high}`);
    console.log(`   📢 Medium: ${summary.medium}`);
    console.log(`   ℹ️  Low: ${summary.low}`);
  }
}

export default DatabaseSecurityTester;
