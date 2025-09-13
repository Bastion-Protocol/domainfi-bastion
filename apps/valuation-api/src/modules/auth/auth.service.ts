import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

import { CryptoUtil } from '../../utils/crypto.util';
import { LoginDto, LoginResponseDto, RegisterDto } from '../../dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { walletAddress, signature, message, timestamp } = loginDto;

    // Validate timestamp (should be within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      throw new UnauthorizedException('Message timestamp is too old');
    }

    // Verify the signature
    const isValid = await CryptoUtil.verifySignature(
      message,
      signature,
      walletAddress
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Generate JWT payload
    const payload = {
      sub: walletAddress,
      walletAddress,
      type: 'wallet',
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      walletAddress,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '24h',
    };
  }

  async register(registerDto: RegisterDto): Promise<LoginResponseDto> {
    // For wallet-based auth, registration is the same as login
    // The wallet address is the user identifier
    return this.login({
      walletAddress: registerDto.walletAddress,
      signature: registerDto.signature,
      message: registerDto.message,
      timestamp: registerDto.timestamp,
    });
  }

  async generateAuthMessage(walletAddress: string): Promise<{ message: string; timestamp: number }> {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `Sign this message to authenticate with DomainFi Valuation API.\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\n\nThis request will not trigger a blockchain transaction or cost any gas fees.`;

    return { message, timestamp };
  }

  async validateUser(walletAddress: string): Promise<any> {
    // In a real implementation, you might want to:
    // 1. Check if the wallet is whitelisted
    // 2. Check rate limits
    // 3. Store user session data
    // 4. Verify wallet has required NFTs/tokens

    if (!ethers.isAddress(walletAddress)) {
      return null;
    }

    return {
      walletAddress,
      type: 'wallet',
    };
  }

  async createApiKey(walletAddress: string, name: string): Promise<{ apiKey: string; keyId: string }> {
    // Generate a secure API key
    const keyId = ethers.id(`${walletAddress}-${name}-${Date.now()}`).slice(0, 10);
    const apiKey = `dfva_${keyId}_${ethers.hexlify(ethers.randomBytes(32)).slice(2)}`;

    // In a real implementation, you would:
    // 1. Store the hashed API key in the database
    // 2. Associate it with the wallet address
    // 3. Set expiration date
    // 4. Set usage limits

    return { apiKey, keyId };
  }

  async validateApiKey(apiKey: string): Promise<any> {
    // Extract key ID from API key format: dfva_{keyId}_{secret}
    if (!apiKey.startsWith('dfva_')) {
      return null;
    }

    const parts = apiKey.split('_');
    if (parts.length !== 3) {
      return null;
    }

    const keyId = parts[1];

    // In a real implementation, you would:
    // 1. Look up the hashed key in the database
    // 2. Verify the secret portion
    // 3. Check if key is still valid/not expired
    // 4. Check rate limits
    // 5. Return associated user data

    // For demo purposes, return a mock user
    return {
      keyId,
      type: 'api_key',
      walletAddress: 'demo-wallet',
    };
  }
}