import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService], // Xuất ra để TV4 có thể gọi sang dùng
})
export class PromotionsModule {}
