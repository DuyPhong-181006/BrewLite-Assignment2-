'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import CouponInput from '@/components/CouponInput';
import { cartTotal, useCart } from '@/store/cart';
import { API_URL, authHeader, errorMessage, useAuth } from '@/store/auth';

// TV6 – Màn (4) Thanh toán (Task 8, wireframe Mục 7): Tổng, Phương thức (Ví / Thẻ), "Xác nhận trả"
// Luồng: POST /orders (TV4) tạo đơn PENDING -> POST /payments (TV6) -> thành công: xóa giỏ, sang màn (5) Xác nhận
//        thất bại: đơn PAYMENT_FAILED, GIỮ NGUYÊN giỏ hàng, bấm lại để thử lại (US-05)

type Method = 'WALLET' | 'CARD';
type Payment = { id: number; status: 'PROCESSING' | 'SUCCESS' | 'FAILED'; failureReason: string | null };

const vnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';
const subscribe = () => () => {};
// Idempotency-Key: mã duy nhất cho 1 lượt trả tiền
const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `key_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const token = useAuth((s) => s.token);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false); // giỏ + token lưu ở trình duyệt

  const [method, setMethod] = useState<Method>('WALLET');
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Đơn đã tạo nhưng chưa trả được -> bấm lại thì thử lại ĐÚNG đơn đó, không tạo đơn mới
  const pendingOrder = useRef<{ id: number; signature: string } | null>(null);
  // Key của lượt trả đang dở: mất mạng giữa chừng thì bấm lại vẫn dùng key cũ -> server không trừ tiền 2 lần
  const payKey = useRef<string | null>(null);

  // Thanh toán cần đăng nhập (JWT của TV5)
  useEffect(() => {
    if (mounted && !token) router.replace('/login');
  }, [mounted, token, router]);

  if (!mounted || !token) return <p className="p-6 text-center text-muted">Đang tải...</p>;

  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Thanh toán</h1>
        <p className="mt-2 text-muted">Giỏ hàng đang trống, chưa có gì để thanh toán.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-leaf px-5 py-2.5 font-semibold text-white hover:bg-leaf-dark">
          Xem menu
        </Link>
      </main>
    );
  }

  const subtotal = cartTotal(items);
  const total = subtotal - discount;

  const sessionExpired = () => {
    useAuth.getState().logout(); // token hết hạn -> đăng nhập lại (giỏ hàng vẫn còn)
    router.replace('/login');
  };

  const handleCoupon = (amount: number, code: string) => {
    setDiscount(amount);
    setCouponCode(code);
  };

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Tạo đơn (POST /orders – TV4). Giá, giảm giá, tổng do BACKEND tính lại từ CSDL.
      const signature = JSON.stringify([items.map((i) => [i.productId, i.size, i.toppings, i.qty]), couponCode]);
      if (pendingOrder.current && pendingOrder.current.signature !== signature) {
        // Đổi mã giảm giá sau khi đơn cũ trả lỗi -> hủy đơn cũ (API hủy của TV4), tạo đơn mới
        void fetch(`${API_URL}/orders/${pendingOrder.current.id}/cancel`, {
          method: 'PATCH',
          headers: authHeader(token),
        }).catch(() => {});
        pendingOrder.current = null;
      }
      if (!pendingOrder.current) {
        const res = await fetch(`${API_URL}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader(token) },
          body: JSON.stringify({
            items: items.map((i) => ({ productId: i.productId, size: i.size, toppings: i.toppings, qty: i.qty })),
            ...(couponCode ? { couponCode } : {}),
          }),
        });
        if (res.status === 401) return sessionExpired();
        const order = await res.json();
        if (!res.ok) throw new Error(errorMessage(order, 'Không tạo được đơn hàng'));
        pendingOrder.current = { id: order.id, signature };
        payKey.current = null; // đơn mới -> key mới
      }
      const orderId = pendingOrder.current.id;

      // 2. Thanh toán (POST /payments – TV6) kèm Idempotency-Key; KHÔNG gửi số tiền
      payKey.current ??= newKey();
      let res: Response;
      try {
        res = await fetch(`${API_URL}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': payKey.current, ...authHeader(token) },
          body: JSON.stringify({ orderId, method, ...(simulateFailure ? { simulateFailure: true } : {}) }),
        });
      } catch {
        throw new Error('Mất kết nối khi thanh toán. Bấm "Xác nhận trả" lại – sẽ không bị trừ tiền 2 lần.');
      }
      payKey.current = null; // đã có phản hồi -> lượt bấm sau dùng key mới
      if (res.status === 401) return sessionExpired();
      const payment = (await res.json()) as Payment;
      if (!res.ok) throw new Error(errorMessage(payment, 'Thanh toán thất bại'));

      if (payment.status !== 'SUCCESS') {
        // US-05: đơn PAYMENT_FAILED, giữ nguyên giỏ hàng
        setError(`Thanh toán lỗi${payment.failureReason ? `: ${payment.failureReason}` : ''}. Giỏ hàng vẫn được giữ nguyên, bấm "Xác nhận trả" để thử lại.`);
        return;
      }

      // 3. Thành công: xóa giỏ, sang màn (5) Xác nhận đơn (TV5)
      pendingOrder.current = null;
      clear();
      router.push(`/orders/${orderId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không kết nối được máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const methods: { value: Method; label: string; note: string }[] = [
    { value: 'WALLET', label: 'Ví điện tử', note: 'Trả qua ví (giả lập)' },
    { value: 'CARD', label: 'Thẻ ngân hàng', note: 'Thẻ nội địa hoặc quốc tế (giả lập)' },
  ];

  // TV6 – Điện thoại: xếp dọc, nút "Xác nhận trả" cố định ở đáy. Máy tính: tùy chọn bên trái, đơn hàng bên phải
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-14 md:pt-8">
      <Link href="/cart" className="text-sm font-medium text-muted hover:text-espresso">
        ← Giỏ hàng
      </Link>
      <h1 className="mt-3 text-2xl font-bold md:text-3xl">Thanh toán</h1>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_380px] md:items-start md:gap-10">
        <div className="space-y-6">
          <fieldset className="rounded-2xl border border-line bg-white p-5">
            <legend className="sr-only">Phương thức thanh toán</legend>
            <p className="font-semibold">Phương thức</p>
            <div className="mt-3 space-y-2">
              {methods.map((m) => (
                <label
                  key={m.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition active:scale-[0.99] ${
                    method === m.value ? 'border-leaf bg-leaf-soft' : 'border-line hover:border-leaf'
                  }`}
                >
                  <input
                    type="radio"
                    name="method"
                    checked={method === m.value}
                    onChange={() => setMethod(m.value)}
                    className="h-4 w-4 accent-leaf"
                  />
                  <span className="flex-1">
                    <span className="block font-medium">{m.label}</span>
                    <span className="block text-sm text-muted">{m.note}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">Không dùng tiền mặt</p>
          </fieldset>

          <div className="rounded-2xl border border-line bg-white p-5">
            {/* Mã giảm giá – component của TV2 */}
            <CouponInput subtotal={subtotal} onApply={handleCoupon} />
          </div>

          {/* Chỉ để demo tiêu chí "thanh toán lỗi" của US-05 với cổng thanh toán giả lập */}
          <label className="flex items-center gap-2 px-1 text-sm text-muted">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(e) => setSimulateFailure(e.target.checked)}
              className="h-4 w-4 accent-leaf"
            />
            (Demo) Giả lập cổng thanh toán từ chối
          </label>
        </div>

        <aside className="rounded-2xl border border-line bg-white p-5 md:sticky md:top-24">
          <p className="font-semibold">Đơn của bạn</p>
          <ul className="mt-3 space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.key} className="flex justify-between gap-3">
                <span>
                  {i.name} <span className="text-muted">· {i.size} × {i.qty}</span>
                </span>
                <span className="shrink-0 tabular-nums">{vnd(i.unitPrice * i.qty)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
            <p className="flex justify-between text-muted">
              <span>Tạm tính</span>
              <span className="tabular-nums">{vnd(subtotal)}</span>
            </p>
            {discount > 0 && (
              <p className="flex justify-between text-leaf">
                <span>Giảm giá ({couponCode})</span>
                <span className="tabular-nums">−{vnd(discount)}</span>
              </p>
            )}
          </div>
          <p className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
            <span className="font-semibold">Tổng</span>
            <span className="text-2xl font-bold tabular-nums">{vnd(total)}</span>
          </p>

          {error && (
            <p role="alert" className="mt-4 animate-rise rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
              {error}
            </p>
          )}

          {/* Điện thoại: nút cố định ở đáy. Máy tính: nút nằm trong khung đơn hàng */}
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white p-4 md:static md:mt-5 md:border-0 md:p-0">
            <button
              type="button"
              onClick={handlePay}
              disabled={loading}
              className="flex w-full items-center justify-between rounded-xl bg-leaf px-5 py-3.5 font-semibold text-white transition hover:bg-leaf-dark active:scale-[0.98] disabled:opacity-60"
            >
              <span>{loading ? 'Đang xử lý...' : 'Xác nhận trả'}</span>
              <span className="tabular-nums">{vnd(total)}</span>
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
