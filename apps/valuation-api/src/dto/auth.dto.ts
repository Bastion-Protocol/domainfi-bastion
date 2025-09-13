import { IsString, IsNotEmpty, IsNumber, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Ethereum wallet address',
    example: '0x742d35Cc6634C0532925a3b8D2C4dE1b',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({
    description: 'Cryptographic signature of the authentication message',
    example: '0x...',
  })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({
    description: 'The message that was signed',
    example: 'Sign this message to authenticate...',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Unix timestamp when the message was created',
    example: 1640995200,
  })
  @IsNumber()
  timestamp: number;
}

export class RegisterDto extends LoginDto {}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token for API authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Wallet address of the authenticated user',
    example: '0x742d35Cc6634C0532925a3b8D2C4dE1b',
  })
  walletAddress: string;

  @ApiProperty({
    description: 'Token expiration time',
    example: '24h',
  })
  expiresIn: string;
}

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Name for the API key (for identification)',
    example: 'Portfolio Manager',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @ApiProperty({
    description: 'Optional description of the API key usage',
    example: 'API key for automated portfolio valuations',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class ApiKeyResponseDto {
  @ApiProperty({
    description: 'Generated API key (only shown once)',
    example: 'dfva_abc123_def456789...',
  })
  apiKey: string;

  @ApiProperty({
    description: 'Unique identifier for the API key',
    example: 'abc123',
  })
  keyId: string;

  @ApiProperty({
    description: 'Name of the API key',
    example: 'Portfolio Manager',
  })
  name: string;

  @ApiProperty({
    description: 'When the API key was created',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the API key expires (if applicable)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  expiresAt?: Date;
}

export class AuthMessageDto {
  @ApiProperty({
    description: 'Wallet address to generate message for',
    example: '0x742d35Cc6634C0532925a3b8D2C4dE1b',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}

export class AuthMessageResponseDto {
  @ApiProperty({
    description: 'Message to be signed by the wallet',
    example: 'Sign this message to authenticate with DomainFi Valuation API...',
  })
  message: string;

  @ApiProperty({
    description: 'Unix timestamp when the message was generated',
    example: 1640995200,
  })
  timestamp: number;
}