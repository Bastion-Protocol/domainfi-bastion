#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

class GrafanaDashboardUpdater {
  constructor() {
    this.projectRoot = process.cwd();
    this.dashboardsDir = path.join(this.projectRoot, 'security', 'grafana-dashboards');
    this.grafanaUrl = process.env.GRAFANA_URL || 'http://localhost:3000';
    this.grafanaApiKey = process.env.GRAFANA_API_KEY;
    this.grafanaUser = process.env.GRAFANA_USER || 'admin';
    this.grafanaPassword = process.env.GRAFANA_PASSWORD || 'admin';
    
    fs.ensureDirSync(this.dashboardsDir);
  }

  async updateDashboard() {
    console.log('📊 Updating Grafana security dashboard...');
    
    // Generate comprehensive security dashboard
    const dashboard = this.createSecurityDashboard();
    
    // Save dashboard to file
    await this.saveDashboardToFile(dashboard);
    
    // Try to upload to Grafana if configured
    if (this.grafanaUrl) {
      await this.uploadToGrafana(dashboard);
    }
    
    console.log('✅ Grafana dashboard updated successfully');
  }

  createSecurityDashboard() {
    const dashboard = {
      dashboard: {
        id: null,
        uid: 'bastion-security',
        title: 'Bastion Protocol - Security Monitoring',
        description: 'Comprehensive security metrics and monitoring for Bastion Protocol',
        tags: ['security', 'bastion', 'defi', 'monitoring'],
        timezone: 'browser',
        editable: true,
        fiscalYearStartMonth: 0,
        graphTooltip: 1,
        hideControls: false,
        links: [],
        liveNow: false,
        panels: this.createPanels(),
        refresh: '30s',
        schemaVersion: 37,
        style: 'dark',
        templating: {
          list: this.createTemplateVariables()
        },
        time: {
          from: 'now-1h',
          to: 'now'
        },
        timepicker: {
          refresh_intervals: [
            '5s',
            '10s',
            '30s',
            '1m',
            '5m',
            '15m',
            '30m',
            '1h',
            '2h',
            '1d'
          ]
        },
        version: 1,
        weekStart: ''
      },
      folderId: 0,
      message: 'Updated by automated security monitoring system',
      overwrite: true
    };

    return dashboard;
  }

