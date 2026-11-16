import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async validateCoupon(code: string, subtotal: number) {
    // 3. Thêm trim() để tránh dấu cách thừa
    const coupon = await this.prisma.promotion.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon) {
      throw new NotFoundException('Mã giảm giá không tồn tại');
    }

    if (!coupon.active) {
      throw new BadRequestException('Mã giảm giá đã bị vô hiệu hóa');
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new BadRequestException('Mã giảm giá đã hết hạn');
    }

    if (coupon.maxUses !== null && coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    }

    // 2. Chặn subtotal <= 0
    if (!(subtotal > 0)) {
      throw new BadRequestException('Giá trị đơn hàng không hợp lệ');
    }

    if (subtotal < coupon.minSubtotal) {
      const minSubtotalFormat = coupon.minSubtotal.toLocaleString('vi-VN');
      throw new BadRequestException(
        `Đơn hàng chưa đạt giá trị tối thiểu ${minSubtotalFormat}đ để áp dụng mã này`,
      );
    }

    let discountAmount = (subtotal * coupon.percentOff) / 100;

    if (coupon.maxDiscount !== null && coupon.maxDiscount > 0 && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }

    return {
      code: coupon.code,
      discountAmount: Math.floor(discountAmount),
      description: coupon.description,
    };
  }

  async recordUsage(code: string) {
    const c = code.trim().toUpperCase(); 
    const coupon = await this.prisma.promotion.findUnique({ where: { code: c } });
    if (!coupon) return;

    const result = await this.prisma.promotion.updateMany({
      where: {
        code: c,
        ...(coupon.maxUses !== null && coupon.maxUses > 0
          ? { usedCount: { lt: coupon.maxUses } }
          : {}),
      },
      data: { usedCount: { increment: 1 } },
    });

    if (result.count === 0) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    }
  }

  // 1. Thêm select để bảo mật
  async getCouponByCode(code: string) {
    const coupon = await this.prisma.promotion.findUnique({
      where: { code: code.trim().toUpperCase() },
      select: {
        code: true,
        description: true,
        percentOff: true,
        maxDiscount: true,
        minSubtotal: true,
      },
    });
    if (!coupon) throw new NotFoundException('Mã giảm giá không tồn tại');
    return coupon;
  }
}
