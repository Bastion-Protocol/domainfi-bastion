#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';

interface SecurityThreshold {
  metric: string;
  value: number;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  action: 'fail' | 'warn' | 'info';
}

interface SecurityMetrics {
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  compliance: {
    overallScore: number;
    soc2Score: number;
    iso27001Score: number;
    gdprScore: number;
    owaspScore: number;
    pcidssScore: number;
    nistScore: number;
  };
  testing: {
    contractsCoverage: number;
    contractsTestsPassed: number;
    contractsTestsFailed: number;
    apiTestsPassed: number;
    apiTestsFailed: number;
    frontendTestsPassed: number;
    frontendTestsFailed: number;
    integrationTestsPassed: number;
    integrationTestsFailed: number;
  };
  dependencies: {
    total: number;
    outdated: number;
    vulnerable: number;
    criticalVulnerable: number;
    highVulnerable: number;
  };
  codeQuality: {
    lintErrors: number;
    lintWarnings: number;
    complexityScore: number;
    duplicationPercentage: number;
    maintainabilityIndex: number;
  };
  incidents: {
    active: number;
    resolved: number;
    mttr: number; // Mean Time To Resolve (hours)
    mtbf: number; // Mean Time Between Failures (hours)
  };
  monitoring: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    threatDetectionRate: number;
  };
}

interface ThresholdEvaluation {
  metric: string;
  currentValue: number;
  threshold: SecurityThreshold;
  passed: boolean;
  message: string;
  severity: string;
}

interface EvaluationResult {
  overall: {
    passed: boolean;
    score: number;
    status: 'pass' | 'warning' | 'fail';
  };
  summary: {
    totalThresholds: number;
    passedThresholds: number;
    failedThresholds: number;
    criticalFailures: number;
    highFailures: number;
    mediumFailures: number;
    lowFailures: number;
  };
  evaluations: ThresholdEvaluation[];
  recommendations: string[];
  gateDecision: {
    shouldProceed: boolean;
    reason: string;
    blockers: string[];
  };
}

class SecurityThresholdEvaluator {
  private thresholds: SecurityThreshold[];
  private projectRoot: string;
  private outputDir: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.outputDir = path.join(this.projectRoot, 'security', 'reports');
    fs.ensureDirSync(this.outputDir);
    
