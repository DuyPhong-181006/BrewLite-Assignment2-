import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        sizes: { orderBy: { sortOrder: 'asc' } },
        toppings: { where: { active: true } },
      },
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm có id ${id}`);
    }

    const sizes =
      product.sizes.length > 0
        ? product.sizes
        : await this.prisma.sizeOption.findMany({ orderBy: { sortOrder: 'asc' } });

    const toppings =
      product.toppings.length > 0
        ? product.toppings
        : await this.prisma.topping.findMany({ where: { active: true } });

    return {
      ...product,
      sizes,
      toppings,
    };
  }
}