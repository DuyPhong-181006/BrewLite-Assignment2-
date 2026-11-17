# Sprint Retrospective – Sprint 1 và Sprint 2

> Chủ trì: TV1 – Đào Duy Phong (Scrum Master). Hình thức: Start / Stop / Continue, mỗi người ghi ít nhất 1 ý.

## Sprint 1 (18/11/2026)

| Tốt (Continue) | Chưa tốt (Stop) | Thử mới (Start) |
|---|---|---|
| Tài liệu Task 1–3 xong trước khi code nên ai cũng biết mã FR của mình | Có bạn giải nén nhầm thư mục, tạo `frontend/frontend` | Luôn chạy lệnh từ thư mục gốc repo, kiểm tra `git status` trước khi commit |
| CI chặn được lỗi lint ngay trên PR | Docker chưa bật nên test báo "Can't reach database server" | Thêm bước `docker compose up -d db` vào checklist trước khi chạy test |
| PR nhỏ, merge theo thứ tự nên ít xung đột | `npm install` làm đổi `package-lock.json` lẫn vào commit không liên quan | Chỉ `git add` đúng file của mình, không dùng `git add .` |

## Sprint 2 (19/11 – 21/11/2026)

| Tốt (Continue) | Chưa tốt (Stop) | Thử mới (Start) |
|---|---|---|
| Luồng end-to-end chạy trên production, E2E tự kiểm tra mỗi PR | Một PR được push trước khi PR nó phụ thuộc được merge → CI đỏ | Ghi rõ "phụ thuộc PR #…" trong mô tả, merge theo đúng thứ tự backlog |
| Idempotency và optimistic locking có test chứng minh, giải thích được khi vấn đáp | Gói Free của Render ngủ làm smoke test lần đầu chậm | Mở trước URL API 2–3 phút trước buổi chấm; smoke test có chờ lại |
| Secret chỉ ở GitHub/Render/Vercel, không lọt vào repo; kịp làm thêm màn quầy pha chế (FR-13) | Thêm FR-13 sát cuối Sprint làm phải chèn 1 bước merge vào giữa | Chừa sẵn 10–15% thời gian Sprint cho việc phát sinh |

## Hành động cho Sprint sau

| Hành động | Người | Hạn |
|---|---|---|
| Tài khoản riêng cho từng nhân viên quầy thay cho mã chung `STAFF_KEY` | TV3 | Sprint 3 |
| Thêm service worker để PWA mở được khi mất mạng | TV1 | Sprint 3 |
| Sao lưu CSDL production trước mỗi migration lớn | TV1 | Thường xuyên |
