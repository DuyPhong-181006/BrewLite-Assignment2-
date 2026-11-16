// UNIT-T16 – Nghiệp vụ thanh toán (FR-05, FR-10) với cổng thanh toán và CSDL giả
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Payment, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaPaymentsRepository } from './prisma-payments.repository';
import { MockPaymentGateway } from './mock-payment.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CreatePaymentDto, GatewayResult } from './payments.types';

type OrderRow = { id: number; userId: number; status: string; total: number; couponCode: string | null };

const USER = 7; // id người đang đăng nhập (req.user.sub)

describe('PaymentsService', () => {
  let service: PaymentsService;

  const makePayment = (over: Partial<Payment> = {}): Payment => ({
    id: 1,
    orderId: 1,
    idempotencyKey: 'key_123',
    amount: 45000,
    method: PaymentMethod.WALLET,
    status: PaymentStatus.PROCESSING,
    providerRef: null,
    failureReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  });

  // Các hàm giả (mock) – mỗi test tự chỉnh kết quả trả về
  const findByIdempotencyKey = jest.fn<(key: string) => Promise<Payment | null>>();
  const createProcessing = jest.fn<(dto: CreatePaymentDto) => Promise<Payment>>();
  const gatewayProcess = jest.fn<(amount: number, method: PaymentMethod, fail?: boolean) => Promise<GatewayResult>>();
  const orderFindUnique = jest.fn<(args: unknown) => Promise<OrderRow | null>>();
  const orderUpdateMany = jest.fn<(args: unknown) => Promise<{ count: number }>>();
  const paymentUpdate = jest.fn<(args: { data: Partial<Payment> }) => Promise<Payment>>();
  const recordUsage = jest.fn<(code: string) => Promise<void>>();
  const awardPointsForPaidOrder = jest.fn<(orderId: number) => Promise<{ awarded: boolean; points: number }>>();

  // tx = "bản sao" prisma dùng bên trong $transaction
  const tx = {
    order: { findUnique: orderFindUnique, updateMany: orderUpdateMany },
    payment: { update: paymentUpdate },
  };
  const prismaMock = {
    ...tx,
    // $transaction nhận 1 hàm (interactive) hoặc 1 mảng thao tác
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (t: typeof tx) => Promise<unknown>)(tx) : Promise.all(arg as Promise<unknown>[]),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    findByIdempotencyKey.mockResolvedValue(null);
    createProcessing.mockImplementation(async (dto) => makePayment({ orderId: dto.orderId, amount: dto.amount }));
    gatewayProcess.mockResolvedValue({ success: true, transactionId: 'TXN_1', reason: '' });
    orderFindUnique.mockResolvedValue({ id: 1, userId: USER, status: 'PENDING', total: 45000, couponCode: null });
    orderUpdateMany.mockResolvedValue({ count: 1 });
    paymentUpdate.mockImplementation(async ({ data }) => makePayment(data));
    recordUsage.mockResolvedValue(undefined);
    awardPointsForPaidOrder.mockResolvedValue({ awarded: true, points: 4 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaPaymentsRepository, useValue: { findByIdempotencyKey, createProcessing } },
        { provide: MockPaymentGateway, useValue: { processPayment: gatewayProcess } },
        { provide: PrismaService, useValue: prismaMock },
        { provide: PromotionsService, useValue: { recordUsage } },
        { provide: LoyaltyService, useValue: { awardPointsForPaidOrder } },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('Idempotency: key đã dùng cho đúng đơn -> trả lại giao dịch cũ, KHÔNG tạo giao dịch mới', async () => {
    const old = makePayment({ status: PaymentStatus.SUCCESS });
    findByIdempotencyKey.mockResolvedValue(old);

    const result = await service.processPayment(USER, 1, PaymentMethod.WALLET, 'key_123');

    expect(result).toEqual(old);
    expect(createProcessing).not.toHaveBeenCalled();
    expect(gatewayProcess).not.toHaveBeenCalled();
  });

  it('Idempotency: key đã dùng cho đơn KHÁC -> 409 Conflict', async () => {
    findByIdempotencyKey.mockResolvedValue(makePayment({ orderId: 99 }));

    await expect(service.processPayment(USER, 1, PaymentMethod.WALLET, 'key_123')).rejects.toBeInstanceOf(ConflictException);
  });

  it('Đơn không tồn tại -> 404', async () => {
    orderFindUnique.mockResolvedValue(null);

    await expect(service.processPayment(USER, 1, PaymentMethod.WALLET, 'k1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('Đơn của người khác -> 404 (không thanh toán hộ / không lộ đơn người khác)', async () => {
    orderFindUnique.mockResolvedValue({ id: 1, userId: 99, status: 'PENDING', total: 45000, couponCode: null });

    await expect(service.processPayment(USER, 1, PaymentMethod.WALLET, 'k0')).rejects.toBeInstanceOf(NotFoundException);
    expect(createProcessing).not.toHaveBeenCalled();
  });

  it('Đơn đã hủy (CANCELLED) -> 400, không gọi cổng thanh toán', async () => {
    orderFindUnique.mockResolvedValue({ id: 1, userId: USER, status: 'CANCELLED', total: 45000, couponCode: null });

    await expect(service.processPayment(USER, 1, PaymentMethod.CARD, 'k2')).rejects.toBeInstanceOf(BadRequestException);
    expect(gatewayProcess).not.toHaveBeenCalled();
  });

  it('Thành công: số tiền lấy từ order.total, đơn PENDING -> PAID, giao dịch SUCCESS, ghi lượt dùng mã', async () => {
    orderFindUnique.mockResolvedValue({ id: 1, userId: USER, status: 'PENDING', total: 40500, couponCode: 'GIAM10' });

    const result = await service.processPayment(USER, 1, PaymentMethod.WALLET, 'k3');

    expect(createProcessing).toHaveBeenCalledWith(expect.objectContaining({ amount: 40500 }));
    expect(gatewayProcess).toHaveBeenCalledWith(40500, PaymentMethod.WALLET, false);
    expect(orderUpdateMany).toHaveBeenCalledWith({ where: { id: 1, status: 'PENDING' }, data: { status: 'PAID' } });
    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expect(recordUsage).toHaveBeenCalledWith('GIAM10');
    expect(awardPointsForPaidOrder).toHaveBeenCalledWith(1); // cộng điểm thưởng (TV5)
  });

  it('Thanh toán lỗi: giao dịch FAILED, đơn PENDING -> PAYMENT_FAILED, không ghi lượt dùng mã', async () => {
    orderFindUnique.mockResolvedValue({ id: 1, userId: USER, status: 'PENDING', total: 45000, couponCode: 'GIAM10' });
    gatewayProcess.mockResolvedValue({ success: false, transactionId: '', reason: 'Từ chối (giả lập)' });

    const result = await service.processPayment(USER, 1, PaymentMethod.CARD, 'k4', true);

    expect(result.status).toBe(PaymentStatus.FAILED);
    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'PENDING' },
      data: { status: 'PAYMENT_FAILED' },
    });
    expect(recordUsage).not.toHaveBeenCalled();
    expect(awardPointsForPaidOrder).not.toHaveBeenCalled();
  });

  it('Thử lại sau khi lỗi: đơn PAYMENT_FAILED -> PENDING rồi mới thanh toán (sơ đồ 9.1)', async () => {
    orderFindUnique.mockResolvedValue({ id: 1, userId: USER, status: 'PAYMENT_FAILED', total: 45000, couponCode: null });

    const result = await service.processPayment(USER, 1, PaymentMethod.WALLET, 'k6');

    expect(orderUpdateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 1, status: 'PAYMENT_FAILED' },
      data: { status: 'PENDING' },
    });
    expect(result.status).toBe(PaymentStatus.SUCCESS);
  });

  it('Đơn bị hủy đúng lúc đang thanh toán -> 409, không báo thành công', async () => {
    orderUpdateMany.mockResolvedValue({ count: 0 }); // updateMany có điều kiện không đổi được dòng nào

    await expect(service.processPayment(USER, 1, PaymentMethod.WALLET, 'k5')).rejects.toBeInstanceOf(ConflictException);
    expect(paymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
    );
  });
});
