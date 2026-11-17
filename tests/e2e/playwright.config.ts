import { defineConfig, devices } from '@playwright/test';

// TV5 – An Tường: cấu hình test E2E (E2E-T01).
// Cần web (cổng 3000) + API (cổng 3001) + CSDL đã seed đang chạy. Xem tests/README.md
export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1, // dùng chung 1 tài khoản demo -> chạy lần lượt
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'laptop', use: { ...devices['Desktop Chrome'] } },
    // Mobile-first (NFR-03): chạy lại cùng luồng trên màn hình điện thoại
    { name: 'dien-thoai', use: { ...devices['Pixel 7'] } },
  ],
});
