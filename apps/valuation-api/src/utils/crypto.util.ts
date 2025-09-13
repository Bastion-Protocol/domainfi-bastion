import { ethers } from 'ethers';
import * as CryptoJS from 'crypto-js';

export class CryptoUtil {
  private static readonly SIGNING_KEY = process.env.VALUATION_SIGNING_KEY || 'default-key';

  static async signValuationMessage(
    domainTokenId: string,
    value: number,
    timestamp: number,
    purpose: string,
    privateKey: string
  ): Promise<{ signature: string; messageHash: string }> {
    const message = ethers.solidityPackedKeccak256(
      ['string', 'uint256', 'uint256', 'string'],
      [domainTokenId, ethers.parseEther(value.toString()), timestamp, purpose]
    );

    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage(ethers.getBytes(message));

    return {
      signature,
      messageHash: message,
    };
  }

  static hashSensitiveData(data: string): string {
    return CryptoJS.SHA256(data + this.SIGNING_KEY).toString();
  }

  static verifySignature(
    message: string,
    signature: string,
    expectedSigner: string
  ): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
    } catch {
      return false;
    }
  }

  static generateApiKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  }
}