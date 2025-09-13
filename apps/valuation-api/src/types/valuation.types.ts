export interface ValuationFactors {
  length: number;
  keywords: string[];
  rarity: number;
  marketComparables: number;
  historicalSales: number;
  brandValue: number;
  seoScore: number;
  socialMediaMentions: number;
}

export interface MarketConditions {
  totalMarketCap: number;
  volumeChange24h: number;
  averagePrice: number;
  transactionCount: number;
}

export interface ValuationRequest {
  domainTokenId: string;
  domainName: string;
  methodology?: string;
  forceFresh?: boolean;
}

export interface BatchValuationRequest {
  domains: ValuationRequest[];
  methodology?: string;
}

export interface PortfolioValuationRequest {
  circleId: string;
  includeHistorical?: boolean;
  timeframe?: '24h' | '7d' | '30d' | '1y';
}

export interface SignedValuationRequest {
  domainTokenId: string;
  purpose: 'lending' | 'trading' | 'custody';
  requester: string;
  timestamp?: number;
}

export interface ValuationResponse {
  domainTokenId: string;
  domainName: string;
  estimatedValue: number;
  confidenceScore: number;
  methodology: string;
  valuationFactors: ValuationFactors;
  timestamp: Date;
  expiresAt?: Date;
}

export interface SignedValuationResponse extends ValuationResponse {
  signature: string;
  messageHash: string;
  signerAddress: string;
}