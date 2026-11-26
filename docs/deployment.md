# Triển khai BrewLite lên production (Task 5.3, 5.4)

> Người soạn: TV1 – Đào Duy Phong (pipeline CD, bản Render + Vercel), TV6 – Nguyễn Tấn Sự (hướng dẫn AWS EC2).
> Quyết định nền tảng: [ADR-007](architecture/adr/007-aws-ec2.md) (AWS EC2, production chính), [ADR-006](architecture/adr/006-deploy-platform.md) (Render + Vercel, bản phụ). Sơ đồ: [deployment.svg](architecture/deployment.svg).

## 1. Tổng quan

| Thành phần | Production chính: AWS EC2 | Bản phụ |
|---|---|---|
| Địa chỉ | `https://<ip>.sslip.io` *(điền đúng, vd `https://203-0-113-10.sslip.io`)* | Web `https://brewlite-assignment2-ten.vercel.app`, API `https://brewlite-api-1rs6.onrender.com` |
| Cổng vào, HTTPS | Container Caddy 2, cổng 80/443, chứng chỉ Let's Encrypt tự động | Vercel, Render |
| Web Next.js | Container `brewlite-web:<sha>`, gọi API qua `/api` | Vercel |
| API NestJS | Container `brewlite-api:<sha>`, đường dẫn `/api/*` | Render Web Service |
| CSDL | Container PostgreSQL 16 + volume `pgdata`, không mở cổng | Render PostgreSQL (Internal URL) |
| Image | `ghcr.io/duyphong-181006/brewlite-api` và `brewlite-web`, tag = commit SHA | `brewlite-api` |
| Cấu hình | `docker-compose.prod.yml`, `deploy/Caddyfile`, file `.env` trên server | Render/Vercel Environment |
| Pipeline | `.github/workflows/cd.yml` job `deploy-ec2` | job `deploy-api`, `deploy-web` |

## 2. Pipeline CD

```
Push main / tag v*  →  quality-gate (CI: lint, unit test, build, integration test)
                    →  image:     docker build apps/api, tag = commit SHA (+ latest), push GHCR
                    →  image-web: docker build apps/web (NEXT_PUBLIC_API_URL=/api), tag = commit SHA, push GHCR
                    →  deploy-ec2 (AWS, production chính):
                         SSH bằng key pair → bash deploy/deploy.sh <sha>
                           git checkout <sha> → docker compose pull → up -d
                           container API khởi động: prisma migrate deploy → seed (upsert) → node dist/main.js
                         smoke test: GET <EC2_URL>/api/health trả status "ok" và version = <sha>, trang chủ có "BrewLite"
                           lỗi → tự chạy lại deploy.sh với SHA trước đó, pipeline báo đỏ
                    →  deploy-api → deploy-web (Render + Vercel, bản phụ, chỉ khi có biến API_URL)
```

Pipeline dừng ngay ở bước lỗi đầu tiên: CI đỏ thì không build image; build image lỗi thì không deploy.

## 3. AWS EC2 – cài đặt lần đầu

Làm theo đúng quy trình trên lớp: **AWS → máy Ubuntu (có IP) → key pair để SSH vào → git clone source code → config IP → run → active.**

### 3.1 Tạo máy Ubuntu và key pair

1. Đăng nhập https://console.aws.amazon.com, góc trên bên phải chọn region **Asia Pacific (Singapore) ap-southeast-1**.
2. **EC2 → Instances → Launch instances**:

   | Mục | Chọn |
   |---|---|
   | Name | `brewlite-server` |
   | Application and OS Images | **Ubuntu Server 24.04 LTS** (nhãn *Free tier eligible*) |
   | Instance type | **t3.micro** hoặc **t2.micro** (nhãn *Free tier eligible*) |
   | Key pair | **Create new key pair** → tên `brewlite-key`, loại **RSA**, định dạng **.pem** → trình duyệt tải về file `brewlite-key.pem` |
   | Network settings | Tick **Allow SSH traffic from Anywhere**, **Allow HTTPS traffic from the internet**, **Allow HTTP traffic from the internet** |
   | Configure storage | **20 GiB** gp3 |

3. Bấm **Launch instance**. Vào **Instances** → chọn máy → ghi lại **Public IPv4 address** (vd `203.0.113.10`).

> File `brewlite-key.pem` là chìa khóa vào server: không gửi qua chat nhóm, không commit lên git. Mất file thì không SSH vào được nữa.
> Cổng 22 mở cho mọi IP vì GitHub Actions SSH từ nhiều IP khác nhau; server chỉ nhận đăng nhập bằng key pair, không nhận mật khẩu.

### 3.2 Giữ IP cố định (nên làm)

