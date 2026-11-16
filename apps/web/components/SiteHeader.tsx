'use client';

import Link from 'next/link';

// TV1 – Thanh trên cùng dùng chung cho mọi trang
export default function SiteHeader() {

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
        </nav>
      </div>
    </header>
  );
}
