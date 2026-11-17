import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

// Client chỉ gửi: thanh toán ĐƠN NÀO và trả BẰNG GÌ.
// KHÔNG có amount (số tiền lấy từ order.total trong CSDL), KHÔNG có userId (lấy từ JWT khi TV5 xong).
export class ProcessPaymentDto {
  @IsInt({ message: 'orderId phải là số nguyên' })
  @Min(1)
  orderId: number;

  @IsEnum(PaymentMethod, { message: 'method chỉ được là WALLET hoặc CARD' })
  method: PaymentMethod;

  // Cho phép gửi trong body; ưu tiên header Idempotency-Key
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  // Chỉ để DEMO trường hợp thanh toán lỗi (PAYMENT_FAILED) theo US-05
  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}