IP công khai **đổi** mỗi khi Stop rồi Start máy. Để giữ IP: **EC2 → Elastic IPs → Allocate Elastic IP address → Allocate** → chọn IP vừa cấp → **Actions → Associate Elastic IP address** → chọn `brewlite-server`. Dùng IP này cho các bước sau. Xem trước phần chi phí của Elastic IP và Free Tier trong trang **Billing** của tài khoản.

### 3.3 SSH vào server (Windows cmd)

```bat
cd %USERPROFILE%\Downloads
ssh -i brewlite-key.pem ubuntu@203.0.113.10
```

Gõ `yes` khi được hỏi lần đầu. Nếu báo `UNPROTECTED PRIVATE KEY FILE` hoặc `bad permissions`, khóa quyền file rồi SSH lại:

```bat
icacls brewlite-key.pem /inheritance:r
icacls brewlite-key.pem /grant:r "%USERNAME%:R"
```

### 3.4 Đưa source code lên server và cài đặt

Trên server (sau khi SSH vào):

```bash
git clone https://github.com/DuyPhong-181006/BrewLite-Assignment2-.git brewlite
cd brewlite
bash deploy/setup-ec2.sh
exit
```

`setup-ec2.sh` cài Docker, thêm 2 GB swap (máy chỉ có 1 GB RAM), tạo file `.env` với mật khẩu CSDL, `JWT_SECRET`, `STAFF_KEY` ngẫu nhiên và điền sẵn `PUBLIC_URL` theo IP của máy. Phải `exit` rồi SSH lại để dùng được lệnh `docker`.

### 3.5 Config IP

SSH lại, mở file `.env`:

```bash
cd ~/brewlite
nano .env
```

| Biến | Giá trị |
|---|---|
| `PUBLIC_URL` | `https://<IP đổi dấu chấm thành gạch ngang>.sslip.io`, vd `https://203-0-113-10.sslip.io`. Tên miền sslip.io tự trỏ về đúng IP nên Caddy xin được chứng chỉ HTTPS. Nếu không xin được chứng chỉ thì tạm dùng `http://203.0.113.10` |
| `STAFF_KEY` | mã nhân viên cho màn `/staff` (đã sinh ngẫu nhiên, đổi nếu muốn) |
| Các biến còn lại | để nguyên |

Lưu: `Ctrl+O`, `Enter`, thoát: `Ctrl+X`. Đổi IP (dùng Elastic IP khác) thì chỉ cần sửa `PUBLIC_URL` rồi chạy lại bước 3.6.

### 3.6 Run → active (chạy thử bằng tay)

Image do pipeline CD build sẵn. Lần đầu, sau khi merge PR có `docker-compose.prod.yml`, vào GitHub → **Packages** → `brewlite-web` → **Package settings → Change visibility → Public** (giống `brewlite-api`, image không chứa secret). Sau đó trên server:

```bash
cd ~/brewlite
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

Chờ khoảng 1 phút đến khi `api` báo `healthy`, mở trình duyệt:

- `https://203-0-113-10.sslip.io` → menu hiện 6 món
- `https://203-0-113-10.sslip.io/api/health` → `{"status":"ok","db":"up",…}`

Chưa có image trên GHCR thì có thể tự build trên server (chậm, 10–15 phút): `docker compose -f docker-compose.prod.yml up -d --build`.

### 3.7 Cho pipeline CD tự deploy

Repo GitHub → **Settings → Secrets and variables → Actions**:

| Loại | Tên | Giá trị |
|---|---|---|
| Secret | `EC2_SSH_KEY` | mở `brewlite-key.pem` bằng Notepad, chép **toàn bộ**, kể cả dòng `-----BEGIN …-----` và `-----END …-----` |
| Variable | `EC2_HOST` | IP server, vd `203.0.113.10` |
| Variable | `EC2_URL` | đúng giá trị `PUBLIC_URL` trên server, không có `/` cuối |
| Variable | `EC2_USER` | *(không bắt buộc)* mặc định `ubuntu` |
| Variable | `EC2_APP_DIR` | *(không bắt buộc)* thư mục repo trên server, mặc định `brewlite` |

Sau đó **Actions → CD → Run workflow**. Job `deploy-ec2` xanh nghĩa là server đang chạy đúng commit vừa deploy (`/api/health` trả `version` = SHA). Từ đây mỗi lần merge vào `main` là server tự cập nhật.

### 3.8 Lệnh vận hành trên server

```bash
cd ~/brewlite
docker compose -f docker-compose.prod.yml ps                 # trạng thái các container
docker compose -f docker-compose.prod.yml logs -f api        # log API (mỗi request 1 dòng)
docker compose -f docker-compose.prod.yml logs -f proxy      # log Caddy, lỗi xin chứng chỉ HTTPS
cat .deployed_tag                                            # commit đang chạy
bash deploy/deploy.sh <commit-sha>                           # deploy/rollback bằng tay
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U brewlite brewlite > backup-$(date +%F).sql   # sao lưu CSDL
sudo apt update && sudo apt upgrade -y                       # cập nhật Ubuntu
```

