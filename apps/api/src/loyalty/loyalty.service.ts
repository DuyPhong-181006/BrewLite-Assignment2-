import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoyaltyService {
  private readonly POINTS_PER_10000 = 1;

  constructor(private readonly prisma: PrismaService) {}

  // GET /loyalty/me – tổng điểm + 20 lần cộng/trừ điểm gần nhất (bảng LoyaltyTransaction)
  async getMyPoints(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, loyaltyPoints: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    const history = await this.prisma.loyaltyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, orderId: true, type: true, points: true, createdAt: true },
    });

    return { ...user, history };
  }

  // Quy tắc tính điểm (BR-08): cứ 10.000đ của tổng tiền sau giảm giá = 1 điểm
  calculatePoints(total: number) {
    return Math.floor(total / 10000) * this.POINTS_PER_10000;
  }

  async awardPointsForPaidOrder(orderId: number) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          total: true,
          status: true,
          pointsEarned: true,
          userId: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      if (order.status !== 'PAID') {
        return { awarded: false, points: 0, reason: 'ORDER_NOT_PAID' };
      }

      const points = this.calculatePoints(order.total);

      if (points <= 0) {
        return { awarded: false, points: 0, reason: 'NOT_ENOUGH_TOTAL' };
      }

      const updated = await tx.order.updateMany({
        where: {
          id: orderId,
          status: 'PAID',
          pointsEarned: 0,
        },
        data: {
          pointsEarned: points,
        },
      });

      if (updated.count === 0) {
        return { awarded: false, points: 0, reason: 'ALREADY_AWARDED' };
      }

      await tx.user.update({
        where: { id: order.userId },
        data: {
          loyaltyPoints: { increment: points },
        },
      });

      // Ghi sổ điểm. @@unique([orderId, type]) chặn cộng 2 lần cho cùng 1 đơn
      await tx.loyaltyTransaction.create({
        data: { userId: order.userId, orderId: order.id, type: 'EARN', points },
      });

      return { awarded: true, points };
    });
  }
}
