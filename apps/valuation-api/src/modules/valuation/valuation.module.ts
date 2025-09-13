import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ValuationService } from './valuation.service';
import { ValuationController } from './valuation.controller';
import { DomainValuation } from '../../entities/domain-valuation.entity';
import { ValuationHistory } from '../../entities/valuation-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DomainValuation, ValuationHistory]),
  ],
  controllers: [ValuationController],
  providers: [ValuationService],
  exports: [ValuationService],
})
export class ValuationModule {}