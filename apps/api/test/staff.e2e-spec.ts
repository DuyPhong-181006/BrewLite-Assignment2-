import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// INT-T06 – Màn quầy pha chế (FR-13): khóa nhân viên, đổi trạng thái theo đúng thứ tự, khách thấy trạng thái mới
describe('Staff orders (integration)', () => {
  const STAFF_KEY = 'e2e-staff-key';
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;
  let orderId: number;

  beforeAll(async () => {
    process.env.STAFF_KEY = STAFF_KEY;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const user = await prisma.user.create({
      data: { email: `e2e_staff_${Date.now()}@brewlite.test`, passwordHash: 'e2e-test-hash', name: 'E2E Staff' },
    });
    userId = user.id;
    const order = await prisma.order.create({ data: { userId, subtotal: 45000, total: 45000, status: 'PAID' } });
    orderId = order.id;
  }, 30000);

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  const patch = (status: string, key: string | null = STAFF_KEY) => {
    const req = request(app.getHttpServer()).patch(`/staff/orders/${orderId}/status`);
    if (key) req.set('X-Staff-Key', key);
    return req.send({ status });
  };

  it('thiếu hoặc sai X-Staff-Key -> 401', async () => {
    expect((await request(app.getHttpServer()).get('/staff/orders')).status).toBe(401);
    expect((await patch('PREPARING', 'sai-khoa')).status).toBe(401);
  });

  it('GET /staff/orders có đơn PAID vừa tạo', async () => {
    const res = await request(app.getHttpServer()).get('/staff/orders').set('X-Staff-Key', STAFF_KEY);
    expect(res.status).toBe(200);
    expect((res.body as Array<{ id: number }>).some((o) => o.id === orderId)).toBe(true);
  });

  it('status lạ -> 400; nhảy bước PAID -> COMPLETED -> 400', async () => {
    expect((await patch('CANCELLED')).status).toBe(400);
    expect((await patch('COMPLETED')).status).toBe(400);
  });

  it('PAID -> PREPARING -> READY -> COMPLETED, CSDL lưu đúng trạng thái cuối', async () => {
    expect((await patch('PREPARING')).status).toBe(200);
    expect((await patch('READY')).status).toBe(200);
    expect((await patch('COMPLETED')).status).toBe(200);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe('COMPLETED');
  });
});
