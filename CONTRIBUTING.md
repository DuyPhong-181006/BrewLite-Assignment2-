# Quy ước làm việc của nhóm BrewLite (Task 4.1)

## 1. Thành viên và phần phụ trách

| TV | Họ tên | Vai trò Scrum | Phụ trách chính |
|---|---|---|---|
| TV1 | Đào Duy Phong | Scrum Master, DevOps | Repo, CI/CD, Docker, health check, kiến trúc, deploy |
| TV2 | Lê Hữu Nhân | Product Owner | SRS, backlog, menu, seed, mã giảm giá, ma trận truy vết |
| TV3 | Phạm Tuấn | Developer | API sản phẩm, chi tiết món, tồn kho, máy trạng thái, migration |
| TV4 | Phạm Thành Danh | Developer | UC-01, activity diagram, giỏ hàng, đặt đơn |
| TV5 | An Tường | Developer | Class diagram, đăng nhập/JWT, xác nhận và lịch sử đơn, điểm thưởng, test E2E |
| TV6 | Nguyễn Tấn Sự | Developer | Sequence diagram, thanh toán, idempotency |

## 2. Chiến lược branch

- `main`: luôn chạy được và là bản được deploy. **Không push thẳng** – được bảo vệ bằng branch protection.
- Mỗi việc một nhánh tách từ `main` mới nhất, đặt tên `<loai>/<tv>-<mo-ta-ngan>`:
  - `docs/tv2-srs`, `feat/tv4-cart`, `fix/tv6-idempotency`, `ci/tv1-cd-pipeline`, `test/tv5-e2e`
- Xong việc → mở **Pull Request** vào `main` → CI xanh + 1 người duyệt → **Squash and merge** hoặc **Merge commit** → xóa nhánh.

```bash
git checkout main
git pull origin main
git checkout -b feat/tv4-cart
# ... sửa code ...
git add <các file của mình>
git commit -m "feat(cart): thêm giỏ hàng lưu trên trình duyệt (FR-03)"
git push -u origin feat/tv4-cart
# lên GitHub bấm "Compare & pull request"
```

### Branch protection cho `main` (TV1 cấu hình)

Settings → Branches → Add branch ruleset (hoặc Add rule) cho `main`:

- [x] Require a pull request before merging (1 approval)
- [x] Require status checks to pass: **`api`**, **`web`** (thêm **`e2e`** khi có workflow E2E)
- [x] Require branches to be up to date before merging
- [x] Block force pushes

## 3. Quy ước commit (Conventional Commits)

```
<loai>(<phạm vi>): <mô tả ngắn, tiếng Việt, không viết hoa đầu câu> (<mã yêu cầu>)
```

| Loại | Dùng khi | Ví dụ |
|---|---|---|
| `feat` | Thêm tính năng | `feat(menu): màn menu mobile-first có loading/empty/error (FR-01)` |
| `fix` | Sửa lỗi | `fix(payments): trả lại giao dịch cũ khi trùng Idempotency-Key (FR-10)` |
| `docs` | Tài liệu, sơ đồ | `docs(requirements): thêm SRS với FR/NFR và MoSCoW` |
| `test` | Thêm/sửa test | `test(e2e): luồng menu đến xác nhận đơn (E2E-T01)` |
| `ci` | Workflow CI/CD | `ci: thêm pipeline Install → Lint → Unit Test → Build` |
| `chore` | Cấu hình, thư viện | `chore(api): cập nhật package-lock` |
| `refactor` | Sửa cấu trúc, không đổi hành vi | `refactor(orders): tách hàm tính giá` |

Mỗi commit một ý; mô tả **vì sao** trong thân commit nếu cần. Thay đổi yêu cầu, sơ đồ, kiến trúc phải ghi lý do trong mô tả PR (Task 4.2).

## 4. Definition of Done

Một backlog item chỉ được coi là **Done** khi:

1. Code đã merge vào `main` qua Pull Request có ít nhất 1 người duyệt.
2. CI xanh: lint, unit test, build; integration/E2E liên quan cũng xanh.
3. Đạt mọi tiêu chí chấp nhận của yêu cầu trong `docs/requirements/srs.md`.
4. Có test tự động cho logic nghiệp vụ mới (unit hoặc integration).
5. Giao diện dùng được trên màn 360 px và laptop, có trạng thái loading/lỗi; API validate đầu vào và trả mã lỗi đúng.
6. Không có secret trong code; biến môi trường mới đã thêm vào `.env.example`.
7. Tài liệu liên quan đã cập nhật (README, sơ đồ, ma trận truy vết).
8. Đã chạy trên production (với tính năng Sprint 2) và smoke test qua.

## 5. File dùng chung – thứ tự merge

Các file sau nhiều người cùng sửa: `apps/api/src/app.module.ts`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/seed.ts`, `apps/web/components/SiteHeader.tsx`, `apps/web/app/page.tsx`. Quy tắc:

- Luôn `git pull origin main` ngay trước khi sửa và trước khi push.
- Merge theo thứ tự đã thống nhất trong Sprint Planning (xem `docs/scrum/product-backlog.md`).
- Chỉ TV3 tạo migration mới trong Sprint 1; thay đổi schema sau đó báo nhóm trước.

## 6. Chạy kiểm tra trước khi push

```bash
npm run lint --prefix apps/api && npm test --prefix apps/api
npm run lint --prefix apps/web && npm test --prefix apps/web && npm run build --prefix apps/web
```
