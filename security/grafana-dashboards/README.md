# Grafana Security Dashboard Configuration

This directory contains the Grafana dashboard configuration for the Bastion Protocol security monitoring system.

## Files

- `bastion-security-dashboard.json` - Current dashboard configuration
- `bastion-security-dashboard-*.json` - Timestamped dashboard backups

## Dashboard Overview

The security dashboard provides comprehensive monitoring across multiple dimensions:

### Security Overview
- **Overall Security Score** - Aggregate security posture gauge (0-100)
- **Critical Vulnerabilities** - Count of critical severity findings
- **High Vulnerabilities** - Count of high severity findings

### Vulnerability Analysis
- **Vulnerability Trends** - Time series showing vulnerability counts by severity
- **Vulnerability Distribution** - Pie chart breakdown of vulnerabilities by severity
- Real-time tracking of security findings across all tools

### Compliance Frameworks
- **SOC 2 Compliance** - Service Organization Control 2 assessment
- **ISO 27001 Compliance** - Information security management standard
- **GDPR Compliance** - General Data Protection Regulation assessment
- **OWASP Compliance** - Open Web Application Security Project guidelines

### Testing & Code Quality
- **Smart Contract Test Coverage** - Percentage of contract code covered by tests
- **Security Tests** - Passed vs failed security test counts
- **Vulnerable Dependencies** - Count of dependencies with known vulnerabilities

### Security Incidents
- **Active Incidents** - Currently open security incidents
- **Mean Time to Resolve** - Average incident resolution time in hours
- **Incident Resolution Trend** - Historical view of incident management

### System Health & Performance
- **System Uptime** - Overall system availability percentage
- **Average Response Time** - System response latency in milliseconds
- **Error Rate** - Percentage of failed requests
- **Threat Detection Rate** - Effectiveness of security monitoring

### Detailed Metrics
- **Security Metrics Summary** - Tabular view of all key security indicators

## Metrics Sources

The dashboard displays metrics from:

- **Prometheus** - Primary metrics collection and storage
- **Slither** - Static analysis vulnerability data
- **MythX** - Professional smart contract security analysis
- **Semgrep** - Code scanning and SAST findings
- **Snyk** - Dependency vulnerability scanning
- **OWASP ZAP** - Web application security testing
- **Custom Security Monitor** - Real-time security event tracking

## Panel Types

- **Gauge Panels** - For percentage-based metrics (scores, uptime, coverage)
- **Stat Panels** - For single value displays (counts, times)
- **Time Series** - For trend analysis over time
- **Pie Charts** - For distribution analysis
- **Bar Gauges** - For comparative metrics
- **Tables** - For detailed metric breakdowns

## Thresholds

### Security Scores
- **Red**: 0-69 (Critical - Immediate action required)
- **Yellow**: 70-79 (Warning - Attention needed)
- **Green**: 80+ (Good - Acceptable security posture)

### Test Coverage
- **Red**: 0-79% (Insufficient coverage)
- **Yellow**: 80-89% (Moderate coverage)
- **Green**: 90%+ (Excellent coverage)

### Uptime
- **Red**: <99% (Unacceptable)
- **Yellow**: 99-99.4% (Needs improvement)
- **Green**: 99.5%+ (Excellent)

### Threat Detection
- **Red**: 0-89% (Poor detection capability)
- **Yellow**: 90-94% (Moderate detection)
- **Green**: 95%+ (Excellent detection)

## Template Variables

- **$severity** - Filter by vulnerability severity (critical, high, medium, low)
- **$framework** - Filter by compliance framework (soc2, iso27001, gdpr, owasp)

## Refresh Intervals

- **Default**: 30 seconds
- **Available**: 5s, 10s, 30s, 1m, 5m, 15m, 30m, 1h, 2h, 1d

## Time Ranges

- **Default**: Last 1 hour
- **Common**: 5m, 15m, 1h, 6h, 12h, 24h, 7d, 30d

## Alerts

Dashboard panels can be configured with alerting rules:

### Critical Alerts
- Security score below 70
- Critical vulnerabilities detected
- System uptime below 99%
- Active security incidents

### Warning Alerts
- Security score below 80
- High vulnerabilities detected
- Test coverage below 90%
- Error rate above 5%

## Usage

### Viewing the Dashboard

1. Access Grafana at the configured URL
2. Navigate to "Dashboards" → "Browse"
3. Select "Bastion Protocol - Security Monitoring"

### Customizing the Dashboard

1. Click the gear icon to enter edit mode
2. Modify panels, queries, or layout as needed
3. Save changes

### Creating New Panels

1. Click "Add Panel" while in edit mode
2. Configure data source (Prometheus)
3. Write PromQL queries for desired metrics
4. Customize visualization options
5. Set appropriate thresholds and colors

## Troubleshooting

### No Data Showing

1. Verify Prometheus data source is configured correctly
2. Check that security monitoring scripts are running
3. Ensure metrics are being pushed to Prometheus
4. Validate PromQL queries in Prometheus UI

### Slow Loading

1. Reduce time range for heavy queries
2. Increase refresh interval
3. Optimize PromQL queries
4. Consider data retention policies

### Authentication Issues

1. Verify Grafana credentials
2. Check API key permissions
3. Validate network connectivity
4. Review Grafana logs

## Maintenance

### Regular Tasks

- Review and update thresholds quarterly
- Add new metrics as security tools evolve
- Archive old dashboard versions
- Validate alert configurations

### Performance Optimization

- Monitor query performance
- Optimize dashboard loading times
- Review data retention policies
- Update dashboard based on usage patterns

## Integration

The dashboard integrates with:

- **Prometheus** - Metrics storage and querying
- **Alertmanager** - Alert routing and notification
- **Slack** - Alert notifications
- **GitHub Actions** - CI/CD pipeline integration
- **Security Monitor** - Real-time event processing

## Security Considerations

- Restrict dashboard access to authorized personnel
- Regularly review and rotate API keys
- Monitor dashboard access logs
- Ensure secure communication (HTTPS)
- Backup dashboard configurations regularly