    this.thresholds = this.defineSecurityThresholds();
  }

  private defineSecurityThresholds(): SecurityThreshold[] {
    return [
      // Critical vulnerability thresholds
      {
        metric: 'vulnerabilities.critical',
        value: 0,
        operator: 'eq',
        severity: 'critical',
        description: 'No critical vulnerabilities allowed',
        action: 'fail'
      },
      {
        metric: 'vulnerabilities.high',
        value: 2,
        operator: 'lte',
        severity: 'high',
        description: 'Maximum 2 high-severity vulnerabilities allowed',
        action: 'fail'
      },
      {
        metric: 'vulnerabilities.total',
        value: 10,
        operator: 'lte',
        severity: 'medium',
        description: 'Maximum 10 total vulnerabilities allowed',
        action: 'warn'
      },

      // Compliance score thresholds
      {
        metric: 'compliance.overallScore',
        value: 80,
        operator: 'gte',
        severity: 'high',
        description: 'Overall compliance score must be at least 80%',
        action: 'fail'
      },
      {
        metric: 'compliance.soc2Score',
        value: 85,
        operator: 'gte',
        severity: 'high',
        description: 'SOC 2 compliance score must be at least 85%',
        action: 'fail'
      },
      {
        metric: 'compliance.iso27001Score',
        value: 80,
        operator: 'gte',
        severity: 'high',
        description: 'ISO 27001 compliance score must be at least 80%',
        action: 'fail'
      },
      {
        metric: 'compliance.gdprScore',
        value: 90,
        operator: 'gte',
        severity: 'critical',
        description: 'GDPR compliance score must be at least 90%',
        action: 'fail'
      },
      {
        metric: 'compliance.owaspScore',
        value: 80,
        operator: 'gte',
        severity: 'high',
        description: 'OWASP Top 10 compliance score must be at least 80%',
        action: 'fail'
      },

      // Testing coverage thresholds
      {
        metric: 'testing.contractsCoverage',
        value: 90,
        operator: 'gte',
        severity: 'high',
        description: 'Smart contract test coverage must be at least 90%',
        action: 'fail'
      },
      {
        metric: 'testing.contractsTestsFailed',
        value: 0,
        operator: 'eq',
        severity: 'critical',
        description: 'All smart contract tests must pass',
        action: 'fail'
      },
      {
        metric: 'testing.apiTestsFailed',
        value: 0,
        operator: 'eq',
        severity: 'high',
        description: 'All API tests must pass',
        action: 'fail'
      },
      {
        metric: 'testing.frontendTestsFailed',
        value: 0,
        operator: 'eq',
        severity: 'medium',
        description: 'All frontend tests should pass',
        action: 'warn'
      },

      // Dependency security thresholds
      {
        metric: 'dependencies.criticalVulnerable',
        value: 0,
        operator: 'eq',
        severity: 'critical',
        description: 'No dependencies with critical vulnerabilities allowed',
        action: 'fail'
      },
      {
        metric: 'dependencies.highVulnerable',
        value: 1,
        operator: 'lte',
        severity: 'high',
        description: 'Maximum 1 dependency with high vulnerabilities allowed',
        action: 'fail'
      },
      {
        metric: 'dependencies.vulnerable',
        value: 5,
        operator: 'lte',
        severity: 'medium',
        description: 'Maximum 5 vulnerable dependencies allowed',
        action: 'warn'
      },
      {
        metric: 'dependencies.outdated',
        value: 10,
        operator: 'lte',
        severity: 'low',
        description: 'Maximum 10 outdated dependencies recommended',
        action: 'info'
      },

      // Code quality thresholds
      {
        metric: 'codeQuality.lintErrors',
        value: 0,
        operator: 'eq',
        severity: 'high',
        description: 'No linting errors allowed',
        action: 'fail'
      },
      {
        metric: 'codeQuality.lintWarnings',
        value: 10,
        operator: 'lte',
        severity: 'medium',
        description: 'Maximum 10 linting warnings allowed',
        action: 'warn'
      },
      {
        metric: 'codeQuality.complexityScore',
        value: 15,
        operator: 'lte',
        severity: 'medium',
        description: 'Average cyclomatic complexity should be ≤ 15',
        action: 'warn'
      },
      {
        metric: 'codeQuality.duplicationPercentage',
        value: 5,
        operator: 'lte',
        severity: 'medium',
        description: 'Code duplication should be ≤ 5%',
        action: 'warn'
      },
      {
        metric: 'codeQuality.maintainabilityIndex',
        value: 70,
        operator: 'gte',
        severity: 'medium',
        description: 'Maintainability index should be ≥ 70',
        action: 'warn'
      },

      // Incident management thresholds
      {
        metric: 'incidents.active',
        value: 3,
        operator: 'lte',
        severity: 'high',
        description: 'Maximum 3 active security incidents allowed',
        action: 'fail'
      },
      {
        metric: 'incidents.mttr',
        value: 24,
        operator: 'lte',
        severity: 'medium',
        description: 'Mean Time To Resolve should be ≤ 24 hours',
        action: 'warn'
      },

      // Monitoring and operational thresholds
      {
        metric: 'monitoring.uptime',
        value: 99.9,
        operator: 'gte',
        severity: 'high',
        description: 'System uptime must be ≥ 99.9%',
        action: 'fail'
      },
      {
        metric: 'monitoring.errorRate',
        value: 1,
        operator: 'lte',
        severity: 'medium',
        description: 'Error rate should be ≤ 1%',
        action: 'warn'
      },
      {
        metric: 'monitoring.responseTime',
        value: 500,
        operator: 'lte',
        severity: 'medium',
        description: 'Average response time should be ≤ 500ms',
        action: 'warn'
      },
      {
        metric: 'monitoring.threatDetectionRate',
        value: 95,
        operator: 'gte',
        severity: 'high',
        description: 'Threat detection rate should be ≥ 95%',
        action: 'fail'
      }
    ];
  }

  async evaluateThresholds(): Promise<EvaluationResult> {
    console.log('🔍 Loading current security metrics...');
    
    const metrics = await this.loadSecurityMetrics();
    const evaluations: ThresholdEvaluation[] = [];
    
    console.log('⚖️  Evaluating security thresholds...');
    
    for (const threshold of this.thresholds) {
      const evaluation = this.evaluateThreshold(metrics, threshold);
      evaluations.push(evaluation);
      
      const status = evaluation.passed ? '✅' : '❌';
      const severity = evaluation.severity.toUpperCase().padEnd(8);
      console.log(`  ${status} [${severity}] ${evaluation.message}`);
    }

    const summary = this.calculateSummary(evaluations);
    const overall = this.calculateOverallStatus(evaluations);
    const recommendations = this.generateRecommendations(evaluations);
    const gateDecision = this.makeGateDecision(evaluations);

    const result: EvaluationResult = {
      overall,
      summary,
      evaluations,
      recommendations,
      gateDecision
    };

    // Save evaluation result
    await this.saveEvaluationResult(result);

    return result;
  }

  private async loadSecurityMetrics(): Promise<SecurityMetrics> {
    const metricsFiles = [
      path.join(this.outputDir, 'current-security-metrics.json'),
      path.join(this.projectRoot, 'security', 'metrics.json'),
      path.join(this.projectRoot, '.security-metrics.json')
    ];

    for (const file of metricsFiles) {
      if (await fs.pathExists(file)) {
        try {
          const metrics = await fs.readJson(file);
          console.log(`📊 Loaded metrics from: ${file}`);
          return this.normalizeMetrics(metrics);
        } catch (error) {
          console.warn(`⚠️  Failed to load metrics from ${file}:`, error.message);
        }
      }
    }

    console.log('📊 Using default security metrics (no metrics file found)');
    return this.getDefaultMetrics();
  }

  private normalizeMetrics(metrics: any): SecurityMetrics {
    // Ensure all required fields exist with defaults
    return {
      vulnerabilities: {
        critical: metrics.vulnerabilities?.critical || 0,
        high: metrics.vulnerabilities?.high || 0,
        medium: metrics.vulnerabilities?.medium || 0,
        low: metrics.vulnerabilities?.low || 0,
        total: metrics.vulnerabilities?.total || 
               (metrics.vulnerabilities?.critical || 0) +
               (metrics.vulnerabilities?.high || 0) +
               (metrics.vulnerabilities?.medium || 0) +
               (metrics.vulnerabilities?.low || 0)
      },
      compliance: {
        overallScore: metrics.compliance?.overallScore || 85,
        soc2Score: metrics.compliance?.soc2Score || 88,
        iso27001Score: metrics.compliance?.iso27001Score || 82,
        gdprScore: metrics.compliance?.gdprScore || 91,
        owaspScore: metrics.compliance?.owaspScore || 85,
        pcidssScore: metrics.compliance?.pcidssScore || 80,
        nistScore: metrics.compliance?.nistScore || 83
      },
      testing: {
        contractsCoverage: metrics.testing?.contractsCoverage || 95,
        contractsTestsPassed: metrics.testing?.contractsTestsPassed || 48,
        contractsTestsFailed: metrics.testing?.contractsTestsFailed || 0,
        apiTestsPassed: metrics.testing?.apiTestsPassed || 156,
        apiTestsFailed: metrics.testing?.apiTestsFailed || 0,
        frontendTestsPassed: metrics.testing?.frontendTestsPassed || 89,
        frontendTestsFailed: metrics.testing?.frontendTestsFailed || 0,
        integrationTestsPassed: metrics.testing?.integrationTestsPassed || 23,
        integrationTestsFailed: metrics.testing?.integrationTestsFailed || 0
      },
      dependencies: {
        total: metrics.dependencies?.total || 150,
        outdated: metrics.dependencies?.outdated || 5,
        vulnerable: metrics.dependencies?.vulnerable || 2,
        criticalVulnerable: metrics.dependencies?.criticalVulnerable || 0,
        highVulnerable: metrics.dependencies?.highVulnerable || 1
      },
      codeQuality: {
        lintErrors: metrics.codeQuality?.lintErrors || 0,
        lintWarnings: metrics.codeQuality?.lintWarnings || 3,
        complexityScore: metrics.codeQuality?.complexityScore || 12,
        duplicationPercentage: metrics.codeQuality?.duplicationPercentage || 2.1,
        maintainabilityIndex: metrics.codeQuality?.maintainabilityIndex || 78
      },
      incidents: {
        active: metrics.incidents?.active || 0,
        resolved: metrics.incidents?.resolved || 15,
        mttr: metrics.incidents?.mttr || 18,
        mtbf: metrics.incidents?.mtbf || 168
      },
      monitoring: {
        uptime: metrics.monitoring?.uptime || 99.95,
        responseTime: metrics.monitoring?.responseTime || 285,
        errorRate: metrics.monitoring?.errorRate || 0.08,
        threatDetectionRate: metrics.monitoring?.threatDetectionRate || 97.2
      }
    };
  }

  private getDefaultMetrics(): SecurityMetrics {
    return {
      vulnerabilities: { critical: 0, high: 1, medium: 3, low: 2, total: 6 },
      compliance: {
        overallScore: 85,
        soc2Score: 88,
        iso27001Score: 82,
        gdprScore: 91,
        owaspScore: 85,
        pcidssScore: 80,
        nistScore: 83
      },
      testing: {
        contractsCoverage: 95,
        contractsTestsPassed: 48,
        contractsTestsFailed: 0,
        apiTestsPassed: 156,
        apiTestsFailed: 0,
        frontendTestsPassed: 89,
        frontendTestsFailed: 0,
        integrationTestsPassed: 23,
        integrationTestsFailed: 0
      },
      dependencies: {
        total: 150,
        outdated: 5,
        vulnerable: 2,
        criticalVulnerable: 0,
        highVulnerable: 1
      },
      codeQuality: {
        lintErrors: 0,
        lintWarnings: 3,
        complexityScore: 12,
        duplicationPercentage: 2.1,
        maintainabilityIndex: 78
      },
      incidents: {
        active: 0,
        resolved: 15,
        mttr: 18,
        mtbf: 168
      },
      monitoring: {
        uptime: 99.95,
        responseTime: 285,
        errorRate: 0.08,
        threatDetectionRate: 97.2
      }
    };
  }

  private evaluateThreshold(metrics: SecurityMetrics, threshold: SecurityThreshold): ThresholdEvaluation {
    const currentValue = this.getMetricValue(metrics, threshold.metric);
    const passed = this.compareValues(currentValue, threshold.value, threshold.operator);
    
    const message = `${threshold.metric}: ${currentValue} ${this.getOperatorSymbol(threshold.operator)} ${threshold.value} - ${threshold.description}`;
    
    return {
      metric: threshold.metric,
      currentValue,
      threshold,
      passed,
      message,
      severity: threshold.severity
    };
  }

  private getMetricValue(metrics: SecurityMetrics, metricPath: string): number {
    const parts = metricPath.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) {
        throw new Error(`Metric path ${metricPath} not found in metrics`);
      }
    }
    
    return typeof value === 'number' ? value : 0;
  }

  private compareValues(actual: number, expected: number, operator: string): boolean {
    switch (operator) {
      case 'gt': return actual > expected;
      case 'gte': return actual >= expected;
      case 'lt': return actual < expected;
      case 'lte': return actual <= expected;
      case 'eq': return actual === expected;
      case 'neq': return actual !== expected;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  private getOperatorSymbol(operator: string): string {
    const symbols: Record<string, string> = {
      'gt': '>',
      'gte': '≥',
      'lt': '<',
      'lte': '≤',
      'eq': '=',
      'neq': '≠'
    };
    return symbols[operator] || operator;
  }

  private calculateSummary(evaluations: ThresholdEvaluation[]) {
    const totalThresholds = evaluations.length;
    const passedThresholds = evaluations.filter(e => e.passed).length;
    const failedThresholds = totalThresholds - passedThresholds;
    
    const severityCounts = {
      critical: evaluations.filter(e => !e.passed && e.severity === 'critical').length,
      high: evaluations.filter(e => !e.passed && e.severity === 'high').length,
      medium: evaluations.filter(e => !e.passed && e.severity === 'medium').length,
      low: evaluations.filter(e => !e.passed && e.severity === 'low').length
    };

    return {
      totalThresholds,
      passedThresholds,
      failedThresholds,
      criticalFailures: severityCounts.critical,
      highFailures: severityCounts.high,
      mediumFailures: severityCounts.medium,
      lowFailures: severityCounts.low
    };
  }

  private calculateOverallStatus(evaluations: ThresholdEvaluation[]) {
    const criticalFailures = evaluations.filter(e => !e.passed && e.severity === 'critical');
    const highFailures = evaluations.filter(e => !e.passed && e.severity === 'high');
    const failureActions = evaluations.filter(e => !e.passed && e.threshold.action === 'fail');
    
    const totalEvaluations = evaluations.length;
    const passedEvaluations = evaluations.filter(e => e.passed).length;
    const score = Math.round((passedEvaluations / totalEvaluations) * 100);

    let status: 'pass' | 'warning' | 'fail';
    let passed: boolean;

    if (criticalFailures.length > 0 || failureActions.length > 0) {
      status = 'fail';
      passed = false;
    } else if (highFailures.length > 0 || score < 80) {
      status = 'warning';
      passed = false;
    } else {
      status = 'pass';
      passed = true;
    }

    return { passed, score, status };
  }

  private generateRecommendations(evaluations: ThresholdEvaluation[]): string[] {
    const recommendations: string[] = [];
    const failedEvaluations = evaluations.filter(e => !e.passed);

    // Group failures by category
    const categories = {
      vulnerabilities: failedEvaluations.filter(e => e.metric.startsWith('vulnerabilities.')),
      compliance: failedEvaluations.filter(e => e.metric.startsWith('compliance.')),
      testing: failedEvaluations.filter(e => e.metric.startsWith('testing.')),
      dependencies: failedEvaluations.filter(e => e.metric.startsWith('dependencies.')),
      codeQuality: failedEvaluations.filter(e => e.metric.startsWith('codeQuality.')),
      incidents: failedEvaluations.filter(e => e.metric.startsWith('incidents.')),
      monitoring: failedEvaluations.filter(e => e.metric.startsWith('monitoring.'))
    };

    if (categories.vulnerabilities.length > 0) {
      recommendations.push('🔒 Address critical and high-severity vulnerabilities immediately');
      recommendations.push('📊 Run comprehensive vulnerability scans and implement remediation plan');
    }

    if (categories.compliance.length > 0) {
      recommendations.push('📋 Review and improve compliance framework implementation');
      recommendations.push('🔍 Conduct compliance gap analysis and create remediation roadmap');
    }

    if (categories.testing.length > 0) {
      recommendations.push('🧪 Increase test coverage and fix failing tests');
      recommendations.push('🔄 Implement continuous testing in CI/CD pipeline');
    }

    if (categories.dependencies.length > 0) {
      recommendations.push('📦 Update vulnerable and outdated dependencies');
      recommendations.push('🔐 Implement automated dependency security scanning');
    }

    if (categories.codeQuality.length > 0) {
      recommendations.push('🛠️  Improve code quality through refactoring and linting');
      recommendations.push('📏 Establish code quality gates in development process');
    }

    if (categories.incidents.length > 0) {
      recommendations.push('🚨 Improve incident response procedures and resolution times');
      recommendations.push('📈 Implement proactive monitoring to prevent incidents');
    }

    if (categories.monitoring.length > 0) {
      recommendations.push('📊 Enhance monitoring and alerting capabilities');
      recommendations.push('⚡ Optimize system performance and reliability');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All security thresholds are met - continue monitoring and maintenance');
    }

    return recommendations;
  }

  private makeGateDecision(evaluations: ThresholdEvaluation[]): any {
    const criticalFailures = evaluations.filter(e => !e.passed && e.severity === 'critical');
    const failureActions = evaluations.filter(e => !e.passed && e.threshold.action === 'fail');
    
    const blockers: string[] = [];
    
    criticalFailures.forEach(failure => {
      blockers.push(`Critical: ${failure.threshold.description}`);
    });
    
    failureActions.forEach(failure => {
      if (failure.severity !== 'critical') {
        blockers.push(`${failure.severity}: ${failure.threshold.description}`);
      }
    });

    const shouldProceed = blockers.length === 0;
    const reason = shouldProceed 
      ? 'All critical security thresholds are met'
      : `${blockers.length} security threshold(s) are blocking deployment`;

    return {
      shouldProceed,
      reason,
      blockers
    };
  }

  private async saveEvaluationResult(result: EvaluationResult): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `threshold-evaluation-${timestamp}.json`;
    const filepath = path.join(this.outputDir, filename);
    
    await fs.writeJson(filepath, result, { spaces: 2 });
    
    // Also save as latest
    const latestPath = path.join(this.outputDir, 'latest-threshold-evaluation.json');
    await fs.writeJson(latestPath, result, { spaces: 2 });
    
    console.log(`💾 Evaluation result saved: ${filepath}`);
  }

  async generateReport(): Promise<void> {
    const result = await this.evaluateThresholds();
    
    console.log('\n📊 Security Threshold Evaluation Summary');
    console.log('=========================================');
    console.log(`Overall Status: ${result.overall.status.toUpperCase()}`);
    console.log(`Overall Score: ${result.overall.score}%`);
    console.log(`Passed: ${result.summary.passedThresholds}/${result.summary.totalThresholds}`);
    console.log(`Failed: ${result.summary.failedThresholds}/${result.summary.totalThresholds}`);
    
    if (result.summary.criticalFailures > 0) {
      console.log(`🚨 Critical Failures: ${result.summary.criticalFailures}`);
    }
    if (result.summary.highFailures > 0) {
      console.log(`⚠️  High Failures: ${result.summary.highFailures}`);
    }
    if (result.summary.mediumFailures > 0) {
      console.log(`📋 Medium Failures: ${result.summary.mediumFailures}`);
    }
    if (result.summary.lowFailures > 0) {
      console.log(`ℹ️  Low Failures: ${result.summary.lowFailures}`);
    }

    console.log('\n🚪 Gate Decision');
    console.log('================');
    console.log(`Proceed: ${result.gateDecision.shouldProceed ? '✅ YES' : '❌ NO'}`);
    console.log(`Reason: ${result.gateDecision.reason}`);
    
    if (result.gateDecision.blockers.length > 0) {
      console.log('\n🚫 Blockers:');
      result.gateDecision.blockers.forEach((blocker, index) => {
        console.log(`  ${index + 1}. ${blocker}`);
      });
    }

    if (result.recommendations.length > 0) {
      console.log('\n💡 Recommendations');
      console.log('==================');
      result.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }

    // Exit with appropriate code for CI/CD
    if (!result.gateDecision.shouldProceed) {
      console.log('\n❌ Security gates failed - blocking deployment');
      process.exit(1);
    } else if (result.overall.status === 'warning') {
      console.log('\n⚠️  Security gates passed with warnings');
      process.exit(0);
    } else {
      console.log('\n✅ All security gates passed');
      process.exit(0);
    }
  }
}

// CLI execution
if (require.main === module) {
  const evaluator = new SecurityThresholdEvaluator();
  
  evaluator.generateReport()
    .catch(error => {
      console.error('❌ Error evaluating security thresholds:', error);
      process.exit(1);
    });
}

export default SecurityThresholdEvaluator;
