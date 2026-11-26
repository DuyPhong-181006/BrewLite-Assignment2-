# BrewLite ☕

Ứng dụng đặt cà phê **không dùng tiền mặt**, chạy tốt trên điện thoại (mobile-first, cài được như app – PWA).
Bài tập lớn môn Công nghệ Phần mềm – Assignment 2: *Requirements to Deployment*.

```
Xem menu → Chọn size, topping → Giỏ hàng → Đặt đơn → Thanh toán Ví/Thẻ (giả lập) → Theo dõi đơn
```

| | URL |
|---|---|
| **Web (production – AWS EC2)** | https://203-0-113-10.sslip.io *(TV1 điền đúng địa chỉ server sau khi deploy)* |
| **Health check** | https://203-0-113-10.sslip.io/api/health |
| Bản phụ (Render + Vercel) | Web https://brewlite-assignment2-ten.vercel.app · API https://brewlite-api-1rs6.onrender.com/health |
| Tài khoản demo | `demo@brewlite.vn` / `123456` · Mã giảm giá: `WELCOME10`, `BREW20` |
| Màn quầy pha chế | `/staff` – mã nhân viên local: `barista-demo-key` (production: hỏi nhóm) |

> Bản phụ dùng gói miễn phí của Render: sau 15 phút không ai dùng sẽ ngủ, lần mở đầu chờ khoảng 1 phút. Bản AWS không bị ngủ.

## Công nghệ

| Phần | Công nghệ | Thư mục |
|---|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, Zustand, PWA manifest | `apps/web` |
| Backend | NestJS, Prisma 5, JWT (Passport), class-validator | `apps/api` |
| CSDL | PostgreSQL 16 (Prisma Migrate) | `apps/api/prisma` |
| Test | Jest + Supertest (API), Vitest + Testing Library (web), Playwright (E2E) | `apps/*`, `tests/e2e` |
| Vận hành | Docker Compose, Caddy, AWS EC2 (Ubuntu), GitHub Actions, GHCR; bản phụ Render, Vercel | `.github/workflows`, `deploy/`, `docker-compose*.yml` |

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
├── deploy/                   # server AWS EC2: Caddyfile, setup-ec2.sh, deploy.sh, .env.prod.example
├── docker-compose.yml        # chạy ở máy (local)
├── docker-compose.prod.yml   # chạy trên server AWS EC2
├── .env.example
└── README.md
```

## Chạy ở máy (local)

Cần: **Node.js 22**, **Docker Desktop** (đang mở), Git.

### Cách 1 – Docker Compose (nhanh nhất, chỉ 1 lệnh)

```bash
git clone https://github.com/DuyPhong-181006/BrewLite-Assignment2-.git brewlite
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
| `cd.yml` | Merge vào `main`, tag `v*` | Quality gate → build image API + web tag **commit SHA** → push GHCR → **SSH vào AWS EC2** chạy `deploy/deploy.sh <sha>` → smoke test `/api/health` và trang chủ. Smoke test lỗi thì **tự quay về bản trước**. Song song: bản phụ Render + Vercel |
| `rollback.yml` | Bấm tay | Đưa server EC2 (và bản phụ Render/Vercel) về commit SHA cũ |

Cách tạo server AWS EC2 (key pair, SSH, git clone, config IP, chạy), secret và rollback chi tiết: **[docs/deployment.md](docs/deployment.md)**.

### Deploy lên AWS EC2 (tóm tắt)

```bash
# 1. Tạo máy Ubuntu 24.04 trên EC2, tải key pair brewlite-key.pem, mở cổng 22/80/443
ssh -i brewlite-key.pem ubuntu@<IP>
# 2. Lấy source code về và cài đặt (Docker, swap, file .env với mật khẩu ngẫu nhiên)
git clone https://github.com/DuyPhong-181006/BrewLite-Assignment2-.git brewlite
cd brewlite && bash deploy/setup-ec2.sh && exit
# 3. SSH lại, config IP: kiểm tra PUBLIC_URL=https://<ip-dạng-gạch-ngang>.sslip.io trong .env
# 4. Chạy
cd brewlite && docker compose -f docker-compose.prod.yml up -d
```

