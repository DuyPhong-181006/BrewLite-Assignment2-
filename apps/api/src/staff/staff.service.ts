import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertTransition } from '../orders/order-state-machine';
import { StaffStatus } from './dto/update-status.dto';

// Đơn đang ở quầy: đã trả tiền, đang pha, chờ khách lấy
const ACTIVE: OrderStatus[] = ['PAID', 'PREPARING', 'READY'];

// TV3 – Phạm Tuấn (FR-13): nghiệp vụ màn quầy pha chế
@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  // Danh sách đơn cần làm, đơn trả tiền trước làm trước. Đổi mã topping thành tên cho barista dễ đọc.
  async listActive() {
    const [orders, toppings] = await Promise.all([
      this.prisma.order.findMany({
        where: { status: { in: ACTIVE } },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          status: true,
          total: true,
          createdAt: true,
          items: { select: { id: true, productName: true, size: true, toppings: true, qty: true } },
        },
      }),
      this.prisma.topping.findMany({ select: { code: true, name: true } }),
    ]);
    const nameOf = new Map(toppings.map((t) => [t.code, t.name]));
    return orders.map((o) => ({
      ...o,
      items: o.items.map((i) => ({ ...i, toppings: i.toppings.map((c) => nameOf.get(c) ?? c) })),
    }));
  }

  // Đổi trạng thái theo máy trạng thái (ADR, FR-08): PAID → PREPARING → READY → COMPLETED
  async updateStatus(id: number, next: StaffStatus) {
    const order = await this.prisma.order.findUnique({ where: { id }, select: { status: true } });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn #${id}`);

    assertTransition(order.status, next); // sai bước (vd PAID → COMPLETED) -> 400

    // Chỉ đổi nếu trạng thái vẫn như lúc đọc: 2 nhân viên bấm cùng lúc thì 1 người nhận 409
    const result = await this.prisma.order.updateMany({
      where: { id, status: order.status },
      data: { status: next },
    });
    if (result.count === 0) {
      throw new ConflictException(`Đơn #${id} vừa được người khác cập nhật, tải lại danh sách`);
    }
    return { id, from: order.status, status: next };
  }
}
