import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

type Fn = (args?: unknown) => Promise<unknown>;

// UNIT-T02, UNIT-T03 – logic lấy chi tiết món (FR-02)
describe('ProductsService', () => {
  const productFindUnique = jest.fn<Fn>();
  const productFindMany = jest.fn<Fn>();
  const sizeFindMany = jest.fn<Fn>();
  const toppingFindMany = jest.fn<Fn>();

  const prisma = {
    product: { findUnique: productFindUnique, findMany: productFindMany },
    sizeOption: { findMany: sizeFindMany },
    topping: { findMany: toppingFindMany },
  } as unknown as PrismaService;

  const service = new ProductsService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('findAll sắp xếp theo id tăng dần', async () => {
    productFindMany.mockResolvedValue([]);
    await service.findAll();
    expect(productFindMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
  });

  it('findOne với id không tồn tại -> NotFoundException (404)', async () => {
    productFindUnique.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('món chưa gắn size/topping riêng -> dùng danh mục chung S/M/L và topping đang bán', async () => {
    productFindUnique.mockResolvedValue({ id: 1, name: 'Cà phê sữa', sizes: [], toppings: [] });
    sizeFindMany.mockResolvedValue([{ code: 'S' }, { code: 'M' }, { code: 'L' }]);
    toppingFindMany.mockResolvedValue([{ code: 'PEARL' }]);

    const product = (await service.findOne(1)) as { sizes: unknown[]; toppings: unknown[] };

    expect(product.sizes).toHaveLength(3);
    expect(product.toppings).toEqual([{ code: 'PEARL' }]);
    expect(toppingFindMany).toHaveBeenCalledWith({ where: { active: true } });
  });
});
