import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CancelOrderButton, { CUSTOMER_CANCELLABLE } from '@/components/CancelOrderButton';
import { API_URL, useAuth } from '@/store/auth';

// UI-T05 – TV4: nút "Hủy đơn" gọi PATCH /orders/:id/cancel kèm token, xử lý thành công / lỗi 400 / hết phiên (FR-08)
const mockFetch = (status: number, body: unknown) => {
  const fn = vi.fn(() => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) }));
  vi.stubGlobal('fetch', fn);
  return fn;
};

describe('CancelOrderButton', () => {
  beforeEach(() => {
    useAuth.setState({ token: 'token-test' });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('chỉ cho hủy đơn chưa trả tiền (khớp backend)', () => {
    expect(CUSTOMER_CANCELLABLE).toEqual(['PENDING', 'PAYMENT_FAILED']);
  });

  it('bấm 2 bước -> gọi PATCH /orders/5/cancel kèm token, báo đơn CANCELLED', async () => {
    const fetchMock = mockFetch(200, { id: 5, status: 'CANCELLED' });
    const onCancelled = vi.fn();
    render(<CancelOrderButton orderId={5} onCancelled={onCancelled} onUnauthorized={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Hủy đơn #5' }));
    expect(fetchMock).not.toHaveBeenCalled(); // bước 1 chỉ hỏi xác nhận
    fireEvent.click(screen.getByRole('button', { name: 'Hủy đơn' }));

    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith({ id: 5, status: 'CANCELLED' }));
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/orders/5/cancel`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer token-test' },
    });
  });

  it('bấm "Không" thì không gọi API', () => {
    const fetchMock = mockFetch(200, {});
    render(<CancelOrderButton orderId={5} onCancelled={vi.fn()} onUnauthorized={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hủy đơn #5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Không' }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Hủy đơn #5' })).toBeTruthy();
  });

  it('đơn đã thanh toán -> hiện câu lỗi 400 của backend', async () => {
    mockFetch(400, { message: 'Đơn #5 đã thanh toán, muốn hủy vui lòng liên hệ quầy để hoàn tiền' });
    const onCancelled = vi.fn();
    render(<CancelOrderButton orderId={5} onCancelled={onCancelled} onUnauthorized={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hủy đơn #5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hủy đơn' }));

    expect((await screen.findByRole('alert')).textContent).toContain('đã thanh toán');
    expect(onCancelled).not.toHaveBeenCalled();
  });

  it('token hết hạn (401) -> gọi onUnauthorized để chuyển sang đăng nhập', async () => {
    mockFetch(401, { message: 'Unauthorized' });
    const onUnauthorized = vi.fn();
    render(<CancelOrderButton orderId={5} onCancelled={vi.fn()} onUnauthorized={onUnauthorized} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hủy đơn #5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hủy đơn' }));
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalled());
  });
});
