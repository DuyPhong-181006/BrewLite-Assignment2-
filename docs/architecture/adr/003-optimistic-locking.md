# ADR-003: Chống bán quá tồn kho bằng optimistic locking (cột `version`)

- **Trạng thái:** Chấp nhận
- **Ngày:** 17/11/2026
- **Người đề xuất:** TV3 – Phạm Tuấn

## Bối cảnh

Giờ cao điểm nhiều khách đặt cùng một món. Nếu 2 request cùng đọc `stock = 1` rồi cùng trừ, món sẽ bị bán 2 ly trong khi chỉ còn 1 (rủi ro R-01, yêu cầu FR-09). Việc trừ kho phải nằm trong cùng transaction với tạo đơn (NFR-05).

## Quyết định

Bảng `Product` có cột `version`. Khi tạo đơn, trong transaction:

```sql
UPDATE "Product"
SET stock = stock - :qty, version = version + 1
WHERE id = :id AND version = :versionVuaDoc AND stock >= :qty;
```

- Cập nhật được 1 dòng → giữ hàng thành công.
- 0 dòng → có người vừa đổi tồn kho hoặc không đủ hàng → ném lỗi 400, transaction rollback, **không tạo đơn**, khách thử lại.
- Hủy đơn trả lại kho (`stock + qty`, `version + 1`) trong transaction hủy đơn.

Code: `apps/api/src/inventory/inventory.service.ts`. Test: INT-T05 (`test/concurrent-stock.e2e-spec.ts`) cho nhiều request đồng thời và kiểm tra tồn kho không âm.

## Phương án đã xét

| Phương án | Lý do không chọn |
|---|---|
| Pessimistic lock `SELECT … FOR UPDATE` | Giữ khóa dòng trong suốt transaction, request khác phải chờ; Prisma không hỗ trợ trực tiếp, phải viết SQL thô |
| Chỉ dùng `UPDATE … WHERE stock >= qty` (không version) | Đủ cho trừ kho đơn giản, nhưng không phát hiện được thay đổi khác giữa lúc đọc và ghi; nhóm muốn mẫu chung cho cả việc trả kho |
| Hàng đợi (queue) xử lý đơn tuần tự | Cần thêm Redis/broker, quá nặng cho MVP |

## Hệ quả

- (+) Không có khóa chờ lâu, đọc menu không bị chặn.
- (+) Không bao giờ âm kho, có test chứng minh.
- (−) Khi tranh chấp cao, một số khách nhận lỗi "đang có người chốt đơn cùng lúc" và phải bấm lại.
