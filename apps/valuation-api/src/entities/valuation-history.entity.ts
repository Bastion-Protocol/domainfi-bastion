import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('valuation_history')
@Index(['domainTokenId'])
@Index(['timestamp'])
export class ValuationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  domainTokenId: string;

  @Column('decimal', { precision: 18, scale: 8 })
  value: number;

  @Column()
  methodology: string;

  @Column('decimal', { precision: 5, scale: 4 })
  confidenceScore: number;

  @Column('json')
  marketConditions: {
    totalMarketCap: number;
    volumeChange24h: number;
    averagePrice: number;
    transactionCount: number;
  };

  @CreateDateColumn()
  timestamp: Date;
}