import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import axios from 'axios';
import { ethers } from 'ethers';

import { DomainValuation } from '../../entities/domain-valuation.entity';
import { ValuationHistory } from '../../entities/valuation-history.entity';
import { ValidationUtil } from '../../utils/validation.util';
import { CryptoUtil } from '../../utils/crypto.util';
import {
  ValuationRequest,
  ValuationResponse,
  BatchValuationRequest,
  PortfolioValuationRequest,
  SignedValuationRequest,
  SignedValuationResponse,
  ValuationFactors,
  MarketConditions
} from '../../types/valuation.types';

@Injectable()
export class ValuationService {
  private readonly logger = new Logger(ValuationService.name);
  private readonly signingWallet: ethers.Wallet;

  constructor(
    @InjectRepository(DomainValuation)
    private readonly valuationRepository: Repository<DomainValuation>,
    @InjectRepository(ValuationHistory)
    private readonly historyRepository: Repository<ValuationHistory>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.signingWallet = new ethers.Wallet(
      process.env.VALUATION_SIGNING_KEY || ethers.Wallet.createRandom().privateKey
    );
  }

  async valuateDomain(request: ValuationRequest): Promise<ValuationResponse> {
    const cacheKey = `valuation:${request.domainTokenId}:${request.methodology || 'default'}`;
    
    // Check cache first unless forced fresh
    if (!request.forceFresh) {
      const cached = await this.cacheManager.get<ValuationResponse>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for domain ${request.domainTokenId}`);
        return cached;
      }
    }

    try {
      // Validate domain name
      if (!ValidationUtil.isValidDomainName(request.domainName)) {
        throw new Error(`Invalid domain name: ${request.domainName}`);
      }

      // Extract TLD and calculate basic factors
      const [domainName, ...tldParts] = request.domainName.split('.');
      const tld = tldParts.join('.');
      
      const valuationFactors = await this.calculateValuationFactors(domainName, tld);
      const marketConditions = await this.getMarketConditions();
      
      // Apply valuation methodology
      const methodology = request.methodology || 'hybrid';
      const { estimatedValue, confidenceScore } = await this.applyValuationModel(
        valuationFactors,
        marketConditions,
        methodology
      );

      const valuation: ValuationResponse = {
        domainTokenId: request.domainTokenId,
        domainName: request.domainName,
        estimatedValue,
        confidenceScore,
        methodology,
        valuationFactors,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      };

      // Save to database
      await this.saveValuation(valuation);
      
      // Cache the result
      await this.cacheManager.set(cacheKey, valuation, 300000); // 5 minutes

      this.logger.log(`Valuated domain ${request.domainName}: $${estimatedValue}`);
      return valuation;

    } catch (error) {
      this.logger.error(`Valuation failed for ${request.domainName}:`, error);
      throw error;
    }
  }

  async batchValuate(request: BatchValuationRequest): Promise<ValuationResponse[]> {
    const results: ValuationResponse[] = [];
    const batchSize = 10; // Process in batches to avoid overwhelming the system

    for (let i = 0; i < request.domains.length; i += batchSize) {
      const batch = request.domains.slice(i, i + batchSize);
      const batchPromises = batch.map(domain => 
        this.valuateDomain({
          ...domain,
          methodology: domain.methodology || request.methodology,
        })
      );

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        this.logger.error(`Batch valuation failed for batch starting at ${i}:`, error);
        // Continue with other batches
      }
    }

    return results;
  }

  async valuatePortfolio(request: PortfolioValuationRequest): Promise<{
    totalValue: number;
    domainCount: number;
    domains: ValuationResponse[];
    historicalData?: any[];
  }> {
    // In a real implementation, this would query the blockchain for domains in a circle
    // For now, we'll simulate by getting domains associated with the circle
    const domains = await this.getDomainsInCircle(request.circleId);
    
    const valuations = await Promise.all(
      domains.map(domain => this.valuateDomain({
        domainTokenId: domain.tokenId,
        domainName: domain.name,
      }))
    );

    const totalValue = valuations.reduce((sum, val) => sum + val.estimatedValue, 0);

    let historicalData;
    if (request.includeHistorical) {
      historicalData = await this.getHistoricalPortfolioData(
        request.circleId,
        request.timeframe || '30d'
      );
    }

    return {
      totalValue,
      domainCount: valuations.length,
      domains: valuations,
      historicalData,
    };
  }

  async createSignedValuation(request: SignedValuationRequest): Promise<SignedValuationResponse> {
    // First get the regular valuation
    const valuation = await this.valuateDomain({
      domainTokenId: request.domainTokenId,
      domainName: await this.getDomainNameFromTokenId(request.domainTokenId),
    });

    const timestamp = request.timestamp || Math.floor(Date.now() / 1000);
    
    // Sign the valuation
    const { signature, messageHash } = await CryptoUtil.signValuationMessage(
      request.domainTokenId,
      valuation.estimatedValue,
      timestamp,
      request.purpose,
      this.signingWallet.privateKey
    );

    const signedValuation: SignedValuationResponse = {
      ...valuation,
      signature,
      messageHash,
      signerAddress: this.signingWallet.address,
    };

    // Log the signed valuation for audit trail
    this.logger.log(`Created signed valuation for ${request.domainTokenId}, purpose: ${request.purpose}, value: $${valuation.estimatedValue}`);
    
    return signedValuation;
  }

  private async calculateValuationFactors(domainName: string, tld: string): Promise<ValuationFactors> {
    const length = domainName.length;
    const rarity = ValidationUtil.calculateDomainRarity(domainName, tld);
    const seoScore = ValidationUtil.calculateSEOScore(domainName);
    
    // Get market comparables (simplified - in reality would query marketplaces)
    const marketComparables = await this.getMarketComparables(domainName, tld);
    
    // Historical sales data (simplified)
    const historicalSales = await this.getHistoricalSales(domainName, tld);
    
    // Extract keywords
    const keywords = this.extractKeywords(domainName);
    
    // Brand value assessment
    const brandValue = this.assessBrandValue(domainName);
    
    // Social media mentions (simplified)
    const socialMediaMentions = await this.getSocialMediaMentions(domainName);

    return {
      length,
      keywords,
      rarity,
      marketComparables,
      historicalSales,
      brandValue,
      seoScore,
      socialMediaMentions,
    };
  }

  private async applyValuationModel(
    factors: ValuationFactors,
    market: MarketConditions,
    methodology: string
  ): Promise<{ estimatedValue: number; confidenceScore: number }> {
    switch (methodology) {
      case 'comparable':
        return this.comparableValuation(factors, market);
      case 'cost':
        return this.costBasedValuation(factors, market);
      case 'income':
        return this.incomeBasedValuation(factors, market);
      case 'hybrid':
      default:
        return this.hybridValuation(factors, market);
    }
  }

  private async comparableValuation(factors: ValuationFactors, market: MarketConditions): Promise<{ estimatedValue: number; confidenceScore: number }> {
    // Base value from market comparables
    let value = factors.marketComparables;
    
    // Adjust for rarity
    value *= (1 + factors.rarity * 0.1);
    
    // Adjust for length (shorter domains more valuable)
    if (factors.length <= 3) value *= 2;
    else if (factors.length <= 5) value *= 1.5;
    else if (factors.length <= 8) value *= 1.2;
    
    // Market adjustment
    value *= (1 + market.volumeChange24h * 0.001);
    
    const confidenceScore = Math.min(0.9, 0.3 + (factors.marketComparables > 0 ? 0.4 : 0) + (factors.historicalSales > 0 ? 0.3 : 0));
    
    return { estimatedValue: Math.max(100, value), confidenceScore };
  }

  private async costBasedValuation(factors: ValuationFactors, market: MarketConditions): Promise<{ estimatedValue: number; confidenceScore: number }> {
    // Base acquisition and development cost
    let baseCost = 1000; // Base domain value
    
    // Add premium for quality factors
    baseCost += factors.brandValue * 500;
    baseCost += factors.seoScore * 200;
    baseCost += factors.rarity * 300;
    
    const confidenceScore = 0.7; // Cost-based has moderate confidence
    
    return { estimatedValue: baseCost, confidenceScore };
  }

  private async incomeBasedValuation(factors: ValuationFactors, market: MarketConditions): Promise<{ estimatedValue: number; confidenceScore: number }> {
    // Estimate potential income from domain
    let monthlyIncome = 0;
    
    // Traffic monetization potential
    monthlyIncome += factors.seoScore * 50;
    monthlyIncome += factors.socialMediaMentions * 0.1;
    monthlyIncome += factors.brandValue * 100;
    
    // Capitalize at 20x monthly income (5% cap rate)
    const value = monthlyIncome * 20;
    
    const confidenceScore = 0.6; // Income projection has lower confidence
    
    return { estimatedValue: Math.max(500, value), confidenceScore };
  }

  private async hybridValuation(factors: ValuationFactors, market: MarketConditions): Promise<{ estimatedValue: number; confidenceScore: number }> {
    // Combine all three approaches with weights
    const comparable = await this.comparableValuation(factors, market);
    const cost = await this.costBasedValuation(factors, market);
    const income = await this.incomeBasedValuation(factors, market);
    
    // Weighted average: 50% comparable, 30% cost, 20% income
    const estimatedValue = (comparable.estimatedValue * 0.5) + (cost.estimatedValue * 0.3) + (income.estimatedValue * 0.2);
    
    // Confidence is average of all methods weighted by their reliability
    const confidenceScore = (comparable.confidenceScore * 0.5) + (cost.confidenceScore * 0.3) + (income.confidenceScore * 0.2);
    
    return { estimatedValue, confidenceScore };
  }

  private async getMarketConditions(): Promise<MarketConditions> {
    // In a real implementation, this would fetch from market data APIs
    return {
      totalMarketCap: 1000000, // $1M total market cap
      volumeChange24h: 0.05, // 5% volume increase
      averagePrice: 2500,
      transactionCount: 150,
    };
  }

  private async getMarketComparables(domainName: string, tld: string): Promise<number> {
    // Simplified comparable analysis
    // In reality, would query domain marketplaces like Sedo, GoDaddy Auctions, etc.
    const baseValue = tld === 'com' ? 2000 : tld === 'org' ? 1000 : 500;
    const lengthMultiplier = domainName.length <= 5 ? 2 : domainName.length <= 8 ? 1.5 : 1;
    
    return baseValue * lengthMultiplier;
  }

  private async getHistoricalSales(domainName: string, tld: string): Promise<number> {
    // Simplified historical analysis
    // Would integrate with domain sales databases
    return Math.random() * 5000; // Random for demo
  }

  private extractKeywords(domainName: string): string[] {
    // Simple keyword extraction
    const businessKeywords = ['app', 'tech', 'digital', 'smart', 'crypto', 'web', 'net', 'online'];
    return businessKeywords.filter(keyword => domainName.toLowerCase().includes(keyword));
  }

  private assessBrandValue(domainName: string): number {
    // Simplified brand assessment
    let score = 5; // Base score
    
    if (domainName.length <= 6) score += 2;
    if (!/[0-9-]/.test(domainName)) score += 2;
    if (ValidationUtil.isValidDomainName(domainName + '.com')) score += 1;
    
    return Math.min(10, score);
  }

  private async getSocialMediaMentions(domainName: string): Promise<number> {
    // Would integrate with social media APIs
    return Math.floor(Math.random() * 1000);
  }

  private async saveValuation(valuation: ValuationResponse): Promise<void> {
    const entity = this.valuationRepository.create({
      domainTokenId: valuation.domainTokenId,
      domainName: valuation.domainName,
      tld: valuation.domainName.split('.').slice(1).join('.'),
      estimatedValue: valuation.estimatedValue,
      valuationFactors: valuation.valuationFactors,
      confidenceScore: valuation.confidenceScore,
      methodology: valuation.methodology,
      isActive: true,
    });

    await this.valuationRepository.save(entity);

    // Also save to history
    const historyEntity = this.historyRepository.create({
      domainTokenId: valuation.domainTokenId,
      value: valuation.estimatedValue,
      methodology: valuation.methodology,
      confidenceScore: valuation.confidenceScore,
      marketConditions: await this.getMarketConditions(),
    });

    await this.historyRepository.save(historyEntity);
  }

  private async getDomainsInCircle(circleId: string): Promise<{ tokenId: string; name: string }[]> {
    // This would query the blockchain for domains in a circle
    // For demo purposes, return mock data
    return [
      { tokenId: '1', name: 'example.com' },
      { tokenId: '2', name: 'test.eth' },
      { tokenId: '3', name: 'demo.org' },
    ];
  }

  private async getDomainNameFromTokenId(tokenId: string): Promise<string> {
    // This would query the blockchain or database
    // For demo, return a mock domain
    return `domain${tokenId}.com`;
  }

  private async getHistoricalPortfolioData(circleId: string, timeframe: string): Promise<any[]> {
    // Query historical valuation data
    const query = this.historyRepository
      .createQueryBuilder('history')
      .select(['history.timestamp', 'SUM(history.value) as totalValue'])
      .where('history.timestamp >= :startDate', {
        startDate: this.getStartDateForTimeframe(timeframe),
      })
      .groupBy('DATE(history.timestamp)')
      .orderBy('history.timestamp', 'ASC');

    return await query.getRawMany();
  }

  private getStartDateForTimeframe(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}