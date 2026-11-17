'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { API_URL, authHeader, useAuth } from '@/store/auth';

// TV5 – Trang lịch sử đơn (Task 9): GET /orders/me (API của TV4) + điểm thưởng GET /loyalty/me

type OrderSummary = { id: number; status: string; total: number; createdAt: string };

const STATUS_TEXT: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PAYMENT_FAILED: 'Thanh toán lỗi',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};
// Màu nhãn trạng thái: xanh = đã trả/xong, vàng = đang chờ/đang làm, đỏ = lỗi/hủy
const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-crema-soft text-crema',
  PAID: 'bg-leaf-soft text-leaf',
  PAYMENT_FAILED: 'bg-danger-soft text-danger',
  PREPARING: 'bg-crema-soft text-crema',
  READY: 'bg-leaf-soft text-leaf',
  COMPLETED: 'bg-leaf-soft text-leaf',
  CANCELLED: 'bg-steam text-muted',
};
const vnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';
const subscribe = () => () => {};

export default function OrderHistoryPage() {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    const headers = authHeader(token);
    Promise.all([
      fetch(`${API_URL}/orders/me`, { headers }),
      fetch(`${API_URL}/loyalty/me`, { headers }),
    ])
      .then(async ([ordersRes, pointsRes]) => {
        if (ordersRes.status === 401) {
          useAuth.getState().logout();
          router.replace('/login');
          return;
        }
        if (!ordersRes.ok) throw new Error();
        setOrders((await ordersRes.json()) as OrderSummary[]);
        if (pointsRes.ok) setPoints(((await pointsRes.json()) as { loyaltyPoints: number }).loyaltyPoints);
      })
      .catch(() => setError('Không tải được lịch sử đơn hàng'));
  }, [mounted, token, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Đơn hàng của tôi</h1>
          {mounted && user && <p className="mt-1 text-muted">{user.name ?? user.email}</p>}
        </div>
        {mounted && user && (
          <div className="flex items-center gap-3">
            {points !== null && (
              <span className="rounded-full bg-leaf-soft px-3 py-1 text-sm font-semibold text-leaf">
                {points} điểm thưởng
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-danger-soft px-4 py-1.5 text-sm font-semibold text-danger transition hover:bg-danger hover:text-white active:scale-95"
            >
              Đăng xuất
            </button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-2xl bg-danger-soft p-4 text-danger">
          {error}
        </p>
      )}
      {!error && orders === null && <p className="mt-6 text-muted">Đang tải...</p>}
      {orders !== null && orders.length === 0 && (
        <div className="mt-6 rounded-2xl border border-line bg-white px-6 py-12 text-center">
          <p className="text-lg font-semibold">Bạn chưa có đơn hàng nào</p>
          <Link href="/" className="mt-6 inline-block rounded-xl bg-leaf px-5 py-2.5 font-semibold text-white hover:bg-leaf-dark">
            Xem menu
          </Link>
        </div>
      )}

      {orders !== null && orders.length > 0 && (
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-white">
          {orders.map((o, i) => (
            <li key={o.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <Link
                href={`/orders/${o.id}`}
                className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-steam md:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Đơn #{o.id}</p>
                  <p className="text-sm text-muted">{new Date(o.createdAt).toLocaleString('vi-VN')}</p>
                </div>
                <span
                  className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-block ${
                    STATUS_STYLE[o.status] ?? 'bg-steam text-muted'
                  }`}
                >
                  {STATUS_TEXT[o.status] ?? o.status}
                </span>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{vnd(o.total)}</p>
                  <p className="text-xs text-muted sm:hidden">{STATUS_TEXT[o.status] ?? o.status}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
