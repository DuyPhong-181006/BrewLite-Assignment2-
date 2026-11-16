# BrewLite – Bối cảnh, stakeholder và phạm vi (Task 1.1)

> Người soạn: TV2 – Lê Hữu Nhân (Product Owner). Người duyệt: cả nhóm.
> Tài liệu liên quan: [SRS](srs.md) · [UC-01 Đặt và thanh toán](uc-01-dat-va-thanh-toan.md)

## 1. Vấn đề nghiệp vụ

Một quán cà phê nhỏ bán mang đi gặp ba vấn đề vào giờ cao điểm (7–9 giờ sáng, 11–13 giờ trưa):

1. **Xếp hàng lâu ở quầy.** Khách phải chờ đến lượt mới gọi món, hỏi size, topping rồi mới trả tiền. Một đơn mất 1–2 phút chỉ để gọi và tính tiền.
2. **Tiền mặt chậm và dễ sai.** Thối tiền lẻ mất thời gian, cuối ca hay lệch sổ. Quán muốn chuyển hẳn sang **ví điện tử và thẻ**.
3. **Không biết đơn đang ở đâu.** Khách hỏi lại "ly của em xong chưa", nhân viên vừa pha vừa phải trả lời.

**BrewLite** là ứng dụng web chạy tốt trên điện thoại (mobile-first, cài được lên màn hình chính như một app – PWA). Khách tự xem menu, chọn size và topping, trả tiền bằng ví hoặc thẻ (giả lập), rồi theo dõi trạng thái đơn. Nhân viên chỉ việc pha theo đơn đã thanh toán.

Luồng nghiệp vụ tối thiểu:

```
Xem menu → Chọn tùy chọn → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn
```

## 2. Stakeholder

| Stakeholder | Vai trò | Mục tiêu | Kỳ vọng với hệ thống | Mức ảnh hưởng |
|---|---|---|---|---|
| Khách hàng | Người dùng chính, đặt và trả tiền trên điện thoại | Mua nhanh, không chờ ở quầy, không cần tiền mặt | Menu rõ giá; chọn size/topping dễ; trả tiền một chạm; biết đơn đã trả tiền chưa; không bị trừ tiền 2 lần | Cao |
| Nhân viên quầy (barista) | Pha chế và giao đồ uống | Biết chính xác món cần pha, chỉ pha đơn đã trả tiền | Đơn ghi rõ size, topping, số lượng; trạng thái đơn đáng tin | Trung bình |
| Quản lý cửa hàng | Chủ quán, quyết định giá, khuyến mãi | Giảm thời gian phục vụ, không bán quá tồn kho, giữ chân khách | Tồn kho không âm; mã giảm giá có giới hạn; điểm thưởng cho khách quen; dữ liệu đơn lưu lại được | Cao |
| Giảng viên / khách hàng nghiệm thu | Chấm và nghiệm thu sản phẩm | Kiểm chứng quy trình từ yêu cầu đến triển khai | Tài liệu truy vết được; CI/CD chạy thật; URL production hoạt động; demo được luồng end-to-end | Rất cao |
| Nhóm phát triển (6 thành viên) | Xây dựng, kiểm thử, vận hành | Hoàn thành đúng hạn, ai cũng giải thích được phần mình | Repo rõ ràng, quy ước commit/PR, pipeline tự động bắt lỗi sớm | Cao |
| Đơn vị thanh toán (cổng ví/thẻ) | Hệ thống ngoài xử lý giao dịch | Nhận yêu cầu thanh toán hợp lệ, trả kết quả thành công/thất bại | Mỗi yêu cầu có khóa chống trùng (Idempotency-Key); số tiền do server tính | Trung bình (trong MVP là **dịch vụ giả lập**) |

## 3. Phạm vi

### 3.1 Trong MVP (in-scope)

| Nhóm | Nội dung | Mã yêu cầu |
|---|---|---|
| Menu | Xem danh sách đồ uống, giá, ảnh; trạng thái đang tải / rỗng / lỗi | FR-01 |
| Chi tiết sản phẩm | Chọn size S/M/L, topping, số lượng; giá cập nhật ngay | FR-02 |
| Giỏ hàng | Thêm, sửa số lượng, xóa; gộp món trùng; tính tổng tiền | FR-03 |
| Đặt đơn | Tạo đơn PENDING, server tính lại giá, trừ tồn kho | FR-04, FR-09 |
| Thanh toán | Ví điện tử / Thẻ qua cổng **giả lập**, chống trừ tiền 2 lần | FR-05, FR-10 |
| Xác thực | Đăng ký, đăng nhập, JWT | FR-06 |
| Xác nhận và lịch sử đơn | Màn xác nhận, tiến trình đơn, danh sách đơn của tôi | FR-07 |
| Quản lý trạng thái đơn | Máy trạng thái PENDING → PAID → PREPARING → READY → COMPLETED, hủy đơn | FR-08 |
| Mở rộng nhỏ (Should) | Mã giảm giá, điểm thưởng | FR-11, FR-12 |
| Vận hành | Docker Compose ở local, CI/CD, health check, deploy production qua HTTPS | NFR-04, NFR-06 |

