import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';

// Module tồn kho (TV3): module khác (vd OrdersModule của TV4) import vào để dùng InventoryService
@Module({
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
