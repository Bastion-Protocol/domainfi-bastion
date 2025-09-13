export class ValidationUtil {
  static isValidDomainName(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(domain);
  }

  static isValidTokenId(tokenId: string): boolean {
    return /^[0-9]+$/.test(tokenId) || /^0x[a-fA-F0-9]+$/.test(tokenId);
  }

  static isValidCircleId(circleId: string): boolean {
    return /^[a-zA-Z0-9-_]+$/.test(circleId) && circleId.length >= 3 && circleId.length <= 50;
  }

  static sanitizeDomainName(domain: string): string {
    return domain.toLowerCase().trim();
  }

  static calculateDomainRarity(domainName: string, tld: string): number {
    let rarity = 0;
    
    // Length factor (shorter is rarer)
    if (domainName.length <= 3) rarity += 5;
    else if (domainName.length <= 5) rarity += 3;
    else if (domainName.length <= 8) rarity += 1;
    
    // Character composition
    if (/^[0-9]+$/.test(domainName)) rarity += 2; // All numbers
    if (!/[0-9]/.test(domainName) && !/[-]/.test(domainName)) rarity += 1; // Clean letters only
    
    // TLD rarity
    const commonTlds = ['com', 'org', 'net', 'edu', 'gov'];
    if (commonTlds.includes(tld)) rarity += 1;
    
    // Dictionary words (simple check)
    if (this.isCommonWord(domainName)) rarity += 3;
    
    return Math.min(rarity, 10); // Cap at 10
  }

  static calculateSEOScore(domainName: string): number {
    let score = 0;
    
    // Length optimization
    if (domainName.length >= 6 && domainName.length <= 14) score += 2;
    
    // No hyphens or numbers
    if (!/[-0-9]/.test(domainName)) score += 2;
    
    // Memorable/brandable
    if (this.isBrandable(domainName)) score += 3;
    
    // Keyword relevance (simplified)
    if (this.hasBusinessKeywords(domainName)) score += 3;
    
    return Math.min(score, 10);
  }

  private static isCommonWord(word: string): boolean {
    const commonWords = [
      'app', 'web', 'tech', 'digital', 'smart', 'crypto', 'block', 'chain',
      'trade', 'market', 'finance', 'bank', 'pay', 'money', 'coin', 'token'
    ];
    return commonWords.some(w => word.includes(w));
  }

  private static isBrandable(domain: string): boolean {
    // Simple heuristics for brandability
    const vowels = (domain.match(/[aeiou]/g) || []).length;
    const consonants = domain.length - vowels;
    return vowels >= 2 && consonants >= 2 && domain.length >= 5;
  }

  private static hasBusinessKeywords(domain: string): boolean {
    const businessWords = [
      'shop', 'store', 'market', 'trade', 'buy', 'sell', 'business',
      'service', 'solution', 'platform', 'system', 'network'
    ];
    return businessWords.some(w => domain.includes(w));
  }
}