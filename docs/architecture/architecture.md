# BrewLite – Mô tả kiến trúc (Task 3.1)

> Người soạn: TV1 – Đào Duy Phong. Các quyết định quan trọng ghi ở [adr/](adr/).
> Sơ đồ triển khai: [deployment.svg](deployment.svg) (nguồn [deployment.puml](deployment.puml)).

## 1. Phương pháp

Nhóm mô tả kiến trúc theo **mô hình C4** ở 2 mức đầu (Context, Container), và **kiến trúc phân lớp** bên trong từng container. Lý do: C4 cho người ngoài nhóm (giảng viên) thấy ngay hệ thống gồm những khối nào chạy ở đâu; phân lớp giúp từng thành viên biết code của mình nằm ở lớp nào.

## 2. C4 mức 1 – Context

```
 [Khách hàng] --(HTTPS, điện thoại/laptop)--> [ BrewLite ] --(gọi nội bộ)--> [Cổng thanh toán giả lập]
 [Nhân viên quầy] --(HTTPS, máy tính bảng ở quầy, mã nhân viên)--> [ BrewLite ]   (FR-13)
 [Nhóm phát triển] --(git push, PR)--> [GitHub: CI/CD] --(deploy)--> [ BrewLite production ]
```

## 3. C4 mức 2 – Container

| Container | Công nghệ | Trách nhiệm | Mã nguồn | Chạy ở production |
|---|---|---|---|---|
| Web (PWA) | Next.js 16, React 19, Tailwind CSS v4, Zustand | Giao diện mobile-first; giữ giỏ hàng và token trên trình duyệt; gọi REST API | `apps/web` | AWS EC2: container Next.js sau Caddy (HTTPS). Bản phụ: Vercel |
| API | NestJS 12, Prisma 5, class-validator, Passport JWT | Nghiệp vụ: menu, đơn, tồn kho, thanh toán, khuyến mãi, điểm thưởng; validate; transaction | `apps/api` | AWS EC2: container Docker image từ GHCR, đường dẫn `/api`. Bản phụ: Render |
| Cơ sở dữ liệu | PostgreSQL 16 | Lưu sản phẩm, người dùng, đơn, giao dịch, mã giảm giá, sổ điểm | `apps/api/prisma/schema.prisma`, `prisma/migrations` | AWS EC2: container PostgreSQL, chỉ trong mạng Docker nội bộ. Bản phụ: Render PostgreSQL |
| Cổng thanh toán giả lập | Class `MockPaymentGateway` trong API | Trả thành công/thất bại sau ~300 ms, thay cho cổng thật | `apps/api/src/payments/mock-payment.gateway.ts` | Cùng container API |
| CI/CD | GitHub Actions, GHCR | Kiểm tra chất lượng, build image, deploy (SSH vào EC2), smoke test, rollback | `.github/workflows/`, `deploy/` | GitHub |

## 4. Kiến trúc phân lớp

### 4.1 Frontend (`apps/web`)

| Lớp | Thư mục | Ví dụ |
|---|---|---|
| Trang (route) | `app/` | `app/page.tsx` (menu), `app/products/[id]`, `app/cart`, `app/checkout`, `app/orders/[id]` |
| Thành phần giao diện | `components/` | `ProductCard`, `CartBadge`, `CouponInput`, `SiteHeader` |
| Trạng thái phía client | `store/` | `cart.ts` (giỏ hàng, lưu localStorage), `auth.ts` (JWT) |
| PWA | `app/manifest.ts`, `public/icons` | Cài lên màn hình chính, màu chủ đạo, icon |

Mọi trang mua hàng là Client Component gọi API bằng `fetch(NEXT_PUBLIC_API_URL + …)`. Trên server AWS, `NEXT_PUBLIC_API_URL=/api`: trình duyệt gọi API cùng địa chỉ với web, Caddy chuyển `/api/*` vào container API. Giá và tổng tiền hiển thị chỉ để xem; **server luôn tính lại** (BR-01).

### 4.2 Backend (`apps/api`) – module theo domain

