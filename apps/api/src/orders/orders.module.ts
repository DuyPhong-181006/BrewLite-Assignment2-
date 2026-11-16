import { Module } from '@nestjs/common';
import { PromotionsModule } from '../promotions/promotions.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  // PromotionsService (mã giảm giá của TV2) và InventoryService (tồn kho của TV3) dùng khi tạo / hủy đơn
  imports: [PromotionsModule, InventoryModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
