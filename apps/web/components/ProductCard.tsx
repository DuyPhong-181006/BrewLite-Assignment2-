import Link from 'next/link';

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl: string;
}

const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

// TV2 – Thẻ món: điện thoại là 1 hàng (ảnh nhỏ bên trái), máy tính là thẻ dọc ảnh vuông lớn
export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-3 transition duration-200 hover:-translate-y-0.5 hover:border-leaf hover:shadow-[0_12px_28px_-16px_rgba(47,107,79,0.45)] active:scale-[0.99] md:h-full md:flex-col md:items-stretch md:gap-0 md:overflow-hidden md:p-0"
    >
      {/* Rê chuột vào thẻ: ảnh phóng to nhẹ trong khung */}
      <div className="shrink-0 overflow-hidden rounded-xl bg-steam md:rounded-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-20 w-20 object-cover transition-transform duration-300 group-hover:scale-105 md:aspect-square md:h-auto md:w-full"
        />
      </div>
      <div className="min-w-0 flex-1 md:flex md:flex-col md:p-4">
        <h3 className="font-semibold transition-colors group-hover:text-leaf">{product.name}</h3>
        {product.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{product.description}</p>}
        <p className="mt-auto hidden pt-3 font-bold tabular-nums text-crema md:block">
          {formatPrice(product.price)}
        </p>
      </div>
      <p className="shrink-0 font-bold tabular-nums text-crema md:hidden">{formatPrice(product.price)}</p>
    </Link>
  );
}
