import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// TV1 – Cấu hình test component (Vitest + Testing Library, môi trường jsdom giả lập trình duyệt)
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true, // để Testing Library tự dọn DOM sau mỗi test
    include: ['__tests__/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
});