### 3.2 Phạm vi mở rộng (sau MVP, nếu còn thời gian)

- Màn hình cho nhân viên quầy chuyển trạng thái PAID → PREPARING → READY → COMPLETED (FR-13, mức Could).
- Dùng điểm thưởng để trừ tiền (bảng `LoyaltyTransaction` đã có loại `REDEEM` để dành).
- Thông báo đẩy (push notification) khi đơn sẵn sàng; chạy offline bằng service worker.

### 3.3 Không thực hiện (out-of-scope)

- **Tiền mặt** và kết nối cổng thanh toán thật (VNPay, MoMo, thẻ Visa thật).
- Giao hàng tận nơi, tính phí ship, bản đồ.
- Quản lý nhiều chi nhánh, chấm công nhân viên, báo cáo doanh thu.
- Trang quản trị thêm/sửa món, nhập kho (dữ liệu menu và tồn kho nạp bằng seed).
- Ứng dụng native iOS/Android (dùng PWA thay thế).

## 4. Giả định

| Mã | Giả định |
|---|---|
| A-01 | Khách dùng điện thoại có trình duyệt hiện đại (Chrome, Safari 2 năm gần nhất) và có Internet. |
| A-02 | Cổng thanh toán được **giả lập** trong backend: mặc định thành công sau ~300 ms, có thể bật "giả lập từ chối" để demo nhánh lỗi. |
| A-03 | Một cửa hàng, một menu; giá tính bằng VND, số nguyên, không có thuế riêng. |
| A-04 | Tồn kho tính theo **số ly** mỗi món (không tính theo nguyên liệu). |
| A-05 | Dữ liệu menu, size, topping, mã giảm giá và tài khoản demo được nạp bằng seed. |
| A-06 | Nền tảng miễn phí (Render, Vercel, GitHub Actions) đủ cho lượng truy cập khi demo và chấm bài. |

## 5. Ràng buộc

| Mã | Ràng buộc |
|---|---|
| C-01 | Công nghệ bắt buộc: **Next.js** (frontend), **NestJS** (backend), **PostgreSQL** (CSDL), **Docker**. Có thể bổ sung, không được thay thế. |
| C-02 | Năm task làm **tuần tự**; task sau chỉ được nghiệm thu khi tạo phẩm task trước đã có trên repo với lịch sử commit rõ ràng. |
| C-03 | Mỗi thành viên commit và push phần việc của mình bằng tài khoản GitHub của mình. |
| C-04 | Thời gian: khoảng 1 tuần cho toàn bộ Assignment 2, 6 thành viên. |
| C-05 | Không dùng tiền mặt; chỉ Ví điện tử (WALLET) và Thẻ (CARD). |
| C-06 | Secret (JWT_SECRET, mật khẩu CSDL, token deploy) **không được** nằm trong repo hay log CI. CSDL production không mở ra Internet. |
| C-07 | Gói miễn phí: Render Web Service ngủ sau 15 phút không dùng (lần mở đầu chậm ~1 phút); Render Postgres miễn phí hết hạn sau 30 ngày. |

## 6. Rủi ro ban đầu

| Mã | Rủi ro | Khả năng | Ảnh hưởng | Cách giảm thiểu |
|---|---|---|---|---|
| R-01 | Hai khách đặt cùng lúc món sắp hết → bán quá tồn kho | Trung bình | Cao | Trừ kho trong transaction + optimistic locking theo cột `version` (ADR-003), có test đồng thời INT-T05 |
| R-02 | Khách bấm "Xác nhận trả" 2 lần hoặc mạng chập chờn → bị trừ tiền 2 lần | Cao | Cao | Idempotency-Key duy nhất cho mỗi lượt trả, ràng buộc unique trong CSDL (ADR-005) |
| R-03 | Deploy lỗi làm production ngừng hoạt động lúc chấm | Trung bình | Rất cao | Smoke test sau deploy, tự quay về image trước, workflow Rollback (docs/deployment.md) |
| R-04 | Thành viên sửa đè file dùng chung (schema, app.module) gây xung đột | Cao | Trung bình | Thứ tự merge cố định, PR nhỏ, CI chặn merge khi lỗi |
| R-05 | Lộ JWT_SECRET hoặc chuỗi kết nối CSDL lên GitHub | Thấp | Rất cao | `.gitignore` chặn `.env`; chỉ commit `.env.example`; secret để trong Render/Vercel/GitHub Secrets |
| R-06 | Gói miễn phí của nền tảng thay đổi hoặc hết hạn trước buổi chấm | Thấp | Cao | Ghi rõ ngày tạo CSDL; có `docker compose up` để demo local thay thế |
| R-07 | Thành viên chưa quen Git/CI | Cao | Trung bình | CONTRIBUTING.md hướng dẫn từng lệnh; PR template có checklist Definition of Done |