  createPanels() {
    return [
      // Overview Row
      this.createRowPanel('Security Overview', 1),
      
      // Security Score Gauge
      this.createGaugePanel(
        'Overall Security Score',
        'security_compliance_score{framework="overall"}',
        2, 0, 12, 8,
        { min: 0, max: 100 },
        [
          { color: 'red', value: 0 },
          { color: 'yellow', value: 70 },
          { color: 'green', value: 80 }
        ]
      ),
      
      // Critical Vulnerabilities
      this.createStatPanel(
        'Critical Vulnerabilities',
        'security_vulnerabilities_total{severity="critical"}',
        14, 0, 5, 8,
        'red'
      ),
      
      // High Vulnerabilities
      this.createStatPanel(
        'High Vulnerabilities',
        'security_vulnerabilities_total{severity="high"}',
        19, 0, 5, 8,
        'orange'
      ),
      
      // Vulnerabilities Row
      this.createRowPanel('Vulnerability Analysis', 9),
      
      // Vulnerability Trend
      this.createTimeSeriesPanel(
        'Vulnerability Trends',
        [
          {
            expr: 'security_vulnerabilities_total{severity="critical"}',
            legendFormat: 'Critical',
            refId: 'A'
          },
          {
            expr: 'security_vulnerabilities_total{severity="high"}',
            legendFormat: 'High',
            refId: 'B'
          },
          {
            expr: 'security_vulnerabilities_total{severity="medium"}',
            legendFormat: 'Medium',
            refId: 'C'
          },
          {
            expr: 'security_vulnerabilities_total{severity="low"}',
            legendFormat: 'Low',
            refId: 'D'
          }
        ],
        10, 0, 12, 8
      ),
      
      // Vulnerability Distribution Pie Chart
      this.createPieChartPanel(
        'Vulnerability Distribution',
        [
          {
            expr: 'security_vulnerabilities_total{severity="critical"}',
            legendFormat: 'Critical',
            refId: 'A'
          },
          {
            expr: 'security_vulnerabilities_total{severity="high"}',
            legendFormat: 'High',
            refId: 'B'
          },
          {
            expr: 'security_vulnerabilities_total{severity="medium"}',
            legendFormat: 'Medium',
            refId: 'C'
          },
          {
            expr: 'security_vulnerabilities_total{severity="low"}',
            legendFormat: 'Low',
            refId: 'D'
          }
        ],
        12, 0, 12, 8
      ),
      
      // Compliance Row
      this.createRowPanel('Compliance Frameworks', 19),
      
      // Compliance Scores Bar Gauge
      this.createBarGaugePanel(
        'Compliance Framework Scores',
        [
          {
            expr: 'security_compliance_score{framework="soc2"}',
            legendFormat: 'SOC 2',
            refId: 'A'
          },
          {
            expr: 'security_compliance_score{framework="iso27001"}',
            legendFormat: 'ISO 27001',
            refId: 'B'
          },
          {
            expr: 'security_compliance_score{framework="gdpr"}',
            legendFormat: 'GDPR',
            refId: 'C'
          },
          {
            expr: 'security_compliance_score{framework="owasp"}',
            legendFormat: 'OWASP',
            refId: 'D'
          }
        ],
        20, 0, 24, 8,
        { min: 0, max: 100 }
      ),
      
      // Testing and Quality Row
      this.createRowPanel('Testing & Code Quality', 29),
      
      // Test Coverage
      this.createGaugePanel(
        'Smart Contract Test Coverage',
        'security_test_coverage_percent{component="contracts"}',
        30, 0, 8, 8,
        { min: 0, max: 100 },
        [
          { color: 'red', value: 0 },
          { color: 'yellow', value: 80 },
          { color: 'green', value: 90 }
        ]
      ),
      
      // Tests Passed/Failed
      this.createBarGaugePanel(
        'Security Tests',
        [
          {
            expr: 'security_tests_total{status="passed"}',
            legendFormat: 'Passed',
            refId: 'A'
          },
          {
            expr: 'security_tests_total{status="failed"}',
            legendFormat: 'Failed',
            refId: 'B'
          }
        ],
        8, 0, 8, 8,
        { min: 0 }
      ),
      
      // Dependencies
      this.createStatPanel(
        'Vulnerable Dependencies',
        'security_dependencies_total{status="vulnerable"}',
        16, 0, 8, 8,
        'orange'
      ),
      
      // Incidents Row
      this.createRowPanel('Security Incidents', 39),
      
      // Active Incidents
      this.createStatPanel(
        'Active Incidents',
        'security_incidents_total{status="active"}',
        40, 0, 6, 8,
        'red'
      ),
      
      // Mean Time to Resolve
      this.createStatPanel(
        'Mean Time to Resolve (hours)',
        'security_incident_resolution_time_hours',
        46, 0, 6, 8,
        'blue'
      ),
      
      // Incident Trend
      this.createTimeSeriesPanel(
        'Incident Resolution Trend',
        [
          {
            expr: 'security_incidents_total{status="active"}',
            legendFormat: 'Active',
            refId: 'A'
          },
          {
            expr: 'security_incidents_total{status="resolved"}',
            legendFormat: 'Resolved',
            refId: 'B'
          }
        ],
        52, 0, 12, 8
      ),
      
      // System Health Row
      this.createRowPanel('System Health & Performance', 49),
      
      // System Uptime
      this.createGaugePanel(
        'System Uptime (%)',
        'security_system_uptime_percent',
        50, 0, 6, 8,
        { min: 95, max: 100 },
        [
          { color: 'red', value: 95 },
          { color: 'yellow', value: 99 },
          { color: 'green', value: 99.5 }
        ]
      ),
      
      // Response Time
      this.createStatPanel(
        'Avg Response Time (ms)',
        'security_response_time_milliseconds',
        56, 0, 6, 8,
        'blue'
      ),
      
      // Error Rate
      this.createStatPanel(
        'Error Rate (%)',
        'security_error_rate_percent',
        62, 0, 6, 8,
        'orange'
      ),
      
      // Threat Detection Rate
      this.createGaugePanel(
        'Threat Detection Rate (%)',
        'security_threat_detection_rate_percent',
        68, 0, 6, 8,
        { min: 0, max: 100 },
        [
          { color: 'red', value: 0 },
          { color: 'yellow', value: 90 },
          { color: 'green', value: 95 }
        ]
      ),
      
      // Detailed Metrics Row
      this.createRowPanel('Detailed Security Metrics', 59),
      
      // Security Metrics Table
      this.createTablePanel(
        'Security Metrics Summary',
        [
          {
            expr: 'security_vulnerabilities_total',
            legendFormat: '{{severity}} Vulnerabilities',
            refId: 'A'
          },
          {
            expr: 'security_compliance_score',
            legendFormat: '{{framework}} Compliance',
            refId: 'B'
          },
          {
            expr: 'security_dependencies_total',
            legendFormat: '{{status}} Dependencies',
            refId: 'C'
          }
        ],
        60, 0, 24, 12
      )
    ];
  }

