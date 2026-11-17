import { expect, test } from '@playwright/test';

// E2E-T01 – Luồng chính của BrewLite từ menu đến xác nhận đơn (UC-01, FR-01 → FR-07)
// Dùng tài khoản demo có sẵn trong seed: demo@brewlite.vn / 123456
const DEMO = { email: 'demo@brewlite.vn', password: '123456' };

test('xem menu -> thêm vào giỏ -> đăng nhập -> thanh toán ví -> thấy xác nhận đơn', async ({ page }) => {
  // 1. Menu
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hôm nay uống gì?' })).toBeVisible();
  await page.getByRole('link', { name: /Cà phê sữa/ }).first().click();

  // 2. Chi tiết món -> thêm vào giỏ
  await expect(page.getByRole('heading', { level: 1, name: 'Cà phê sữa' })).toBeVisible();
  await page.getByRole('button', { name: /Thêm vào giỏ/ }).click();
  await expect(page.getByText('Đã thêm vào giỏ hàng')).toBeVisible();

  // 3. Giỏ hàng có món vừa thêm -> bấm Thanh toán
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Giỏ hàng' })).toBeVisible();
  await expect(page.getByText('Cà phê sữa').first()).toBeVisible();
  await page.getByRole('link', { name: /Thanh toán/ }).click();

  // 4. Chưa đăng nhập -> bị chuyển sang trang đăng nhập (luồng thay thế A1 của UC-01)
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Email').fill(DEMO.email);
  await page.getByLabel('Mật khẩu').fill(DEMO.password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  // 5. Đăng nhập xong quay lại thanh toán (giỏ còn món) -> trả bằng ví (mặc định)
  await expect(page).toHaveURL(/\/checkout/);
  await page.getByRole('button', { name: /Xác nhận trả/ }).click();

  // 6. Màn xác nhận đơn
  await expect(page).toHaveURL(/\/orders\/\d+/);
  await expect(page.getByRole('heading', { name: 'Đặt hàng thành công' })).toBeVisible();
  await expect(page.getByLabel('Tiến trình đơn hàng')).toContainText('Đã trả tiền');
});

// E2E-T01b – Chưa đăng nhập thì không vào được bước thanh toán (FR-06)
test('chưa đăng nhập mà vào thẳng /checkout thì bị chuyển về /login', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page).toHaveURL(/\/login/);
});
