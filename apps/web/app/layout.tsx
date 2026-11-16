import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

// Font thiết kế cho tiếng Việt – dấu hiển thị đều, không bị lệch dòng
const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BrewLite – Đặt cà phê",
  description: "Chọn đồ uống, chỉnh size và topping, thanh toán bằng ví điện tử hoặc thẻ.",
  // PWA trên iPhone: mở từ màn hình chính như ứng dụng riêng
  appleWebApp: { capable: true, title: "BrewLite", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#2f6b4f",
  width: "device-width",
  initialScale: 1,
};

// TV1 – Khung chung cho mọi trang: thanh trên cùng + nội dung từng trang
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnam.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
