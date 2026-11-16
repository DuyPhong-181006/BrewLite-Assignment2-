/* eslint-disable @next/next/no-img-element */

// TV5 – Khung giới thiệu quán bên cạnh form Đăng nhập / Đăng ký.
// Điện thoại: dải màu xanh phía trên form. Máy tính: nửa bên trái.
const DRINKS = [
  { src: '/images/ca-phe-sua.jpg', alt: 'Cà phê sữa' },
  { src: '/images/matcha-latte.jpg', alt: 'Matcha latte' },
  { src: '/images/tra-dao.jpg', alt: 'Trà đào' },
];

const PERKS = [
  'Chọn size, topping theo ý mình',
  'Trả bằng ví điện tử hoặc thẻ, không cần tiền mặt',
  'Cứ 10.000đ được 1 điểm thưởng',
];

export default function AuthShowcase() {
  return (
    <div className="bg-leaf px-6 py-7 text-white md:flex md:flex-col md:justify-between md:px-10 md:py-12">
      <div>
        <p className="text-sm font-semibold text-white/70">BrewLite</p>
        <h2 className="mt-2 text-2xl font-bold leading-snug md:text-3xl">
          Đặt trước, tới quầy là có nước.
        </h2>
      </div>

      <div className="mt-6 flex md:mt-10">
        {DRINKS.map((d, i) => (
          // Lớp ngoài chạy hiệu ứng "bật ra" lúc mở trang, lớp ảnh bên trong nghiêng khi rê chuột
          // (tách 2 lớp vì hiệu ứng mở trang giữ transform, sẽ đè mất hiệu ứng rê chuột nếu đặt chung)
          <span
            key={d.src}
            className={`animate-pop hover:z-10 ${i > 0 ? '-ml-4' : ''}`}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <img
              src={d.src}
              alt={d.alt}
              className="block h-20 w-20 rounded-full border-4 border-leaf bg-white object-cover transition-transform duration-300 hover:-translate-y-1.5 hover:-rotate-6 md:h-28 md:w-28"
            />
          </span>
        ))}
      </div>

      <ul className="mt-8 hidden space-y-3 text-sm text-white/85 md:block">
        {PERKS.map((p) => (
          <li key={p} className="flex gap-3">
            <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs">
              ✓
            </span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
