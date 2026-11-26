# TV1 – Image của NestJS API. CD build image này, gắn tag = commit SHA, đẩy lên GHCR; server AWS EC2 (và Render) kéo về chạy.
# Local: docker compose up --build
FROM node:22-alpine

# Prisma cần thư viện openssl trên Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Cài thư viện trước để Docker cache lớp này khi chỉ sửa code
COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npx prisma generate && npm run build

# Commit SHA được CI truyền vào -> GET /health trả về để biết bản nào đang chạy
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
ENV NODE_ENV=production

EXPOSE 3001

# Khởi động: áp migration chưa chạy (an toàn, không xóa dữ liệu) -> nạp menu mẫu nếu RUN_SEED=true -> chạy server.
# migrate deploy lỗi thì container dừng, Render giữ bản cũ đang chạy (xem docs/deployment.md).
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$RUN_SEED\" = \"true\" ] && [ -f prisma/seed.ts ]; then npx prisma db seed; fi && node dist/main.js"]
