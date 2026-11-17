# Triển khai BrewLite lên production (Task 5.3, 5.4)

> Người soạn: TV1 – Đào Duy Phong. Quyết định nền tảng: [ADR-006](architecture/adr/006-deploy-platform.md). Sơ đồ: [deployment.svg](architecture/deployment.svg).

## 1. Tổng quan

| Thành phần | Nền tảng | URL / tên |
|---|---|---|
| Web Next.js | Vercel (Hobby) | `https://brewlite.vercel.app` *(điền đúng)* |
| API NestJS | Render Web Service, chạy Docker image | `https://brewlite-api.onrender.com` *(điền đúng)* |
| CSDL | Render PostgreSQL 16, region Singapore | chỉ kết nối bằng **Internal URL** |
| Image API | GitHub Container Registry | `ghcr.io/<owner>/brewlite-api:<commit-sha>` |
| Pipeline | GitHub Actions | `.github/workflows/cd.yml` |

Ngày tạo CSDL Render: **…/11/2026** (gói Free hết hạn sau 30 ngày → hạn: …/12/2026).

## 2. Pipeline CD

```
Push main / tag v*  →  quality-gate (CI: lint, unit test, build, integration test)
                    →  image: docker build apps/api, tag = commit SHA (+ latest), push GHCR
                    →  deploy-api: gọi Render Deploy Hook kèm imgURL=…:<sha>
                         container khởi động: prisma migrate deploy → seed (upsert) → node dist/main.js
                       smoke test: chờ GET /health trả status "ok" và version = <sha> (tối đa 10 phút)
                         lỗi → tự gọi Deploy Hook với image SHA trước đó, pipeline báo đỏ
                    →  deploy-web: vercel pull → vercel build → vercel deploy --prebuilt --prod
                       smoke test: trang chủ trả 200 và có chữ "BrewLite"
```

Pipeline dừng ngay ở bước lỗi đầu tiên: CI đỏ thì không build image; API không khỏe thì không deploy web.

## 3. Cài đặt lần đầu (TV1 làm 1 lần)

### 3.1 Render PostgreSQL

1. https://dashboard.render.com → **New → Postgres**. Name `brewlite-db`, Database `brewlite`, Region **Singapore**, Plan **Free** → Create.
2. Mở `brewlite-db` → **Info**: sao chép **Internal Database URL** (dạng `postgresql://…@dpg-xxx-a/brewlite`). **Không** dùng External URL cho API.
3. **Networking / Access Control**: xóa mọi dòng (kể cả `0.0.0.0/0`) → CSDL không nhận kết nối từ Internet.

### 3.2 Đưa image đầu tiên lên GHCR

Image chỉ có sau lần chạy `cd.yml` đầu tiên, nhưng Render cần image để tạo service. Cách làm:

1. Merge PR chứa `cd.yml`. Job `image` sẽ chạy xong (job `deploy-api` báo lỗi vì chưa có secret – bình thường).
2. GitHub → trang cá nhân/tổ chức → **Packages** → `brewlite-api` → **Package settings** → **Change visibility → Public**. (Image không chứa secret; Public để Render kéo về không cần đăng nhập.)

### 3.3 Render Web Service cho API

1. **New → Web Service → Existing Image**. Image URL: `ghcr.io/<owner>/brewlite-api:latest`. Name `brewlite-api`, Region **Singapore**, Plan **Free**.
2. **Environment Variables:**

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Internal Database URL ở bước 3.1 |
   | `JWT_SECRET` | chuỗi ngẫu nhiên dài (Render có nút **Generate**) |
   | `FRONTEND_URL` | `https://brewlite.vercel.app` (URL web thật, nhiều URL cách nhau dấu phẩy) |
   | `RUN_SEED` | `true` |
   | `MOCK_PAYMENT_DELAY_MS` | `300` |
   | `STAFF_KEY` | mã nhân viên cho màn quầy `/staff` (đặt chuỗi riêng, không dùng `barista-demo-key`) |

   Không cần đặt `PORT`: Render tự cấp, API đọc `process.env.PORT`.
3. **Settings → Health Check Path:** `/health`.
4. **Settings → Deploy Hook:** sao chép URL (dạng `https://api.render.com/deploy/srv-xxx?key=yyy`) – đây là **secret**.
5. Mở `https://brewlite-api.onrender.com/health` → thấy `{"status":"ok","db":"up",…}`.

### 3.4 Vercel cho web

