// INT-T02 – Integration test đăng ký / đăng nhập / JWT (FR-06) và GET /loyalty/me (FR-12)
// TV5 – An Tường: test API đăng ký / đăng nhập (Task 7) – chạy bằng `npm run test:e2e`
// Cần CSDL đang chạy và JWT_SECRET trong apps/api/.env (CI đã có sẵn).
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e) – TV5', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-auth-${Date.now()}@test.vn`;
  const password = '12345678';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  }, 30000);

  afterAll(async () => {
    if (!prisma) return;
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  }, 30000);

  it('POST /auth/register – đăng ký thành công, mật khẩu được băm', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, name: 'Khách E2E' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.passwordHash).toBeUndefined(); // không trả mật khẩu về

    const saved = await prisma.user.findUnique({ where: { email } });
    expect(saved!.passwordHash).not.toBe(password); // lưu bản băm, không lưu mật khẩu gốc
  });

  it('POST /auth/register – email trùng -> 409', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, name: 'Khách E2E' });
    expect(res.status).toBe(409);
  });

  it.each([
    ['thiếu dữ liệu', {}],
    ['email sai dạng', { email: 'khong-phai-email', password, name: 'A' }],
    ['mật khẩu dưới 8 ký tự', { email: `x-${Date.now()}@test.vn`, password: '123', name: 'A' }],
  ])('POST /auth/register – %s -> 400', async (_name, body) => {
    const res = await request(app.getHttpServer()).post('/auth/register').send(body);
    expect(res.status).toBe(400);
  });

  it('POST /auth/login – sai mật khẩu -> 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'sai-mat-khau' });
    expect(res.status).toBe(401);
  });

  it('POST /auth/login đúng -> có token; GET /auth/me cần token', async () => {
    const server = app.getHttpServer();
    const login = await request(server).post('/auth/login').send({ email, password });
    expect(login.status).toBe(201);
    expect(typeof login.body.accessToken).toBe('string');

    expect((await request(server).get('/auth/me')).status).toBe(401);

    const me = await request(server).get('/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
  });

  it('GET /loyalty/me – có token thì xem được điểm (người mới = 0)', async () => {
    const server = app.getHttpServer();
    const login = await request(server).post('/auth/login').send({ email, password });

    const res = await request(server).get('/loyalty/me').set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.loyaltyPoints).toBe(0);
    expect(res.body.history).toEqual([]); // FR-12: chưa có đơn nào thì sổ điểm rỗng
  });
});
