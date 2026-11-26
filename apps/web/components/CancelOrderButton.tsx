'use client';

import { useState } from 'react';
import { API_URL, authHeader, errorMessage, useAuth } from '@/store/auth';

// TV4 – Phạm Thành Danh: nút "Hủy đơn" (FR-08, US-08) trên giao diện, gọi API hủy đơn PATCH /orders/:id/cancel (TV4)
// Khớp activity diagram UC-01: thanh toán lỗi -> "Thử lại?" -> không -> hủy đơn -> CANCELLED, trả lại tồn kho
// Chỉ hiện khi đơn chưa trả tiền – giống CUSTOMER_CANCELLABLE ở backend (orders.service.ts)
export const CUSTOMER_CANCELLABLE = ['PENDING', 'PAYMENT_FAILED'];

type Props = {
  orderId: number;
  onCancelled: (order: { id: number; status: string }) => void;
  onUnauthorized: () => void; // token hết hạn -> trang gọi tự chuyển sang đăng nhập
};

export default function CancelOrderButton({ orderId, onCancelled, onUnauthorized }: Props) {
  const token = useAuth((s) => s.token);
  const [confirming, setConfirming] = useState(false); // bấm 2 bước để tránh lỡ tay
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cancel = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: authHeader(token),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json();
      // 400: đơn đã trả tiền / đã hủy / vừa đổi trạng thái; 404: không phải đơn của mình
      if (!res.ok) throw new Error(errorMessage(data, 'Không hủy được đơn'));
      setConfirming(false);
      onCancelled(data as { id: number; status: string });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không kết nối được máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      {confirming ? (
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm">
          <p className="font-medium text-danger">Hủy đơn #{orderId}? Các món sẽ được trả lại kho.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={loading}
              className="rounded-lg border border-line bg-white py-2 font-medium hover:border-leaf disabled:opacity-60"
            >
              Không
            </button>
            <button
              type="button"
              onClick={() => void cancel()}
              disabled={loading}
              className="rounded-lg bg-danger py-2 font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Đang hủy...' : 'Hủy đơn'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-full rounded-xl border border-danger/40 py-2.5 text-sm font-semibold text-danger hover:bg-danger-soft"
        >
          Hủy đơn #{orderId}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
