# Sprint 2 Review – 21/11/2026

> Chủ trì: TV2 – Lê Hữu Nhân (PO). Người tham gia: cả nhóm.

**Sprint Goal:** hoàn thành luồng end-to-end, tự động hóa đóng gói và triển khai một phiên bản production có thể truy cập được. → **Đạt**, làm thêm được FR-13 (mức Could).

## Kết quả theo backlog

| ID | Item | Người | Kết quả |
|---|---|---|---|
| S2-1 | Giỏ hàng | TV4 | Done |
| S2-2 | Mã giảm giá | TV2 | Done |
| S2-3 | Chi tiết món, tồn kho, máy trạng thái | TV3 | Done |
| S2-4 | Đăng nhập JWT, điểm thưởng | TV5 | Done |
| S2-5 | API đơn hàng | TV4 | Done |
| S2-6 | Thanh toán, idempotency | TV6 | Done |
| S2-7 | Xác nhận, lịch sử đơn, E2E | TV5 | Done |
| S2-8 | CD, deploy production, release v1.0.0 | TV1 | Done |
| S2-9 | Ma trận truy vết, Sprint Review | TV2 | Done |
| S2-10 | Màn quầy pha chế (FR-13) | TV3 | Done |

## Demo trên production

| | Link |
|---|---|
| Web | https://brewlite-assignment2-ten.vercel.app |
| API health | https://brewlite-api-1rs6.onrender.com/health |
| Lần chạy CD thành công | https://github.com/DuyPhong-181006/BrewLite-Assignment2-/actions/runs/44087825578 |
| Release v1.0.0 | *(link Releases)* |
| Video demo luồng end-to-end | *(link video)* |

Kịch bản demo:

1. Mở web trên điện thoại, thêm vào màn hình chính.
2. Chọn Cà phê sữa size L + trân châu → thêm vào giỏ → giỏ hàng.
3. Bấm Thanh toán → bị chuyển sang đăng nhập → đăng nhập tài khoản demo.
4. Nhập mã `WELCOME10` → chọn Ví → Xác nhận trả → màn "Đặt hàng thành công".
5. Bật "(Demo) Giả lập cổng thanh toán từ chối" ở đơn khác → thấy thanh toán thất bại → thử lại thành công.
6. Mở `/staff` trên máy khác, nhập mã nhân viên → bấm "Bắt đầu pha", "Pha xong" → màn xác nhận của khách tự đổi sang "Đang pha", "Sẵn sàng".
7. Mở Postman gửi `POST /payments` 2 lần cùng `Idempotency-Key` → cùng 1 giao dịch.
8. Mở tab Actions: CI, E2E, CD xanh; `/health` trả version = commit mới nhất.

## Phản hồi

- *(ghi phản hồi của giảng viên/khách hàng sau buổi demo)*
