import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // Giữ hàng trong kho sử dụng khóa lạc quan (Optimistic Locking) và kiểm tra đủ tồn kho
  // tx: truyền vào khi chạy BÊN TRONG transaction (vd TV4 tạo đơn); không truyền thì dùng prisma thường
  async holdStock(
    productId: number,
    quantityToHold: number,
    currentVersion: number,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const result = await tx.product.updateMany({
      where: {
        id: productId,
        version: currentVersion,
        stock: { gte: quantityToHold },
      },
      data: {
        stock: { decrement: quantityToHold },
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        'Sản phẩm không đủ tồn kho hoặc đang có người chốt đơn cùng lúc, vui lòng thử lại!',
      );
    }

    return tx.product.findUnique({
      where: { id: productId },
    });
  }

  // Dùng khi tạo đơn (TV4 gọi trong transaction): tự đọc version hiện tại rồi giữ hàng
  async holdStockForOrder(tx: Prisma.TransactionClient, productId: number, quantity: number) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { name: true, stock: true, version: true },
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm có id ${productId}`);
    }
    if (product.stock < quantity) {
      throw new BadRequestException(`${product.name} chỉ còn ${product.stock} ly`);
    }

    return this.holdStock(productId, quantity, product.version, tx);
  }

  // Trả hàng về kho khi hủy đơn (TV4 gọi trong transaction hủy đơn)
  async releaseStock(tx: Prisma.TransactionClient, productId: number, quantity: number) {
    return tx.product.update({
      where: { id: productId },
      data: {
        stock: { increment: quantity },
        version: { increment: 1 },
      },
    });
  }
}
