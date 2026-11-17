import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { LoggingInterceptor } from './common/logging.interceptor';
import { ProductsModule } from './products/products.module';
import { PromotionsModule } from './promotions/promotions.module';
import { AuthModule } from './auth/auth.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { StaffModule } from './staff/staff.module';

// Module gốc: mỗi domain là 1 module riêng (xem docs/architecture/architecture.md)
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule, // TV1 – GET /health
    ProductsModule, // TV3 – FR-01, FR-02
    PromotionsModule, // TV2 – FR-11
    AuthModule, // TV5 – FR-06
    LoyaltyModule, // TV5 – FR-12
    OrdersModule, // TV4 – FR-04, FR-07, FR-08
    PaymentsModule, // TV6 – FR-05, FR-10
    StaffModule, // TV3 – FR-13 quầy pha chế
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }],
})
export class AppModule {}
