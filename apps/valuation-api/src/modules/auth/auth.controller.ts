import { Controller, Post, Body, Get, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GetUser } from '../../decorators/get-user.decorator';
import {
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  CreateApiKeyDto,
  ApiKeyResponseDto,
  AuthMessageDto,
  AuthMessageResponseDto,
} from '../../dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate with wallet signature',
    description: 'Login using wallet signature verification. Returns a JWT token for API access.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid signature or expired message',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return await this.authService.login(loginDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register with wallet signature',
    description: 'Register a new user using wallet signature verification. For wallet-based auth, this is equivalent to login.',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully registered',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid signature or expired message',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async register(@Body() registerDto: RegisterDto): Promise<LoginResponseDto> {
    return await this.authService.register(registerDto);
  }

  @Post('message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate authentication message',
    description: 'Generate a message to be signed by the wallet for authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication message generated',
    type: AuthMessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid wallet address',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async generateAuthMessage(@Body() authMessageDto: AuthMessageDto): Promise<AuthMessageResponseDto> {
    return await this.authService.generateAuthMessage(authMessageDto.walletAddress);
  }

  @Post('api-key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create API key',
    description: 'Create a new API key for programmatic access. Requires JWT authentication.',
  })
  @ApiResponse({
    status: 201,
    description: 'API key created successfully',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT token required',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async createApiKey(
    @Body() createApiKeyDto: CreateApiKeyDto,
    @GetUser() user: any,
  ): Promise<ApiKeyResponseDto> {
    const { apiKey, keyId } = await this.authService.createApiKey(
      user.walletAddress,
      createApiKeyDto.name
    );

    return {
      apiKey,
      keyId,
      name: createApiKeyDto.name,
      createdAt: new Date(),
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Get the current authenticated user profile information.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        walletAddress: {
          type: 'string',
          example: '0x742d35Cc6634C0532925a3b8D2C4dE1b',
        },
        type: {
          type: 'string',
          example: 'wallet',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
        },
        lastActiveAt: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT token required',
  })
  async getProfile(@GetUser() user: any) {
    return {
      walletAddress: user.walletAddress,
      type: user.type,
      createdAt: new Date(), // In real implementation, get from database
      lastActiveAt: new Date(),
    };
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify token',
    description: 'Verify that the current JWT token is valid and not expired.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token is valid',
    schema: {
      type: 'object',
      properties: {
        valid: {
          type: 'boolean',
          example: true,
        },
        walletAddress: {
          type: 'string',
          example: '0x742d35Cc6634C0532925a3b8D2C4dE1b',
        },
        expiresAt: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token is invalid or expired',
  })
  async verifyToken(@GetUser() user: any) {
    return {
      valid: true,
      walletAddress: user.walletAddress,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    };
  }
}