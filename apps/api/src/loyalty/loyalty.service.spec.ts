import { jest } from '@jest/globals';
import { LoyaltyService } from './loyalty.service';
import { PrismaService } from '../prisma/prisma.service';

type Fn = (args?: unknown) => Promise<unknown>;

// UNIT-T12 → UNIT-T14 – cộng điểm thưởng khi đơn đã thanh toán (FR-12)
describe('LoyaltyService', () => {
  const orderFindUnique = jest.fn<Fn>();
  const orderUpdateMany = jest.fn<Fn>();
  const userUpdate = jest.fn<Fn>();
  const loyaltyCreate = jest.fn<Fn>();

  const tx = {
    order: { findUnique: orderFindUnique, updateMany: orderUpdateMany },
    user: { update: userUpdate },
    loyaltyTransaction: { create: loyaltyCreate },
  };
  const prisma = {
    $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  } as unknown as PrismaService;
  const service = new LoyaltyService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('10.000đ = 1 điểm, phần lẻ bị bỏ', () => {
    expect(service.calculatePoints(9999)).toBe(0);
    expect(service.calculatePoints(45000)).toBe(4);
    expect(service.calculatePoints(100000)).toBe(10);
  });

  it('đơn PAID 45.000đ -> cộng 4 điểm và ghi 1 dòng LoyaltyTransaction EARN', async () => {
    orderFindUnique.mockResolvedValue({ id: 1, total: 45000, status: 'PAID', pointsEarned: 0, userId: 7 });
    orderUpdateMany.mockResolvedValue({ count: 1 });

    const result = await service.awardPointsForPaidOrder(1);

    expect(result).toEqual({ awarded: true, points: 4 });
    expect(userUpdate).toHaveBeenCalledWith({ where: { id: 7 }, data: { loyaltyPoints: { increment: 4 } } });
    expect(loyaltyCreate).toHaveBeenCalledWith({ data: { userId: 7, orderId: 1, type: 'EARN', points: 4 } });
  });

  it('gọi lần 2 cho cùng đơn -> không cộng thêm (ALREADY_AWARDED)', async () => {
    orderFindUnique.mockResolvedValue({ id: 1, total: 45000, status: 'PAID', pointsEarned: 4, userId: 7 });
    orderUpdateMany.mockResolvedValue({ count: 0 });

    const result = await service.awardPointsForPaidOrder(1);

    expect(result).toMatchObject({ awarded: false, reason: 'ALREADY_AWARDED' });
    expect(userUpdate).not.toHaveBeenCalled();
    expect(loyaltyCreate).not.toHaveBeenCalled();
  });

  it('đơn chưa thanh toán -> không cộng điểm', async () => {
    orderFindUnique.mockResolvedValue({ id: 2, total: 45000, status: 'PENDING', pointsEarned: 0, userId: 7 });
    const result = await service.awardPointsForPaidOrder(2);
    expect(result).toMatchObject({ awarded: false, reason: 'ORDER_NOT_PAID' });
  });
});
