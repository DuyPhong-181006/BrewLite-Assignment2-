# BrewLite ☕

Ứng dụng đặt cà phê **không dùng tiền mặt**, chạy tốt trên điện thoại (mobile-first/PWA).
Bài tập lớn môn Công nghệ Phần mềm – Assignment 2: *Requirements to Deployment*.

```
Xem menu → Chọn tùy chọn → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn
```

## Cấu trúc repository

```
brewlite/
├── apps/
│   ├── web/                  # Next.js mobile-first/PWA
│   └── api/                  # NestJS + Prisma
├── docs/
│   ├── requirements/         # Task 1
│   ├── diagrams/             # Task 2
│   ├── architecture/         # Task 3
│   └── scrum/                # Product Backlog, Sprint Review
├── .github/workflows/        # CI
├── docker-compose.yml
├── .env.example
└── README.md
```

## Chạy ở máy

Cần: Node.js 22, Docker Desktop (đang mở), Git.

```bash
npm run setup                          # cài thư viện cho root, apps/api, apps/web
docker compose up -d db                # bật PostgreSQL

# Windows (cmd): copy thay cho cp
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

npm run db:migrate --prefix apps/api -- --skip-seed   # tạo bảng
npm run db:seed                                        # nạp dữ liệu mẫu
npm run dev                                            # API :3001 + web :3000
```

Hoặc chạy cả hệ thống bằng Docker: `docker compose up -d --build` → http://localhost:3000, API http://localhost:3001/health.

## Kiểm thử và CI

```bash
npm run lint
npm test
npm run test:e2e --prefix apps/api     # integration test, cần docker compose up -d db
```

Mỗi Pull Request chạy workflow **CI**: Install → Lint → Unit Test → Build cho API và web. PR đỏ không merge được (branch protection).

Quy ước branch, commit, Definition of Done: [CONTRIBUTING.md](CONTRIBUTING.md).

## Tài liệu

- [Bối cảnh và phạm vi](docs/requirements/context-and-scope.md) · [SRS](docs/requirements/srs.md) · [UC-01](docs/requirements/uc-01-dat-va-thanh-toan.md)
- [Activity](docs/diagrams/activity-end-to-end.svg) · [Sequence](docs/diagrams/sequence-checkout.svg) · [Class](docs/diagrams/class-domain.svg)
- [Kiến trúc](docs/architecture/architecture.md) · [ADR](docs/architecture/adr/) · [Deployment diagram](docs/architecture/deployment.svg)
- [Product Backlog](docs/scrum/product-backlog.md)
