import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('domain_valuations')
@Index(['domainTokenId'])
@Index(['domainName'])
@Index(['createdAt'])
export class DomainValuation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  domainTokenId: string;

  @Column()
  domainName: string;

  @Column()
  tld: string;

  @Column('decimal', { precision: 18, scale: 8 })
  estimatedValue: number;

  @Column('json')
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

  @Column('decimal', { precision: 5, scale: 4 })
  confidenceScore: number;

  @Column()
  methodology: string;

  @Column({ nullable: true })
  circleId?: string;

  @Column({ default: false })
  isActive: boolean;

  @Column({ nullable: true })
  lastMarketPrice?: number;

  @Column({ nullable: true })
  priceChange24h?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}