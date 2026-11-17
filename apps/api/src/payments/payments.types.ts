import { PaymentMethod, PaymentStatus } from '@prisma/client';

export { PaymentMethod, PaymentStatus };

export interface PaymentTransaction {
  id: number; // Đổi từ string thành number để khớp với CSDL
  orderId: number;
  idempotencyKey: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Dữ liệu để ghi 1 giao dịch – amount do SERVER lấy từ order.total, không nhận từ client
export interface CreatePaymentDto {
  orderId: number;
  idempotencyKey: string;
  amount: number;
  method: PaymentMethod;
}

// Kết quả cổng thanh toán giả lập
export interface GatewayResult {
  success: boolean;
  transactionId: string;
  reason: string;
}