1. https://vercel.com → **Add New → Project** → Import repo GitHub. **Root Directory: `apps/web`**, Framework: Next.js.
2. **Environment Variables (Production):** `NEXT_PUBLIC_API_URL` = `https://brewlite-api.onrender.com`.
3. **Settings → Git → Ignored Build Step**: chọn *Don't build anything* (hoặc tắt tự deploy) – deploy chỉ đi qua pipeline CD.
4. Tạo token: Account Settings → **Tokens** → Create (scope project của nhóm).
5. Lấy `orgId`, `projectId`: chạy `npx vercel link` trong `apps/web` trên máy, mở file `apps/web/.vercel/project.json` (thư mục này đã bị `.gitignore`, không commit).

### 3.5 GitHub Secrets và Variables

Repo → **Settings → Secrets and variables → Actions**:

| Loại | Tên | Giá trị |
|---|---|---|
| Secret | `RENDER_DEPLOY_HOOK_URL` | Deploy Hook ở 3.3 |
| Secret | `VERCEL_TOKEN` | token ở 3.4 |
| Secret | `VERCEL_ORG_ID` | `orgId` |
| Secret | `VERCEL_PROJECT_ID` | `projectId` |
| Variable | `API_URL` | `https://brewlite-api.onrender.com` (không có `/` cuối) |
| Variable | `WEB_URL` | `https://brewlite.vercel.app` |

Sau đó vào **Actions → CD → Run workflow** để chạy deploy đầy đủ lần đầu.

## 4. Migration an toàn

- Migration nằm trong `apps/api/prisma/migrations`, được review trong PR (ADR-002).
- Container chạy `npx prisma migrate deploy` trước khi mở cổng: chỉ áp migration **chưa chạy**, không reset, không xóa dữ liệu.
- Migration lỗi → container dừng → health check không đạt → Render **giữ bản cũ đang chạy**; smoke test trong CD báo đỏ.
- Quy tắc để rollback image cũ vẫn chạy được: chỉ thêm bảng/cột (có giá trị mặc định); muốn xóa/đổi tên cột thì làm qua 2 lần phát hành.

## 5. Secret – không lọt vào repo và log

- Repo chỉ có `.env.example`; `.gitignore` chặn `.env`, `.env.local`, `.vercel/`.
- Giá trị thật chỉ nằm ở: Render Environment, Vercel Environment, GitHub Secrets. GitHub tự che (`***`) secret nếu lỡ in ra log.
- `JWT_SECRET` trong `docker-compose.yml` và CI chỉ là giá trị cho máy local/CSDL tạm của CI, **khác** giá trị production.
- `LoggingInterceptor` không ghi body request hay header Authorization.
- CSDL production không có địa chỉ công khai được phép truy cập (Access Control trống).

## 6. Rollback

| Tình huống | Cách xử lý |
|---|---|
| Smoke test API lỗi trong CD | Tự động: job `deploy-api` gọi Deploy Hook với image SHA đang chạy trước đó |
| Phát hiện lỗi sau khi deploy xong | **Actions → Rollback → Run workflow**, nhập SHA của bản tốt (xem lần chạy CD xanh trước, hoặc trang Packages) |
| GitHub Actions không dùng được | Render: service → **Events** → chọn bản trước → **Rollback**. Vercel: **Deployments** → bản trước → **⋯ → Promote to Production** |
| Migration hỏng dữ liệu | Render Postgres Free không có backup tự động → trước khi merge migration lớn, chạy `pg_dump` bằng External URL tạm mở cho IP của mình rồi đóng lại |

## 7. Kiểm tra sau deploy (smoke test thủ công)

1. `GET https://brewlite-api.onrender.com/health` → `status: ok`, `db: up`, `version` = commit mới nhất.
2. Mở web trên điện thoại → menu hiện 6 món.
3. Đăng nhập `demo@brewlite.vn / 123456` → thêm món → thanh toán Ví → thấy "Đặt hàng thành công".
4. Mở `/staff`, nhập `STAFF_KEY` → đơn vừa đặt nằm ở cột "Đã trả tiền" → bấm "Bắt đầu pha" → màn xác nhận đổi sang "Đang pha".
5. Render → **Logs**: thấy dòng `POST /payments 201 …ms`, không có token/mật khẩu trong log.

## 8. Phát hành phiên bản

```bash
git checkout main && git pull
git tag -a v1.0.0 -m "BrewLite v1.0.0"
git push origin v1.0.0
```

Tag `v*` cũng chạy `cd.yml`. Trên GitHub → **Releases → Draft a new release** → chọn tag `v1.0.0`, dán nội dung [release-notes/v1.0.0.md](release-notes/v1.0.0.md).