Sau lần đầu, mỗi lần merge vào `main` pipeline CD tự SSH vào server deploy bản mới.

### Rollback nhanh

1. GitHub → **Actions** → **Rollback** → **Run workflow** → nhập commit SHA của bản tốt trước đó (xem trong lần chạy CD xanh gần nhất).
2. Trên server EC2: `cd ~/brewlite && bash deploy/deploy.sh <sha-bản-tốt>`.
3. Bản phụ: Render Dashboard → service `brewlite-api` → **Events** → bản deploy trước → **Rollback**; Vercel → **Deployments** → bản trước → **Promote to Production**.

## Tài liệu

- Yêu cầu: [Bối cảnh và phạm vi](docs/requirements/context-and-scope.md) · [SRS](docs/requirements/srs.md) · [UC-01 Đặt và thanh toán](docs/requirements/uc-01-dat-va-thanh-toan.md)
- Sơ đồ: [Activity](docs/diagrams/activity-end-to-end.svg) · [Sequence](docs/diagrams/sequence-checkout.svg) · [Class](docs/diagrams/class-domain.svg)
- Kiến trúc: [Mô tả kiến trúc](docs/architecture/architecture.md) · [ADR](docs/architecture/adr/) (ADR-007: AWS EC2) · [Deployment diagram](docs/architecture/deployment.svg)
- [Ma trận truy vết](docs/traceability-matrix.md) · [Triển khai](docs/deployment.md) · [Release notes v1.0.0](docs/release-notes/v1.0.0.md)
- Scrum: [Product Backlog](docs/scrum/product-backlog.md) · [Sprint 1 Review](docs/scrum/sprint-1-review.md) · [Sprint 2 Review](docs/scrum/sprint-2-review.md) · [Retrospective](docs/scrum/retrospective.md)
- Quy ước nhóm: [CONTRIBUTING.md](CONTRIBUTING.md)

## Nhóm và phân công

| TV | Họ tên | MSSV | Vai trò | Task 1–3 (yêu cầu, mô hình, kiến trúc) | Sprint 1–2 (code, CI/CD) |
|---|---|---|---|---|---|
| TV1 | Đào Duy Phong | 3124410273 | Scrum Master, DevOps | Khởi tạo repo; mô tả kiến trúc, ADR-001, ADR-006, deployment diagram | Monorepo, Docker Compose, health check, logging, CI; CD, deploy Render/Vercel, rollback, release v1.0.0; hạ tầng AWS EC2 (compose production, Caddy, deploy qua SSH) |
| TV2 | Lê Hữu Nhân | 3124410245 | Product Owner | Bối cảnh và phạm vi, SRS, use-case tổng quát | Seed, màn menu (FR-01); mã giảm giá (FR-11); ma trận truy vết, Sprint Review |
| TV3 | Phạm Anh Tuấn | 3124410394 | Developer | ADR-002, ADR-003 | Migration, API sản phẩm; màn chi tiết, tồn kho, máy trạng thái (FR-02, FR-08, FR-09); quầy pha chế (FR-13) |
| TV4 | Phạm Thành Danh | 3124410034 | Developer | Đặc tả UC-01, activity diagram | Giỏ hàng (FR-03); API đơn hàng, integration test, Postman (FR-04, FR-07, FR-08) |
| TV5 | Lê An Tường | 3124560097 | Developer | Class diagram, ADR-004 | Đăng nhập JWT, điểm thưởng (FR-06, FR-12); màn xác nhận, lịch sử đơn, test E2E (FR-07) |
| TV6 | Nguyễn Tấn Sự | 3124410305 | Developer | Sequence diagram, ADR-005 | Thanh toán Ví/Thẻ, Idempotency-Key, màn checkout, Postman (FR-05, FR-10); tài liệu triển khai AWS EC2, ADR-007, deployment diagram |

Mỗi thành viên tự commit và push phần của mình qua Pull Request. Chi tiết từng việc: [Product Backlog](docs/scrum/product-backlog.md).
