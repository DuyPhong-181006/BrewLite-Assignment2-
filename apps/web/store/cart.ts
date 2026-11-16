import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Một món trong giỏ
export interface CartItem {
  key: string;        // mã riêng của dòng: sản phẩm + size + topping
  productId: number;
  name: string;
  size: 'S' | 'M' | 'L';
  toppings: string[];
  toppingNames: string[];
  unitPrice: number;  // giá 1 ly
  qty: number;        // số lượng
}

// Giỏ hàng có gì: danh sách món + 4 thao tác
interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, 'key' | 'qty'>, qty: number) => void;
  updateQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

// Tối đa 20 ly mỗi dòng – khớp @Max(20) trong create-order.dto.ts ở backend
export const MAX_QTY = 20;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      // Thêm món: đã có cùng món thì cộng số lượng (không quá MAX_QTY), chưa có thì thêm dòng mới
      add: (item, qty) =>
        set((state) => {
          const key = `${item.productId}-${item.size}-${item.toppings.join('+')}`;
          const existing = state.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === key ? { ...i, qty: Math.min(i.qty + qty, MAX_QTY) } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, key, qty: Math.min(qty, MAX_QTY) }] };
        }),

      // Sửa số lượng: về 0 thì bỏ món khỏi giỏ, không cho vượt MAX_QTY
      updateQty: (key, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.key !== key)
              : state.items.map((i) => (i.key === key ? { ...i, qty: Math.min(qty, MAX_QTY) } : i)),
        })),

      // Xóa 1 món
      remove: (key) => set((state) => ({ items: state.items.filter((i) => i.key !== key) })),

      // Xóa hết (dùng sau khi thanh toán thành công)
      clear: () => set({ items: [] }),
    }),
    { name: 'brewlite-cart' }, // lưu vào trình duyệt với tên này
  ),
);

// Tổng tiền và tổng số ly
export const cartTotal = (items: CartItem[]) => items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.qty, 0);