'use client';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '../../../store/cart';

// Địa chỉ backend: mặc định localhost, đổi được bằng NEXT_PUBLIC_API_URL (vd khi mở bằng điện thoại cùng Wi-Fi)
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface SizeOption {
  code: 'S' | 'M' | 'L';
  label: string;
  extraPrice: number;
}

interface ToppingOption {
  code: string;
  name: string;
  price: number;
}

interface ProductDetailData {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl: string;
  sizes?: SizeOption[];
  toppings?: ToppingOption[];
}

const DEFAULT_SIZES: SizeOption[] = [
  { code: 'S', label: 'S', extraPrice: 0 },
  { code: 'M', label: 'M', extraPrice: 5000 },
  { code: 'L', label: 'L', extraPrice: 10000 },
];

const DEFAULT_TOPPINGS: ToppingOption[] = [
  { code: 'PEARL', name: 'Trân châu', price: 5000 },
  { code: 'CHEESE_FOAM', name: 'Kem cheese', price: 8000 }, // mã phải khớp CSDL (seed)
];

// Cốc vẽ bằng SVG cho nút chọn size: S nhỏ, M vừa, L lớn. Cốc đang chọn được "rót" đầy màu xanh.
const CUP_HEIGHT = { S: 30, M: 38, L: 46 } as const;
const CUP_BODY = 'M8 13 H32 L29.5 51 Q29.3 54 26.5 54 H13.5 Q10.7 54 10.5 51 Z';

function CupIcon({ size, active }: { size: 'S' | 'M' | 'L'; active: boolean }) {
  const h = CUP_HEIGHT[size];
  const clipId = `cup-${size}`;
  return (
    <svg width={(h * 40) / 56} height={h} viewBox="0 0 40 56" aria-hidden className="mx-auto">
      <defs>
        <clipPath id={clipId}>
          <path d={CUP_BODY} />
        </clipPath>
      </defs>
      {/* nước trong cốc: dâng lên khi chọn, rút xuống khi bỏ chọn */}
      <g clipPath={`url(#${clipId})`}>
        <rect
          x="0"
          y="22"
          width="40"
          height="34"
          className={`fill-leaf transition-transform duration-500 ease-out ${active ? 'scale-y-100' : 'scale-y-0'}`}
          style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
        />
      </g>
      <path d={CUP_BODY} fill="none" strokeWidth="2.5" className={active ? 'stroke-leaf' : 'stroke-muted'} />
      {/* nắp và ống hút */}
      <rect x="5" y="8" width="30" height="5" rx="2" className={active ? 'fill-leaf' : 'fill-muted'} />
      <path d="M23 8 L26 1" strokeWidth="2.5" strokeLinecap="round" className={active ? 'stroke-leaf' : 'stroke-muted'} />
    </svg>
  );
}

