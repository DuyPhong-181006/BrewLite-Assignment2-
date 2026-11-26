# ADR-007: Production chính trên AWS EC2 (Ubuntu + Docker Compose + Caddy)

- **Trạng thái:** Chấp nhận
- **Ngày:** 18/11/2026
- **Người đề xuất:** TV1 – Đào Duy Phong, TV6 – Nguyễn Tấn Sự
- **Thay thế một phần:** [ADR-006](006-deploy-platform.md)

## Bối cảnh

Trên lớp, giảng viên hướng dẫn quy trình triển khai lên máy chủ: tạo máy Ubuntu trên AWS → tạo key pair để SSH vào máy → `git clone` mã nguồn → cấu hình theo IP của máy → chạy hệ thống. Bản đang chạy trên Render + Vercel (ADR-006) dùng được nhưng không thể hiện quy trình này, Render miễn phí ngủ sau 15 phút và CSDL miễn phí hết hạn sau 30 ngày.

Yêu cầu vẫn giữ nguyên: HTTPS, CSDL không public, image tag theo commit SHA trên registry, deploy bằng secret của CI, smoke test sau deploy và rollback được.

## Quyết định

Một máy **AWS EC2** (Ubuntu 24.04, t3.micro hoặc t2.micro, region Singapore) chạy toàn bộ hệ thống bằng **Docker Compose** (`docker-compose.prod.yml`):

| Container | Vai trò | Cổng ra ngoài |
|---|---|---|
| `proxy` (Caddy 2) | Cổng vào duy nhất. `/` → web, `/api/*` → API. Tự xin và gia hạn chứng chỉ HTTPS (Let's Encrypt) cho tên miền `<ip>.sslip.io` | 80, 443 |
| `web` | Next.js, image `ghcr.io/<owner>/brewlite-web:<sha>`, build với `NEXT_PUBLIC_API_URL=/api` | không |
| `api` | NestJS, image `ghcr.io/<owner>/brewlite-api:<sha>`, chạy `prisma migrate deploy` khi khởi động | không |
| `db` | PostgreSQL 16, dữ liệu trong volume `pgdata` | không |

- **"Config IP" bằng 1 biến:** `PUBLIC_URL` trong file `.env` trên server (vd `https://203-0-113-10.sslip.io`). Web gọi API bằng đường dẫn tương đối `/api`, nên image web không phụ thuộc IP và CI build sẵn được.
- **Build ở CI, server chỉ chạy:** máy 1 GB RAM không đủ build Next.js. Job `image`, `image-web` build và đẩy image tag commit SHA lên GHCR.
- **Deploy bằng SSH:** job `deploy-ec2` dùng key pair (secret `EC2_SSH_KEY`) SSH vào server, chạy `deploy/deploy.sh <sha>`: `git checkout <sha>` → `docker compose pull` → `up -d`. Smoke test `GET /api/health` phải trả `version = <sha>`, lỗi thì tự chạy lại `deploy.sh` với SHA trước.
- **Render + Vercel giữ làm bản phụ:** vẫn deploy song song khi có biến `API_URL`; xóa biến này để tắt.

## Phương án đã xét

| Phương án | Lý do không chọn |
|---|---|
| Giữ Render + Vercel làm production chính | Không theo quy trình được hướng dẫn; Render ngủ, CSDL hết hạn 30 ngày |
| Build image ngay trên EC2 (`docker compose up --build`) | t3.micro 1 GB RAM build Next.js rất chậm, dễ hết bộ nhớ; bản chạy không trùng với bản CI đã kiểm tra. Vẫn giữ làm cách dự phòng |
| Mở thẳng cổng 3000 và 3001 ra Internet | Không có HTTPS, phải đóng IP vào image web, CORS phức tạp. Caddy gom về 1 địa chỉ, chỉ mở 80/443 |
| Nginx + Certbot | Phải tự cài, tự gia hạn chứng chỉ; Caddy làm việc này tự động với vài dòng cấu hình |
| AWS RDS cho CSDL | Thêm dịch vụ, thêm chi phí; container PostgreSQL trong mạng nội bộ Docker đủ cho đồ án |
| Kubernetes (EKS) | Quá phức tạp và tốn chi phí cho 1 API, 1 web |

## Hệ quả

- (+) Đúng quy trình trên lớp: EC2 → key pair → git clone → config IP → run. Không bị ngủ, CSDL không hết hạn.
- (+) CSDL, API, web không mở cổng ra ngoài; chỉ Caddy nhận kết nối. File `.env` chỉ nằm trên server (quyền 600).
- (+) Rollback: `deploy/deploy.sh <sha-cũ>` (workflow Rollback gọi giúp), image cũ vẫn còn trên GHCR.
- (−) Một máy duy nhất: máy dừng thì hệ thống dừng; nhóm tự cập nhật Ubuntu và tự sao lưu CSDL (`pg_dump`).
- (−) Cổng SSH 22 phải mở cho GitHub Actions (IP thay đổi liên tục). Bù lại: chỉ đăng nhập bằng key pair, Ubuntu trên EC2 tắt đăng nhập bằng mật khẩu.
- (−) IP công khai đổi khi Stop/Start máy → cần Elastic IP, hoặc cập nhật lại `PUBLIC_URL`, biến `EC2_HOST`, `EC2_URL`.
- (−) Chứng chỉ HTTPS qua sslip.io phụ thuộc dịch vụ bên ngoài và giới hạn của Let's Encrypt; không xin được thì tạm chạy `http://<ip>`.
- (−) Tài khoản AWS cần thẻ thanh toán; phải tự theo dõi Free Tier/chi phí và Stop máy khi không dùng.
