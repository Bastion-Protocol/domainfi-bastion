import { Controller, Post, Get, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

import { ValuationService } from './valuation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ValuationRequestDto,
  ValuationResponseDto,
  BatchValuationRequestDto,
  PortfolioValuationRequestDto,
  SignedValuationRequestDto,
  SignedValuationResponseDto,
} from '../../dto/valuation.dto';

@ApiTags('valuation')
@Controller('valuation')
@UseGuards(ThrottlerGuard)
export class ValuationController {
  constructor(private readonly valuationService: ValuationService) {}

  @Post('domain')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get domain valuation',
    description: 'Calculates the estimated value of a domain using specified methodology',
  })
  @ApiResponse({
    status: 200,
    description: 'Domain valuation calculated successfully',
    type: ValuationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid domain name or request parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT token required',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async valuateDomain(@Body() request: ValuationRequestDto): Promise<ValuationResponseDto> {
    return await this.valuationService.valuateDomain(request);
  }

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Batch domain valuation',
    description: 'Calculates valuations for multiple domains in a single request',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch valuation completed successfully',
    type: [ValuationResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters or domain list',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT token required',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async batchValuate(@Body() request: BatchValuationRequestDto): Promise<ValuationResponseDto[]> {
    return await this.valuationService.batchValuate(request);
  }

  @Post('portfolio')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Portfolio valuation',
    description: 'Calculates the total value of all domains in a circle with optional historical data',
  })
  @ApiResponse({
    status: 200,
    description: 'Portfolio valuation calculated successfully',
    schema: {
      type: 'object',
      properties: {
        totalValue: {
          type: 'number',
          description: 'Total portfolio value in USD',
          example: 150000,
        },
        domainCount: {
          type: 'number',
          description: 'Number of domains in portfolio',
          example: 25,
        },
        domains: {
          type: 'array',
          items: { $ref: '#/components/schemas/ValuationResponseDto' },
          description: 'Individual domain valuations',
        },
        historicalData: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              totalValue: { type: 'number' },
            },
          },
          description: 'Historical portfolio values (if requested)',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid circle ID or request parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT token required',
  })
  @ApiResponse({
    status: 404,
    description: 'Circle not found',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async valuatePortfolio(@Body() request: PortfolioValuationRequestDto) {
    return await this.valuationService.valuatePortfolio(request);
  }

  @Post('signed')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create signed valuation',
    description: 'Creates a cryptographically signed valuation for on-chain verification',
  })
  @ApiResponse({
    status: 200,
    description: 'Signed valuation created successfully',
    type: SignedValuationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid domain token ID or request parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT token required',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async createSignedValuation(@Body() request: SignedValuationRequestDto): Promise<SignedValuationResponseDto> {
    return await this.valuationService.createSignedValuation(request);
  }

  @Get('domain/:tokenId/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get domain valuation history',
    description: 'Retrieves historical valuations for a specific domain',
  })
  @ApiParam({
    name: 'tokenId',
    description: 'Domain token ID',
    example: '12345',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of records to return',
    required: false,
    example: 50,
  })
  @ApiQuery({
    name: 'timeframe',
    description: 'Time period for historical data',
    required: false,
    enum: ['24h', '7d', '30d', '1y'],
    example: '30d',
  })
  @ApiResponse({
    status: 200,
    description: 'Valuation history retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'uuid-string' },
          domainTokenId: { type: 'string', example: '12345' },
          value: { type: 'number', example: 2500 },
          methodology: { type: 'string', example: 'hybrid' },
          confidenceScore: { type: 'number', example: 0.85 },
          timestamp: { type: 'string', format: 'date-time' },
          marketConditions: {
            type: 'object',
            properties: {
              totalMarketCap: { type: 'number' },
              volumeChange24h: { type: 'number' },
              averagePrice: { type: 'number' },
              transactionCount: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT token required',
  })
  @ApiResponse({
    status: 404,
    description: 'Domain not found',
  })
  async getValuationHistory(
    @Param('tokenId') tokenId: string,
    @Query('limit') limit?: number,
    @Query('timeframe') timeframe?: string,
  ) {
    // Implementation would query the ValuationHistory repository
    // For now, return placeholder response
    return {
      message: 'Valuation history endpoint - implementation pending',
      tokenId,
      limit: limit || 50,
      timeframe: timeframe || '30d',
    };
  }

  @Get('market/conditions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current market conditions',
    description: 'Retrieves current domain market statistics and trends',
  })
  @ApiResponse({
    status: 200,
    description: 'Market conditions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalMarketCap: {
          type: 'number',
          description: 'Total market capitalization in USD',
          example: 1000000,
        },
        volumeChange24h: {
          type: 'number',
          description: '24-hour volume change as percentage',
          example: 0.05,
        },
        averagePrice: {
          type: 'number',
          description: 'Average domain price in USD',
          example: 2500,
        },
        transactionCount: {
          type: 'number',
          description: 'Number of transactions in last 24h',
          example: 150,
        },
        lastUpdated: {
          type: 'string',
          format: 'date-time',
          description: 'When market data was last updated',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT token required',
  })
  async getMarketConditions() {
    // Implementation would fetch real market data
    return {
      totalMarketCap: 1000000,
      volumeChange24h: 0.05,
      averagePrice: 2500,
      transactionCount: 150,
      lastUpdated: new Date(),
    };
  }

  @Get('domain/:tokenId/comparable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get comparable domains',
    description: 'Finds similar domains and their valuations for market comparison',
  })
  @ApiParam({
    name: 'tokenId',
    description: 'Domain token ID to find comparables for',
    example: '12345',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of comparables to return',
    required: false,
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Comparable domains found successfully',
    schema: {
      type: 'object',
      properties: {
        sourceTokenId: { type: 'string', example: '12345' },
        sourceDomainName: { type: 'string', example: 'example.com' },
        comparables: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tokenId: { type: 'string' },
              domainName: { type: 'string' },
              estimatedValue: { type: 'number' },
              similarityScore: { type: 'number', minimum: 0, maximum: 1 },
              lastSoldPrice: { type: 'number', nullable: true },
              lastSoldDate: { type: 'string', format: 'date-time', nullable: true },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT token required',
  })
  @ApiResponse({
    status: 404,
    description: 'Domain not found',
  })
  async getComparableDomains(
    @Param('tokenId') tokenId: string,
    @Query('limit') limit?: number,
  ) {
    // Implementation would use ML/similarity algorithms to find comparable domains
    return {
      message: 'Comparable domains endpoint - implementation pending',
      sourceTokenId: tokenId,
      limit: limit || 10,
    };
  }

  @Get('analytics/trends')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get valuation trends',
    description: 'Retrieves market trends and analytics for domain valuations',
  })
  @ApiQuery({
    name: 'tld',
    description: 'Filter by specific TLD',
    required: false,
    example: 'com',
  })
  @ApiQuery({
    name: 'timeframe',
    description: 'Time period for trend analysis',
    required: false,
    enum: ['24h', '7d', '30d', '1y'],
    example: '30d',
  })
  @ApiResponse({
    status: 200,
    description: 'Valuation trends retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        timeframe: { type: 'string', example: '30d' },
        tld: { type: 'string', example: 'com', nullable: true },
        trends: {
          type: 'object',
          properties: {
            averageValueChange: { type: 'number', example: 0.15 },
            volumeChange: { type: 'number', example: 0.08 },
            mostValuableSegment: { type: 'string', example: '3-letter domains' },
            emergingKeywords: {
              type: 'array',
              items: { type: 'string' },
              example: ['ai', 'crypto', 'web3'],
            },
          },
        },
        dataPoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date' },
              averageValue: { type: 'number' },
              transactionVolume: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT token required',
  })
  async getValuationTrends(
    @Query('tld') tld?: string,
    @Query('timeframe') timeframe?: string,
  ) {
    // Implementation would analyze historical data for trends
    return {
      message: 'Valuation trends endpoint - implementation pending',
      tld: tld || 'all',
      timeframe: timeframe || '30d',
    };
  }
}