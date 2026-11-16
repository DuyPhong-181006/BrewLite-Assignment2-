'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { cartCount, cartTotal, useCart } from '@/store/cart';

const formatVnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';

// TV4 – Nút "Xem giỏ hàng (n)" ở đáy màn (1) Menu trên điện thoại – theo wireframe Mục 7
export default function CartBadge() {
  const items = useCart((s) => s.items);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const count = mounted ? cartCount(items) : 0;
  const total = mounted ? cartTotal(items) : 0;

  return (
    <Link
      href="/cart"
      className="flex w-full items-center justify-between rounded-xl bg-leaf px-5 py-3.5 font-semibold text-white transition hover:bg-leaf-dark active:scale-[0.98]"
    >
      <span>Xem giỏ hàng ({count})</span>
      {count > 0 && <span className="tabular-nums">{formatVnd(total)}</span>}
    </Link>
  );
}
