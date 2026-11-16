'use client';

import { useEffect, useState } from 'react';
import ProductCard, { type Product } from '../components/ProductCard';
import CartBadge from '../components/CartBadge';
import IceBanner from '../components/IceBanner';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Gọi GET /products – lỗi mạng hoặc server lỗi đều báo về cùng một câu
async function loadProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/products`);
  if (!res.ok) throw new Error();
  return (await res.json()) as Product[];
}

// TV2 – Màn Menu (FR-01): điện thoại 1 cột, máy tính bảng 3 cột, laptop 4 cột
export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadProducts()
      .then(setProducts)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const retry = () => {
    setLoading(true);
    setError(false);
    loadProducts()
      .then(setProducts)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  return (
    <>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-14 md:pt-10">
        <div className="mb-6 md:mb-8">
          <IceBanner>
            <h1 className="text-3xl font-bold md:text-5xl">Hôm nay uống gì?</h1>
            <p className="mt-2 text-muted md:mt-3 md:text-lg">Chọn món, chỉnh size và topping, trả bằng ví điện tử hoặc thẻ.</p>
          </IceBanner>
        </div>

        {loading && (
          <ul aria-label="Đang tải menu" className="grid gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="h-24 animate-pulse rounded-2xl bg-line/60 md:h-80" />
            ))}
          </ul>
        )}

        {!loading && error && (
          <div role="alert" className="rounded-2xl border border-danger/30 bg-danger-soft p-5 text-danger">
            <p className="font-semibold">Không tải được menu.</p>
            <p className="mt-1 text-sm">Kiểm tra kết nối rồi thử lại.</p>
            <button
              type="button"
              onClick={retry}
              className="mt-4 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white"
            >
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <p className="rounded-2xl border border-line bg-white p-8 text-center text-muted">
            Chưa có món nào trong menu.
          </p>
        )}

        {!loading && !error && products.length > 0 && (
          <ul className="grid gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {products.map((product, i) => (
              // Món hiện lần lượt từ trên xuống khi vừa tải xong menu
              <li key={product.id} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Điện thoại: nút giỏ hàng cố định ở đáy (wireframe 1). Máy tính đã có nút Giỏ hàng trên thanh đầu trang */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white p-4 md:hidden">
        <CartBadge />
      </div>
    </>
  );
}
