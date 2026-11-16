# ADR-002: Quản lý schema CSDL bằng Prisma Migrate

- **Trạng thái:** Chấp nhận
- **Ngày:** 17/11/2026
- **Người đề xuất:** TV3 – Phạm Tuấn

## Bối cảnh

Ở Assignment 1 nhóm dùng `prisma db push`: lệnh này sửa thẳng CSDL cho khớp `schema.prisma`, **không để lại lịch sử** và có thể xóa cột/dữ liệu khi đổi tên. Assignment 2 yêu cầu "migration/seed có thể tái tạo database" và "chạy migration theo cách an toàn" khi deploy production.

## Quyết định

1. Dùng **Prisma Migrate**. Mỗi thay đổi schema tạo một migration bằng `npx prisma migrate dev --name <ten-thay-doi>` trên máy dev; thư mục `prisma/migrations/<thời-gian>_<tên>/migration.sql` được commit cùng PR.
2. **Không sửa** migration đã merge vào `main`; muốn đổi thì tạo migration mới.
3. CI và production chỉ dùng `npx prisma migrate deploy`: áp các migration chưa chạy theo thứ tự, không tạo migration mới, không reset dữ liệu.
4. Dữ liệu mẫu nạp bằng `prisma/seed.ts` (upsert) – chạy lại nhiều lần không trùng.

## Phương án đã xét

| Phương án | Lý do không chọn |
|---|---|
| Giữ `prisma db push` | Không có lịch sử, không review được SQL, có thể mất dữ liệu production |
| TypeORM migrations | Phải viết lại toàn bộ tầng truy cập dữ liệu đang dùng Prisma |
| Viết SQL tay + công cụ Flyway | Thêm Java/công cụ ngoài; schema Prisma và SQL dễ lệch nhau |

## Hệ quả

- (+) Ai clone repo cũng dựng lại đúng CSDL bằng `migrate deploy` + `db seed`.
- (+) SQL của từng thay đổi nằm trong PR, người review đọc được.
- (+) Migration lỗi trên production → container không khởi động → Render giữ bản đang chạy.
- (−) Hai người cùng tạo migration trên 2 nhánh có thể xung đột thứ tự → quy định chỉ người phụ trách schema của Sprint tạo migration, merge theo thứ tự.
- (−) Migration xóa cột cần làm 2 bước (bỏ dùng trong code trước, xóa cột ở bản sau) để rollback image cũ vẫn chạy được.