Không dùng thì **Stop** máy trong EC2 Console để đỡ tốn tiền (dữ liệu trong ổ đĩa vẫn còn). Start lại thì container tự chạy lại (`restart: unless-stopped`); nếu không dùng Elastic IP thì IP đổi, phải sửa `PUBLIC_URL`, `EC2_HOST`, `EC2_URL`.

## 4. Bản phụ: Render + Vercel (TV1 cài 1 lần)

Bản này đã chạy từ Sprint 2 và được giữ lại làm bản phụ. Pipeline chỉ deploy lên đây khi có biến `API_URL`; xóa biến `API_URL` (và `WEB_URL`) để tắt.

### 4.1 Render PostgreSQL

1. https://dashboard.render.com → **New → Postgres**. Name `brewlite-db`, Database `brewlite`, Region **Singapore**, Plan **Free** → Create.
2. Mở `brewlite-db` → **Info**: sao chép **Internal Database URL** (dạng `postgresql://…@dpg-xxx-a/brewlite`). **Không** dùng External URL cho API.
3. **Networking / Access Control**: xóa mọi dòng (kể cả `0.0.0.0/0`) → CSDL không nhận kết nối từ Internet.

### 4.2 Đưa image đầu tiên lên GHCR

Image chỉ có sau lần chạy `cd.yml` đầu tiên, nhưng Render cần image để tạo service. Cách làm:

1. Merge PR chứa `cd.yml`. Job `image` sẽ chạy xong (job `deploy-api` báo lỗi vì chưa có secret – bình thường).
2. GitHub → trang cá nhân/tổ chức → **Packages** → `brewlite-api` → **Package settings** → **Change visibility → Public**. (Image không chứa secret; Public để Render kéo về không cần đăng nhập.)

### 4.3 Render Web Service cho API

1. **New → Web Service → Existing Image**. Image URL: `ghcr.io/<owner>/brewlite-api:latest`. Name `brewlite-api`, Region **Singapore**, Plan **Free**.
2. **Environment Variables:**

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Internal Database URL ở bước 4.1 |
   | `JWT_SECRET` | chuỗi ngẫu nhiên dài (Render có nút **Generate**) |
   | `FRONTEND_URL` | `https://brewlite.vercel.app` (URL web thật, nhiều URL cách nhau dấu phẩy) |
   | `RUN_SEED` | `true` |
   | `MOCK_PAYMENT_DELAY_MS` | `300` |
   | `STAFF_KEY` | mã nhân viên cho màn quầy `/staff` (đặt chuỗi riêng, không dùng `barista-demo-key`) |

   Không cần đặt `PORT`: Render tự cấp, API đọc `process.env.PORT`.
3. **Settings → Health Check Path:** `/health`.
4. **Settings → Deploy Hook:** sao chép URL (dạng `https://api.render.com/deploy/srv-xxx?key=yyy`) – đây là **secret**.
5. Mở `https://brewlite-api.onrender.com/health` → thấy `{"status":"ok","db":"up",…}`.

### 4.4 Vercel cho web

1. https://vercel.com → **Add New → Project** → Import repo GitHub. **Root Directory: `apps/web`**, Framework: Next.js.
2. **Environment Variables (Production):** `NEXT_PUBLIC_API_URL` = `https://brewlite-api.onrender.com`.
3. **Settings → Git → Ignored Build Step**: chọn *Don't build anything* (hoặc tắt tự deploy) – deploy chỉ đi qua pipeline CD.
4. Tạo token: Account Settings → **Tokens** → Create (scope project của nhóm).
5. Lấy `orgId`, `projectId`: chạy `npx vercel link` trong `apps/web` trên máy, mở file `apps/web/.vercel/project.json` (thư mục này đã bị `.gitignore`, không commit).

### 4.5 GitHub Secrets và Variables

Repo → **Settings → Secrets and variables → Actions**:

| Loại | Tên | Giá trị |
|---|---|---|
| Secret | `RENDER_DEPLOY_HOOK_URL` | Deploy Hook ở 4.3 |
| Secret | `VERCEL_TOKEN` | token ở 4.4 |
| Secret | `VERCEL_ORG_ID` | `orgId` |
| Secret | `VERCEL_PROJECT_ID` | `projectId` |
| Variable | `API_URL` | `https://brewlite-api.onrender.com` (không có `/` cuối) |
| Variable | `WEB_URL` | `https://brewlite.vercel.app` |