  createTemplateVariables() {
    return [
      {
        current: {
          selected: false,
          text: 'All',
          value: '$__all'
        },
        datasource: {
          type: 'prometheus',
          uid: 'prometheus'
        },
        definition: 'label_values(security_vulnerabilities_total, severity)',
        hide: 0,
        includeAll: true,
        label: 'Severity',
        multi: true,
        name: 'severity',
        options: [],
        query: {
          query: 'label_values(security_vulnerabilities_total, severity)',
          refId: 'StandardVariableQuery'
        },
        refresh: 1,
        regex: '',
        skipUrlSync: false,
        sort: 0,
        type: 'query'
      },
      {
        current: {
          selected: false,
          text: 'All',
          value: '$__all'
        },
        datasource: {
          type: 'prometheus',
          uid: 'prometheus'
        },
        definition: 'label_values(security_compliance_score, framework)',
        hide: 0,
        includeAll: true,
        label: 'Framework',
        multi: true,
        name: 'framework',
        options: [],
        query: {
          query: 'label_values(security_compliance_score, framework)',
          refId: 'StandardVariableQuery'
        },
        refresh: 1,
        regex: '',
        skipUrlSync: false,
        sort: 0,
        type: 'query'
      }
    ];
  }

  createRowPanel(title, gridPos) {
    return {
      collapsed: false,
      gridPos: {
        h: 1,
        w: 24,
        x: 0,
        y: gridPos
      },
      id: gridPos,
      panels: [],
      title: title,
      type: 'row'
    };
  }

  createGaugePanel(title, query, gridPosY, gridPosX, width, height, fieldConfig = {}, thresholds = []) {
    return {
      datasource: {
        type: 'prometheus',
        uid: 'prometheus'
      },
      fieldConfig: {
        defaults: {
          color: {
            mode: 'thresholds'
          },
          custom: {
            displayMode: 'lcd',
            orientation: 'horizontal'
          },
          mappings: [],
          max: fieldConfig.max || 100,
          min: fieldConfig.min || 0,
          thresholds: {
            mode: 'absolute',
            steps: thresholds.length > 0 ? thresholds : [
              { color: 'green', value: null },
              { color: 'red', value: 80 }
            ]
          },
          unit: 'short'
        },
        overrides: []
      },
      gridPos: {
        h: height,
        w: width,
        x: gridPosX,
        y: gridPosY
      },
      id: gridPosY * 100 + gridPosX,
      options: {
        orientation: 'auto',
        reduceOptions: {
          calcs: ['lastNotNull'],
          fields: '',
          values: false
        },
        showThresholdLabels: false,
        showThresholdMarkers: true
      },
      pluginVersion: '9.0.0',
      targets: [
        {
          datasource: {
            type: 'prometheus',
            uid: 'prometheus'
          },
          expr: query,
          refId: 'A'
        }
      ],
      title: title,
      type: 'gauge'
    };
  }

  createStatPanel(title, query, gridPosY, gridPosX, width, height, color = 'blue') {
    return {
      datasource: {
        type: 'prometheus',
        uid: 'prometheus'
      },
      fieldConfig: {
        defaults: {
          color: {
            mode: 'palette-classic'
          },
          custom: {
            displayMode: 'list',
            orientation: 'horizontal'
          },
          mappings: [],
          thresholds: {
            mode: 'absolute',
            steps: [
              { color: 'green', value: null },
              { color: color, value: 0 }
            ]
          }
        },
        overrides: []
      },
      gridPos: {
        h: height,
        w: width,
        x: gridPosX,
        y: gridPosY
      },
      id: gridPosY * 100 + gridPosX,
      options: {
        colorMode: 'value',
        graphMode: 'area',
        justifyMode: 'auto',
        orientation: 'auto',
        reduceOptions: {
          calcs: ['lastNotNull'],
          fields: '',
          values: false
        },
        textMode: 'auto'
      },
      pluginVersion: '9.0.0',
      targets: [
        {
          datasource: {
            type: 'prometheus',
            uid: 'prometheus'
          },
          expr: query,
          refId: 'A'
        }
      ],
      title: title,
      type: 'stat'
    };
  }

