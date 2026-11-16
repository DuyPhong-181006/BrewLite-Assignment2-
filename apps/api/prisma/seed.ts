/**
 * Dữ liệu mẫu – chạy được nhiều lần (upsert), không ghi đè tồn kho.
 * Chạy: npx prisma db seed (docker compose và production tự chạy khi khởi động API).
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// TV2 – Lê Hữu Nhân: menu (FR-01)
const products = [
  { name: 'Cà phê sữa', description: 'Cà phê phin truyền thống với sữa đặc', price: 35000, imageUrl: '/images/ca-phe-sua.jpg', stock: 100 },
  { name: 'Americano', description: 'Espresso pha loãng với nước nóng', price: 40000, imageUrl: '/images/americano.jpg', stock: 100 },
  { name: 'Cappuccino', description: 'Espresso, sữa nóng và lớp bọt sữa mịn', price: 45000, imageUrl: '/images/cappuccino.jpg', stock: 100 },
  { name: 'Trà đào', description: 'Trà đen ủ lạnh với đào miếng', price: 39000, imageUrl: '/images/tra-dao.jpg', stock: 100 },
  { name: 'Bạc xỉu', description: 'Nhiều sữa, ít cà phê, thêm đá', price: 35000, imageUrl: '/images/bac-xiu.jpg', stock: 100 },
  { name: 'Matcha latte', description: 'Matcha Nhật Bản với sữa tươi', price: 49000, imageUrl: '/images/matcha-latte.jpg', stock: 50 },
];

// Size và topping cho màn chi tiết (FR-02)
const sizes = [
  { code: 'S', label: 'Nhỏ', extraPrice: 0, sortOrder: 1 },
  { code: 'M', label: 'Vừa', extraPrice: 5000, sortOrder: 2 },
  { code: 'L', label: 'Lớn', extraPrice: 10000, sortOrder: 3 },
];

const toppings = [
  { code: 'PEARL', name: 'Trân châu', price: 5000 },
  { code: 'CHEESE_FOAM', name: 'Kem cheese', price: 8000 },
  { code: 'COFFEE_JELLY', name: 'Thạch cà phê', price: 5000 },
  { code: 'EXTRA_SHOT', name: 'Thêm shot espresso', price: 10000 },
];

// TV2 – Lê Hữu Nhân: mã giảm giá (FR-11)
const coupons = [
  { code: 'WELCOME10', description: 'Giảm 10% cho mọi đơn, tối đa 20.000đ', percentOff: 10, maxDiscount: 20000 },
  { code: 'BREW20', description: 'Giảm 20% cho đơn từ 100.000đ, tối đa 50.000đ', percentOff: 20, maxDiscount: 50000, minSubtotal: 100000, maxUses: 100 },
];

async function main() {
  for (const p of products) {
    await prisma.product.upsert({
      where: { name: p.name },
      update: { description: p.description, price: p.price, imageUrl: p.imageUrl },
      create: p,
    });
  }

  for (const s of sizes) {
    await prisma.sizeOption.upsert({ where: { code: s.code }, update: s, create: s });
  }

  for (const t of toppings) {
    await prisma.topping.upsert({ where: { code: t.code }, update: t, create: t });
  }

  for (const c of coupons) {
    await prisma.promotion.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  // TV5 – An Tường: tài khoản demo (FR-06) – dùng cho demo và test E2E
  const passwordHash = await bcrypt.hash('123456', 10);
  await prisma.user.upsert({
    where: { email: 'demo@brewlite.vn' },
    update: {},
    create: { email: 'demo@brewlite.vn', name: 'Khách demo', passwordHash },
  });

  console.log(
    `Seed xong: ${products.length} sản phẩm, ${sizes.length} size, ${toppings.length} topping, ${coupons.length} mã giảm giá, 1 tài khoản demo`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
