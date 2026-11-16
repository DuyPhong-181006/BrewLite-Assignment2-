# ADR-006: Triển khai trên Vercel (web) + Render (API, PostgreSQL), image lưu ở GHCR

- **Trạng thái:** Chấp nhận
- **Ngày:** 17/11/2026
- **Người đề xuất:** TV1 – Đào Duy Phong

## Bối cảnh

Đề yêu cầu: URL frontend qua HTTPS, API có health check, CSDL production không public, image có tag theo commit SHA đẩy lên registry, deploy bằng secret của CI, smoke test sau deploy và có cách rollback. Nhóm không có ngân sách, không có kinh nghiệm quản trị máy chủ.

## Quyết định

| Thành phần | Nền tảng | Lý do |
|---|---|---|
| Web Next.js | **Vercel** (Hobby, miễn phí) | Chạy Next.js tốt nhất, có CDN và HTTPS sẵn, deploy bằng CLI với token trong GitHub Secrets, rollback 1 lệnh |
| API NestJS | **Render Web Service** chạy Docker image (Free) | Kéo image từ registry theo tag; có health check path, log, tự khởi động lại; Deploy Hook nhận tham số `imgURL` để deploy đúng image SHA |
| CSDL | **Render PostgreSQL** (Free) cùng region Singapore | Kết nối bằng Internal URL trong mạng riêng; tắt truy cập từ bên ngoài (xóa mọi IP trong Access Control) |
| Registry | **GitHub Container Registry** (`ghcr.io`) | Đăng nhập bằng `GITHUB_TOKEN` có sẵn trong Actions, không cần tài khoản thêm |
| Migration | `prisma migrate deploy` khi container khởi động | CI không cần kết nối tới CSDL production → CSDL không phải mở ra Internet |

## Phương án đã xét

| Phương án | Lý do không chọn |
|---|---|
| Tất cả trên Render (cả web) | Được, nhưng Next.js trên Render không có CDN biên như Vercel; web cũng bị ngủ khi không dùng |
| Railway / Fly.io | Không còn gói miễn phí lâu dài / cần thẻ thanh toán |
| VPS + Docker Compose + Nginx | Phải tự lo HTTPS, cập nhật hệ điều hành, sao lưu; tốn thời gian nhóm không có |
| Vercel tự deploy khi push (Git integration) | Deploy không đi qua quality gate của pipeline; đề yêu cầu pipeline điều khiển deploy và smoke test |

## Hệ quả

- (+) Toàn bộ HTTPS do nền tảng cấp; secret chỉ nằm ở GitHub Secrets, Render Environment, Vercel Environment.
- (+) Rollback: Render chạy lại image SHA cũ (còn trên GHCR), Vercel `rollback` về bản trước. Có workflow `rollback.yml`.
- (−) Render Free ngủ sau 15 phút không dùng → lần mở đầu chậm ~1 phút; smoke test chờ tối đa 10 phút. Trước buổi chấm cần mở trước.
- (−) Render PostgreSQL Free hết hạn sau 30 ngày → ghi ngày tạo trong docs/deployment.md, cần nâng cấp hoặc tạo lại nếu chấm muộn.
- (−) Gói image GHCR phải đặt **Public** (image không chứa secret) để Render kéo được mà không cần khai báo credential.
