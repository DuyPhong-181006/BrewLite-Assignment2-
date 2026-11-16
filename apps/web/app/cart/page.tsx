'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { cartCount, cartTotal, MAX_QTY, useCart } from '@/store/cart';

const formatVnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';

// TV4 – Màn (3) Giỏ hàng – theo wireframe Mục 7.
// Điện thoại: danh sách món + nút Thanh toán cố định ở đáy. Máy tính: danh sách bên trái, khung tổng tiền bên phải.
export default function CartPage() {
  const items = useCart((s) => s.items);
  const updateQty = useCart((s) => s.updateQty);
  const remove = useCart((s) => s.remove);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!mounted) return <p className="p-6 text-center text-muted">Đang tải giỏ hàng...</p>;

  const total = cartTotal(items);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-14 md:pt-10">
      <h1 className="text-2xl font-bold md:text-3xl">Giỏ hàng</h1>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line bg-white px-6 py-12 text-center">
          <p className="text-lg font-semibold">Giỏ hàng đang trống</p>
          <p className="mt-1 text-muted">Chọn món ở menu để bắt đầu.</p>
          <Link href="/" className="mt-6 inline-block rounded-xl bg-leaf px-5 py-2.5 font-semibold text-white transition hover:bg-leaf-dark active:scale-[0.98]">
            Xem menu
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_340px] md:items-start md:gap-10">
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
            {items.map((item) => {
              // Hiện TÊN topping; món cũ lưu trước khi có toppingNames thì hiện tạm mã
              const toppings = item.toppingNames ?? item.toppings;
              return (
                <li key={item.key} className="flex animate-rise flex-wrap items-center gap-x-4 gap-y-3 p-4 md:flex-nowrap">
                  <div className="min-w-0 basis-full md:basis-auto md:flex-1">
                    <p className="font-semibold">
                      {item.name} <span className="font-normal text-muted">· Size {item.size}</span>
                    </p>
                    {toppings.length > 0 && <p className="text-sm text-muted">+ {toppings.join(', ')}</p>}
                    <p className="mt-0.5 text-sm tabular-nums text-muted">{formatVnd(item.unitPrice)} / ly</p>
                  </div>

                  <div className="flex items-center gap-1" role="group" aria-label={`Số lượng ${item.name}`}>
                    <button
                      type="button"
                      onClick={() => updateQty(item.key, item.qty - 1)}
                      aria-label="Giảm 1 ly"
                      className="h-9 w-9 rounded-lg border border-line text-lg transition hover:border-leaf hover:bg-leaf-soft active:scale-90"
                    >
                      −
                    </button>
                    {/* key: số lượng đổi thì nảy nhẹ */}
                    <span key={item.qty} className="w-8 animate-bump text-center font-semibold tabular-nums">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.key, item.qty + 1)}
                      disabled={item.qty >= MAX_QTY}
                      aria-label="Thêm 1 ly"
                      className="h-9 w-9 rounded-lg border border-line text-lg transition hover:border-leaf hover:bg-leaf-soft active:scale-90 disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-transparent"
                    >
                      +
                    </button>
                  </div>

                  <p className="ml-auto w-24 text-right font-semibold tabular-nums">{formatVnd(item.unitPrice * item.qty)}</p>

                  <button
                    type="button"
                    onClick={() => remove(item.key)}
                    className="text-sm font-medium text-danger hover:underline"
                  >
                    Xóa
                  </button>
                </li>
              );
            })}
          </ul>

          <aside className="rounded-2xl border border-line bg-white p-5 md:sticky md:top-24">
            <div className="flex justify-between text-muted">
              <span>Số ly</span>
              <span className="tabular-nums">{cartCount(items)}</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
              <span className="font-semibold">Tổng</span>
              <span className="text-2xl font-bold tabular-nums">{formatVnd(total)}</span>
            </div>
            <p className="mt-1 text-xs text-muted">Mã giảm giá nhập ở bước thanh toán.</p>

            {/* Điện thoại: nút cố định ở đáy. Máy tính: nút nằm trong khung tổng tiền */}
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white p-4 md:static md:mt-5 md:border-0 md:p-0">
              <Link
                href="/checkout"
                className="flex w-full items-center justify-between rounded-xl bg-leaf px-5 py-3.5 font-semibold text-white transition hover:bg-leaf-dark active:scale-[0.98]"
              >
                <span>Thanh toán</span>
                <span className="tabular-nums">{formatVnd(total)}</span>
              </Link>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
