// UNIT-T15 – Máy trạng thái đơn hàng (FR-08): chuyển hợp lệ / bị chặn
import { BadRequestException } from '@nestjs/common';
import { assertTransition } from './order-state-machine';

describe('Order State Machine - Task 10 (a)', () => {
  it('cho phép các bước chuyển trạng thái hợp lệ (đúng sơ đồ Mục 9.1)', () => {
    // Luồng thành công
    expect(() => assertTransition('PENDING', 'PAID')).not.toThrow();
    expect(() => assertTransition('PAID', 'PREPARING')).not.toThrow();
    expect(() => assertTransition('PREPARING', 'READY')).not.toThrow();
    expect(() => assertTransition('READY', 'COMPLETED')).not.toThrow();
    // Thanh toán lỗi và thử lại
    expect(() => assertTransition('PENDING', 'PAYMENT_FAILED')).not.toThrow();
    expect(() => assertTransition('PAYMENT_FAILED', 'PENDING')).not.toThrow();
    // Hủy đơn
    expect(() => assertTransition('PENDING', 'CANCELLED')).not.toThrow();
    expect(() => assertTransition('PAYMENT_FAILED', 'CANCELLED')).not.toThrow();
    expect(() => assertTransition('PAID', 'CANCELLED')).not.toThrow();
  });

  it('chặn và ném lỗi khi chuyển trạng thái sai quy trình', () => {
    expect(() => assertTransition('PENDING', 'COMPLETED')).toThrow(BadRequestException); // nhảy cóc
    expect(() => assertTransition('PENDING', 'PREPARING')).toThrow(BadRequestException); // chưa trả tiền đã pha
    expect(() => assertTransition('PAYMENT_FAILED', 'PAID')).toThrow(BadRequestException); // phải "thử lại" về PENDING trước
    expect(() => assertTransition('PREPARING', 'CANCELLED')).toThrow(BadRequestException); // đang pha không hủy được
    expect(() => assertTransition('READY', 'PAID')).toThrow(BadRequestException); // đi lùi
    expect(() => assertTransition('COMPLETED', 'PENDING')).toThrow(BadRequestException); // trạng thái kết thúc
    expect(() => assertTransition('CANCELLED', 'PAID')).toThrow(BadRequestException); // trạng thái kết thúc
  });
});
