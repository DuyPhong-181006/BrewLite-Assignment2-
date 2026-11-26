#!/usr/bin/env bash
# TV1 – Deploy (hoặc rollback) BrewLite trên server AWS EC2 về đúng 1 commit SHA.
#   bash deploy/deploy.sh <commit-sha>
# Pipeline CD gọi script này qua SSH; workflow Rollback gọi lại với SHA cũ.
# Các bước: git lấy đúng phiên bản cấu hình -> kéo image :<sha> từ GHCR -> khởi động lại -> ghi lại SHA đang chạy.
# Migration chạy khi container API khởi động (prisma migrate deploy, xem apps/api/Dockerfile).

# Bọc trong hàm: bash đọc hết script trước khi chạy, nên git checkout đổi file này giữa chừng cũng không sao.
main() {
  set -euo pipefail
  local tag="${1:?Thiếu commit SHA. Dùng: bash deploy/deploy.sh <commit-sha>}"
  cd "$(dirname "$0")/.."
  local compose="docker compose -f docker-compose.prod.yml"

  if [ ! -f .env ]; then
    echo "Chưa có file .env. Chạy bash deploy/setup-ec2.sh trước." >&2
    exit 1
  fi

  local prev=""
  [ -f .deployed_tag ] && prev=$(cat .deployed_tag)
  echo "Đang chạy: ${prev:-chưa có}. Deploy: $tag"

  # Lấy đúng phiên bản docker-compose.prod.yml và Caddyfile của commit cần deploy
  git fetch --quiet origin
  git checkout --quiet --detach "$tag"

  sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=$tag|" .env
  $compose pull api web
  $compose up -d --no-build --remove-orphans

  echo "$prev" > .previous_tag
  echo "$tag" > .deployed_tag

  # Dọn image cũ để không đầy ổ đĩa (image cũ vẫn còn trên GHCR, rollback sẽ kéo lại)
  docker image prune -af > /dev/null || true
  $compose ps
}

main "$@"