function ProductDetailContent() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const addToCart = useCart((s) => s.add);

  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedSize, setSelectedSize] = useState<'S' | 'M' | 'L'>('S');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [addedNotice, setAddedNotice] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_URL}/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Không tìm thấy sản phẩm');
        return res.json();
      })
      .then((data: ProductDetailData) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Lỗi tải dữ liệu');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-10">
        <div className="grid gap-6 md:grid-cols-2 md:gap-10">
          <div className="aspect-square animate-pulse rounded-2xl bg-line/60" />
          <div className="space-y-3">
            <div className="h-9 w-2/3 animate-pulse rounded-lg bg-line/60" />
            <div className="h-5 w-full animate-pulse rounded-lg bg-line/60" />
          </div>
        </div>
        <p className="sr-only">Đang tải món...</p>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16 text-center">
        <p className="text-lg font-semibold">{error || 'Không tìm thấy sản phẩm'}</p>
        <p className="mt-1 text-muted">Món này có thể đã ngừng bán. Hãy chọn món khác trong menu.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-leaf px-5 py-2.5 font-semibold text-white hover:bg-leaf-dark">
          Về menu
        </Link>
      </main>
    );
  }

  const sizeOptions = product.sizes && product.sizes.length > 0 ? product.sizes : DEFAULT_SIZES;
  const toppingOptions = product.toppings && product.toppings.length > 0 ? product.toppings : DEFAULT_TOPPINGS;

  const currentSizeObj = sizeOptions.find((s) => s.code === selectedSize);
  const sizeExtra = currentSizeObj ? currentSizeObj.extraPrice : 0;

  const chosenToppingObjs = toppingOptions.filter((t) => selectedToppings.includes(t.code));
  const toppingExtra = chosenToppingObjs.reduce((sum, t) => sum + t.price, 0);

  const finalPrice = product.price + sizeExtra + toppingExtra;

  const toggleTopping = (code: string) => {
    setSelectedToppings((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]
    );
  };

  const handleAddToCart = () => {
    addToCart(
      {
        productId: product.id,
        name: product.name,
        size: selectedSize,
        toppings: chosenToppingObjs.map((t) => t.code),
        toppingNames: chosenToppingObjs.map((t) => t.name),
        unitPrice: finalPrice,
      },
      1
    );
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 1500);
  };

  const vnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  // TV3 – Màn (2) Chi tiết: điện thoại xếp dọc, máy tính chia 2 cột (ảnh trái, tùy chọn phải)
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-14 md:pt-8">
      <button type="button" onClick={() => router.back()} className="text-sm font-medium text-muted hover:text-espresso">
        ← Quay lại
      </button>

      <div className="mt-4 grid gap-6 md:grid-cols-2 md:gap-10 lg:gap-14">
        {product.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="aspect-square w-full animate-rise rounded-2xl bg-white object-cover md:sticky md:top-24"
          />
        )}

        <div>
          <h1 className="text-2xl font-bold md:text-4xl">{product.name}</h1>
          {product.description && <p className="mt-2 text-muted">{product.description}</p>}
          <p className="mt-4 text-2xl font-bold tabular-nums text-crema" aria-live="polite">
            {vnd(finalPrice)}
          </p>

          <fieldset className="mt-8">
            <legend className="font-semibold">Size</legend>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {sizeOptions.map((sizeOption) => {
                const active = selectedSize === sizeOption.code;
                return (
                  <button
                    key={sizeOption.code}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedSize(sizeOption.code)}
                    className={`flex flex-col items-center justify-end rounded-xl border px-3 pb-3 pt-4 text-center transition active:scale-95 ${
                      active ? 'border-leaf bg-leaf-soft text-leaf' : 'border-line bg-white hover:border-leaf'
                    }`}
                  >
                    <CupIcon size={sizeOption.code} active={active} />
                    <span className="mt-2 block text-lg font-bold leading-none">{sizeOption.code}</span>
                    <span className="mt-1 block text-xs text-muted">
                      {sizeOption.extraPrice > 0 ? `+${vnd(sizeOption.extraPrice)}` : 'Giá gốc'}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mt-8">
            <legend className="font-semibold">Topping</legend>
            <div className="mt-3 space-y-2">
              {toppingOptions.map((toppingOption) => {
                const isSelected = selectedToppings.includes(toppingOption.code);
                return (
                  <button
                    key={toppingOption.code}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleTopping(toppingOption.code)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition active:scale-[0.98] ${
                      isSelected ? 'border-leaf bg-leaf-soft' : 'border-line bg-white hover:border-leaf'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-colors ${
                        isSelected ? 'border-leaf bg-leaf text-white' : 'border-line bg-white'
                      }`}
                    >
                      {isSelected && <span className="animate-pop">✓</span>}
                    </span>
                    <span className="flex-1">{toppingOption.name}</span>
                    <span className="text-sm tabular-nums text-muted">+{vnd(toppingOption.price)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <p role="status" className="mt-6 min-h-6 text-sm font-medium text-leaf">
            {addedNotice && <span className="inline-block animate-rise">✓ Đã thêm vào giỏ hàng</span>}
          </p>

          {/* Điện thoại: nút cố định ở đáy màn hình. Máy tính: nút nằm ngay dưới tùy chọn */}
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white p-4 md:static md:mt-2 md:border-0 md:bg-transparent md:p-0">
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex w-full items-center justify-between rounded-xl bg-leaf px-5 py-3.5 font-semibold text-white transition hover:bg-leaf-dark active:scale-[0.98] md:max-w-sm"
            >
              <span>Thêm vào giỏ</span>
              <span className="tabular-nums">{vnd(finalPrice)}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
export default function ProductDetail() {
  return (
    <Suspense fallback={<p className="p-6 text-center text-muted">Đang tải...</p>}>
      <ProductDetailContent />
    </Suspense>
  );
}