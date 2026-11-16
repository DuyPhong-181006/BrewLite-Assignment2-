# ADR-004: Xác thực bằng JWT Bearer token

- **Trạng thái:** Chấp nhận
- **Ngày:** 17/11/2026
- **Người đề xuất:** TV5 – An Tường

## Bối cảnh

Khách phải đăng nhập mới được đặt đơn, thanh toán, xem lịch sử (FR-06, NFR-02). Web (Vercel) và API (Render) ở **2 domain khác nhau**; API có thể chạy nhiều bản sao.

## Quyết định

1. Đăng nhập thành công → API ký **JWT** (HS256) chứa `{ sub: userId, email }`, hạn **1 giờ**, khóa ký đọc từ biến môi trường `JWT_SECRET` (thiếu thì API không khởi động).
2. Web lưu token trong store `auth` (localStorage) và gửi header `Authorization: Bearer <token>`.
3. API dùng Passport `JwtStrategy` + `JwtAuthGuard` cho các route cần đăng nhập; guard gắn `req.user = { sub, email }`; service luôn lọc theo `userId` → khách chỉ thấy đơn của mình.
4. Mật khẩu băm **bcrypt** 10 vòng; đăng nhập sai trả cùng một thông báo cho sai email và sai mật khẩu.
5. Token hết hạn → API trả 401 → web xóa token và chuyển về trang đăng nhập, giỏ hàng giữ nguyên.

## Phương án đã xét

| Phương án | Lý do không chọn |
|---|---|
| Session + cookie lưu server | Cần bảng/Redis lưu session; cookie khác domain (vercel.app ↔ onrender.com) phải cấu hình SameSite=None, CORS credentials phức tạp |
| Cookie httpOnly chứa JWT | An toàn hơn trước XSS nhưng gặp lại vấn đề cookie khác domain; để dành khi có domain riêng |
| Dịch vụ ngoài (Auth0, Clerk) | Phụ thuộc bên thứ ba, khó giải thích khi vấn đáp, không cần cho MVP |

## Hệ quả

- (+) API không lưu trạng thái đăng nhập, dễ chạy nhiều bản sao.
- (+) Test dễ: integration test tự ký token bằng `JwtService`.
- (−) Không thu hồi được token trước hạn → giữ hạn ngắn 1 giờ.
- (−) Token trong localStorage có thể bị đọc nếu web dính XSS → React tự escape dữ liệu, không dùng `dangerouslySetInnerHTML`.
