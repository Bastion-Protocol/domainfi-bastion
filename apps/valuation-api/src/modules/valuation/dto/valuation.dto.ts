import { IsString, IsOptional, IsBoolean, IsArray, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValuationRequestDto {
  @ApiProperty({ description: 'Domain token ID' })
  @IsString()
  domainTokenId: string;

  @ApiProperty({ description: 'Domain name (e.g., example.com)' })
  @IsString()
  domainName: string;

  @ApiPropertyOptional({ description: 'Valuation methodology to use' })
  @IsOptional()
  @IsString()
  methodology?: string;

  @ApiPropertyOptional({ description: 'Force fresh calculation ignoring cache' })
  @IsOptional()
  @IsBoolean()
  forceFresh?: boolean;
}

export class BatchValuationRequestDto {
  @ApiProperty({ type: [ValuationRequestDto], description: 'Array of domains to valuate' })
  @IsArray()
  domains: ValuationRequestDto[];

  @ApiPropertyOptional({ description: 'Default methodology for all domains' })
  @IsOptional()
  @IsString()
  methodology?: string;
}

export class PortfolioValuationRequestDto {
  @ApiProperty({ description: 'Circle ID for portfolio valuation' })
  @IsString()
  circleId: string;

  @ApiPropertyOptional({ description: 'Include historical valuation data' })
  @IsOptional()
  @IsBoolean()
  includeHistorical?: boolean;

  @ApiPropertyOptional({ enum: ['24h', '7d', '30d', '1y'], description: 'Historical timeframe' })
  @IsOptional()
  @IsEnum(['24h', '7d', '30d', '1y'])
  timeframe?: '24h' | '7d' | '30d' | '1y';
}

export class SignedValuationRequestDto {
  @ApiProperty({ description: 'Domain token ID' })
  @IsString()
  domainTokenId: string;

  @ApiProperty({ enum: ['lending', 'trading', 'custody'], description: 'Purpose of the signed valuation' })
  @IsEnum(['lending', 'trading', 'custody'])
  purpose: 'lending' | 'trading' | 'custody';

  @ApiProperty({ description: 'Address of the requester' })
  @IsString()
  requester: string;

  @ApiPropertyOptional({ description: 'Timestamp for the valuation (defaults to current time)' })
  @IsOptional()
  @IsNumber()
  timestamp?: number;
}

export class ValuationResponseDto {
  @ApiProperty({ description: 'Domain token ID' })
  domainTokenId: string;

  @ApiProperty({ description: 'Domain name' })
  domainName: string;

  @ApiProperty({ description: 'Estimated value in USD' })
  estimatedValue: number;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  @Min(0)
  @Max(1)
  confidenceScore: number;

  @ApiProperty({ description: 'Valuation methodology used' })
  methodology: string;

  @ApiProperty({ description: 'Factors contributing to valuation' })
  valuationFactors: {
    length: number;
    keywords: string[];
    rarity: number;
    marketComparables: number;
    historicalSales: number;
    brandValue: number;
    seoScore: number;
    socialMediaMentions: number;
  };

  @ApiProperty({ description: 'Timestamp of valuation' })
  timestamp: Date;

  @ApiPropertyOptional({ description: 'Expiration time for cached valuation' })
  expiresAt?: Date;
}

export class SignedValuationResponseDto extends ValuationResponseDto {
  @ApiProperty({ description: 'Cryptographic signature' })
  signature: string;

  @ApiProperty({ description: 'Hash of the signed message' })
  messageHash: string;

  @ApiProperty({ description: 'Address of the signer' })
  signerAddress: string;
}