import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductCard from '@/components/ProductCard';

// UI-T01 – Thẻ món hiển thị đúng tên, giá định dạng VND và dẫn tới trang chi tiết (FR-01)
describe('ProductCard', () => {
  const product = {
    id: 3,
    name: 'Cappuccino',
    description: 'Espresso, sữa nóng và lớp bọt sữa mịn',
    price: 45000,
    imageUrl: '/images/cappuccino.jpg',
  };

  it('hiện tên, mô tả, ảnh có alt và giá 45.000đ', () => {
    render(<ProductCard product={product} />);
    expect(screen.getByRole('heading', { name: 'Cappuccino' })).toBeTruthy();
    expect(screen.getByText('Espresso, sữa nóng và lớp bọt sữa mịn')).toBeTruthy();
    expect(screen.getByAltText('Cappuccino')).toBeTruthy();
    // Giá hiện 2 lần: 1 cho điện thoại, 1 cho máy tính (CSS ẩn bớt 1)
    expect(screen.getAllByText('45.000đ').length).toBeGreaterThan(0);
  });

  it('bấm vào thẻ mở trang /products/3', () => {
    render(<ProductCard product={product} />);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/products/3');
  });
});
