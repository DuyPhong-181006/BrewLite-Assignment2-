import { Injectable } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { GatewayResult } from './payments.types';

// Cổng thanh toán GIẢ LẬP (đề Mục 6): mô phỏng Ví điện tử / Thẻ, không gọi MoMo/VNPay thật
@Injectable()
export class MockPaymentGateway {
  async processPayment(amount: number, method: PaymentMethod, simulateFailure = false): Promise<GatewayResult> {
    // Giả lập xử lý thanh toán (mặc định 300ms, chỉnh bằng biến MOCK_PAYMENT_DELAY_MS trong docker-compose)
    const delay = Number(process.env.MOCK_PAYMENT_DELAY_MS ?? 300);
    await new Promise((resolve) => setTimeout(resolve, delay));

    if (simulateFailure || amount <= 0) {
      return { success: false, transactionId: '', reason: `Cổng thanh toán từ chối giao dịch ${method} (giả lập)` };
    }

    return {
      success: true,
      transactionId: `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      reason: '',
    };
  }
}
