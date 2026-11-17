'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import { API_URL, authHeader, useAuth } from '@/store/auth';

// TV5 – Màn (5) Xác nhận đơn (Task 9, wireframe Mục 7): mã đơn, trạng thái, "Về trang chủ"
// Dữ liệu: GET /orders/:id (API của TV4) – cần đăng nhập

type OrderItem = { id: number; productName: string; size: string; toppings: string[]; qty: number; lineTotal: number };
type Order = {
  id: number;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  pointsEarned: number;
  items: OrderItem[];
};

const STATUS_TEXT: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PAYMENT_FAILED: 'Thanh toán lỗi',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng – mời lấy nước',
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

// Các bước của một đơn đã trả tiền (theo sơ đồ trạng thái Mục 9.1 của đề)
const STEPS = [
  { status: 'PAID', label: 'Đã trả tiền' },
  { status: 'PREPARING', label: 'Đang pha' },
  { status: 'READY', label: 'Sẵn sàng' },
  { status: 'COMPLETED', label: 'Hoàn tất' },
];

// Ly nước: đơn đã trả tiền thì nước được "rót" đầy dần rồi hiện dấu ✓; đơn khác thì ly rỗng màu xám
function FillingCup({ full }: { full: boolean }) {
  const body = 'M14 22 H66 L60.5 104 Q60 110 54 110 H26 Q20 110 19.5 104 Z';
  return (
    <div className="relative mx-auto h-28 w-24" aria-hidden>
      <svg viewBox="0 0 80 112" className="h-full w-full">
        <defs>
          <clipPath id="cup-body">
            <path d={body} />
          </clipPath>
        </defs>
        {full && (
          <g clipPath="url(#cup-body)">
            <rect
              x="0"
              y="34"
              width="80"
              height="78"
              className="animate-fill fill-leaf"
              style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
            />
          </g>
        )}
        <path d={body} fill="none" strokeWidth="4" className={full ? 'stroke-leaf' : 'stroke-muted'} />
        <rect x="9" y="13" width="62" height="9" rx="3" className={full ? 'fill-leaf' : 'fill-muted'} />
        <path d="M46 13 L52 2" strokeWidth="4" strokeLinecap="round" className={full ? 'stroke-leaf' : 'stroke-muted'} />
      </svg>
      {full && (
        <span className="absolute -bottom-1 -right-2 flex h-9 w-9 animate-pop items-center justify-center rounded-full border-4 border-white bg-crema text-sm font-bold text-white [animation-delay:1.4s]">
          ✓
        </span>
      )}
    </div>
  );
}
const subscribe = () => () => {};

function OrderConfirmContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false); // token lưu ở trình duyệt
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    let stopped = false;
    let loaded = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const load = () =>
      fetch(`${API_URL}/orders/${id}`, { headers: authHeader(token) })
        .then((res) => {
          if (res.status === 401) {
            useAuth.getState().logout(); // token hết hạn -> đăng nhập lại
            router.replace('/login');
            return null;
          }
          if (!res.ok) throw new Error();
          return res.json() as Promise<Order>;
        })
        .then((data) => {
          if (!data || stopped) return;
          loaded = true;
          setOrder(data);
          // Đơn đã xong hoặc đã hủy thì thôi hỏi lại
          if (data.status === 'COMPLETED' || data.status === 'CANCELLED') clearInterval(timer);
        })
        .catch(() => {
          if (!loaded && !stopped) setError('Không tìm thấy đơn hàng'); // lỗi mạng khi đang tự cập nhật thì bỏ qua
        });

    void load();
    // FR-13: nhân viên đổi trạng thái ở quầy (/staff) -> thanh tiến trình tự cập nhật mỗi 5 giây
    timer = setInterval(() => void load(), 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [mounted, token, id, router]);

  if (error) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16 text-center">
        <p className="text-lg font-semibold">{error}</p>
        <Link href="/orders" className="mt-6 inline-block rounded-xl bg-leaf px-5 py-2.5 font-semibold text-white hover:bg-leaf-dark">
          Xem đơn hàng của tôi
        </Link>
      </main>
    );
  }
  if (!order) return <p className="p-6 text-center text-muted">Đang tải đơn hàng...</p>;

  const paid = order.status === 'PAID';
  const step = STEPS.findIndex((st) => st.status === order.status); // -1: đơn chưa trả / lỗi / đã hủy

  // TV5 – Màn (5) Xác nhận: một khung giữa màn hình, giống nhau trên điện thoại và máy tính
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 md:py-14">
      <div className="rounded-2xl border border-line bg-white p-6 md:p-8">
        <div className="text-center">
          <FillingCup full={step >= 0} />
          <h1 className="mt-5 animate-rise text-2xl font-bold [animation-delay:150ms]">
            {paid ? 'Đặt hàng thành công' : step >= 0 ? 'Đơn hàng của bạn' : 'Thông tin đơn hàng'}
          </h1>
          <p className="mt-2 text-muted">
            Mã đơn <span className="font-semibold text-espresso">#{order.id}</span>
          </p>

          {step >= 0 ? (
            <ol aria-label="Tiến trình đơn hàng" className="mt-6 grid grid-cols-4">
              {STEPS.map((st, i) => {
                const reached = i <= step;
                return (
                  <li key={st.status} className="relative flex flex-col items-center">
                    {i > 0 && (
                      <span
                        aria-hidden
                        className={`absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2 ${reached ? 'bg-leaf' : 'bg-line'}`}
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${
                        reached ? 'border-leaf bg-leaf text-white' : 'border-line bg-white text-muted'
                      } ${i === step ? 'ring-4 ring-leaf/20' : ''}`}
                    >
                      {reached ? '✓' : i + 1}
                    </span>
                    <span
                      className={`mt-2 text-xs ${i === step ? 'font-semibold text-leaf' : reached ? '' : 'text-muted'}`}
                      aria-current={i === step ? 'step' : undefined}
                    >
                      {st.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <span
              className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                STATUS_STYLE[order.status] ?? 'bg-steam text-muted'
              }`}
            >
              {order.status} · {STATUS_TEXT[order.status] ?? order.status}
            </span>
          )}

          {paid && <p className="mt-5 font-medium">Mời tới quầy lấy nước</p>}
          {order.pointsEarned > 0 && <p className="mt-1 text-sm text-leaf">+{order.pointsEarned} điểm thưởng</p>}
        </div>

        <ul className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between gap-3">
              <span>
                {it.productName} <span className="text-muted">· {it.size} × {it.qty}</span>
              </span>
              <span className="shrink-0 tabular-nums">{vnd(it.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-line pt-3">
          {order.discount > 0 && (
            <p className="flex justify-between text-sm text-leaf">
              <span>Giảm giá</span>
              <span className="tabular-nums">−{vnd(order.discount)}</span>
            </p>
          )}
          <p className="flex items-baseline justify-between">
            <span className="font-semibold">Tổng</span>
            <span className="text-xl font-bold tabular-nums">{vnd(order.total)}</span>
          </p>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Link href="/orders" className="rounded-xl border border-line py-3 text-center font-medium hover:border-leaf">
            Lịch sử đơn hàng
          </Link>
          <Link href="/" className="rounded-xl bg-leaf py-3 text-center font-semibold text-white hover:bg-leaf-dark">
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}

// Next.js 16 (cacheComponents): useParams() phải nằm trong <Suspense>, nếu không `next build` báo lỗi prerender
export default function OrderConfirmPage() {
  return (
    <Suspense fallback={<p className="p-6 text-center text-muted">Đang tải đơn hàng...</p>}>
      <OrderConfirmContent />
    </Suspense>
  );
}
