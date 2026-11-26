# BrewLite ☕

Ứng dụng đặt cà phê **không dùng tiền mặt**, chạy tốt trên điện thoại (mobile-first, cài được như app – PWA).
Bài tập lớn môn Công nghệ Phần mềm – Assignment 2: *Requirements to Deployment*.

```
Xem menu → Chọn size, topping → Giỏ hàng → Đặt đơn → Thanh toán Ví/Thẻ (giả lập) → Theo dõi đơn
```

| | URL |
|---|---|
| **Web (production)** | https://brewlite-assignment2-ten.vercel.app |
| **API** | https://brewlite-api-1rs6.onrender.com |
| **Health check** | https://brewlite-api-1rs6.onrender.com/health |
| Tài khoản demo | `demo@brewlite.vn` / `123456` · Mã giảm giá: `WELCOME10`, `BREW20` |
| Màn quầy pha chế | `/staff` – mã nhân viên local: `barista-demo-key` (production: hỏi nhóm) |

> API dùng gói miễn phí của Render: sau 15 phút không ai dùng sẽ ngủ, lần mở đầu chờ khoảng 1 phút.

## Công nghệ

| Phần | Công nghệ | Thư mục |
|---|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, Zustand, PWA manifest | `apps/web` |
| Backend | NestJS, Prisma 5, JWT (Passport), class-validator | `apps/api` |
| CSDL | PostgreSQL 16 (Prisma Migrate) | `apps/api/prisma` |
| Test | Jest + Supertest (API), Vitest + Testing Library (web), Playwright (E2E) | `apps/*`, `tests/e2e` |
| Vận hành | Docker, GitHub Actions, GHCR, Render, Vercel | `.github/workflows`, `docker-compose.yml` |

## Cấu trúc repository

```
brewlite/
├── apps/
│   ├── web/                  # Next.js mobile-first/PWA
│   └── api/                  # NestJS + Prisma (migrations, seed)
├── docs/
│   ├── requirements/         # Task 1: bối cảnh, SRS, use-case
│   ├── diagrams/             # Task 2: activity, sequence, class (.puml + .svg)
│   ├── architecture/         # Task 3: kiến trúc, ADR, deployment diagram
│   ├── scrum/                # backlog, sprint review, retrospective
│   ├── postman/              # bộ request Postman
│   ├── release-notes/        # ghi chú phát hành
│   ├── traceability-matrix.md
│   └── deployment.md
├── tests/e2e/                # Playwright: menu → xác nhận đơn
├── .github/workflows/        # ci.yml, e2e.yml, cd.yml, rollback.yml
├── docker-compose.yml
├── .env.example
└── README.md
```

## Chạy ở máy (local)

Cần: **Node.js 22**, **Docker Desktop** (đang mở), Git.

### Cách 1 – Docker Compose (nhanh nhất, chỉ 1 lệnh)

```bash
git clone https://github.com/<owner>/brewlite.git
cd brewlite
docker compose up -d --build
```

Mở http://localhost:3000. API: http://localhost:3001/health. Tắt: `docker compose down` (thêm `-v` để xóa luôn dữ liệu).

### Cách 2 – Chạy dev (sửa code thấy ngay)

```bash
npm run setup                          # cài thư viện cho root, apps/api, apps/web
docker compose up -d db                # chỉ bật PostgreSQL

# Windows (cmd): copy thay cho cp
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

npm run db:migrate --prefix apps/api -- --skip-seed   # tạo bảng từ migration
npm run db:seed                                        # nạp menu, mã giảm giá, tài khoản demo
npm run dev                                            # API :3001 + web :3000
```

Mở bằng điện thoại cùng Wi-Fi: trong `apps/web/.env.local` đổi `localhost` thành IP máy tính (vd `http://192.168.1.5:3001`), chạy lại `npm run dev`, mở `http://192.168.1.5:3000`.

> Lỗi `Can't reach database server at localhost:5432` → Docker chưa bật hoặc chưa chạy `docker compose up -d db`.

## Kiểm thử

| Lệnh | Chạy gì |
|---|---|
| `npm test --prefix apps/api` | Unit test API (không cần CSDL) |
| `npm run test:e2e --prefix apps/api` | Integration test API với PostgreSQL thật (cần `docker compose up -d db`) |
| `npm test --prefix apps/web` | Test component và giỏ hàng (Vitest) |
| `npm run lint` | Lint cả API và web |
| `cd tests/e2e && npm install && npx playwright install chromium && npm test` | E2E trên trình duyệt (cần hệ thống đang chạy, xem `tests/README.md`) |

