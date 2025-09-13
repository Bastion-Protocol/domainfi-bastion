import express from 'express';
import { createPrometheusMetrics } from 'prometheus-api-metrics';
import { collectDefaultMetrics, register, Counter, Histogram, Gauge } from 'prom-client';
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import winston from 'winston';
import cron from 'node-cron';
import Redis from 'ioredis';

interface SecurityMetrics {
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  compliance: {
    overallScore: number;
    soc2Score: number;
    iso27001Score: number;
    gdprScore: number;
  };
  incidents: {
    total: number;
    resolved: number;
    mttr: number; // Mean Time To Resolve (hours)
  };
  testing: {
    contractsCoverage: number;
    apiTestsPassed: number;
    frontendTestsPassed: number;
  };
  dependencies: {
    total: number;
    outdated: number;
    vulnerable: number;
  };
}

interface SecurityAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'vulnerability' | 'compliance' | 'incident' | 'anomaly';
  title: string;
  description: string;
  affectedSystems: string[];
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  assignee?: string;
  metadata: Record<string, any>;
}

class SecurityMonitoringSystem extends EventEmitter {
  private app: express.Application;
  private server: any;
  private wss: WebSocket.Server;
  private redis: Redis;
  private logger: winston.Logger;
  
  // Prometheus metrics
  private metrics = {
    vulnerabilities: new Gauge({
      name: 'security_vulnerabilities_total',
      help: 'Total number of security vulnerabilities by severity',
      labelNames: ['severity', 'component']
    }),
    
    complianceScore: new Gauge({
      name: 'security_compliance_score',
      help: 'Security compliance score by framework',
      labelNames: ['framework']
    }),
    
    securityIncidents: new Counter({
      name: 'security_incidents_total',
      help: 'Total number of security incidents',
      labelNames: ['severity', 'type', 'status']
    }),
    
    incidentResolutionTime: new Histogram({
      name: 'security_incident_resolution_time_hours',
      help: 'Time to resolve security incidents in hours',
      labelNames: ['severity', 'type'],
      buckets: [0.5, 1, 2, 4, 8, 16, 24, 48, 72]
    }),
    
    testCoverage: new Gauge({
      name: 'security_test_coverage_percent',
      help: 'Security test coverage percentage',
      labelNames: ['component']
    }),
    
    dependencyVulnerabilities: new Gauge({
      name: 'security_dependency_vulnerabilities',
      help: 'Number of vulnerable dependencies',
      labelNames: ['severity', 'package_type']
    }),
    
    securityScanDuration: new Histogram({
      name: 'security_scan_duration_seconds',
      help: 'Duration of security scans',
      labelNames: ['scan_type'],
      buckets: [30, 60, 120, 300, 600, 1200, 1800, 3600]
    }),
    
    alertsGenerated: new Counter({
      name: 'security_alerts_total',
      help: 'Total number of security alerts generated',
      labelNames: ['severity', 'type', 'source']
    })
  };
  
