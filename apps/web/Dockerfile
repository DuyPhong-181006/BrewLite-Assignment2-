# TV1 – Image Next.js: dùng cho docker compose local và server AWS EC2 (CD build với NEXT_PUBLIC_API_URL=/api, xem docs/deployment.md)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
# Địa chỉ API được "đóng" vào code lúc build -> truyền bằng build arg
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# output: "standalone" -> chỉ cần thư mục standalone + file tĩnh, không cần cài lại node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
