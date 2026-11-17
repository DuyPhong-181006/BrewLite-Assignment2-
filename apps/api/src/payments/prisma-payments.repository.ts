import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './payments.types';
import { Payment, PaymentStatus } from '@prisma/client';

@Injectable()
export class PrismaPaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdempotencyKey(key: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { idempotencyKey: key },
    });
  }

  // Ghi giao dịch ở trạng thái PROCESSING TRƯỚC khi gọi cổng thanh toán.
  // Cột idempotencyKey là @unique nên 2 request cùng key gửi cùng lúc chỉ 1 cái ghi được.
  async createProcessing(dto: CreatePaymentDto): Promise<Payment> {
    return this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        idempotencyKey: dto.idempotencyKey,
        amount: dto.amount,
        method: dto.method,
        status: PaymentStatus.PROCESSING,
      },
    });
  }
}
