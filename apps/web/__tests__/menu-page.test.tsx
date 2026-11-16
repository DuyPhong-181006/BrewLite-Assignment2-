import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Home from '@/app/page';

// UI-T02 → UI-T04 – Màn Menu có đủ 3 trạng thái: đang tải/có dữ liệu, rỗng, lỗi (FR-01, Task 4.3)
const mockFetch = (impl: () => Promise<unknown>) => {
  vi.stubGlobal('fetch', vi.fn(impl));
};

describe('Màn Menu', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('đang tải thì hiện khung chờ, tải xong hiện danh sách món', async () => {
    mockFetch(async () => ({
      ok: true,
      json: async () => [
        { id: 1, name: 'Cà phê sữa', price: 35000, imageUrl: '/images/ca-phe-sua.jpg' },
        { id: 2, name: 'Trà đào', price: 39000, imageUrl: '/images/tra-dao.jpg' },
      ],
    }));

    render(<Home />);
    expect(screen.getByLabelText('Đang tải menu')).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Cà phê sữa' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Trà đào' })).toBeTruthy();
  });

  it('menu rỗng thì báo "Chưa có món nào trong menu."', async () => {
    mockFetch(async () => ({ ok: true, json: async () => [] }));
    render(<Home />);
    expect(await screen.findByText('Chưa có món nào trong menu.')).toBeTruthy();
  });

  it('API lỗi thì báo lỗi và có nút "Thử lại"', async () => {
    mockFetch(async () => ({ ok: false, json: async () => ({}) }));
    render(<Home />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Không tải được menu.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy();
  });
});
