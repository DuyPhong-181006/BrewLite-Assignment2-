'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { cartCount, useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';

const subscribe = () => () => {};

// TV1 – Thanh trên cùng dùng chung cho mọi trang
export default function SiteHeader() {
  const items = useCart((s) => s.items);
  // Giỏ hàng và đăng nhập lưu ở trình duyệt -> chỉ đọc sau khi trang đã chạy trên trình duyệt
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const count = mounted ? cartCount(items) : 0;
  const token = useAuth((s) => s.token);
  const loggedIn = mounted && token !== null;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 md:h-16 md:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight text-leaf md:text-xl">
          BrewLite
        </Link>

        <nav aria-label="Điều hướng chính" className="flex items-center gap-1.5 text-sm font-semibold md:gap-2">
          <Link href="/" className="hidden rounded-full bg-leaf-soft px-3.5 py-2 text-leaf transition-colors hover:bg-leaf hover:text-white md:inline-block">
            Menu
          </Link>
          {/* Đã đăng nhập: hiện "Đơn hàng". Chưa đăng nhập: hiện "Đăng nhập" (đơn hàng gắn với tài khoản) */}
          {loggedIn && (
            <Link href="/orders" className="rounded-full bg-leaf-soft px-3.5 py-2 text-leaf transition-colors hover:bg-leaf hover:text-white">
              Đơn hàng
            </Link>
          )}
          {mounted && !loggedIn && (
            <Link href="/login" className="rounded-full bg-leaf-soft px-3.5 py-2 text-leaf transition-colors hover:bg-leaf hover:text-white">
              Đăng nhập
            </Link>
          )}
          <Link
            href="/cart"
            className="ml-1 inline-flex items-center gap-2 rounded-full bg-leaf py-2 pl-4 pr-2 font-semibold text-white transition-colors hover:bg-leaf-dark active:scale-95"
          >
            Giỏ hàng
            {/* key={count}: mỗi lần số ly đổi thì ô số được vẽ lại -> chạy hiệu ứng nảy, báo cho khách biết đã thêm vào giỏ */}
            <span
              key={count}
              className={`min-w-6 rounded-full bg-white/20 px-1.5 text-center tabular-nums ${count > 0 ? 'animate-bump' : ''}`}
              aria-label={`${count} ly`}
            >
              {count}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
