import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// TV5 – An Tường: lưu trạng thái đăng nhập (token JWT + thông tin người dùng)

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  loyaltyPoints: number;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'brewlite-auth' }, // lưu localStorage – tải lại trang vẫn còn đăng nhập
  ),
);

// Header gửi kèm mọi request cần đăng nhập: { Authorization: 'Bearer <token>' }
export const authHeader = (token: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

// Lấy câu báo lỗi NestJS trả về (message có thể là chuỗi hoặc mảng)
export const errorMessage = (data: unknown, fallback: string): string => {
  const msg = (data as { message?: string | string[] } | null)?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg || fallback;
};

// Gọi POST /auth/login – dùng chung cho trang đăng nhập và đăng ký
export async function loginRequest(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(errorMessage(data, 'Đăng nhập thất bại'));
  return data as { accessToken: string; user: AuthUser };
}
