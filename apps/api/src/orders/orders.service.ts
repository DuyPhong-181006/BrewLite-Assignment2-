import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { assertTransition } from './order-state-machine';

// Khách chỉ tự hủy được đơn CHƯA trả tiền (đơn PAID muốn hủy phải hoàn tiền – việc của quầy, ngoài MVP)
const CUSTOMER_CANCELLABLE: OrderStatus[] = ['PENDING', 'PAYMENT_FAILED'];

// Gộp số lượng theo sản phẩm (cùng 1 món khác size/topping vẫn trừ chung 1 kho),
// sắp theo id tăng dần: 2 đơn cùng lúc luôn khóa sản phẩm theo cùng thứ tự -> tránh deadlock
const qtyByProduct = (lines: { productId: number; qty: number }[]): [number, number][] => {
  const total = new Map<number, number>();
  for (const line of lines) total.set(line.productId, (total.get(line.productId) ?? 0) + line.qty);
  return [...total].sort((a, b) => a[0] - b[0]);
};

@Injectable()
export class OrdersService {
  // NestJS tự đưa PrismaService (TV1), PromotionsService (TV2) và InventoryService (TV3) vào đây
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionsService,
    private readonly inventory: InventoryService,
  ) {}

  // Task 6: tính giá ở backend, trừ kho rồi lưu đơn trạng thái PENDING
  async create(userId: number, dto: CreateOrderDto) {
    const lines: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];

    for (const item of dto.items) {
      // Giá gốc của món
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm #${item.productId}`);

      // Phụ thu theo size
      const size = await this.prisma.sizeOption.findUnique({ where: { code: item.size } });
      if (!size) throw new BadRequestException(`Size không hợp lệ: ${item.size}`);

      // Giá các topping (bỏ trùng)
      const toppingCodes = [...new Set(item.toppings ?? [])];
      const toppings = await this.prisma.topping.findMany({
        where: { code: { in: toppingCodes }, active: true },
      });
      if (toppings.length !== toppingCodes.length) throw new BadRequestException('Có topping không hợp lệ');

      const unitPrice = product.price + size.extraPrice + toppings.reduce((sum, t) => sum + t.price, 0);

      lines.push({
        productId: product.id,
        productName: product.name,
        size: item.size,
        toppings: toppingCodes,
        qty: item.qty,
        unitPrice,
        lineTotal: unitPrice * item.qty,
      });
    }

    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

    // Áp mã giảm giá (nếu có) – dùng hàm validateCoupon của TV2.
    // Mã sai / hết hạn / chưa đủ giá trị tối thiểu -> TV2 ném lỗi 404/400, đơn KHÔNG được tạo.
    // Lượt dùng mã chỉ được ghi khi đơn PAID (việc của TV6 gọi recordUsage).
    let discount = 0;
    let couponCode: string | null = null;
    if (dto.couponCode) {
      const coupon = await this.promotions.validateCoupon(dto.couponCode, subtotal);
      discount = coupon.discountAmount;
      couponCode = coupon.code;
    }

    // Trừ kho (TV3) và lưu đơn trong CÙNG 1 transaction:
    // 1 món thiếu hàng / có người chốt đơn cùng lúc -> lỗi 400, hoàn lại toàn bộ, KHÔNG có đơn nào được tạo
    return this.prisma.$transaction(async (tx) => {
      for (const [productId, qty] of qtyByProduct(lines)) {
        await this.inventory.holdStockForOrder(tx, productId, qty);
      }
      return tx.order.create({
        data: {
          userId,
          status: 'PENDING',
          subtotal,
          discount,
          couponCode,
          total: subtotal - discount,
          items: { create: lines },
        },
        include: { items: true },
      });
    });
  }

  // Task 9: lịch sử đơn của người dùng, mới nhất trước
  findMine(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  // GET /orders/:id – chi tiết 1 đơn. Đơn của người khác cũng báo 404 (không cho biết đơn đó có tồn tại)
  async findOne(userId: number, id: number) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order || order.userId !== userId) throw new NotFoundException(`Không tìm thấy đơn #${id}`);
    return order;
  }

  // Hủy đơn: KHÔNG xóa dòng trong CSDL, chỉ đổi trạng thái sang CANCELLED (giữ lịch sử, đối soát thanh toán)
  // và trả hàng về kho.
  async cancel(userId: number, id: number) {
    const order = await this.findOne(userId, id); // không có / không phải của mình -> 404

    // State machine của TV3 (sơ đồ Mục 9.1): vd đơn đã CANCELLED / COMPLETED -> 400
    assertTransition(order.status, 'CANCELLED');
    if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
      throw new BadRequestException(`Đơn #${id} đã thanh toán, muốn hủy vui lòng liên hệ quầy để hoàn tiền`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Chỉ cập nhật nếu trạng thái VẪN còn hủy được ngay lúc ghi.
      // Nếu cùng lúc có request khác vừa thanh toán / hủy xong thì count = 0 -> báo lỗi, không ghi đè, không trả kho 2 lần.
      const result = await tx.order.updateMany({
        where: { id, userId, status: { in: CUSTOMER_CANCELLABLE } },
        data: { status: 'CANCELLED' },
      });
      if (result.count === 0) throw new BadRequestException(`Đơn #${id} vừa đổi trạng thái, không hủy được`);

      // Trả lại hàng về kho (TV3) – cùng transaction với việc đổi trạng thái
      for (const [productId, qty] of qtyByProduct(order.items)) {
        await this.inventory.releaseStock(tx, productId, qty);
      }
    });

    return this.findOne(userId, id);
  }
}