import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaPaymentsRepository } from './prisma-payments.repository';
import { MockPaymentGateway } from './mock-payment.gateway';
import { PromotionsModule } from '../promotions/promotions.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  // PromotionsService.recordUsage (TV2) và LoyaltyService.awardPointsForPaidOrder (TV5) – gọi khi đơn PAID
  imports: [PromotionsModule, LoyaltyModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PrismaPaymentsRepository,
    MockPaymentGateway,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
