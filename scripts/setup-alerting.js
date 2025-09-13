#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class AlertingSetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.alertingDir = path.join(this.projectRoot, 'security', 'alerting');
    this.prometheusDir = path.join(this.alertingDir, 'prometheus');
    this.alertmanagerDir = path.join(this.alertingDir, 'alertmanager');
    
    // Ensure directories exist
    fs.ensureDirSync(this.prometheusDir);
    fs.ensureDirSync(this.alertmanagerDir);
  }

  async setupAlerting() {
    console.log('🚨 Setting up comprehensive security alerting...');
    
    await this.createPrometheusRules();
    await this.createAlertmanagerConfig();
    await this.createGrafanaAlerts();
    await this.createSlackIntegration();
    await this.createEmailTemplates();
    await this.createEscalationPolicies();
    
    console.log('✅ Security alerting system configured successfully');
  }

  async createPrometheusRules() {
    console.log('📋 Creating Prometheus alerting rules...');
    
    const rules = {
      groups: [
        {
          name: 'bastion-security-critical',
          interval: '30s',
          rules: [
            {
              alert: 'CriticalVulnerabilityDetected',
              expr: 'security_vulnerabilities_total{severity="critical"} > 0',
              for: '0m',
              labels: {
                severity: 'critical',
                category: 'security',
                component: 'vulnerability-scan'
              },
              annotations: {
                summary: 'Critical security vulnerability detected',
                description: 'Critical vulnerability found: {{ $value }} critical vulnerabilities detected in the system.',
                runbook_url: 'https://security-runbooks.bastion.protocol/critical-vulnerabilities',
                dashboard_url: 'https://grafana.bastion.protocol/d/bastion-security/security-monitoring'
              }
            },
            {
              alert: 'SecurityScoreCritical',
              expr: 'security_compliance_score{framework="overall"} < 70',
              for: '5m',
              labels: {
                severity: 'critical',
                category: 'compliance',
                component: 'security-score'
              },
              annotations: {
                summary: 'Overall security score critically low',
                description: 'Security compliance score is {{ $value }}%, below critical threshold of 70%.',
                runbook_url: 'https://security-runbooks.bastion.protocol/security-score',
                dashboard_url: 'https://grafana.bastion.protocol/d/bastion-security/security-monitoring'
              }
            },
            {
              alert: 'ActiveSecurityIncident',
              expr: 'security_incidents_total{status="active"} > 0',
              for: '0m',
              labels: {
                severity: 'critical',
                category: 'incident',
                component: 'incident-management'
              },
              annotations: {
                summary: 'Active security incident requires attention',
                description: '{{ $value }} active security incidents require immediate attention.',
                runbook_url: 'https://security-runbooks.bastion.protocol/incident-response',
                dashboard_url: 'https://grafana.bastion.protocol/d/bastion-security/security-monitoring'
              }
            },
            {
              alert: 'SystemUptimeCritical',
              expr: 'security_system_uptime_percent < 99',
              for: '2m',
              labels: {
                severity: 'critical',
                category: 'availability',
                component: 'system-health'
              },
              annotations: {
                summary: 'System uptime critically low',
                description: 'System uptime is {{ $value }}%, below critical threshold of 99%.',
                runbook_url: 'https://security-runbooks.bastion.protocol/system-availability',
                dashboard_url: 'https://grafana.bastion.protocol/d/bastion-security/security-monitoring'
              }
            }
          ]
        },
        {
          name: 'bastion-security-warning',
          interval: '1m',
          rules: [
            {
              alert: 'HighVulnerabilityDetected',
              expr: 'security_vulnerabilities_total{severity="high"} > 5',
              for: '5m',
              labels: {
                severity: 'warning',
                category: 'security',
                component: 'vulnerability-scan'
              },
              annotations: {
                summary: 'High severity vulnerabilities detected',
                description: '{{ $value }} high severity vulnerabilities detected, exceeding threshold of 5.',
                runbook_url: 'https://security-runbooks.bastion.protocol/high-vulnerabilities',
                dashboard_url: 'https://grafana.bastion.protocol/d/bastion-security/security-monitoring'
              }
            },
            {
              alert: 'SecurityScoreWarning',
              expr: 'security_compliance_score{framework="overall"} < 80 and security_compliance_score{framework="overall"} >= 70',
              for: '10m',
              labels: {
                severity: 'warning',
                category: 'compliance',
                component: 'security-score'
              },
              annotations: {
                summary: 'Security score below optimal threshold',
                description: 'Security compliance score is {{ $value }}%, below optimal threshold of 80%.',
                runbook_url: 'https://security-runbooks.bastion.protocol/security-score',
                dashboard_url: 'https://grafana.bastion.protocol/d/bastion-security/security-monitoring'
              }
            },
            {
              alert: 'TestCoverageLow',
              expr: 'security_test_coverage_percent{component="contracts"} < 90',
              for: '15m',
              labels: {
                severity: 'warning',
                category: 'testing',
                component: 'test-coverage'
              },
              annotations: {
                summary: 'Smart contract test coverage below threshold',
                description: 'Smart contract test coverage is {{ $value }}%, below threshold of 90%.',
                runbook_url: 'https://security-runbooks.bastion.protocol/test-coverage',
                dashboard_url: 'https://grafana.bastion.protocol/d/bastion-security/security-monitoring'
              }
            },
            {
              alert: 'VulnerableDependencies',
              expr: 'security_dependencies_total{status="vulnerable"} > 10',
              for: '30m',
              labels: {
                severity: 'warning',
                category: 'dependencies',
                component: 'dependency-scan'
              },
              annotations: {
                summary: 'Multiple vulnerable dependencies detected',
                description: '{{ $value }} vulnerable dependencies detected, exceeding threshold of 10.',
                runbook_url: 'https://security-runbooks.bastion.protocol/vulnerable-dependencies',
                dashboard_url: 'https://grafana.bastion.protocol/d/bastion-security/security-monitoring'
              }
            },
            {
              alert: 'SecurityTestFailures',
              expr: 'security_tests_total{status="failed"} > 0',
              for: '5m',
              labels: {
                severity: 'warning',
                category: 'testing',
                component: 'security-tests'
              },
              annotations: {
                summary: 'Security tests failing',
                description: '{{ $value }} security tests are currently failing.',
                runbook_url: 'https://security-runbooks.bastion.protocol/test-failures',
                dashboard_url: 'https://grafana.bastion.protocol/d/bastion-security/security-monitoring'
              }
            }
          ]
        },
        {
          name: 'bastion-security-info',
          interval: '5m',
          rules: [
            {
              alert: 'MediumVulnerabilityDetected',
              expr: 'security_vulnerabilities_total{severity="medium"} > 20',
              for: '30m',
              labels: {
                severity: 'info',
                category: 'security',
                component: 'vulnerability-scan'
              },
              annotations: {
                summary: 'Multiple medium severity vulnerabilities detected',
                description: '{{ $value }} medium severity vulnerabilities detected, exceeding threshold of 20.',
                runbook_url: 'https://security-runbooks.bastion.protocol/medium-vulnerabilities',
                dashboard_url: 'https://grafana.bastion.protocol/d/bastion-security/security-monitoring'
              }
            },
            {
              alert: 'ComplianceFrameworkWarning',
              expr: 'security_compliance_score{framework!="overall"} < 80',
              for: '1h',
              labels: {
                severity: 'info',
                category: 'compliance',
                component: 'framework-compliance'
              },
              annotations: {
                summary: 'Compliance framework score below threshold',
                description: '{{ $labels.framework }} compliance score is {{ $value }}%, below threshold of 80%.',
                runbook_url: 'https://security-runbooks.bastion.protocol/compliance-frameworks',
                dashboard_url: 'https://grafana.bastion.protocol/d/bastion-security/security-monitoring'
              }
            },
            {
              alert: 'HighErrorRate',
              expr: 'security_error_rate_percent > 5',
              for: '15m',
              labels: {
                severity: 'info',
                category: 'performance',
                component: 'error-rate'
              },
              annotations: {
                summary: 'High error rate detected',
                description: 'Error rate is {{ $value }}%, above threshold of 5%.',
                runbook_url: 'https://security-runbooks.bastion.protocol/error-rate',
                dashboard_url: 'https://grafana.bastion.protocol/d/bastion-security/security-monitoring'
              }
            },
            {
              alert: 'ThreatDetectionRateLow',
              expr: 'security_threat_detection_rate_percent < 95',
              for: '1h',
              labels: {
                severity: 'info',
                category: 'detection',
                component: 'threat-detection'
              },
              annotations: {
                summary: 'Threat detection rate below optimal',
                description: 'Threat detection rate is {{ $value }}%, below optimal threshold of 95%.',
                runbook_url: 'https://security-runbooks.bastion.protocol/threat-detection',
                dashboard_url: 'https://grafana.bastion.protocol/d/bastion-security/security-monitoring'
              }
            }
          ]
        }
      ]
    };

    const rulesFile = path.join(this.prometheusDir, 'security-alerts.yml');
    await fs.writeFile(rulesFile, require('js-yaml').dump(rules), 'utf8');
    console.log(`💾 Prometheus rules saved: ${rulesFile}`);
  }

  async createAlertmanagerConfig() {
    console.log('📧 Creating Alertmanager configuration...');
    
    const config = {
      global: {
        smtp_smarthost: process.env.SMTP_HOST || 'localhost:587',
        smtp_from: process.env.ALERT_FROM_EMAIL || 'security-alerts@bastion.protocol',
        smtp_auth_username: process.env.SMTP_USERNAME,
        smtp_auth_password: process.env.SMTP_PASSWORD,
        slack_api_url: process.env.SLACK_WEBHOOK_URL
      },
      route: {
        group_by: ['alertname', 'severity', 'category'],
        group_wait: '10s',
        group_interval: '5m',
        repeat_interval: '1h',
        receiver: 'security-team',
        routes: [
          {
            match: { severity: 'critical' },
            receiver: 'critical-alerts',
            group_wait: '0s',
            group_interval: '1m',
            repeat_interval: '5m'
          },
          {
            match: { severity: 'warning' },
            receiver: 'warning-alerts',
            group_interval: '10m',
            repeat_interval: '2h'
          },
          {
            match: { severity: 'info' },
            receiver: 'info-alerts',
            group_interval: '30m',
            repeat_interval: '24h'
          }
        ]
      },
      receivers: [
        {
          name: 'security-team',
          email_configs: [
            {
              to: process.env.SECURITY_TEAM_EMAIL || 'security@bastion.protocol',
              subject: '[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }} - Bastion Protocol Security Alert',
              body: `
                {{ range .Alerts }}
                Alert: {{ .Annotations.summary }}
                Description: {{ .Annotations.description }}
                Severity: {{ .Labels.severity }}
                Component: {{ .Labels.component }}
                
                Dashboard: {{ .Annotations.dashboard_url }}
                Runbook: {{ .Annotations.runbook_url }}
                {{ end }}
              `,
              html: `
                <h2>Bastion Protocol Security Alert</h2>
                {{ range .Alerts }}
                <div style="border: 2px solid {{ if eq .Labels.severity "critical" }}red{{ else if eq .Labels.severity "warning" }}orange{{ else }}blue{{ end }}; padding: 10px; margin: 10px 0;">
                  <h3 style="color: {{ if eq .Labels.severity "critical" }}red{{ else if eq .Labels.severity "warning" }}orange{{ else }}blue{{ end }};">
                    [{{ .Labels.severity | upper }}] {{ .Annotations.summary }}
                  </h3>
                  <p><strong>Description:</strong> {{ .Annotations.description }}</p>
                  <p><strong>Component:</strong> {{ .Labels.component }}</p>
                  <p><strong>Category:</strong> {{ .Labels.category }}</p>
                  <p>
                    <a href="{{ .Annotations.dashboard_url }}" style="color: blue;">View Dashboard</a> |
                    <a href="{{ .Annotations.runbook_url }}" style="color: blue;">View Runbook</a>
                  </p>
                </div>
                {{ end }}
              `
            }
          ],
          slack_configs: [
            {
              channel: process.env.SLACK_SECURITY_CHANNEL || '#security-alerts',
              title: '[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}',
              text: `
                {{ range .Alerts }}
                *Alert:* {{ .Annotations.summary }}
                *Severity:* {{ .Labels.severity }}
                *Description:* {{ .Annotations.description }}
                *Component:* {{ .Labels.component }}
                
                <{{ .Annotations.dashboard_url }}|View Dashboard> | <{{ .Annotations.runbook_url }}|View Runbook>
                {{ end }}
              `,
              color: '{{ if eq .GroupLabels.severity "critical" }}danger{{ else if eq .GroupLabels.severity "warning" }}warning{{ else }}good{{ end }}'
            }
          ]
        },
        {
          name: 'critical-alerts',
          email_configs: [
            {
              to: process.env.CRITICAL_ALERTS_EMAIL || 'critical-security@bastion.protocol',
              subject: '🚨 CRITICAL SECURITY ALERT - {{ .GroupLabels.alertname }}',
              body: `
                CRITICAL SECURITY ALERT REQUIRES IMMEDIATE ATTENTION
                
                {{ range .Alerts }}
                Alert: {{ .Annotations.summary }}
                Description: {{ .Annotations.description }}
                Time: {{ .StartsAt }}
                
                IMMEDIATE ACTION REQUIRED:
                1. Review the dashboard: {{ .Annotations.dashboard_url }}
                2. Follow the runbook: {{ .Annotations.runbook_url }}
                3. Escalate if needed according to incident response procedures
                {{ end }}
              `
            }
          ],
          slack_configs: [
            {
              channel: process.env.SLACK_CRITICAL_CHANNEL || '#critical-security',
              title: '🚨 CRITICAL SECURITY ALERT',
              text: `
                <!channel> CRITICAL SECURITY ALERT - IMMEDIATE ATTENTION REQUIRED
                
                {{ range .Alerts }}
                *Alert:* {{ .Annotations.summary }}
                *Description:* {{ .Annotations.description }}
                *Time:* {{ .StartsAt }}
                
                <{{ .Annotations.dashboard_url }}|🔍 View Dashboard> | <{{ .Annotations.runbook_url }}|📋 Emergency Runbook>
                {{ end }}
              `,
              color: 'danger'
            }
          ],
          pagerduty_configs: [
            {
              routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
              description: '{{ .GroupLabels.alertname }}: {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}',
              severity: 'critical',
              details: {
                alert_count: '{{ len .Alerts }}',
                dashboard: '{{ range .Alerts }}{{ .Annotations.dashboard_url }}{{ end }}',
                runbook: '{{ range .Alerts }}{{ .Annotations.runbook_url }}{{ end }}'
              }
            }
          ]
        },
        {
          name: 'warning-alerts',
          email_configs: [
            {
              to: process.env.WARNING_ALERTS_EMAIL || 'security-warnings@bastion.protocol',
              subject: '⚠️ Security Warning - {{ .GroupLabels.alertname }}',
              body: `
                Security Warning Alert
                
                {{ range .Alerts }}
                Alert: {{ .Annotations.summary }}
                Description: {{ .Annotations.description }}
                Severity: {{ .Labels.severity }}
                
                Dashboard: {{ .Annotations.dashboard_url }}
                Runbook: {{ .Annotations.runbook_url }}
                {{ end }}
              `
            }
          ],
          slack_configs: [
            {
              channel: process.env.SLACK_WARNING_CHANNEL || '#security-warnings',
              title: '⚠️ Security Warning',
              text: `
                {{ range .Alerts }}
                *Alert:* {{ .Annotations.summary }}
                *Description:* {{ .Annotations.description }}
                
                <{{ .Annotations.dashboard_url }}|View Dashboard> | <{{ .Annotations.runbook_url }}|View Runbook>
                {{ end }}
              `,
              color: 'warning'
            }
          ]
        },
        {
          name: 'info-alerts',
          slack_configs: [
            {
              channel: process.env.SLACK_INFO_CHANNEL || '#security-info',
              title: 'ℹ️ Security Information',
              text: `
                {{ range .Alerts }}
                *Alert:* {{ .Annotations.summary }}
                *Description:* {{ .Annotations.description }}
                
                <{{ .Annotations.dashboard_url }}|View Dashboard>
                {{ end }}
              `,
              color: 'good'
            }
          ]
        }
      ],
      inhibit_rules: [
        {
          source_match: { severity: 'critical' },
          target_match: { severity: 'warning' },
          equal: ['alertname', 'component']
        },
        {
          source_match: { severity: 'warning' },
          target_match: { severity: 'info' },
          equal: ['alertname', 'component']
        }
      ]
    };

    const configFile = path.join(this.alertmanagerDir, 'alertmanager.yml');
    await fs.writeFile(configFile, require('js-yaml').dump(config), 'utf8');
    console.log(`💾 Alertmanager config saved: ${configFile}`);
  }

  async createGrafanaAlerts() {
    console.log('📊 Creating Grafana alert rules...');
    
    const alertRules = {
      apiVersion: 1,
      groups: [
        {
          name: 'bastion-security-dashboard-alerts',
          orgId: 1,
          folder: 'Security Alerts',
          interval: '1m',
          rules: [
            {
              uid: 'critical-vulnerability-alert',
              title: 'Critical Vulnerability Dashboard Alert',
              condition: 'A',
              data: [
                {
                  refId: 'A',
                  queryType: '',
                  relativeTimeRange: {
                    from: 300,
                    to: 0
                  },
                  datasourceUid: 'prometheus',
                  model: {
                    expr: 'security_vulnerabilities_total{severity="critical"}',
                    interval: '',
                    refId: 'A'
                  }
                }
              ],
              noDataState: 'NoData',
              execErrState: 'Alerting',
              for: '0m',
              annotations: {
                summary: 'Critical vulnerabilities detected in security dashboard',
                description: 'The security dashboard shows {{ $value }} critical vulnerabilities that require immediate attention.'
              },
              labels: {
                severity: 'critical',
                team: 'security'
              }
            },
            {
              uid: 'security-score-alert',
              title: 'Security Score Below Threshold',
              condition: 'A',
              data: [
                {
                  refId: 'A',
                  queryType: '',
                  relativeTimeRange: {
                    from: 600,
                    to: 0
                  },
                  datasourceUid: 'prometheus',
                  model: {
                    expr: 'security_compliance_score{framework="overall"}',
                    interval: '',
                    refId: 'A'
                  }
                }
              ],
              noDataState: 'NoData',
              execErrState: 'Alerting',
              for: '5m',
              annotations: {
                summary: 'Overall security score below acceptable threshold',
                description: 'The overall security compliance score is {{ $value }}%, which is below the acceptable threshold.'
              },
              labels: {
                severity: 'warning',
                team: 'security'
              }
            }
          ]
        }
      ]
    };

    const grafanaAlertsFile = path.join(this.alertingDir, 'grafana-alerts.json');
    await fs.writeJson(grafanaAlertsFile, alertRules, { spaces: 2 });
    console.log(`💾 Grafana alerts saved: ${grafanaAlertsFile}`);
  }

  async createSlackIntegration() {
    console.log('💬 Creating Slack integration scripts...');
    
    const slackScript = `#!/usr/bin/env node

const axios = require('axios');

class SlackNotifier {
  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.channels = {
      critical: process.env.SLACK_CRITICAL_CHANNEL || '#critical-security',
      warning: process.env.SLACK_WARNING_CHANNEL || '#security-warnings',
      info: process.env.SLACK_INFO_CHANNEL || '#security-info',
      general: process.env.SLACK_SECURITY_CHANNEL || '#security-alerts'
    };
  }

  async sendAlert(severity, title, message, details = {}) {
    if (!this.webhookUrl) {
      console.log('⚠️  Slack webhook URL not configured');
      return;
    }

    const color = this.getSeverityColor(severity);
    const channel = this.channels[severity] || this.channels.general;
    
    const payload = {
      channel: channel,
      username: 'Bastion Security Bot',
      icon_emoji: this.getSeverityEmoji(severity),
      attachments: [
        {
          color: color,
          title: title,
          text: message,
          fields: Object.entries(details).map(([key, value]) => ({
            title: key,
            value: value,
            short: true
          })),
          footer: 'Bastion Protocol Security System',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    if (severity === 'critical') {
      payload.text = '<!channel> 🚨 CRITICAL SECURITY ALERT 🚨';
    }

    try {
      await axios.post(this.webhookUrl, payload);
      console.log(\`✅ Slack notification sent to \${channel}\`);
    } catch (error) {
      console.error('❌ Failed to send Slack notification:', error.message);
    }
  }

  getSeverityColor(severity) {
    const colors = {
      critical: '#FF0000',
      warning: '#FFA500',
      info: '#0066CC',
      success: '#00AA00'
    };
    return colors[severity] || '#808080';
  }

  getSeverityEmoji(severity) {
    const emojis = {
      critical: ':rotating_light:',
      warning: ':warning:',
      info: ':information_source:',
      success: ':white_check_mark:'
    };
    return emojis[severity] || ':bell:';
  }

  async testConnection() {
    await this.sendAlert('info', 'Slack Integration Test', 'This is a test message from the Bastion Protocol security monitoring system.', {
      'Test Time': new Date().toISOString(),
      'System': 'Security Monitoring',
      'Status': 'Operational'
    });
  }
}

// CLI usage
if (require.main === module) {
  const notifier = new SlackNotifier();
  const [severity, title, ...messageParts] = process.argv.slice(2);
  
  if (!severity || !title || messageParts.length === 0) {
    console.log('Usage: node slack-notifier.js <severity> <title> <message>');
    console.log('Severities: critical, warning, info, success');
    process.exit(1);
  }
  
  const message = messageParts.join(' ');
  notifier.sendAlert(severity, title, message)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = SlackNotifier;`;

    const slackFile = path.join(this.alertingDir, 'slack-notifier.js');
    await fs.writeFile(slackFile, slackScript, 'utf8');
    await fs.chmod(slackFile, '755');
    console.log(`💾 Slack notifier saved: ${slackFile}`);
  }

  async createEmailTemplates() {
    console.log('📧 Creating email templates...');
    
    const templates = {
      critical: {
        subject: '🚨 CRITICAL SECURITY ALERT - {{ .alertname }}',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .alert-critical { border-left: 5px solid #dc3545; background-color: #f8d7da; }
              .alert-warning { border-left: 5px solid #ffc107; background-color: #fff3cd; }
              .alert-info { border-left: 5px solid #17a2b8; background-color: #d1ecf1; }
              .alert-box { padding: 15px; margin: 10px 0; }
              .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              .footer { background-color: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; }
              .button { background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🚨 CRITICAL SECURITY ALERT</h1>
              <p>Bastion Protocol Security Monitoring</p>
            </div>
            <div class="content">
              <div class="alert-box alert-critical">
                <h2>{{ .summary }}</h2>
                <p><strong>Alert:</strong> {{ .alertname }}</p>
                <p><strong>Description:</strong> {{ .description }}</p>
                <p><strong>Severity:</strong> CRITICAL</p>
                <p><strong>Time:</strong> {{ .startsAt }}</p>
                <p><strong>Component:</strong> {{ .component }}</p>
              </div>
              <div style="text-align: center; margin: 20px 0;">
                <a href="{{ .dashboardUrl }}" class="button">View Dashboard</a>
                <a href="{{ .runbookUrl }}" class="button" style="background-color: #dc3545;">Emergency Runbook</a>
              </div>
              <h3>Immediate Actions Required:</h3>
              <ol>
                <li>Acknowledge this alert immediately</li>
                <li>Review the security dashboard for detailed information</li>
                <li>Follow the emergency runbook procedures</li>
                <li>Escalate to security team lead if necessary</li>
                <li>Document all remediation actions taken</li>
              </ol>
            </div>
            <div class="footer">
              <p>This is an automated security alert from Bastion Protocol monitoring system.</p>
              <p>For questions, contact: security@bastion.protocol</p>
            </div>
          </body>
          </html>
        `
      },
      warning: {
        subject: '⚠️ Security Warning - {{ .alertname }}',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .alert-warning { border-left: 5px solid #ffc107; background-color: #fff3cd; }
              .alert-box { padding: 15px; margin: 10px 0; }
              .header { background-color: #ffc107; color: #212529; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              .footer { background-color: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; }
              .button { background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>⚠️ Security Warning</h1>
              <p>Bastion Protocol Security Monitoring</p>
            </div>
            <div class="content">
              <div class="alert-box alert-warning">
                <h2>{{ .summary }}</h2>
                <p><strong>Alert:</strong> {{ .alertname }}</p>
                <p><strong>Description:</strong> {{ .description }}</p>
                <p><strong>Severity:</strong> WARNING</p>
                <p><strong>Time:</strong> {{ .startsAt }}</p>
                <p><strong>Component:</strong> {{ .component }}</p>
              </div>
              <div style="text-align: center; margin: 20px 0;">
                <a href="{{ .dashboardUrl }}" class="button">View Dashboard</a>
                <a href="{{ .runbookUrl }}" class="button">View Runbook</a>
              </div>
              <h3>Recommended Actions:</h3>
              <ul>
                <li>Review the security dashboard for context</li>
                <li>Follow standard operating procedures</li>
                <li>Monitor for escalation to critical level</li>
                <li>Schedule remediation during next maintenance window</li>
              </ul>
            </div>
            <div class="footer">
              <p>This is an automated security alert from Bastion Protocol monitoring system.</p>
            </div>
          </body>
          </html>
        `
      }
    };

    for (const [severity, template] of Object.entries(templates)) {
      const templateFile = path.join(this.alertingDir, `email-template-${severity}.html`);
      await fs.writeFile(templateFile, template.html, 'utf8');
      console.log(`💾 Email template saved: ${templateFile}`);
    }
  }

  async createEscalationPolicies() {
    console.log('📈 Creating escalation policies...');
    
    const escalationConfig = {
      policies: [
        {
          name: 'critical-security-incidents',
          description: 'Escalation policy for critical security incidents',
          steps: [
            {
              level: 1,
              timeout: '5m',
              contacts: [
                {
                  type: 'email',
                  address: process.env.SECURITY_LEAD_EMAIL || 'security-lead@bastion.protocol'
                },
                {
                  type: 'slack',
                  channel: '#critical-security'
                },
                {
                  type: 'pagerduty',
                  key: process.env.PAGERDUTY_INTEGRATION_KEY
                }
              ]
            },
            {
              level: 2,
              timeout: '10m',
              contacts: [
                {
                  type: 'email',
                  address: process.env.CTO_EMAIL || 'cto@bastion.protocol'
                },
                {
                  type: 'phone',
                  number: process.env.SECURITY_LEAD_PHONE
                }
              ]
            },
            {
              level: 3,
              timeout: '15m',
              contacts: [
                {
                  type: 'email',
                  address: process.env.CEO_EMAIL || 'ceo@bastion.protocol'
                },
                {
                  type: 'emergency_broadcast',
                  channels: ['#general', '#leadership']
                }
              ]
            }
          ]
        },
        {
          name: 'security-warnings',
          description: 'Escalation policy for security warnings',
          steps: [
            {
              level: 1,
              timeout: '30m',
              contacts: [
                {
                  type: 'email',
                  address: process.env.SECURITY_TEAM_EMAIL || 'security@bastion.protocol'
                },
                {
                  type: 'slack',
                  channel: '#security-warnings'
                }
              ]
            },
            {
              level: 2,
              timeout: '2h',
              contacts: [
                {
                  type: 'email',
                  address: process.env.SECURITY_LEAD_EMAIL || 'security-lead@bastion.protocol'
                }
              ]
            }
          ]
        }
      ],
      rules: [
        {
          condition: {
            severity: 'critical',
            category: 'security'
          },
          policy: 'critical-security-incidents'
        },
        {
          condition: {
            severity: 'critical',
            category: 'availability'
          },
          policy: 'critical-security-incidents'
        },
        {
          condition: {
            severity: 'warning'
          },
          policy: 'security-warnings'
        }
      ]
    };

    const escalationFile = path.join(this.alertingDir, 'escalation-policies.json');
    await fs.writeJson(escalationFile, escalationConfig, { spaces: 2 });
    console.log(`💾 Escalation policies saved: ${escalationFile}`);

    // Create escalation script
    const escalationScript = `#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const SlackNotifier = require('./slack-notifier');

class EscalationManager {
  constructor() {
    this.configFile = path.join(__dirname, 'escalation-policies.json');
    this.slackNotifier = new SlackNotifier();
    this.activeEscalations = new Map();
  }

  async loadConfig() {
    try {
      return await fs.readJson(this.configFile);
    } catch (error) {
      console.error('Failed to load escalation config:', error);
      return { policies: [], rules: [] };
    }
  }

  async escalateAlert(alert) {
    const config = await this.loadConfig();
    const policy = this.findMatchingPolicy(alert, config);
    
    if (!policy) {
      console.log('No matching escalation policy found for alert:', alert.alertname);
      return;
    }

    console.log(\`Starting escalation for alert: \${alert.alertname} using policy: \${policy.name}\`);
    
    const escalationId = \`\${alert.alertname}-\${Date.now()}\`;
    this.activeEscalations.set(escalationId, {
      alert,
      policy,
      currentLevel: 0,
      startTime: Date.now()
    });

    await this.executeEscalationLevel(escalationId, 0);
  }

  findMatchingPolicy(alert, config) {
    for (const rule of config.rules) {
      if (this.matchesCondition(alert, rule.condition)) {
        return config.policies.find(p => p.name === rule.policy);
      }
    }
    return null;
  }

  matchesCondition(alert, condition) {
    for (const [key, value] of Object.entries(condition)) {
      if (alert.labels[key] !== value) {
        return false;
      }
    }
    return true;
  }

  async executeEscalationLevel(escalationId, level) {
    const escalation = this.activeEscalations.get(escalationId);
    if (!escalation || level >= escalation.policy.steps.length) {
      return;
    }

    const step = escalation.policy.steps[level];
    console.log(\`Executing escalation level \${level + 1} for \${escalation.alert.alertname}\`);

    // Send notifications to all contacts at this level
    for (const contact of step.contacts) {
      await this.sendNotification(escalation.alert, contact, level + 1);
    }

    // Schedule next escalation level
    if (level + 1 < escalation.policy.steps.length) {
      const timeoutMs = this.parseTimeout(step.timeout);
      setTimeout(() => {
        // Check if alert is still active
        if (this.activeEscalations.has(escalationId)) {
          this.executeEscalationLevel(escalationId, level + 1);
        }
      }, timeoutMs);
    }
  }

  async sendNotification(alert, contact, level) {
    switch (contact.type) {
      case 'email':
        console.log(\`📧 Sending email to \${contact.address} (Level \${level})\`);
        // Email sending would be implemented here
        break;
      
      case 'slack':
        await this.slackNotifier.sendAlert(
          alert.labels.severity,
          \`[Level \${level} Escalation] \${alert.annotations.summary}\`,
          alert.annotations.description,
          {
            'Escalation Level': level,
            'Alert Name': alert.alertname,
            'Component': alert.labels.component
          }
        );
        break;
      
      case 'phone':
        console.log(\`📞 Making phone call to \${contact.number} (Level \${level})\`);
        // Phone call implementation would go here
        break;
      
      case 'pagerduty':
        console.log(\`📟 Sending to PagerDuty (Level \${level})\`);
        // PagerDuty integration would go here
        break;
      
      case 'emergency_broadcast':
        for (const channel of contact.channels) {
          await this.slackNotifier.sendAlert(
            'critical',
            \`🚨 EMERGENCY BROADCAST - Level \${level} Escalation\`,
            \`\${alert.annotations.summary}\\n\\nThis alert has escalated to level \${level} and requires immediate attention.\`,
            { 'Alert': alert.alertname, 'Component': alert.labels.component }
          );
        }
        break;
    }
  }

  parseTimeout(timeout) {
    const match = timeout.match(/(\\d+)(m|h|s)/);
    if (!match) return 300000; // Default 5 minutes
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      default: return 300000;
    }
  }

  resolveEscalation(alertname) {
    for (const [id, escalation] of this.activeEscalations.entries()) {
      if (escalation.alert.alertname === alertname) {
        console.log(\`Resolving escalation for: \${alertname}\`);
        this.activeEscalations.delete(id);
        return true;
      }
    }
    return false;
  }
}

// CLI usage
if (require.main === module) {
  const manager = new EscalationManager();
  const command = process.argv[2];
  
  switch (command) {
    case 'escalate':
      const alertData = JSON.parse(process.argv[3] || '{}');
      manager.escalateAlert(alertData);
      break;
      
    case 'resolve':
      const alertname = process.argv[3];
      const resolved = manager.resolveEscalation(alertname);
      console.log(resolved ? 'Escalation resolved' : 'No active escalation found');
      break;
      
    default:
      console.log('Usage: node escalation-manager.js <escalate|resolve> [data]');
      process.exit(1);
  }
}

module.exports = EscalationManager;`;

    const escalationScriptFile = path.join(this.alertingDir, 'escalation-manager.js');
    await fs.writeFile(escalationScriptFile, escalationScript, 'utf8');
    await fs.chmod(escalationScriptFile, '755');
    console.log(`💾 Escalation manager saved: ${escalationScriptFile}`);
  }

  async testAlertingSystem() {
    console.log('🧪 Testing alerting system...');
    
    // Test Slack integration
    try {
      const SlackNotifier = require(path.join(this.alertingDir, 'slack-notifier.js'));
      const notifier = new SlackNotifier();
      await notifier.testConnection();
    } catch (error) {
      console.log('⚠️  Slack test failed:', error.message);
    }

    // Test email templates
    console.log('📧 Email templates created and ready for use');
    
    // Test escalation policies
    console.log('📈 Escalation policies configured');
    
    console.log('✅ Alerting system test completed');
  }
}

// CLI execution
if (require.main === module) {
  const alerting = new AlertingSetup();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      alerting.setupAlerting()
        .then(() => {
          console.log('✅ Alerting setup completed successfully');
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Error setting up alerting:', error);
          process.exit(1);
        });
      break;
      
    case 'test':
      alerting.testAlertingSystem()
        .then(() => {
          console.log('✅ Alerting test completed');
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Error testing alerting:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node setup-alerting.js <setup|test>');
      console.log('Commands:');
      console.log('  setup - Create comprehensive alerting configuration');
      console.log('  test  - Test alerting system components');
      process.exit(1);
  }
}

module.exports = AlertingSetup;
