# ADR-001: Dùng monorepo `apps/web` + `apps/api` và modular monolith

- **Trạng thái:** Chấp nhận
- **Ngày:** 17/11/2026
- **Người đề xuất:** TV1 – Đào Duy Phong

## Bối cảnh

Assignment 1 để frontend và backend trong 2 thư mục `frontend/`, `backend/` cùng một repo. Assignment 2 yêu cầu cấu trúc `apps/web`, `apps/api`, `docs`, `tests` và một pipeline CI/CD cho cả hệ thống. Nhóm có 6 người, mỗi người làm cả frontend lẫn backend của tính năng mình, thời gian khoảng 1 tuần.

## Quyết định

1. **Một repository** chứa web, API, tài liệu, test E2E và workflow CI/CD.
2. Mỗi app giữ `package.json` và `package-lock.json` riêng (không dùng npm workspaces) để CI cài và cache từng app độc lập, Docker build từng app chỉ với thư mục của nó.
3. Backend là **modular monolith**: một ứng dụng NestJS, mỗi domain một module (`products`, `orders`, `payments`…), dùng chung một CSDL PostgreSQL.

## Phương án đã xét

| Phương án | Lý do không chọn |
|---|---|
| 2 repo riêng cho web và API | Một tính năng (vd thanh toán) phải mở 2 PR ở 2 repo; khó truy vết yêu cầu → code → test; phải đồng bộ 2 pipeline |
| Monorepo với npm workspaces / Turborepo | Thêm công cụ mới cả nhóm phải học; lockfile chung dễ xung đột khi 6 người cùng cài thư viện |
| Microservices (mỗi domain 1 service) | Cần message broker hoặc saga để giữ nhất quán đơn + kho + thanh toán; quá nặng cho MVP 1 tuần |

## Hệ quả

- (+) Một PR có thể chứa cả API, giao diện, test và tài liệu của cùng một tính năng → truy vết dễ.
- (+) Một CI chạy cho mọi thay đổi; branch protection áp cho toàn bộ hệ thống.
- (−) File dùng chung (`app.module.ts`, `schema.prisma`, `seed.ts`) dễ xung đột → nhóm quy định thứ tự merge (CONTRIBUTING.md).
- (−) CI chạy cả 2 app cho mỗi PR, kể cả khi chỉ sửa tài liệu (chấp nhận được, mỗi lần ~3–4 phút).
