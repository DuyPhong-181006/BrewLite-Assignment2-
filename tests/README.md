# tests/ – kiểm thử tích hợp và end-to-end

| Loại | Ở đâu | Chạy bằng |
|---|---|---|
| Unit test API | `apps/api/src/**/*.spec.ts` | `npm test --prefix apps/api` |
| Integration test API (CSDL thật) | `apps/api/test/*.e2e-spec.ts` | `npm run test:e2e --prefix apps/api` |
| Test component web | `apps/web/__tests__/` | `npm test --prefix apps/web` |
| **End-to-end (trình duyệt thật)** | `tests/e2e/specs/` | xem bên dưới |

Danh sách mã test (UNIT-T.., API-T.., INT-T.., UI-T.., E2E-T..) và yêu cầu tương ứng: `docs/traceability-matrix.md`.

## Chạy E2E trên máy

Cần 3 thứ đang chạy: CSDL (đã migrate + seed), API cổng 3001, web cổng 3000.

```bash
docker compose up -d --build      # cách nhanh nhất: chạy cả db + api + web
cd tests/e2e
npm install
npx playwright install chromium   # tải trình duyệt (lần đầu)
npm test
```

Test chạy 2 lần: màn hình laptop và màn hình điện thoại (Pixel 7).
Lỗi thì xem ảnh chụp và trace trong `tests/e2e/test-results/`.

Trên CI: workflow `.github/workflows/e2e.yml` tự dựng CSDL, API, web rồi chạy test này.