```
Controller  (HTTP: route, guard JWT, ValidationPipe, mã lỗi)
    ↓
Service     (nghiệp vụ: tính giá, máy trạng thái, idempotency, điểm thưởng)
    ↓
Prisma      (truy cập CSDL, transaction)  ──>  PostgreSQL
```

| Module | Domain | Phụ trách | API chính |
|---|---|---|---|
| `health` | Vận hành | TV1 | `GET /health` |
| `products` | Menu, chi tiết | TV3 (API), TV2 (seed, màn menu) | `GET /products`, `GET /products/:id` |
| `promotions` | Mã giảm giá | TV2 | `GET /coupons/:code/validate` |
| `inventory` | Tồn kho (optimistic locking) | TV3 | dùng nội bộ trong `orders` |
| `auth` | Đăng ký, đăng nhập, JWT | TV5 | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| `loyalty` | Điểm thưởng | TV5 | `GET /loyalty/me` |
| `orders` | Đơn hàng, máy trạng thái | TV4 (đơn), TV3 (state machine) | `POST /orders`, `GET /orders/me`, `GET /orders/:id`, `PATCH /orders/:id/cancel` |
| `payments` | Thanh toán, idempotency | TV6 | `POST /payments` |
| `staff` | Quầy pha chế (FR-13) | TV3 | `GET /staff/orders`, `PATCH /staff/orders/:id/status` (header `X-Staff-Key`) |
| `prisma` | Kết nối CSDL dùng chung | TV1 | – |

Module chỉ gọi nhau qua service được export (ví dụ `OrdersModule` import `InventoryModule`, `PromotionsModule`), không đọc thẳng bảng của domain khác ngoài transaction cần thiết.

## 5. Các mối quan tâm xuyên suốt

| Vấn đề | Cách làm | Ở đâu |
|---|---|---|
| **Migration** | Prisma Migrate: mỗi thay đổi schema là 1 thư mục migration SQL được commit; production chạy `prisma migrate deploy` khi container khởi động (chỉ áp migration mới, không xóa dữ liệu) | `apps/api/prisma/migrations`, `apps/api/Dockerfile`, ADR-002 |
| **Seed** | `prisma/seed.ts` dùng upsert, chạy lại không trùng; bật bằng `RUN_SEED=true` | `apps/api/prisma/seed.ts` |
| **Cấu hình** | 12-factor: mọi giá trị thay đổi theo môi trường đọc từ biến môi trường; repo chỉ có `.env.example` | `.env.example`, `apps/*/.env.example` |
| **Secret** | Local: file `.env` (bị `.gitignore` chặn). CI: GitHub Secrets. Production AWS: file `.env` chỉ nằm trên server (quyền 600), key pair SSH chỉ nằm trong GitHub Secrets. Bản phụ: Environment của Render và Vercel | docs/deployment.md |
| **Logging** | `LoggingInterceptor` ghi 1 dòng/request: phương thức, đường dẫn, mã trạng thái, thời gian (ms). Không ghi body, không ghi header Authorization. Log ra stdout → `docker compose logs api` trên EC2 (bản phụ: Render Logs). Caddy ghi log truy cập | `apps/api/src/common/logging.interceptor.ts` |
| **Health check** | `GET /health` chạy `SELECT 1`: trả `{ status: ok, db: up, version, uptime }`, CSDL lỗi trả 503. `version` = commit SHA của image | `apps/api/src/health/` |
| **Bảo mật** | JWT (ADR-004), bcrypt, ValidationPipe `whitelist + forbidNonWhitelisted`, CORS chỉ cho domain frontend (`FRONTEND_URL`), khách chỉ truy cập đơn của mình | `apps/api/src/auth`, `main.ts` |
| **Toàn vẹn dữ liệu** | Transaction khi tạo đơn + trừ kho và khi đổi trạng thái + ghi giao dịch; optimistic locking (ADR-003); Idempotency-Key (ADR-005) | `orders`, `inventory`, `payments` |

## 6. Lý do chọn kiến trúc

**Modular monolith** (1 API NestJS chia module theo domain) trong **monorepo** (ADR-001), deploy thành 4 container trên 1 máy chủ AWS EC2 bằng Docker Compose: Caddy (cổng vào, HTTPS), web, API, CSDL (ADR-007).

### Ưu điểm

