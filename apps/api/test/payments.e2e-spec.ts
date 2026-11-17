// INT-T03 – Integration test API thanh toán (FR-05, FR-10, FR-12): idempotency, lỗi rồi thử lại, cộng điểm
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Lấy đối tượng app NestJS + kết nối CSDL thật (Postgres trong Docker) để test API như Postman
describe('Payments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;
  let otherUserId: number;
  let token: string; // token JWT của người dùng test (TV5)
  const orderIds: number[] = [];

  // Tạo 1 đơn mới cho từng test (mỗi test 1 đơn riêng, không ảnh hưởng nhau)
  const newOrder = async (total = 50000, status: OrderStatus = 'PENDING', owner = userId) => {
    const order = await prisma.order.create({ data: { userId: owner, subtotal: total, total, status } });
    orderIds.push(order.id);
    return order.id;
  };
  const key = (name: string) => `e2e_${name}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const pay = (body: object, idempotencyKey?: string, bearer: string | null = token) => {
    const req = request(app.getHttpServer()).post('/payments');
    if (bearer) req.set('Authorization', `Bearer ${bearer}`);
    if (idempotencyKey) req.set('Idempotency-Key', idempotencyKey);
    return req.send(body);
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    const user = await prisma.user.create({
      data: {
        email: `e2e_pay_${Date.now()}@brewlite.test`,
        passwordHash: 'e2e-test-hash',
        name: 'E2E Payment User',
      },
    });
    userId = user.id;
    const other = await prisma.user.create({
      data: { email: `e2e_pay_other_${Date.now()}@brewlite.test`, passwordHash: 'e2e-test-hash', name: 'E2E Other' },
    });
    otherUserId = other.id;

    const jwt = app.get(JwtService, { strict: false }); // JwtService do AuthModule (TV5) cấu hình
    token = await jwt.signAsync({ sub: user.id, email: user.email });
  }, 30000);

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
    await app.close();
  }, 30000);

  it('POST /payments - gửi trùng Idempotency-Key 2 lần: cùng 1 giao dịch, chỉ trừ tiền 1 lần', async () => {
    const orderId = await newOrder(50000);
    const k = key('dup');

    const res1 = await pay({ orderId, method: 'WALLET' }, k);
    const res2 = await pay({ orderId, method: 'WALLET' }, k);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(res1.body.id).toEqual(res2.body.id);
    expect(res1.body.status).toBe('SUCCESS');
    expect(res1.body.amount).toBe(50000); // số tiền lấy từ order.total, client không gửi
    expect(await prisma.payment.count({ where: { orderId } })).toBe(1);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe('PAID');
    expect(order?.pointsEarned).toBe(5); // 50.000đ -> 5 điểm thưởng (LoyaltyService của TV5)
  }, 30000);

  it('POST /payments - bấm "Xác nhận trả" 2 lần CÙNG LÚC (cùng key): vẫn chỉ 1 giao dịch', async () => {
    const orderId = await newOrder(45000);
    const k = key('double_click');

    const [res1, res2] = await Promise.all([
      pay({ orderId, method: 'CARD' }, k),
      pay({ orderId, method: 'CARD' }, k),
    ]);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(res1.body.id).toEqual(res2.body.id);
    expect(await prisma.payment.count({ where: { orderId } })).toBe(1);
  }, 30000);

  it('POST /payments - 2 lượt trả KHÁC key cùng lúc cho 1 đơn: chỉ 1 lượt thành công', async () => {
    const orderId = await newOrder(30000);

    const results = await Promise.all([
      pay({ orderId, method: 'WALLET' }, key('a')),
      pay({ orderId, method: 'WALLET' }, key('b')),
    ]);

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await prisma.payment.count({ where: { orderId, status: 'SUCCESS' } })).toBe(1);
  }, 30000);

  it('POST /payments - chưa đăng nhập (không có token) -> 401', async () => {
    const orderId = await newOrder(50000);

    const res = await pay({ orderId, method: 'WALLET' }, key('noauth'), null);

    expect(res.status).toBe(401);
    expect(await prisma.payment.count({ where: { orderId } })).toBe(0);
  }, 30000);

  it('POST /payments - trả đơn của người khác -> 404', async () => {
    const orderId = await newOrder(50000, 'PENDING', otherUserId);

    const res = await pay({ orderId, method: 'WALLET' }, key('other'));

    expect(res.status).toBe(404);
    expect(await prisma.payment.count({ where: { orderId } })).toBe(0);
  }, 30000);

  it('POST /payments - client gửi kèm amount -> 400 (không cho client tự đặt số tiền)', async () => {
    const orderId = await newOrder(50000);

    const res = await pay({ orderId, method: 'WALLET', amount: 1000 }, key('amount'));

    expect(res.status).toBe(400);
    expect(await prisma.payment.count({ where: { orderId } })).toBe(0);
  }, 30000);

  it('POST /payments - thiếu Idempotency-Key -> 400', async () => {
    const orderId = await newOrder(50000);

    const res = await pay({ orderId, method: 'WALLET' });

    expect(res.status).toBe(400);
  }, 30000);

  it('POST /payments - phương thức không hợp lệ (BANK_CARD, tiền mặt...) -> 400', async () => {
    const orderId = await newOrder(50000);

    const res = await pay({ orderId, method: 'BANK_CARD' }, key('method'));

    expect(res.status).toBe(400);
  }, 30000);

  it('POST /payments - đơn không tồn tại -> 404', async () => {
    const res = await pay({ orderId: 999999999, method: 'WALLET' }, key('notfound'));

    expect(res.status).toBe(404);
  }, 30000);

  it('POST /payments - đơn đã hủy (CANCELLED) -> 400, không tạo giao dịch', async () => {
    const orderId = await newOrder(50000, 'CANCELLED');

    const res = await pay({ orderId, method: 'WALLET' }, key('cancelled'));

    expect(res.status).toBe(400);
    expect(await prisma.payment.count({ where: { orderId } })).toBe(0);
  }, 30000);

  it('POST /payments - thanh toán lỗi -> đơn PAYMENT_FAILED; thử lại bằng key mới -> PAID', async () => {
    const orderId = await newOrder(50000);

    const failed = await pay({ orderId, method: 'CARD', simulateFailure: true }, key('fail'));
    expect(failed.status).toBe(201);
    expect(failed.body.status).toBe('FAILED');
    let order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe('PAYMENT_FAILED');

    const retry = await pay({ orderId, method: 'CARD' }, key('retry'));
    expect(retry.status).toBe(201);
    expect(retry.body.status).toBe('SUCCESS');
    order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe('PAID');
  }, 30000);
});