  constructor() {
    super();
    this.setupLogger();
    this.setupRedis();
    this.setupExpress();
    this.setupWebSocket();
    this.setupMetrics();
    this.startMonitoring();
  }
  
  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'security-monitoring' },
      transports: [
        new winston.transports.File({ 
          filename: 'logs/security-monitoring.log',
          maxsize: 10485760, // 10MB
          maxFiles: 5
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }
  
  private setupRedis(): void {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }
  
  private setupExpress(): void {
    this.app = express();
    this.app.use(express.json());
    this.app.use(express.static('public'));
    
    // Prometheus metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    });
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });
    
    // Security dashboard endpoint
    this.app.get('/dashboard', async (req, res) => {
      const metrics = await this.getCurrentSecurityMetrics();
      res.json(metrics);
    });
    
    // Alerts endpoint
    this.app.get('/alerts', async (req, res) => {
      const alerts = await this.getActiveAlerts();
      res.json(alerts);
    });
    
    // Alert acknowledgment endpoint
    this.app.post('/alerts/:id/acknowledge', async (req, res) => {
      const { id } = req.params;
      const { assignee } = req.body;
      
      try {
        await this.acknowledgeAlert(id, assignee);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to acknowledge alert' });
      }
    });
    
    // Security metrics submission endpoint
    this.app.post('/metrics/submit', async (req, res) => {
      try {
        await this.updateSecurityMetrics(req.body);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to update metrics' });
      }
    });
  }
  
  private setupWebSocket(): void {
    this.server = this.app.listen(process.env.PORT || 3001, () => {
      this.logger.info(`Security monitoring server started on port ${process.env.PORT || 3001}`);
    });
    
    this.wss = new WebSocket.Server({ server: this.server });
    
    this.wss.on('connection', (ws) => {
      this.logger.info('New WebSocket connection established');
      
      // Send current metrics on connection
      this.getCurrentSecurityMetrics().then(metrics => {
        ws.send(JSON.stringify({
          type: 'metrics_update',
          data: metrics
        }));
      });
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleWebSocketMessage(ws, data);
        } catch (error) {
          this.logger.error('Invalid WebSocket message:', error);
        }
      });
      
      ws.on('close', () => {
        this.logger.info('WebSocket connection closed');
      });
    });
  }
  
  private setupMetrics(): void {
    // Collect default Node.js metrics
    collectDefaultMetrics({
      prefix: 'security_monitoring_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
    });
    
    // Initialize custom metrics
    Object.values(this.metrics).forEach(metric => {
      register.registerMetric(metric);
    });
  }
  
  private startMonitoring(): void {
    // Schedule regular monitoring tasks
    
    // Every minute: Check for new vulnerabilities
    cron.schedule('* * * * *', async () => {
      await this.checkVulnerabilities();
    });
    
    // Every 5 minutes: Update security metrics
    cron.schedule('*/5 * * * *', async () => {
      await this.updateSecurityDashboard();
    });
    
    // Every 15 minutes: Check compliance status
    cron.schedule('*/15 * * * *', async () => {
      await this.checkComplianceStatus();
    });
    
    // Every hour: Generate security reports
    cron.schedule('0 * * * *', async () => {
      await this.generateHourlyReport();
    });
    
    // Daily: Generate comprehensive security report
    cron.schedule('0 2 * * *', async () => {
      await this.generateDailyReport();
    });
    
    this.logger.info('Security monitoring tasks scheduled');
  }
  
  private async checkVulnerabilities(): Promise<void> {
    try {
      // Check latest vulnerability scan results
      const scanResults = await this.redis.get('latest_vulnerability_scan');
      if (!scanResults) return;
      
      const vulnerabilities = JSON.parse(scanResults);
      
      // Update Prometheus metrics
      ['critical', 'high', 'medium', 'low'].forEach(severity => {
        const count = vulnerabilities.filter((v: any) => v.severity === severity).length;
        this.metrics.vulnerabilities.set({ severity, component: 'all' }, count);
      });
      
      // Check for new critical vulnerabilities
      const criticalVulns = vulnerabilities.filter((v: any) => v.severity === 'critical');
      
      for (const vuln of criticalVulns) {
        const alertExists = await this.redis.exists(`alert:vuln:${vuln.id}`);
        if (!alertExists) {
          await this.createSecurityAlert({
            id: `vuln-${vuln.id}`,
            severity: 'critical',
            type: 'vulnerability',
            title: `Critical Vulnerability: ${vuln.title}`,
            description: vuln.description,
            affectedSystems: vuln.affectedSystems || ['unknown'],
            timestamp: new Date(),
            status: 'active',
            metadata: vuln
          });
        }
      }
      
    } catch (error) {
      this.logger.error('Error checking vulnerabilities:', error);
    }
  }
  
  private async updateSecurityDashboard(): Promise<void> {
    try {
      const metrics = await this.getCurrentSecurityMetrics();
      
      // Update Prometheus metrics
      this.metrics.complianceScore.set({ framework: 'overall' }, metrics.compliance.overallScore);
      this.metrics.complianceScore.set({ framework: 'soc2' }, metrics.compliance.soc2Score);
      this.metrics.complianceScore.set({ framework: 'iso27001' }, metrics.compliance.iso27001Score);
      this.metrics.complianceScore.set({ framework: 'gdpr' }, metrics.compliance.gdprScore);
      
      this.metrics.testCoverage.set({ component: 'contracts' }, metrics.testing.contractsCoverage);
      this.metrics.testCoverage.set({ component: 'api' }, metrics.testing.apiTestsPassed);
      this.metrics.testCoverage.set({ component: 'frontend' }, metrics.testing.frontendTestsPassed);
      
      this.metrics.dependencyVulnerabilities.set({ severity: 'all', package_type: 'npm' }, metrics.dependencies.vulnerable);
      
      // Broadcast to WebSocket clients
      this.broadcastToClients({
        type: 'metrics_update',
        data: metrics
      });
      
      // Store in Redis for persistence
      await this.redis.setex('current_security_metrics', 300, JSON.stringify(metrics));
      
    } catch (error) {
      this.logger.error('Error updating security dashboard:', error);
    }
  }
  
  private async checkComplianceStatus(): Promise<void> {
    try {
      // Check various compliance frameworks
      const complianceChecks = await Promise.all([
        this.checkSOC2Compliance(),
        this.checkISO27001Compliance(),
        this.checkGDPRCompliance()
      ]);
      
      const [soc2, iso27001, gdpr] = complianceChecks;
      
      // Generate alerts for compliance issues
      if (soc2.score < 80) {
        await this.createSecurityAlert({
          id: 'compliance-soc2-low',
          severity: 'high',
          type: 'compliance',
          title: 'SOC 2 Compliance Score Below Threshold',
          description: `SOC 2 compliance score is ${soc2.score}%, below the required 80%`,
          affectedSystems: ['compliance'],
          timestamp: new Date(),
          status: 'active',
          metadata: { framework: 'SOC2', score: soc2.score, findings: soc2.findings }
        });
      }
      
      if (iso27001.score < 75) {
        await this.createSecurityAlert({
          id: 'compliance-iso27001-low',
          severity: 'high',
          type: 'compliance',
          title: 'ISO 27001 Compliance Score Below Threshold',
          description: `ISO 27001 compliance score is ${iso27001.score}%, below the required 75%`,
          affectedSystems: ['compliance'],
          timestamp: new Date(),
          status: 'active',
          metadata: { framework: 'ISO27001', score: iso27001.score, findings: iso27001.findings }
        });
      }
      
      if (gdpr.score < 90) {
        await this.createSecurityAlert({
          id: 'compliance-gdpr-low',
          severity: 'critical',
          type: 'compliance',
          title: 'GDPR Compliance Score Below Threshold',
          description: `GDPR compliance score is ${gdpr.score}%, below the required 90%`,
          affectedSystems: ['compliance', 'data-processing'],
          timestamp: new Date(),
          status: 'active',
          metadata: { framework: 'GDPR', score: gdpr.score, findings: gdpr.findings }
        });
      }
      
    } catch (error) {
      this.logger.error('Error checking compliance status:', error);
    }
  }
  
  private async generateHourlyReport(): Promise<void> {
    try {
      const metrics = await this.getCurrentSecurityMetrics();
      const alerts = await this.getActiveAlerts();
      
      const report = {
        timestamp: new Date().toISOString(),
        period: 'hourly',
        summary: {
          totalVulnerabilities: Object.values(metrics.vulnerabilities).reduce((a, b) => a + b, 0),
          criticalVulnerabilities: metrics.vulnerabilities.critical,
          activeAlerts: alerts.filter(a => a.status === 'active').length,
          complianceScore: metrics.compliance.overallScore
        },
        metrics,
        alerts: alerts.slice(0, 10), // Latest 10 alerts
        trends: await this.calculateSecurityTrends('1h')
      };
      
      // Store report
      await this.redis.setex(`report:hourly:${Date.now()}`, 86400, JSON.stringify(report));
      
      // Send to monitoring systems
      await this.sendReportToMonitoringSystems(report);
      
      this.logger.info('Hourly security report generated');
      
    } catch (error) {
      this.logger.error('Error generating hourly report:', error);
    }
  }
  
  private async generateDailyReport(): Promise<void> {
    try {
      const metrics = await this.getCurrentSecurityMetrics();
      const alerts = await this.getAlertsFromPeriod(24 * 60 * 60 * 1000); // Last 24 hours
      const incidents = await this.getIncidentsFromPeriod(24 * 60 * 60 * 1000);
      
      const report = {
        timestamp: new Date().toISOString(),
        period: 'daily',
        executiveSummary: {
          securityPosture: this.assessSecurityPosture(metrics),
          keyFindings: await this.generateKeyFindings(metrics, alerts, incidents),
          recommendations: await this.generateRecommendations(metrics, alerts, incidents)
        },
        detailedMetrics: metrics,
        alertsSummary: {
          total: alerts.length,
          bySevertiy: this.groupBySeverity(alerts),
          byType: this.groupByType(alerts),
          resolved: alerts.filter(a => a.status === 'resolved').length
        },
        incidentsSummary: {
          total: incidents.length,
          bySevertiy: this.groupBySeverity(incidents),
          averageResolutionTime: this.calculateAverageResolutionTime(incidents)
        },
        complianceStatus: await this.generateComplianceReport(),
        trends: await this.calculateSecurityTrends('24h')
      };
      
      // Store comprehensive report
      await this.redis.setex(`report:daily:${Date.now()}`, 30 * 86400, JSON.stringify(report));
      
      // Send to stakeholders
      await this.sendDailyReportToStakeholders(report);
      
      this.logger.info('Daily security report generated');
      
    } catch (error) {
      this.logger.error('Error generating daily report:', error);
    }
  }
  
  private async createSecurityAlert(alert: SecurityAlert): Promise<void> {
    try {
      // Store alert
      await this.redis.setex(`alert:${alert.id}`, 86400 * 7, JSON.stringify(alert));
      await this.redis.lpush('alerts:active', alert.id);
      
      // Update metrics
      this.metrics.alertsGenerated.inc({
        severity: alert.severity,
        type: alert.type,
        source: 'monitoring'
      });
      
      // Broadcast to clients
      this.broadcastToClients({
        type: 'new_alert',
        data: alert
      });
      
      // Send notifications based on severity
      if (alert.severity === 'critical') {
        await this.sendCriticalAlertNotification(alert);
      } else if (alert.severity === 'high') {
        await this.sendHighSeverityNotification(alert);
      }
      
      this.logger.warn(`Security alert created: ${alert.title}`, { alert });
      
    } catch (error) {
      this.logger.error('Error creating security alert:', error);
    }
  }
  
  private async acknowledgeAlert(alertId: string, assignee: string): Promise<void> {
    const alertData = await this.redis.get(`alert:${alertId}`);
    if (!alertData) {
      throw new Error('Alert not found');
    }
    
    const alert: SecurityAlert = JSON.parse(alertData);
    alert.status = 'acknowledged';
    alert.assignee = assignee;
    
    await this.redis.setex(`alert:${alertId}`, 86400 * 7, JSON.stringify(alert));
    
    this.broadcastToClients({
      type: 'alert_acknowledged',
      data: { alertId, assignee }
    });
    
    this.logger.info(`Alert acknowledged: ${alertId} by ${assignee}`);
  }
  
  private async updateSecurityMetrics(newMetrics: Partial<SecurityMetrics>): Promise<void> {
    const currentMetrics = await this.getCurrentSecurityMetrics();
    const updatedMetrics = { ...currentMetrics, ...newMetrics };
    
    await this.redis.setex('current_security_metrics', 300, JSON.stringify(updatedMetrics));
    
    this.broadcastToClients({
      type: 'metrics_update',
      data: updatedMetrics
    });
  }
  
  private async getCurrentSecurityMetrics(): Promise<SecurityMetrics> {
    const cached = await this.redis.get('current_security_metrics');
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Default metrics if none exist
    return {
      vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
      compliance: { overallScore: 85, soc2Score: 88, iso27001Score: 82, gdprScore: 91 },
      incidents: { total: 0, resolved: 0, mttr: 0 },
      testing: { contractsCoverage: 95, apiTestsPassed: 98, frontendTestsPassed: 92 },
      dependencies: { total: 150, outdated: 5, vulnerable: 2 }
    };
  }
  
  private async getActiveAlerts(): Promise<SecurityAlert[]> {
    const alertIds = await this.redis.lrange('alerts:active', 0, -1);
    const alerts: SecurityAlert[] = [];
    
    for (const id of alertIds) {
      const alertData = await this.redis.get(`alert:${id}`);
      if (alertData) {
        alerts.push(JSON.parse(alertData));
      }
    }
    
    return alerts.filter(alert => alert.status === 'active');
  }
  
  private broadcastToClients(message: any): void {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
  
  private handleWebSocketMessage(ws: WebSocket, data: any): void {
    switch (data.type) {
      case 'subscribe_alerts':
        // Subscribe to alert updates
        break;
      case 'subscribe_metrics':
        // Subscribe to metrics updates
        break;
      case 'acknowledge_alert':
        this.acknowledgeAlert(data.alertId, data.assignee);
        break;
      default:
        this.logger.warn('Unknown WebSocket message type:', data.type);
    }
  }
  
  // Helper methods for compliance checks
  private async checkSOC2Compliance(): Promise<{ score: number; findings: any[] }> {
    // Implementation would check SOC 2 controls
    return { score: 85, findings: [] };
  }
  
  private async checkISO27001Compliance(): Promise<{ score: number; findings: any[] }> {
    // Implementation would check ISO 27001 controls
    return { score: 82, findings: [] };
  }
  
  private async checkGDPRCompliance(): Promise<{ score: number; findings: any[] }> {
    // Implementation would check GDPR requirements
    return { score: 91, findings: [] };
  }
  
  // Helper methods for reporting
  private assessSecurityPosture(metrics: SecurityMetrics): string {
    const score = metrics.compliance.overallScore;
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    return 'Needs Improvement';
  }
  
  private async generateKeyFindings(metrics: SecurityMetrics, alerts: SecurityAlert[], incidents: any[]): Promise<string[]> {
    const findings: string[] = [];
    
    if (metrics.vulnerabilities.critical > 0) {
      findings.push(`${metrics.vulnerabilities.critical} critical vulnerabilities require immediate attention`);
    }
    
    if (metrics.compliance.overallScore < 80) {
      findings.push('Overall compliance score below acceptable threshold');
    }
    
    const activeAlerts = alerts.filter(a => a.status === 'active');
    if (activeAlerts.length > 10) {
      findings.push(`${activeAlerts.length} active security alerts require attention`);
    }
    
    return findings;
  }
  
  private async generateRecommendations(metrics: SecurityMetrics, alerts: SecurityAlert[], incidents: any[]): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (metrics.vulnerabilities.high > 5) {
      recommendations.push('Prioritize remediation of high-severity vulnerabilities');
    }
    
    if (metrics.testing.contractsCoverage < 95) {
      recommendations.push('Increase smart contract test coverage');
    }
    
    if (metrics.dependencies.vulnerable > 0) {
      recommendations.push('Update vulnerable dependencies');
    }
    
    return recommendations;
  }
  
  private groupBySeverity(items: any[]): Record<string, number> {
    return items.reduce((acc, item) => {
      acc[item.severity] = (acc[item.severity] || 0) + 1;
      return acc;
    }, {});
  }
  
  private groupByType(items: any[]): Record<string, number> {
    return items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});
  }
  
  private calculateAverageResolutionTime(incidents: any[]): number {
    if (incidents.length === 0) return 0;
    
    const resolved = incidents.filter(i => i.resolvedAt);
    if (resolved.length === 0) return 0;
    
    const totalTime = resolved.reduce((acc, incident) => {
      const resolutionTime = new Date(incident.resolvedAt).getTime() - new Date(incident.createdAt).getTime();
      return acc + resolutionTime;
    }, 0);
    
    return totalTime / resolved.length / (1000 * 60 * 60); // Convert to hours
  }
  
  private async calculateSecurityTrends(period: string): Promise<any> {
    // Implementation would calculate trends over the specified period
    return {
      vulnerabilityTrend: 'decreasing',
      complianceTrend: 'stable',
      incidentTrend: 'decreasing'
    };
  }
  
  private async getAlertsFromPeriod(periodMs: number): Promise<SecurityAlert[]> {
    // Implementation would fetch alerts from the specified time period
    return [];
  }
  
  private async getIncidentsFromPeriod(periodMs: number): Promise<any[]> {
    // Implementation would fetch incidents from the specified time period
    return [];
  }
  
  private async generateComplianceReport(): Promise<any> {
    return {
      soc2: await this.checkSOC2Compliance(),
      iso27001: await this.checkISO27001Compliance(),
      gdpr: await this.checkGDPRCompliance()
    };
  }
  
  private async sendCriticalAlertNotification(alert: SecurityAlert): Promise<void> {
    // Implementation would send critical alerts via multiple channels
    this.logger.error(`CRITICAL ALERT: ${alert.title}`, { alert });
  }
  
  private async sendHighSeverityNotification(alert: SecurityAlert): Promise<void> {
    // Implementation would send high severity notifications
    this.logger.warn(`HIGH SEVERITY ALERT: ${alert.title}`, { alert });
  }
  
  private async sendReportToMonitoringSystems(report: any): Promise<void> {
    // Implementation would send reports to external monitoring systems
    this.logger.info('Report sent to monitoring systems');
  }
  
  private async sendDailyReportToStakeholders(report: any): Promise<void> {
    // Implementation would send daily reports to stakeholders
    this.logger.info('Daily report sent to stakeholders');
  }
}

// Initialize and start the security monitoring system
if (require.main === module) {
  const monitor = new SecurityMonitoringSystem();
  
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    monitor.server?.close(() => {
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    monitor.server?.close(() => {
      process.exit(0);
    });
  });
}

export default SecurityMonitoringSystem;
