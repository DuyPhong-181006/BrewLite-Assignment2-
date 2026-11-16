import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

// Bảng chuyển trạng thái hợp lệ theo sơ đồ Mục 9.1 của đề
// PAYMENT_FAILED chỉ đi được "thử lại" (về PENDING) hoặc "hủy"; PAID vẫn "hủy" được (kèm hoàn tiền)
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_FAILED: ['PENDING', 'CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new BadRequestException(
      `Không thể chuyển trạng thái đơn hàng từ ${from} sang ${to}`,
    );
  }
}