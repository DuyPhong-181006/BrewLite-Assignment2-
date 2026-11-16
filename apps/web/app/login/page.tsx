'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { loginRequest, useAuth } from '@/store/auth';
import { useCart } from '@/store/cart';
import AuthShowcase from '@/components/AuthShowcase';

// TV5 – Trang đăng nhập (Task 7). Đăng nhập xong: đang có giỏ hàng -> đi thanh toán, không thì về Menu
export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { accessToken, user } = await loginRequest(email.trim(), password);
      setAuth(accessToken, user);
      router.push(useCart.getState().items.length > 0 ? '/checkout' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-8 md:py-14">
      <div className="overflow-hidden rounded-3xl border border-line bg-white md:grid md:grid-cols-2">
        <AuthShowcase />
        <div className="p-6 md:p-10">
          <h1 className="text-2xl font-bold">Đăng nhập</h1>
          <p className="mt-1 text-sm text-muted">Đăng nhập để thanh toán và xem lịch sử đơn.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              />
            </label>
            <label className="block text-sm font-medium">
              Mật khẩu
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              />
            </label>

            {error && (
              <p role="alert" className="animate-rise rounded-xl bg-danger-soft p-3 text-sm text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-leaf py-3 font-semibold text-white transition hover:bg-leaf-dark active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm">
            Chưa có tài khoản?{' '}
            <Link href="/register" className="font-semibold text-leaf hover:underline">
              Đăng ký
            </Link>
          </p>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted">Tài khoản demo: demo@brewlite.vn / 123456</p>
    </main>
  );
}
