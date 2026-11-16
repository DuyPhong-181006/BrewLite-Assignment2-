import type { ReactNode } from 'react';

// TV2 – Banner đầu trang Menu: nền xanh mát + đá viên trôi nhẹ (vẽ bằng SVG, không dùng ảnh ngoài)

type Cube = { x: number; y: number; s: number; r: number; d: number };

// Vị trí (x, y), cạnh (s), góc nghiêng (r) và độ trễ hiệu ứng (d, giây) của từng viên đá
const CUBES: Cube[] = [
  { x: 250, y: 30, s: 74, r: 14, d: 0 },
  { x: 330, y: 120, s: 58, r: -18, d: -2.2 },
  { x: 170, y: 140, s: 46, r: 28, d: -1.1 },
  { x: 345, y: 18, s: 34, r: -8, d: -3.4 },
  { x: 225, y: 185, s: 30, r: 40, d: -4.1 },
];

const BUBBLES = [
  { cx: 150, cy: 60, r: 5, d: -0.6 },
  { cx: 205, cy: 110, r: 3, d: -2.8 },
  { cx: 315, cy: 95, r: 4, d: -1.7 },
  { cx: 385, cy: 200, r: 6, d: -3.9 },
  { cx: 135, cy: 205, r: 3.5, d: -2.1 },
];

export default function IceBanner({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white bg-[linear-gradient(110deg,#f2fcfd_0%,#d4f1f5_45%,#9cdbe7_100%)] px-6 py-8 md:px-10 md:py-12">
      {/* Hiệu ứng trôi: lên xuống chậm, lặp lại. Máy bật "giảm chuyển động" thì đá đứng yên */}
      <style>{`
        @keyframes brewlite-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(3deg); }
        }
        .brewlite-ice { animation: brewlite-float 6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @media (prefers-reduced-motion: reduce) { .brewlite-ice { animation: none; } }
      `}</style>

      <svg
        aria-hidden
        viewBox="0 0 400 240"
        preserveAspectRatio="xMaxYMid meet"
        className="pointer-events-none absolute inset-y-0 right-0 h-full w-[80%] opacity-60 md:w-[55%] md:opacity-100"
      >
        <defs>
          <linearGradient id="ice-face" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#c9eef4" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#7cc9d9" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {CUBES.map((c, i) => (
          <g key={i} className="brewlite-ice" style={{ animationDelay: `${c.d}s` }}>
            <g transform={`rotate(${c.r} ${c.x + c.s / 2} ${c.y + c.s / 2})`}>
              {/* viền ngoài xanh đậm giúp viên đá nổi trên nền sáng */}
              <rect x={c.x} y={c.y} width={c.s} height={c.s} rx={c.s * 0.22} fill="none" stroke="#5fb6c9" strokeOpacity="0.45" strokeWidth="5" />
              <rect
                x={c.x}
                y={c.y}
                width={c.s}
                height={c.s}
                rx={c.s * 0.22}
                fill="url(#ice-face)"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              {/* vệt sáng trên mặt đá */}
              <path
                d={`M${c.x + c.s * 0.2} ${c.y + c.s * 0.62} Q${c.x + c.s * 0.22} ${c.y + c.s * 0.25} ${c.x + c.s * 0.58} ${c.y + c.s * 0.2}`}
                fill="none"
                stroke="#ffffff"
                strokeWidth={Math.max(2, c.s * 0.07)}
                strokeLinecap="round"
                opacity="0.9"
              />
            </g>
          </g>
        ))}

        {BUBBLES.map((b, i) => (
          <circle
            key={i}
            cx={b.cx}
            cy={b.cy}
            r={b.r}
            fill="#ffffff"
            fillOpacity="0.85"
            stroke="#7cc9d9"
            strokeOpacity="0.5"
            className="brewlite-ice"
            style={{ animationDelay: `${b.d}s` }}
          />
        ))}
      </svg>

      <div className="relative max-w-md">{children}</div>
    </section>
  );
}