- Nhóm 6 người, 1 tuần: một API, một CSDL, một pipeline là đủ đơn giản để ai cũng chạy được trên máy và giải thích được.
- Transaction ACID trong một CSDL giải quyết trực tiếp 2 rủi ro lớn nhất: bán quá kho và trừ tiền 2 lần. Microservice sẽ phải dùng saga hoặc outbox, phức tạp hơn nhiều.
- Ranh giới module rõ ràng: nếu sau này cần tách thanh toán thành service riêng, `payments` đã gói gọn sau interface `MockPaymentGateway`.
- Web và API là Docker image chạy giống hệt nhau ở local, CI và production; server chỉ kéo image về chạy, không build.

### Hạn chế

- API là một khối: lỗi nặng ở một module có thể làm cả API ngừng; không mở rộng riêng từng phần được.
- Một máy EC2 duy nhất: máy hỏng hoặc khởi động lại thì hệ thống ngừng vài phút; nhóm tự lo cập nhật hệ điều hành và sao lưu CSDL.
- Bản phụ trên Render ngủ sau 15 phút, lần gọi đầu chậm ~1 phút; CSDL Render miễn phí hết hạn sau 30 ngày.
- Cổng thanh toán là giả lập trong cùng process, chưa có callback/webhook như cổng thật.
- Chưa có service worker nên PWA chưa dùng được khi mất mạng.

### Trade-off đã chấp nhận

| Chọn | Thay vì | Đổi lại |
|---|---|---|
| Modular monolith | Microservices | Đơn giản, transaction dễ; chấp nhận không scale riêng từng module |
| Optimistic locking | Khóa dòng `SELECT … FOR UPDATE` | Không giữ khóa lâu, đọc nhanh; khi tranh chấp thì khách nhận lỗi và thử lại (ADR-003) |
| JWT không trạng thái | Session lưu server | Không cần bảng session, API dễ nhân bản; không thu hồi token trước hạn được, nên để hạn ngắn 1 giờ (ADR-004) |
| AWS EC2 + Docker Compose + Caddy | PaaS (Render, Vercel) | Toàn quyền máy chủ, đúng quy trình được hướng dẫn trên lớp, không bị ngủ; đổi lại nhóm tự quản trị máy (ADR-007). Render + Vercel giữ làm bản phụ (ADR-006) |
| Migration chạy khi container khởi động | Bước migrate riêng trong pipeline | Không cần mở CSDL ra Internet cho CI; migration lỗi thì container API không khỏe, smoke test báo đỏ và CD tự quay về bản trước |

## 7. Truy vết deployment diagram → kiến trúc → mã nguồn

| Node / artifact trong deployment diagram | Container (mục 3) | Mã nguồn / cấu hình |
|---|---|---|
| Trình duyệt / PWA | Web (PWA) | `apps/web/app/manifest.ts` |
| AWS EC2 – container Caddy (cổng 80/443) | Cổng vào, HTTPS | `deploy/Caddyfile`, `docker-compose.prod.yml` |
| AWS EC2 – container Next.js | Web (PWA) | `apps/web`, `apps/web/Dockerfile`, job `image-web` |
| AWS EC2 – container NestJS | API | `apps/api`, `apps/api/Dockerfile`, job `image`, job `deploy-ec2`, `deploy/deploy.sh` |
| prisma migrate deploy | API (migration) | `apps/api/prisma/migrations`, CMD trong Dockerfile |
| AWS EC2 – container PostgreSQL + volume `pgdata` | Cơ sở dữ liệu | `docker-compose.prod.yml` (không mở cổng ra ngoài) |
| Vercel, Render (bản phụ) | Web, API, CSDL | job `deploy-web`, `deploy-api` trong `cd.yml` |
| GitHub Actions runner | CI/CD | `.github/workflows/ci.yml`, `e2e.yml`, `cd.yml`, `rollback.yml` |
| GitHub Container Registry | CI/CD | job `image`, `image-web` trong `cd.yml` |
| GitHub Secrets (key pair SSH), file `.env` trên server | Cấu hình, secret | `deploy/.env.prod.example`, docs/deployment.md |
| Laptop – docker-compose | Local | `docker-compose.yml` |
