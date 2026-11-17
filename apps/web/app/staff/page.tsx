'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const KEY_STORAGE = 'brewlite-staff-key';

type Status = 'PAID' | 'PREPARING' | 'READY';
interface StaffOrder {
  id: number;
  status: Status;
  total: number;
  createdAt: string;
  items: { id: number; productName: string; size: string; toppings: string[]; qty: number }[];
}

// 3 cột của quầy: mỗi cột có 1 nút đẩy đơn sang bước kế tiếp (máy trạng thái FR-08)
const COLUMNS: { status: Status; title: string; next: string; action: string; tone: string }[] = [
  { status: 'PAID', title: 'Đã trả tiền', next: 'PREPARING', action: 'Bắt đầu pha', tone: 'bg-crema-soft text-crema' },
  { status: 'PREPARING', title: 'Đang pha', next: 'READY', action: 'Pha xong', tone: 'bg-steam text-leaf-dark' },
  { status: 'READY', title: 'Chờ khách lấy', next: 'COMPLETED', action: 'Khách đã lấy', tone: 'bg-leaf-soft text-leaf' },
];

const vnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';
const time = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

// sessionStorage: đóng tab là phải nhập lại mã nhân viên
const readKey = () => {
  try {
    return sessionStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
};
const saveKey = (k: string) => {
  try {
    if (k) sessionStorage.setItem(KEY_STORAGE, k);
    else sessionStorage.removeItem(KEY_STORAGE);
  } catch {
    // trình duyệt chặn lưu trữ: vẫn dùng được, chỉ là phải nhập lại khi tải lại trang
  }
};

const subscribe = () => () => {};

// TV3 – Phạm Tuấn (FR-13): màn quầy pha chế cho nhân viên – mở trên máy tính bảng ở quầy
export default function StaffPage() {
  // Mã lưu ở trình duyệt -> chỉ đọc sau khi trang chạy trên trình duyệt (tránh lệch khi render sẵn)
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [keyState, setKeyState] = useState<string | null>(null); // null = chưa nhập/thoát trong phiên này
  const staffKey = keyState ?? (mounted ? readKey() : '');
  const [input, setInput] = useState('');
  const [orders, setOrders] = useState<StaffOrder[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const logout = useCallback((message = '') => {
    saveKey('');
    setKeyState('');
    setOrders(null);
    setError(message);
  }, []);

  const load = useCallback(async () => {
    if (!staffKey) return;
    try {
      const res = await fetch(`${API_URL}/staff/orders`, { headers: { 'X-Staff-Key': staffKey } });
      if (res.status === 401) return logout('Mã nhân viên không đúng.');
      if (!res.ok) throw new Error();
      setOrders((await res.json()) as StaffOrder[]);
      setError('');
    } catch {
      setError('Không tải được danh sách đơn. Kiểm tra kết nối, hệ thống sẽ tự thử lại.');
    }
  }, [staffKey, logout]);

  // Tự tải lại mỗi 5 giây để thấy đơn mới khách vừa trả tiền
  useEffect(() => {
    if (!staffKey) return;
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [staffKey, load]);

  const advance = async (order: StaffOrder, next: string) => {
    setBusyId(order.id);
    try {
      const res = await fetch(`${API_URL}/staff/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Staff-Key': staffKey },
        body: JSON.stringify({ status: next }),
      });
      if (res.status === 401) return logout('Mã nhân viên không đúng.');
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? `Không cập nhật được đơn #${order.id}.`);
      }
    } catch {
      setError(`Không cập nhật được đơn #${order.id}. Kiểm tra kết nối rồi bấm lại.`);
    } finally {
      setBusyId(null);
      void load();
    }
  };

  if (!staffKey) {
    return (
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
        <h1 className="text-2xl font-bold">Quầy pha chế</h1>
        <p className="mt-1 text-sm text-muted">Nhập mã nhân viên để xem đơn cần pha.</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const k = input.trim();
            if (!k) return;
            saveKey(k);
            setKeyState(k);
            setError('');
          }}
        >
          <label className="block text-sm font-medium">
            Mã nhân viên
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">
              {error}
            </p>
          )}
          <button type="submit" className="w-full rounded-xl bg-leaf py-3 font-semibold text-white transition hover:bg-leaf-dark">
            Vào quầy
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-6 md:px-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Quầy pha chế</h1>
          <p className="text-sm text-muted">Tự cập nhật mỗi 5 giây. Đơn cũ nhất ở trên cùng.</p>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="rounded-full bg-danger-soft px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger hover:text-white"
        >
          Thoát
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">
          {error}
        </p>
      )}

      {orders === null ? (
        <p className="mt-10 text-center text-muted">Đang tải đơn...</p>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const list = orders.filter((o) => o.status === col.status);
            return (
              <section key={col.status} aria-label={col.title} className="rounded-2xl border border-line bg-white/70 p-3">
                <h2 className="flex items-center justify-between px-1 pb-2 font-semibold">
                  {col.title}
                  <span className={`rounded-full px-2.5 py-0.5 text-sm tabular-nums ${col.tone}`}>{list.length}</span>
                </h2>
                {list.length === 0 && <p className="px-1 py-6 text-center text-sm text-muted">Không có đơn.</p>}
                <ul className="space-y-3">
                  {list.map((o) => (
                    <li key={o.id} className="animate-rise rounded-xl border border-line bg-white p-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-lg font-bold">#{o.id}</span>
                        <span className="text-sm text-muted tabular-nums">{time(o.createdAt)}</span>
                      </div>
                      <ul className="mt-2 space-y-1 text-sm">
                        {o.items.map((i) => (
                          <li key={i.id}>
                            <span className="font-semibold tabular-nums">{i.qty}×</span> {i.productName}{' '}
                            <span className="rounded bg-steam px-1.5 text-xs font-semibold text-leaf-dark">{i.size}</span>
                            {i.toppings.length > 0 && <span className="block pl-5 text-muted">+ {i.toppings.join(', ')}</span>}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold tabular-nums text-crema">{vnd(o.total)}</span>
                        <button
                          type="button"
                          disabled={busyId === o.id}
                          onClick={() => void advance(o, col.next)}
                          className="rounded-xl bg-leaf px-4 py-2 text-sm font-semibold text-white transition hover:bg-leaf-dark active:scale-95 disabled:opacity-60"
                        >
                          {busyId === o.id ? 'Đang lưu...' : col.action}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
