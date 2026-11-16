import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Chỉ khi build Docker (apps/web/Dockerfile đặt BUILD_STANDALONE=1): đóng gói tối giản, chạy bằng node server.js.
  // Chạy local (npm run dev / npm start) và Vercel thì giữ mặc định.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
