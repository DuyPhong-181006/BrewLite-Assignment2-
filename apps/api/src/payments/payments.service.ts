import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Payment, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaPaymentsRepository } from './prisma-payments.repository';
import { MockPaymentGateway } from './mock-payment.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { assertTransition } from '../orders/order-state-machine';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PrismaPaymentsRepository,
    private readonly paymentGateway: MockPaymentGateway,
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionsService, // của TV2 – ghi lượt dùng mã khi đơn PAID
    private readonly loyalty: LoyaltyService, // của TV5 – cộng điểm thưởng khi đơn PAID
  ) {}

  async processPayment(
    userId: number,
    orderId: number,
    method: PaymentMethod,
    idempotencyKey: string,
    simulateFailure = false,
  ): Promise<Payment> {
    // 1. Kiểm tra Đơn hàng có tồn tại và là đơn CỦA người đang đăng nhập
    // (đơn của người khác cũng báo 404 – không cho biết đơn đó có tồn tại)
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId) {
      throw new NotFoundException(`Không tìm thấy đơn #${orderId}`);
    }

    // 2. Kiểm tra Idempotency-Key (chống thanh toán trùng): key đã dùng -> trả lại giao dịch cũ
    const existingPayment = await this.paymentsRepository.findByIdempotencyKey(idempotencyKey);
    if (existingPayment) {
      if (existingPayment.orderId !== orderId) {
        throw new ConflictException('Idempotency-Key này đã dùng cho một đơn khác');
      }
      return existingPayment;
    }

    // 3. Đơn phải đang chờ thanh toán (sơ đồ trạng thái Mục 9.1)
    if (order.status === 'PAYMENT_FAILED') {
      // "thử lại": PAYMENT_FAILED -> PENDING, kiểm tra bằng máy trạng thái của TV3 (FR-08)
      assertTransition('PAYMENT_FAILED', 'PENDING');
      await this.prisma.order.updateMany({
        where: { id: orderId, status: 'PAYMENT_FAILED' },
        data: { status: 'PENDING' },
      });
    } else if (order.status !== 'PENDING') {
      // Có thể 1 request CÙNG key vừa thanh toán xong ngay trước đó -> trả lại giao dịch đó
      const justDone = await this.paymentsRepository.findByIdempotencyKey(idempotencyKey);
      if (justDone && justDone.orderId === orderId) return justDone;
      throw new BadRequestException(`Đơn #${orderId} đang ở trạng thái ${order.status}, không thanh toán được`);
    }

    // 4. Ghi giao dịch PROCESSING trước, số tiền = order.total (KHÔNG lấy từ client)
    let payment: Payment;
    try {
      payment = await this.paymentsRepository.createProcessing({
        orderId,
        idempotencyKey,
        amount: order.total,
        method,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // Request khác cùng key vừa ghi trước (bấm 2 lần) -> trả lại giao dịch đó
        const sameKey = await this.paymentsRepository.findByIdempotencyKey(idempotencyKey);
        if (sameKey) return sameKey;
      }
      throw e;
    }

    // 5. Gọi cổng thanh toán giả lập với số tiền của đơn
    const gatewayResult = await this.paymentGateway.processPayment(order.total, method, simulateFailure);

    if (!gatewayResult.success) {
      // Thanh toán lỗi: giao dịch FAILED + đơn PAYMENT_FAILED; frontend giữ nguyên giỏ (US-05)
      const [failed] = await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED', failureReason: gatewayResult.reason },
        }),
        this.prisma.order.updateMany({
          where: { id: orderId, status: 'PENDING' },
          data: { status: 'PAYMENT_FAILED' },
        }),
      ]);
      return failed;
    }

    // 6. Thành công: đơn PENDING -> PAID và giao dịch SUCCESS trong CÙNG transaction.
    // Chỉ đổi khi đơn VẪN đang PENDING – không ghi đè đơn vừa bị hủy (API hủy của TV4),
    // và 2 lượt trả tiền cùng lúc cho 1 đơn thì chỉ 1 lượt thành công.
    assertTransition('PENDING', 'PAID'); // đơn đã được đưa về PENDING ở bước 3 (FR-08)
    const paid = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: 'PAID' },
      });
      if (updated.count === 0) return null;
      return tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCESS', providerRef: gatewayResult.transactionId },
      });
    });

    if (!paid) {
      // Đơn đã bị hủy / đã được lượt khác trả xong -> lượt này FAILED (giả lập hoàn tiền), báo 409
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failureReason: 'Đơn đã đổi trạng thái trong lúc thanh toán – hoàn tiền (giả lập)' },
      });
      throw new ConflictException('Đơn vừa bị hủy hoặc đã được thanh toán, giao dịch này không được tính');
    }

    // 7. Sau khi PAID: ghi lượt dùng mã giảm giá (TV2) và cộng điểm thưởng (TV5)
    if (order.couponCode) {
      try {
        await this.promotions.recordUsage(order.couponCode);
      } catch {
        // Đã trả tiền thành công thì không chặn đơn vì lỗi ghi lượt dùng mã
      }
    }
    try {
      await this.loyalty.awardPointsForPaidOrder(orderId); // 1 điểm / 10.000đ, chỉ cộng 1 lần
    } catch {
      // Lỗi cộng điểm không làm hỏng giao dịch đã thành công
    }

    return paid;
  }
}