Sau đó vào **Actions → CD → Run workflow** để chạy deploy đầy đủ lần đầu.

## 5. Migration an toàn

- Migration nằm trong `apps/api/prisma/migrations`, được review trong PR (ADR-002).
- Container chạy `npx prisma migrate deploy` trước khi mở cổng: chỉ áp migration **chưa chạy**, không reset, không xóa dữ liệu.
- Migration lỗi → container API không khỏe → smoke test trong CD báo đỏ → CD tự chạy lại bản trước trên EC2 (Render thì **giữ bản cũ đang chạy**).
- Quy tắc để rollback image cũ vẫn chạy được: chỉ thêm bảng/cột (có giá trị mặc định); muốn xóa/đổi tên cột thì làm qua 2 lần phát hành.

## 6. Secret – không lọt vào repo và log

- Repo chỉ có `.env.example` và `deploy/.env.prod.example`; `.gitignore` chặn `.env`, `.env.local`, `.vercel/`.
- Giá trị thật chỉ nằm ở: file `.env` trên server EC2 (quyền 600, chỉ user `ubuntu` đọc được), GitHub Secrets (`EC2_SSH_KEY`), Render Environment, Vercel Environment. GitHub tự che (`***`) secret nếu lỡ in ra log.
- File key pair `.pem` chỉ nằm trên máy người quản trị và trong secret `EC2_SSH_KEY`.
- `JWT_SECRET` trong `docker-compose.yml` và CI chỉ là giá trị cho máy local/CSDL tạm của CI, **khác** giá trị production.
- `LoggingInterceptor` không ghi body request hay header Authorization.
- CSDL production không có địa chỉ công khai: trên EC2 container `db` không mở cổng, chỉ API trong mạng Docker nội bộ kết nối được; trên Render Access Control để trống.

## 7. Rollback

| Tình huống | Cách xử lý |
|---|---|
| Smoke test lỗi trong CD (EC2) | Tự động: job `deploy-ec2` chạy lại `deploy/deploy.sh` với SHA đang chạy trước đó |
| Smoke test API lỗi trong CD (Render) | Tự động: job `deploy-api` gọi Deploy Hook với image SHA đang chạy trước đó |
| Phát hiện lỗi sau khi deploy xong | **Actions → Rollback → Run workflow**, nhập SHA của bản tốt (xem lần chạy CD xanh trước). Áp dụng cho cả EC2 và Render/Vercel |
| GitHub Actions không dùng được (EC2) | SSH vào server: `cd ~/brewlite && bash deploy/deploy.sh <sha-bản-tốt>` (SHA trước đó lưu trong file `.previous_tag`) |
| GitHub Actions không dùng được (bản phụ) | Render: service → **Events** → chọn bản trước → **Rollback**. Vercel: **Deployments** → bản trước → **⋯ → Promote to Production** |
| Migration hỏng dữ liệu (EC2) | Trước khi merge migration lớn, sao lưu bằng `pg_dump` (mục 3.8); khôi phục: `docker compose -f docker-compose.prod.yml exec -T db psql -U brewlite brewlite < backup-….sql` |
| Migration hỏng dữ liệu (Render) | Render Postgres Free không có backup tự động → trước khi merge migration lớn, chạy `pg_dump` bằng External URL tạm mở cho IP của mình rồi đóng lại |

## 8. Kiểm tra sau deploy (smoke test thủ công)

1. `GET https://<ip>.sslip.io/api/health` → `status: ok`, `db: up`, `version` = commit mới nhất (`cat ~/brewlite/.deployed_tag` trên server).
2. Mở `https://<ip>.sslip.io` trên điện thoại → có ổ khóa HTTPS, menu hiện 6 món.
3. Đăng nhập `demo@brewlite.vn / 123456` → thêm món → thanh toán Ví → thấy "Đặt hàng thành công".
4. Mở `/staff`, nhập `STAFF_KEY` → đơn vừa đặt nằm ở cột "Đã trả tiền" → bấm "Bắt đầu pha" → màn xác nhận đổi sang "Đang pha".
5. Trên server: `docker compose -f docker-compose.prod.yml logs api | tail` → thấy dòng `POST /payments 201 …ms`, không có token/mật khẩu trong log.
6. Bản phụ: làm lại bước 1–2 với `https://brewlite-api-1rs6.onrender.com/health` và URL Vercel.

## 9. Phát hành phiên bản

```bash
git checkout main && git pull
git tag -a v1.0.0 -m "BrewLite v1.0.0"
git push origin v1.0.0
```

Tag `v*` cũng chạy `cd.yml`. Trên GitHub → **Releases → Draft a new release** → chọn tag `v1.0.0`, dán nội dung [release-notes/v1.0.0.md](release-notes/v1.0.0.md).
