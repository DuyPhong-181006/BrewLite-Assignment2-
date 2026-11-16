// INT-T04 – Integration test API đơn hàng (FR-04, FR-08, FR-09): POST /orders, GET /orders/me, GET /orders/:id, PATCH /orders/:id/cancel
// TV4 – Phạm Thành Danh: test API đơn hàng (Task 6 – gồm trừ / trả kho của TV3 – và guard JWT của Task 7) – chạy bằng `npm run test:e2e`
// Tự tạo dữ liệu cần thiết nên chạy được cả trên CSDL trống của CI (không cần seed).
// Cần biến môi trường JWT_SECRET (CI đã có; chạy trên máy thì thêm vào apps/api/.env).
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Orders (e2e) – TV4', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let productId: number;
  let lowStockId: number; // sản phẩm chỉ còn 3 ly – để thử đặt quá tồn kho
  let expectedUnit: number; // giá 1 ly = giá gốc + size M + trân châu
  const stamp = Date.now();
  const couponCode = `E2E${stamp}`;
  const userIds: number[] = [];
  let token = ''; // khách A
  let otherToken = ''; // khách B – dùng để kiểm tra không xem/hủy được đơn của người khác

  // Gửi request kèm token của khách A
  const api = () => {
    const server = app.getHttpServer();
    return {
      post: (url: string) => request(server).post(url).set('Authorization', `Bearer ${token}`),
      get: (url: string) => request(server).get(url).set('Authorization', `Bearer ${token}`),
      patch: (url: string) => request(server).patch(url).set('Authorization', `Bearer ${token}`),
    };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    const jwt = app.get(JwtService, { strict: false }); // JwtService do AuthModule (TV5) cấu hình

    // 2 khách hàng riêng cho test + token giống hệt token mà POST /auth/login trả về
    for (const name of ['a', 'b']) {
      const email = `e2e-orders-${name}-${stamp}@test.vn`;
      const user = await prisma.user.create({ data: { email, passwordHash: 'e2e', name: `E2E ${name}` } });
      userIds.push(user.id);
      const signed = await jwt.signAsync({ sub: user.id, email });
      if (name === 'a') token = signed;
      else otherToken = signed;
    }

    // Dữ liệu tối thiểu (upsert: CSDL đã seed thì giữ nguyên, CSDL trống thì tạo mới)
    const sizeM = await prisma.sizeOption.upsert({
      where: { code: 'M' },
      update: {},
      create: { code: 'M', label: 'Vừa', extraPrice: 5000, sortOrder: 2 },
    });
    const pearl = await prisma.topping.upsert({
      where: { code: 'PEARL' },
      update: {},
      create: { code: 'PEARL', name: 'Trân châu', price: 5000 },
    });
    const product = await prisma.product.create({
      data: { name: `E2E Cappuccino ${stamp}`, price: 45000, imageUrl: '/x.jpg', stock: 100 },
    });
    productId = product.id;
    const lowStock = await prisma.product.create({
      data: { name: `E2E Matcha ${stamp}`, price: 49000, imageUrl: '/x.jpg', stock: 3 },
    });
    lowStockId = lowStock.id;
    expectedUnit = product.price + sizeM.extraPrice + pearl.price;

    await prisma.promotion.create({
      data: { code: couponCode, percentOff: 10, maxDiscount: 20000 },
    });
  }, 30000); // khởi động app + biên dịch TypeScript lần đầu có thể lâu hơn 5 giây mặc định

  afterAll(async () => {
    if (!prisma) return; // beforeAll lỗi thì không có gì để dọn
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } }); // OrderItem xóa theo (Cascade)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.product.deleteMany({ where: { id: { in: [productId, lowStockId].filter(Boolean) } } });
    await prisma.promotion.deleteMany({ where: { code: couponCode } });
    await app.close();
  }, 30000);

  // Số ly còn trong kho của 1 sản phẩm (đọc thẳng từ CSDL)
  const stockOf = async (id: number) => (await prisma.product.findUniqueOrThrow({ where: { id } })).stock;

  const item = (qty = 2) => ({ productId, size: 'M', toppings: ['PEARL'], qty });
  let firstOrderId = 0;

  it('Chưa đăng nhập (không có token) -> 401', async () => {
    const server = app.getHttpServer();
    expect((await request(server).post('/orders').send({ items: [item(1)] })).status).toBe(401);
    expect((await request(server).get('/orders/me')).status).toBe(401);
    expect((await request(server).get('/orders/me').set('Authorization', 'Bearer token-gia')).status).toBe(401);
  });

  it('POST /orders – tạo đơn PENDING, giá do backend tự tính, gắn đúng người đặt, trừ kho 2 ly', async () => {
    const before = await stockOf(productId);
    const res = await api().post('/orders').send({ items: [item(2)] });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.userId).toBe(userIds[0]);
    expect(res.body.items[0].unitPrice).toBe(expectedUnit);
    expect(res.body.total).toBe(expectedUnit * 2);
    expect(await stockOf(productId)).toBe(before - 2);
    firstOrderId = res.body.id;
  });

  it('POST /orders – cùng 1 món khác topping: trừ chung 1 kho (1 + 2 = 3 ly)', async () => {
    const before = await stockOf(productId);
    const res = await api()
      .post('/orders')
      .send({ items: [{ productId, size: 'M', qty: 1 }, item(2)] });

    expect(res.status).toBe(201);
    expect(await stockOf(productId)).toBe(before - 3);
  });

  it('POST /orders – đặt quá số ly còn trong kho -> 400, không tạo đơn, kho giữ nguyên', async () => {
    const res = await api()
      .post('/orders')
      .send({ items: [{ productId: lowStockId, size: 'M', qty: 5 }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('chỉ còn 3 ly');
    expect(await stockOf(lowStockId)).toBe(3);
    expect(await prisma.orderItem.count({ where: { productId: lowStockId } })).toBe(0);
  });

  it('POST /orders – áp mã giảm giá 10%', async () => {
    const res = await api().post('/orders').send({ items: [item(2)], couponCode });

    const subtotal = expectedUnit * 2;
    const discount = Math.min(Math.floor(subtotal * 0.1), 20000);
    expect(res.status).toBe(201);
    expect(res.body.subtotal).toBe(subtotal);
    expect(res.body.discount).toBe(discount);
    expect(res.body.total).toBe(subtotal - discount);
  });

  it.each([
    ['giỏ trống', { items: [] }],
    ['size sai', { items: [{ productId: 1, size: 'XL', qty: 1 }] }],
    ['số lượng 0', { items: [{ productId: 1, size: 'M', qty: 0 }] }],
    ['client tự gửi giá', { items: [{ productId: 1, size: 'M', qty: 1 }], total: 1000 }],
  ])('POST /orders – %s -> 400', async (_name, body) => {
    const res = await api().post('/orders').send(body);
    expect(res.status).toBe(400);
  });

  it('POST /orders – sản phẩm không tồn tại -> 404', async () => {
    const res = await api().post('/orders').send({ items: [{ productId: 999999, size: 'M', qty: 1 }] });
    expect(res.status).toBe(404);
  });

  it('GET /orders/me và GET /orders/:id – thấy đơn của mình', async () => {
    const mine = await api().get('/orders/me');
    expect(mine.status).toBe(200);
    expect(mine.body.map((o: { id: number }) => o.id)).toContain(firstOrderId);

    const one = await api().get(`/orders/${firstOrderId}`);
    expect(one.status).toBe(200);
    expect(one.body.id).toBe(firstOrderId);

    const missing = await api().get('/orders/999999');
    expect(missing.status).toBe(404);
  });

  it('Khách khác không xem, không hủy được đơn của mình -> 404', async () => {
    const server = app.getHttpServer();
    const view = await request(server).get(`/orders/${firstOrderId}`).set('Authorization', `Bearer ${otherToken}`);
    expect(view.status).toBe(404);

    const cancel = await request(server)
      .patch(`/orders/${firstOrderId}/cancel`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(cancel.status).toBe(404);
  });

  it('PATCH /orders/:id/cancel – hủy được 1 lần, trả lại 2 ly vào kho; lần 2 bị chặn, không trả kho 2 lần', async () => {
    const before = await stockOf(productId);

    const first = await api().patch(`/orders/${firstOrderId}/cancel`);
    expect(first.status).toBe(200);
    expect(first.body.status).toBe('CANCELLED');
    expect(await stockOf(productId)).toBe(before + 2);

    const second = await api().patch(`/orders/${firstOrderId}/cancel`);
    expect(second.status).toBe(400);
    expect(await stockOf(productId)).toBe(before + 2);
  });

  it('PATCH /orders/:id/cancel – đơn đã thanh toán (PAID) -> 400, kho giữ nguyên', async () => {
    const res = await api().post('/orders').send({ items: [item(1)] });
    await prisma.order.update({ where: { id: res.body.id }, data: { status: 'PAID' } }); // giả lập đã trả tiền
    const before = await stockOf(productId);

    const cancel = await api().patch(`/orders/${res.body.id}/cancel`);
    expect(cancel.status).toBe(400);
    expect(await stockOf(productId)).toBe(before);
  });
});
