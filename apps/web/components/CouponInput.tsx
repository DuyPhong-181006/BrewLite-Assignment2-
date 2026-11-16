'use client';

import { useState, useEffect } from 'react';

interface CouponInputProps {
  subtotal: number;
  onApply: (discountAmount: number, code: string) => void;
}

export default function CouponInput({ subtotal, onApply }: CouponInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  
  // Lưu lại subtotal tại thời điểm áp mã thành công
  const [appliedSubtotal, setAppliedSubtotal] = useState<number | null>(null);

  // Khi tổng tiền thay đổi, tự động xóa mã ở component cha
  useEffect(() => {
    onApply(0, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const handleApply = async () => {
    if (!code.trim()) return;
    
    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${API}/coupons/${encodeURIComponent(code.trim())}/validate?subtotal=${subtotal}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Mã giảm giá không hợp lệ');
      }

      setAppliedSubtotal(subtotal); // Lưu lại subtotal hiện tại
      setMessage(`Đã áp dụng mã ${data.code}: Giảm ${data.discountAmount.toLocaleString('vi-VN')}đ`);
      setIsError(false);
      onApply(data.discountAmount, data.code); 
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ');
      setIsError(true);
      setAppliedSubtotal(null); // Reset nếu lỗi
      onApply(0, ''); 
    } finally {
      setLoading(false);
    }
  };

  // Chỉ hiển thị thông báo nếu subtotal hiện tại khớp với lúc áp mã
  const showMessage = message !== '' && appliedSubtotal === subtotal;

  return (
    <div>
      <label htmlFor="coupon" className="text-sm font-medium">
        Mã giảm giá
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="coupon"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Ví dụ: WELCOME10"
          autoCapitalize="characters"
          className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="shrink-0 rounded-xl border border-leaf px-4 py-2.5 text-sm font-semibold text-leaf transition hover:bg-leaf-soft active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Đang kiểm tra...' : 'Áp dụng'}
        </button>
      </div>

      {showMessage && (
        <p role="status" className={`mt-2 animate-rise text-sm ${isError ? 'text-danger' : 'text-leaf'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
