# Product Backlog và kế hoạch Sprint

> PO: TV2 – Lê Hữu Nhân · SM: TV1 – Đào Duy Phong.
> Bảng việc trực tuyến: GitHub Projects của repo (tab **Projects** → "BrewLite Board", cột Todo / In progress / In review / Done). Mỗi dòng dưới đây là 1 issue, gắn nhãn `sprint-1` hoặc `sprint-2`.

## Sprint 1 – 18/11/2026

**Sprint Goal:** tạo nền tảng kỹ thuật, tài liệu có kiểm soát phiên bản và một MVP đầu tiên chạy được cho luồng xem menu.

| ID | Backlog item | Yêu cầu | Người | Ước lượng | Thứ tự merge |
|---|---|---|---|---|---|
| S1-1 | Monorepo `apps/web`, `apps/api`; Docker Compose; `.env.example`; CONTRIBUTING; health check; CI | NFR-04, NFR-06 | TV1 | 5 | 1 |
| S1-2 | Migration đầu tiên (`init`) từ schema; API `GET /products`, `GET /products/:id` + test | FR-01, FR-02 | TV3 | 3 | 2 |
| S1-3 | Seed menu, size, topping; màn menu mobile-first (loading/empty/error); test component | FR-01, NFR-03 | TV2 | 3 | 3 |
| S1-4 | Bật branch protection, tạo GitHub Project, chụp minh chứng CI xanh và CI đỏ | NFR-04 | TV1 | 1 | – |

## Sprint 2 – 19/11 → 21/11/2026

**Sprint Goal:** hoàn thành luồng end-to-end, tự động hóa đóng gói và triển khai một phiên bản production có thể truy cập được.

| ID | Backlog item | Yêu cầu | Người | Ước lượng | Thứ tự merge |
|---|---|---|---|---|---|
| S2-1 | Giỏ hàng (store, trang giỏ, nút giỏ trên header) + unit test | FR-03 | TV4 | 3 | 1 |
| S2-2 | Mã giảm giá (API + ô nhập mã) + seed mã + unit test; nút giỏ ở đáy menu | FR-11 | TV2 | 3 | 2 |
| S2-3 | Màn chi tiết (size, topping), tồn kho optimistic locking, máy trạng thái + test | FR-02, FR-08, FR-09 | TV3 | 5 | 3 |
| S2-4 | Đăng ký/đăng nhập JWT, điểm thưởng + LoyaltyTransaction, tài khoản demo | FR-06, FR-12 | TV5 | 5 | 4 |
| S2-5 | API đơn hàng (tạo, lịch sử, hủy) + integration test + Postman | FR-04, FR-07, FR-08 | TV4 | 5 | 5 |
| S2-6 | Thanh toán Ví/Thẻ giả lập, Idempotency-Key, màn checkout + test + Postman | FR-05, FR-10 | TV6 | 5 | 6 |
| S2-10 | Màn quầy pha chế cho nhân viên (Could – làm nếu kịp) | FR-13 | TV3 | 3 | 7 |
| S2-7 | Màn xác nhận (tự cập nhật trạng thái) + lịch sử đơn; test E2E Playwright + workflow E2E | FR-07 | TV5 | 3 | 8 |
| S2-8 | CD: image SHA → GHCR → Render/Vercel → smoke test → rollback; README; release v1.0.0 | NFR-04, NFR-06 | TV1 | 5 | 9 |
| S2-9 | Ma trận truy vết, Sprint Review | – | TV2 | 2 | 10 |

Ước lượng theo story point (1, 2, 3, 5).
