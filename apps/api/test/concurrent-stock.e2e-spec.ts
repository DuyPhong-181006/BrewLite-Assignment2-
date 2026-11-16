// INT-T05 – Nhiều khách đặt cùng lúc món sắp hết: không bán quá tồn kho (FR-09, optimistic locking)
import { Test } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import { InventoryService } from '../src/inventory/inventory.service';

describe('Kiểm soát tồn kho đồng thời - Task 10 (c)', () => {
  let prisma: PrismaService;
  let inventoryService: InventoryService;
  let testProductId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService, InventoryService],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    inventoryService = moduleRef.get(InventoryService);

    const product = await prisma.product.create({
      data: {
        name: `Test Concurrent Coffee ${Date.now()}`,
        price: 35000,
        imageUrl: '/images/test.png',
        stock: 2,
        version: 0,
      },
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    if (testProductId) {
      await prisma.product.delete({ where: { id: testProductId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('không bán vượt quá tồn kho khi nhiều khách đặt đồng thời', async () => {
    const requests = Array.from({ length: 5 }, () =>
      inventoryService.holdStock(testProductId, 1, 0),
    );

    const results = await Promise.allSettled(requests);
    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(4);

    const finalProduct = await prisma.product.findUnique({
      where: { id: testProductId },
    });
    expect(finalProduct?.stock).toBe(1);
    expect(finalProduct?.stock).toBeGreaterThanOrEqual(0);
  });

  it('chặn đặt hàng nếu số lượng đặt lớn hơn tồn kho hiện tại', async () => {
    const current = await prisma.product.findUnique({
      where: { id: testProductId },
    });

    await expect(
      inventoryService.holdStock(testProductId, 10, current!.version),
    ).rejects.toThrow();

    const after = await prisma.product.findUnique({
      where: { id: testProductId },
    });
    expect(after?.stock).toBe(current?.stock);
  });

  it('giữ hàng trong transaction: bước sau lỗi thì kho không bị trừ (rollback)', async () => {
    const before = await prisma.product.findUnique({ where: { id: testProductId } });

    await expect(
      prisma.$transaction(async (tx) => {
        await inventoryService.holdStockForOrder(tx, testProductId, 1);
        throw new Error('tạo đơn lỗi'); // giả lập lưu đơn thất bại sau khi đã giữ hàng
      }),
    ).rejects.toThrow('tạo đơn lỗi');

    const after = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(after?.stock).toBe(before?.stock);
  });

  it('trả kho khi hủy đơn: releaseStock cộng lại số lượng', async () => {
    const before = await prisma.product.findUnique({ where: { id: testProductId } });

    await inventoryService.releaseStock(prisma, testProductId, 1);

    const after = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(after?.stock).toBe((before?.stock ?? 0) + 1);
  });
});