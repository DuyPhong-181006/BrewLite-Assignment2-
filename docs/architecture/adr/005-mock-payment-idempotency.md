# ADR-005: Cổng thanh toán giả lập và Idempotency-Key cho `POST /payments`

- **Trạng thái:** Chấp nhận
- **Ngày:** 17/11/2026
- **Người đề xuất:** TV6 – Nguyễn Tấn Sự

## Bối cảnh

Đề yêu cầu thanh toán Ví/Thẻ **mô phỏng** (FR-05) và xử lý khi client gửi lại yêu cầu thanh toán (FR-10). Thực tế khách hay bấm 2 lần hoặc mạng chập chờn khiến trình duyệt gửi lại → nguy cơ trừ tiền 2 lần (R-02).

## Quyết định

1. **Cổng giả lập** `MockPaymentGateway` nằm trong module `payments`, sau một interface: chờ `MOCK_PAYMENT_DELAY_MS` (mặc định 300 ms), trả `{ success, transactionId }` hoặc `{ success: false, reason }`. Có cờ `simulateFailure` để demo nhánh lỗi. Muốn dùng cổng thật chỉ cần thay class này.
2. Client tạo **Idempotency-Key** (UUID) cho mỗi lượt bấm "Xác nhận trả", gửi qua header; gửi lại do lỗi mạng thì dùng **lại key cũ**. Thiếu header → 400.
3. Bảng `Payment` có cột `idempotencyKey` **UNIQUE**. Luồng xử lý:
   - Key đã có → trả lại đúng giao dịch cũ, không gọi cổng lần nữa.
   - Key mới → ghi `Payment(PROCESSING)` trước, rồi mới gọi cổng. Hai request cùng key đến cùng lúc: request sau vi phạm UNIQUE (Prisma `P2002`) → trả giao dịch của request trước.
   - Thành công: trong 1 transaction đổi đơn `PENDING → PAID` (chỉ khi đơn vẫn PENDING) và giao dịch `SUCCESS`.
   - Thất bại: giao dịch `FAILED`, đơn `PAYMENT_FAILED`; khách thử lại bằng key mới.
4. Số tiền luôn lấy từ `order.total` trong CSDL, không nhận từ client.

## Phương án đã xét

| Phương án | Lý do không chọn |
|---|---|
| Tích hợp sandbox VNPay/MoMo | Cần đăng ký merchant, callback về URL công khai, vượt phạm vi (out-of-scope) |
| Dịch vụ giả lập chạy thành container riêng | Thêm 1 service phải deploy và theo dõi trên gói miễn phí; lợi ích chỉ là mô phỏng gọi mạng |
| Chống trùng bằng cách khóa nút ở frontend | Không chống được gửi lại do mạng, gọi API trực tiếp (Postman) hay 2 tab |

## Hệ quả

- (+) Gửi 1 hay 10 lần cùng key đều chỉ có 1 giao dịch – có test INT-T03, UNIT-T16.
- (+) Đơn bị hủy giữa lúc đang trả tiền không bị ghi đè thành PAID (điều kiện `status = PENDING`).
- (−) Giao dịch kẹt ở PROCESSING nếu API chết đúng lúc gọi cổng; bản sau cần job dọn dẹp/đối soát.
- (−) Cổng giả lập không mô phỏng webhook/callback bất đồng bộ như cổng thật.