Integration test nên chạy trên CSDL riêng: đặt `DATABASE_URL` = giá trị `TEST_DATABASE_URL` trong `.env.example` (CSDL `brewlite_test` được Docker tạo sẵn) rồi chạy `npx prisma migrate deploy` trước.

Postman: import các file trong `docs/postman/`, đổi biến `baseUrl` sang URL API production để gọi thử bản đã deploy.

## Build

```bash
npm run build                                   # build API (dist/) và web (.next/)
docker build -t brewlite-api apps/api           # image API
docker build -t brewlite-web --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 apps/web
```

## CI/CD và deploy

| Workflow | Khi nào | Làm gì |
|---|---|---|
| `ci.yml` | Mở/cập nhật PR, merge vào `main` | Install → Lint → Unit Test → Build (API + web), integration test API. PR đỏ **không merge được** |
| `e2e.yml` | PR, merge vào `main` | Dựng CSDL + API + web trên runner, chạy Playwright |
| `cd.yml` | Merge vào `main`, tag `v*` | Quality gate → build image API tag **commit SHA** → push GHCR → deploy Render → smoke test `/health` → deploy Vercel → smoke test web. Smoke test API lỗi thì **tự quay về image trước** |
| `rollback.yml` | Bấm tay | Đưa API về image SHA cũ, đưa web về bản production trước |

Cách cấu hình Render, Vercel, secret và quy trình rollback chi tiết: **[docs/deployment.md](docs/deployment.md)**.

### Rollback nhanh

1. GitHub → **Actions** → **Rollback** → **Run workflow** → nhập commit SHA của bản tốt trước đó (xem trong lần chạy CD xanh gần nhất).
2. Hoặc thủ công: Render Dashboard → service `brewlite-api` → **Events** → bản deploy trước → **Rollback**; Vercel → **Deployments** → bản trước → **Promote to Production**.

## Tài liệu

- Yêu cầu: [Bối cảnh và phạm vi](docs/requirements/context-and-scope.md) · [SRS](docs/requirements/srs.md) · [UC-01 Đặt và thanh toán](docs/requirements/uc-01-dat-va-thanh-toan.md)
- Sơ đồ: [Activity](docs/diagrams/activity-end-to-end.svg) · [Sequence](docs/diagrams/sequence-checkout.svg) · [Class](docs/diagrams/class-domain.svg)
- Kiến trúc: [Mô tả kiến trúc](docs/architecture/architecture.md) · [ADR](docs/architecture/adr/) · [Deployment diagram](docs/architecture/deployment.svg)
- [Ma trận truy vết](docs/traceability-matrix.md) · [Triển khai](docs/deployment.md) · [Release notes v1.0.0](docs/release-notes/v1.0.0.md)
- Scrum: [Product Backlog](docs/scrum/product-backlog.md) · [Sprint 1 Review](docs/scrum/sprint-1-review.md) · [Sprint 2 Review](docs/scrum/sprint-2-review.md) · [Retrospective](docs/scrum/retrospective.md)
- Quy ước nhóm: [CONTRIBUTING.md](CONTRIBUTING.md)

## Phân công nhóm

| TV | Họ tên | Vai trò Scrum | Phụ trách chính |
|---|---|---|---|
| TV1 | Đào Duy Phong | Scrum Master, DevOps | Monorepo, Docker, CI/CD, health check, kiến trúc, GHCR, Render/Vercel, rollback, release |
| TV2 | Lê Hữu Nhân | Product Owner | Bối cảnh, SRS, backlog, seed menu, mã giảm giá, ma trận truy vết, Sprint Review |
| TV3 | Phạm Tuấn | Developer | Migration/schema, API/menu, chi tiết sản phẩm, tồn kho, optimistic locking, máy trạng thái đơn, màn quầy pha chế |
| TV4 | Phạm Thành Danh | Developer | UC-01, activity diagram, giỏ hàng, API tạo/lịch sử/hủy đơn |
| TV5 | An Tường | Developer | Class diagram, JWT, đăng nhập/đăng ký, điểm thưởng, xác nhận/lịch sử đơn, test E2E Playwright |
| TV6 | Nguyễn Tấn Sự | Developer | Sequence diagram, đặc tả thanh toán, ADR idempotency và mock payment |

Kế hoạch phân công chi tiết theo từng Sprint và thứ tự merge: [Product Backlog](docs/scrum/product-backlog.md). Quy ước branch và commit: [CONTRIBUTING.md](CONTRIBUTING.md).
