import { BadRequestException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { PromotionsService } from './promotions.service';
import { PrismaService } from '../prisma/prisma.service';

type Fn = (args?: unknown) => Promise<unknown>;

// UNIT-T08 → UNIT-T11 – kiểm tra mã giảm giá (FR-11)
describe('PromotionsService.validateCoupon', () => {
  const findUnique = jest.fn<Fn>();
  const service = new PromotionsService({ promotion: { findUnique } } as unknown as PrismaService);

  const promo = (over: Record<string, unknown> = {}) => ({
    code: 'WELCOME10',
    description: 'Giảm 10%',
    percentOff: 10,
    maxDiscount: 20000,
    minSubtotal: 0,
    maxUses: null,
    usedCount: 0,
    expiresAt: null,
    active: true,
    ...over,
  });

  beforeEach(() => jest.clearAllMocks());

  it('mã không tồn tại -> 404', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.validateCoupon('KHONGCO', 50000)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('mã viết thường, có dấu cách vẫn tìm đúng mã in hoa', async () => {
    findUnique.mockResolvedValue(promo());
    await service.validateCoupon('  welcome10 ', 50000);
    expect(findUnique).toHaveBeenCalledWith({ where: { code: 'WELCOME10' } });
  });

  it('giảm 10% nhưng không vượt mức tối đa 20.000đ', async () => {
    findUnique.mockResolvedValue(promo());
    expect((await service.validateCoupon('WELCOME10', 50000)).discountAmount).toBe(5000);
    expect((await service.validateCoupon('WELCOME10', 500000)).discountAmount).toBe(20000);
  });

  it('đơn chưa đạt giá trị tối thiểu -> 400', async () => {
    findUnique.mockResolvedValue(promo({ minSubtotal: 100000 }));
    await expect(service.validateCoupon('BREW20', 50000)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('mã hết hạn -> 400', async () => {
    findUnique.mockResolvedValue(promo({ expiresAt: new Date('2020-01-01') }));
    await expect(service.validateCoupon('WELCOME10', 50000)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('mã đã dùng hết lượt -> 400', async () => {
    findUnique.mockResolvedValue(promo({ maxUses: 5, usedCount: 5 }));
    await expect(service.validateCoupon('WELCOME10', 50000)).rejects.toBeInstanceOf(BadRequestException);
  });
});