  createTimeSeriesPanel(title, targets, gridPosY, gridPosX, width, height) {
    return {
      datasource: {
        type: 'prometheus',
        uid: 'prometheus'
      },
      fieldConfig: {
        defaults: {
          color: {
            mode: 'palette-classic'
          },
          custom: {
            axisLabel: '',
            axisPlacement: 'auto',
            barAlignment: 0,
            drawStyle: 'line',
            fillOpacity: 10,
            gradientMode: 'none',
            hideFrom: {
              legend: false,
              tooltip: false,
              vis: false
            },
            lineInterpolation: 'linear',
            lineWidth: 1,
            pointSize: 5,
            scaleDistribution: {
              type: 'linear'
            },
            showPoints: 'never',
            spanNulls: false,
            stacking: {
              group: 'A',
              mode: 'none'
            },
            thresholdsStyle: {
              mode: 'off'
            }
          },
          mappings: [],
          thresholds: {
            mode: 'absolute',
            steps: [
              { color: 'green', value: null },
              { color: 'red', value: 80 }
            ]
          },
          unit: 'short'
        },
        overrides: []
      },
      gridPos: {
        h: height,
        w: width,
        x: gridPosX,
        y: gridPosY
      },
      id: gridPosY * 100 + gridPosX,
      options: {
        legend: {
          calcs: [],
          displayMode: 'list',
          placement: 'bottom'
        },
        tooltip: {
          mode: 'single',
          sort: 'none'
        }
      },
      targets: targets.map(target => ({
        datasource: {
          type: 'prometheus',
          uid: 'prometheus'
        },
        expr: target.expr,
        legendFormat: target.legendFormat,
        refId: target.refId
      })),
      title: title,
      type: 'timeseries'
    };
  }

  createPieChartPanel(title, targets, gridPosY, gridPosX, width, height) {
    return {
      datasource: {
        type: 'prometheus',
        uid: 'prometheus'
      },
      fieldConfig: {
        defaults: {
          color: {
            mode: 'palette-classic'
          },
          custom: {
            hideFrom: {
              legend: false,
              tooltip: false,
              vis: false
            }
          },
          mappings: []
        },
        overrides: []
      },
      gridPos: {
        h: height,
        w: width,
        x: gridPosX,
        y: gridPosY
      },
      id: gridPosY * 100 + gridPosX,
      options: {
        reduceOptions: {
          calcs: ['lastNotNull'],
          fields: '',
          values: false
        },
        pieType: 'pie',
        tooltip: {
          mode: 'single',
          sort: 'none'
        },
        legend: {
          displayMode: 'list',
          placement: 'right'
        }
      },
      targets: targets.map(target => ({
        datasource: {
          type: 'prometheus',
          uid: 'prometheus'
        },
        expr: target.expr,
        legendFormat: target.legendFormat,
        refId: target.refId
      })),
      title: title,
      type: 'piechart'
    };
  }

  createBarGaugePanel(title, targets, gridPosY, gridPosX, width, height, fieldConfig = {}) {
    return {
      datasource: {
        type: 'prometheus',
        uid: 'prometheus'
      },
      fieldConfig: {
        defaults: {
          color: {
            mode: 'thresholds'
          },
          custom: {
            displayMode: 'lcd',
            orientation: 'horizontal'
          },
          mappings: [],
          max: fieldConfig.max || 100,
          min: fieldConfig.min || 0,
          thresholds: {
            mode: 'absolute',
            steps: [
              { color: 'green', value: null },
              { color: 'red', value: 80 }
            ]
          }
        },
        overrides: []
      },
      gridPos: {
        h: height,
        w: width,
        x: gridPosX,
        y: gridPosY
      },
      id: gridPosY * 100 + gridPosX,
      options: {
        orientation: 'horizontal',
        reduceOptions: {
          calcs: ['lastNotNull'],
          fields: '',
          values: false
        },
        showUnfilled: true
      },
      pluginVersion: '9.0.0',
      targets: targets.map(target => ({
        datasource: {
          type: 'prometheus',
          uid: 'prometheus'
        },
        expr: target.expr,
        legendFormat: target.legendFormat,
        refId: target.refId
      })),
      title: title,
      type: 'bargauge'
    };
  }

  createTablePanel(title, targets, gridPosY, gridPosX, width, height) {
    return {
      datasource: {
        type: 'prometheus',
        uid: 'prometheus'
      },
      fieldConfig: {
        defaults: {
          color: {
            mode: 'thresholds'
          },
          custom: {
            align: 'auto',
            displayMode: 'auto',
            inspect: false
          },
          mappings: [],
          thresholds: {
            mode: 'absolute',
            steps: [
              { color: 'green', value: null },
              { color: 'red', value: 80 }
            ]
          }
        },
        overrides: []
      },
      gridPos: {
        h: height,
        w: width,
        x: gridPosX,
        y: gridPosY
      },
      id: gridPosY * 100 + gridPosX,
      options: {
        showHeader: true,
        sortBy: []
      },
      pluginVersion: '9.0.0',
      targets: targets.map(target => ({
        datasource: {
          type: 'prometheus',
          uid: 'prometheus'
        },
        expr: target.expr,
        legendFormat: target.legendFormat,
        refId: target.refId,
        format: 'table'
      })),
      title: title,
      type: 'table'
    };
  }

