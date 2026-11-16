# Sprint 1 Review – 18/11/2026

> Chủ trì: TV2 – Lê Hữu Nhân (PO). Người tham gia: cả nhóm.

**Sprint Goal:** tạo nền tảng kỹ thuật, tài liệu có kiểm soát phiên bản và một MVP đầu tiên chạy được cho luồng xem menu. → **Đạt.**

## Kết quả theo backlog

| ID | Item | Kết quả | Minh chứng |
|---|---|---|---|
| S1-1 | Monorepo, Docker Compose, CI, health check | Done | PR của TV1, workflow CI |
| S1-2 | Migration `init`, `GET /products`, `GET /products/:id` + test | Done | PR của TV3, API-T01, API-T02, UNIT-T02, UNIT-T03 |
| S1-3 | Seed menu, màn menu mobile-first, test component | Done | PR của TV2, UI-T01 → UI-T04 |
| S1-4 | Branch protection, GitHub Project, minh chứng CI | Done | Ảnh chụp bên dưới |

## Demo

1. `docker compose up -d --build` → mở http://localhost:3000 trên laptop và điện thoại: menu 6 món, 1 cột trên điện thoại, 4 cột trên laptop.
2. Tắt API → menu báo "Không tải được menu." và nút "Thử lại"; bật lại API → bấm "Thử lại" hiện menu.
3. `GET http://localhost:3001/health` → `{"status":"ok","db":"up",…}`.

## Minh chứng CI (Task 4.4)

| | Link |
|---|---|
| PR có CI chạy thành công | *(dán link PR)* |
| Lần pipeline phát hiện lỗi (CI đỏ, nút Merge bị khóa) | *(dán link lần chạy + ảnh)* |

## Phản hồi và điều chỉnh backlog

- Giỏ hàng cần có nút cố định ở đáy màn điện thoại → thêm vào S2-1/S2-2.
- Màn chi tiết cần chọn size bằng hình ly để khách dễ nhìn → thêm vào S2-3.
