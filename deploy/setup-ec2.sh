#!/usr/bin/env bash
# TV1 – Cài đặt lần đầu cho server AWS EC2 (Ubuntu 22.04/24.04). Chạy 1 lần, sau khi git clone:
#   git clone https://github.com/DuyPhong-181006/BrewLite-Assignment2-.git brewlite
#   cd brewlite && bash deploy/setup-ec2.sh
# Việc script làm: cài Docker -> thêm 2 GB swap (máy 1 GB RAM) -> tạo file .env với mật khẩu ngẫu nhiên và IP của server.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 1/3 Cài Docker"
if ! command -v docker > /dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER"
sudo systemctl enable --now docker

echo "==> 2/3 Thêm 2 GB swap (tránh hết RAM trên máy 1 GB)"
if ! sudo swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile > /dev/null
  sudo swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
fi

echo "==> 3/3 Tạo file .env"
if [ -f .env ]; then
  echo "Đã có .env, giữ nguyên."
else
  cp deploy/.env.prod.example .env
  chmod 600 .env
  ip=$(curl -fsS --max-time 10 https://checkip.amazonaws.com | tr -d '[:space:]' || true)
  if [ -n "$ip" ]; then
    sed -i "s|^PUBLIC_URL=.*|PUBLIC_URL=https://${ip//./-}.sslip.io|" .env
  fi
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env
  sed -i "s|^STAFF_KEY=.*|STAFF_KEY=$(openssl rand -hex 6)|" .env
  echo "IP công khai của server: ${ip:-không lấy được, sửa PUBLIC_URL trong .env bằng tay}"
fi

echo
grep '^PUBLIC_URL=' .env
echo "Mã nhân viên cho /staff: $(grep '^STAFF_KEY=' .env | cut -d= -f2)"
echo
echo "Xong. Thoát SSH (exit) rồi SSH lại để dùng được lệnh docker không cần sudo."
echo "Chạy thử bằng tay: docker compose -f docker-compose.prod.yml up -d"
echo "Hoặc để pipeline CD tự deploy (xem docs/deployment.md mục 3)."
