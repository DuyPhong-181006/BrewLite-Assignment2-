import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_QTY, cartCount, cartTotal, useCart } from '@/store/cart';

// UNIT-T04 → UNIT-T07 – Giỏ hàng: gộp món trùng, giới hạn số ly, tính tổng tiền (FR-03)
const latte = {
  productId: 1,
  name: 'Cà phê sữa',
  size: 'M' as const,
  toppings: ['PEARL'],
  toppingNames: ['Trân châu'],
  unitPrice: 45000, // 35.000 + size M 5.000 + trân châu 5.000
};

describe('Giỏ hàng (store/cart.ts)', () => {
  beforeEach(() => {
    useCart.getState().clear();
  });

  it('thêm cùng món, cùng size, cùng topping 2 lần -> gộp thành 1 dòng', () => {
    useCart.getState().add(latte, 1);
    useCart.getState().add(latte, 2);
    const { items } = useCart.getState();
    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(3);
  });

  it('khác size -> thành 2 dòng riêng', () => {
    useCart.getState().add(latte, 1);
    useCart.getState().add({ ...latte, size: 'L', unitPrice: 50000 }, 1);
    expect(useCart.getState().items).toHaveLength(2);
  });

  it(`không cho vượt ${MAX_QTY} ly mỗi dòng, đặt số lượng 0 thì bỏ món`, () => {
    useCart.getState().add(latte, 15);
    useCart.getState().add(latte, 15);
    const key = useCart.getState().items[0].key;
    expect(useCart.getState().items[0].qty).toBe(MAX_QTY);

    useCart.getState().updateQty(key, 0);
    expect(useCart.getState().items).toHaveLength(0);
  });

  it('tổng tiền = đơn giá × số lượng, cộng tất cả các dòng', () => {
    useCart.getState().add(latte, 2); // 90.000
    useCart.getState().add({ ...latte, size: 'S', toppings: [], toppingNames: [], unitPrice: 35000 }, 1); // 35.000
    const { items } = useCart.getState();
    expect(cartTotal(items)).toBe(125000);
    expect(cartCount(items)).toBe(3);
  });
});
