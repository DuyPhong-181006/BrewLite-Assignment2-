import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// API-T01, API-T02 – GET /products và GET /products/:id với CSDL thật.
// Test tự tạo 1 món riêng rồi xóa đi, không phụ thuộc dữ liệu seed.
describe('Products (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let productId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const product = await prisma.product.create({
      data: { name: `E2E món thử ${Date.now()}`, price: 30000, imageUrl: '/images/americano.jpg' },
    });
    productId = product.id;
  }, 30000);

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: productId } });
    await app.close();
  });

  it('API-T01 GET /products -> 200, mảng món có id, name, price, imageUrl', async () => {
    const res = await request(app.getHttpServer()).get('/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const mine = (res.body as Array<{ id: number }>).find((p) => p.id === productId);
    expect(mine).toMatchObject({ price: 30000, imageUrl: '/images/americano.jpg' });
  });

  it('API-T02 GET /products/:id -> 200 kèm danh sách size và topping', async () => {
    const res = await request(app.getHttpServer()).get(`/products/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(productId);
    expect(Array.isArray(res.body.sizes)).toBe(true);
    expect(Array.isArray(res.body.toppings)).toBe(true);
  });

  it('GET /products/:id không tồn tại -> 404', async () => {
    const res = await request(app.getHttpServer()).get('/products/999999999');
    expect(res.status).toBe(404);
  });

  it('GET /products/abc (id không phải số) -> 400', async () => {
    const res = await request(app.getHttpServer()).get('/products/abc');
    expect(res.status).toBe(400);
  });
});
