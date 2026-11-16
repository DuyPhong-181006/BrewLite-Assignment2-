import type { MetadataRoute } from 'next';

// TV1 – Web App Manifest (NFR-03): cho phép "Thêm vào màn hình chính" trên điện thoại,
// mở lên như một ứng dụng riêng (không có thanh địa chỉ trình duyệt).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BrewLite – Đặt cà phê',
    short_name: 'BrewLite',
    description: 'Chọn đồ uống, chỉnh size và topping, thanh toán bằng ví điện tử hoặc thẻ.',
    start_url: '/',
    display: 'standalone',
    background_color: '#e7f6f6',
    theme_color: '#2f6b4f',
    lang: 'vi',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