  async saveDashboardToFile(dashboard) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `bastion-security-dashboard-${timestamp}.json`;
    const filepath = path.join(this.dashboardsDir, filename);
    
    await fs.writeJson(filepath, dashboard, { spaces: 2 });
    
    // Also save as current dashboard
    const currentPath = path.join(this.dashboardsDir, 'bastion-security-dashboard.json');
    await fs.writeJson(currentPath, dashboard, { spaces: 2 });
    
    console.log(`💾 Dashboard saved: ${filename}`);
  }

  async uploadToGrafana(dashboard) {
    if (!this.grafanaUrl) {
      console.log('⚠️  Grafana URL not configured, skipping upload');
      return;
    }

    console.log('📤 Uploading dashboard to Grafana...');
    
    try {
      // Try with API key first, then basic auth
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (this.grafanaApiKey) {
        headers['Authorization'] = `Bearer ${this.grafanaApiKey}`;
      } else {
        const credentials = Buffer.from(`${this.grafanaUser}:${this.grafanaPassword}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const response = await fetch(`${this.grafanaUrl}/api/dashboards/db`, {
        method: 'POST',
        headers,
        body: JSON.stringify(dashboard)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Dashboard uploaded successfully: ${result.url}`);
      } else {
        const error = await response.text();
        console.log(`⚠️  Failed to upload dashboard: ${response.status} - ${error}`);
      }
      
    } catch (error) {
      console.log(`❌ Error uploading to Grafana: ${error.message}`);
    }
  }

  async createDataSource() {
    if (!this.grafanaUrl) {
      return;
    }

    console.log('🔗 Creating/updating Prometheus data source...');
    
    const dataSource = {
      name: 'Prometheus',
      type: 'prometheus',
      url: process.env.PROMETHEUS_URL || 'http://localhost:9090',
      access: 'proxy',
      isDefault: true,
      basicAuth: false
    };

    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (this.grafanaApiKey) {
        headers['Authorization'] = `Bearer ${this.grafanaApiKey}`;
      } else {
        const credentials = Buffer.from(`${this.grafanaUser}:${this.grafanaPassword}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const response = await fetch(`${this.grafanaUrl}/api/datasources`, {
        method: 'POST',
        headers,
        body: JSON.stringify(dataSource)
      });

      if (response.ok) {
        console.log('✅ Prometheus data source created/updated');
      } else {
        const error = await response.text();
        console.log(`⚠️  Data source update result: ${response.status} - ${error}`);
      }
      
    } catch (error) {
      console.log(`❌ Error creating data source: ${error.message}`);
    }
  }

  async testGrafanaConnection() {
    if (!this.grafanaUrl) {
      console.log('❌ Grafana URL not configured');
      return false;
    }

    console.log('🔍 Testing Grafana connection...');
    
    try {
      const response = await fetch(`${this.grafanaUrl}/api/health`);
      
      if (response.ok) {
        console.log('✅ Grafana connection successful');
        return true;
      } else {
        console.log(`⚠️  Grafana responded with status ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Grafana connection failed: ${error.message}`);
      return false;
    }
  }
}

// CLI execution
if (require.main === module) {
  const updater = new GrafanaDashboardUpdater();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'update':
      updater.updateDashboard()
        .then(() => {
          console.log('✅ Dashboard updated successfully');
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Error updating dashboard:', error);
          process.exit(1);
        });
      break;
      
    case 'test':
      updater.testGrafanaConnection()
        .then(success => {
          process.exit(success ? 0 : 1);
        })
        .catch(error => {
          console.error('❌ Error testing connection:', error);
          process.exit(1);
        });
      break;
      
    case 'datasource':
      updater.createDataSource()
        .then(() => {
          console.log('✅ Data source configured');
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Error configuring data source:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node update-grafana-dashboard.js <command>');
      console.log('Commands:');
      console.log('  update     - Generate and upload security dashboard');
      console.log('  test       - Test connection to Grafana');
      console.log('  datasource - Create/update Prometheus data source');
      process.exit(1);
  }
}

module.exports = GrafanaDashboardUpdater;
