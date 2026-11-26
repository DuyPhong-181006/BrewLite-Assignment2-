# Ma trận truy vết BrewLite

> Người soạn: TV2 – Lê Hữu Nhân. Cập nhật mỗi khi đổi yêu cầu, sơ đồ, API hoặc test (qua Pull Request).

**Ký hiệu sơ đồ:** UC = use-case ([tổng quát](requirements/usecase-overview.svg), [UC-01](requirements/usecase-checkout.svg)) · Activity-01 = [activity-end-to-end](diagrams/activity-end-to-end.svg) · Sequence-01 = [sequence-checkout](diagrams/sequence-checkout.svg) · Class-01 = [class-domain](diagrams/class-domain.svg) · Deploy-01 = [deployment](architecture/deployment.svg).

## 1. Yêu cầu chức năng

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ | Code / API | Test |
|---|---|---|---|---|
| FR-01 | US-01 Xem menu | Activity-01 (tải menu, lỗi → thử lại); Class-01 `Product` | `GET /products` – `apps/api/src/products`; `apps/web/app/page.tsx`, `components/ProductCard.tsx` | API-T01, UI-T01, UI-T02 → UI-T04, E2E-T01 |
| FR-02 | US-02 Chi tiết, size, topping | Activity-01 (chọn món); Class-01 `Product`, `SizeOption`, `Topping` | `GET /products/:id` – `products.service.ts`; `apps/web/app/products/[id]/page.tsx` | API-T02, UNIT-T02, UNIT-T03, E2E-T01 |
| FR-03 | US-03 Giỏ hàng | Activity-01 (thêm vào giỏ) | `apps/web/store/cart.ts`, `app/cart/page.tsx`, `components/CartBadge.tsx` | UNIT-T04 → UNIT-T07, E2E-T01 |
| FR-04 | UC-01 bước 5–6 (US-05 Đặt đơn) | Activity-01; Sequence-01 bước 2–18; Class-01 `Order`, `OrderItem` | `POST /orders` – `apps/api/src/orders/orders.service.ts` | INT-T04, E2E-T01 |
| FR-05 | UC-01 bước 7–9 (US-06 Thanh toán) | Activity-01 (nhánh thành công/thất bại); Sequence-01 bước 19–39; Class-01 `Payment` | `POST /payments` – `apps/api/src/payments`; `apps/web/app/checkout/page.tsx` | INT-T03, UNIT-T16, E2E-T01 |
| FR-06 | US-04 Đăng ký/đăng nhập; UC-01 luồng A1 | Activity-01 (chưa đăng nhập); Sequence-01 bước 3–5; ADR-004 | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` – `apps/api/src/auth`; `app/login`, `app/register` | INT-T02, E2E-T01 (bước đăng nhập), E2E-T01b (chặn /checkout) |
| FR-07 | US-07 Xác nhận và lịch sử; UC-01 bước 10–11 | Activity-01 (màn xác nhận); Sequence-01 bước 35 | `GET /orders/me`, `GET /orders/:id`; `app/orders/page.tsx`, `app/orders/[id]/page.tsx` | INT-T04, E2E-T01 |
| FR-08 | US-08 Hủy đơn; máy trạng thái | Activity-01 (hủy đơn); Class-01 enum `OrderStatus` | `PATCH /orders/:id/cancel`; `orders/order-state-machine.ts` | UNIT-T15, INT-T04 |
| FR-09 | UC-01 luồng E1, E2 | Activity-01 (hết hàng); Sequence-01 bước 11–15; Class-01 `Product.version`; ADR-003 | `inventory/inventory.service.ts` (gọi trong `POST /orders`) | INT-T04, INT-T05 |
| FR-10 | UC-01 luồng A3, A4, E7 | Sequence-01 bước 23–26 (key đã dùng / P2002); Class-01 `Payment.idempotencyKey`; ADR-005 | `POST /payments` header `Idempotency-Key` – `payments.service.ts` | INT-T03, UNIT-T16 |
| FR-11 | US-09 Mã giảm giá; UC-01 luồng A2 | Class-01 `Promotion`; Sequence-01 bước 10, 31 | `GET /coupons/:code/validate` – `apps/api/src/promotions`; `components/CouponInput.tsx` | UNIT-T08 → UNIT-T11 |
| FR-12 | US-10 Điểm thưởng | Activity-01 (cộng điểm); Sequence-01 bước 32; Class-01 `LoyaltyTransaction` | `GET /loyalty/me`; `loyalty.service.ts` (gọi sau khi PAID) | UNIT-T12 → UNIT-T14, INT-T02, INT-T03 |
| FR-13 | US-11 Nhân viên cập nhật trạng thái | UC tổng quát; Class-01 enum `OrderStatus` (máy trạng thái) | `GET /staff/orders`, `PATCH /staff/orders/:id/status` – `apps/api/src/staff`; `apps/web/app/staff/page.tsx`; màn xác nhận tự cập nhật | UNIT-T17, INT-T06 |

## 2. Yêu cầu phi chức năng

| Mã yêu cầu | Thiết kế | Code / cấu hình | Kiểm chứng |
|---|---|---|---|
| NFR-01 Hiệu năng | architecture.md §5 (logging thời gian) | `common/logging.interceptor.ts` | Log `… 12ms`; Postman |
| NFR-02 Bảo mật | ADR-004; architecture.md §5 | `auth/`, `staff/staff-key.guard.ts`, `main.ts` (CORS), ValidationPipe, `.gitignore`, docs/deployment.md §5 | INT-T02 → INT-T04 (401, 404 đơn người khác, 400 dữ liệu sai) |
| NFR-03 Mobile-first/PWA | architecture.md §4.1 | `app/manifest.ts`, `public/icons`, layout Tailwind `md:` | E2E-T01 (project `dien-thoai`), UI-T02 → UI-T04 |
| NFR-04 Triển khai | ADR-001, ADR-002, ADR-006; Deploy-01 | `docker-compose.yml`, `.github/workflows/*`, `Dockerfile` | Lần chạy CI/CD trên tab Actions |
| NFR-05 Toàn vẹn dữ liệu | ADR-003, ADR-005; Sequence-01 (khối transaction) | `orders.service.ts`, `payments.service.ts`, `inventory.service.ts` | INT-T03, INT-T04, INT-T05 |
| NFR-06 Sẵn sàng | Deploy-01 (health check); ADR-006 | `health/health.controller.ts`, smoke test trong `cd.yml` | UNIT-T01, INT-T01, smoke test CD |

## 3. Danh mục test

| Mã | Loại | Nội dung | File |
|---|---|---|---|
| UNIT-T01 | Unit | Health: ok khi CSDL trả lời, 503 khi lỗi | `apps/api/src/health/health.controller.spec.ts` |
| UNIT-T02, T03 | Unit | Sản phẩm: 404, size/topping mặc định | `apps/api/src/products/products.service.spec.ts` |
| UNIT-T04 → T07 | Unit | Giỏ hàng: gộp món, giới hạn 20 ly, tổng tiền | `apps/web/__tests__/cart-store.test.ts` |
| UNIT-T08 → T11 | Unit | Mã giảm giá: không tồn tại, mức tối đa, tối thiểu, hết hạn, hết lượt | `apps/api/src/promotions/promotions.service.spec.ts` |
| UNIT-T12 → T14 | Unit | Điểm thưởng: cách tính, cộng 1 lần, ghi LoyaltyTransaction | `apps/api/src/loyalty/loyalty.service.spec.ts` |
| UNIT-T15 | Unit | Máy trạng thái đơn | `apps/api/src/orders/order-state-machine.spec.ts` |
| UNIT-T16 | Unit | Nghiệp vụ thanh toán, idempotency | `apps/api/src/payments/payments.service.spec.ts` |
| UNIT-T17 | Unit | Quầy pha chế: đúng thứ tự, chặn nhảy bước, 404, 409 khi bấm cùng lúc | `apps/api/src/staff/staff.service.spec.ts` |
| UI-T01 | Component | Thẻ món | `apps/web/__tests__/ProductCard.test.tsx` |
| UI-T02 → T04 | Component | Màn menu: tải/có dữ liệu, rỗng, lỗi | `apps/web/__tests__/menu-page.test.tsx` |
| API-T01, T02 | Integration | `GET /products`, `GET /products/:id` (+ 404, 400) | `apps/api/test/products.e2e-spec.ts` |
| INT-T01 | Integration | `GET /health` với CSDL thật | `apps/api/test/health.e2e-spec.ts` |
| INT-T02 | Integration | Đăng ký, đăng nhập, JWT, `/loyalty/me` | `apps/api/test/auth.e2e-spec.ts` |
| INT-T03 | Integration | Thanh toán: trùng key, lỗi rồi thử lại, hủy giữa chừng, cộng điểm | `apps/api/test/payments.e2e-spec.ts` |
| INT-T04 | Integration | Đơn hàng: tạo, trừ/trả kho, quá kho, dữ liệu sai, 401, đơn người khác | `apps/api/test/orders.e2e-spec.ts` |
| INT-T05 | Integration | Đặt đồng thời không bán quá kho | `apps/api/test/concurrent-stock.e2e-spec.ts` |
| INT-T06 | Integration | Quầy pha chế: mã nhân viên, PAID → PREPARING → READY → COMPLETED | `apps/api/test/staff.e2e-spec.ts` |
| E2E-T01 | End-to-end | Menu → giỏ → đăng nhập → thanh toán → xác nhận (laptop + điện thoại); E2E-T01b chặn `/checkout` khi chưa đăng nhập | `tests/e2e/specs/checkout.spec.ts` |

## 4. Kiến trúc → mã nguồn → triển khai

| Thành phần kiến trúc | Mã nguồn | Node trong Deploy-01 |
|---|---|---|
| Cổng vào, HTTPS | `deploy/Caddyfile`, `docker-compose.prod.yml` | AWS EC2 – container Caddy |
| Web Next.js/PWA | `apps/web` | AWS EC2 – container web (bản phụ: Vercel) |
| API NestJS (module theo domain) | `apps/api/src/*` | AWS EC2 – container API (bản phụ: Render Web Service) |
| Migration | `apps/api/prisma/migrations` | `prisma migrate deploy` trong container |
| PostgreSQL | `apps/api/prisma/schema.prisma` | AWS EC2 – container PostgreSQL (bản phụ: Render PostgreSQL) |
| Cổng thanh toán giả lập | `apps/api/src/payments/mock-payment.gateway.ts` | trong container API |
| CI/CD | `.github/workflows/`, `deploy/deploy.sh` | GitHub Actions, GHCR, SSH vào EC2 |
