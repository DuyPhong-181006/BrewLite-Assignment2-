'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { API_URL, errorMessage, loginRequest, useAuth } from '@/store/auth';
import { useCart } from '@/store/cart';
import AuthShowcase from '@/components/AuthShowcase';

// TV5 – Trang đăng ký (Task 7). Đăng ký xong tự đăng nhập luôn
export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(errorMessage(data, 'Đăng ký thất bại')); // 409: email đã được đăng ký

      const { accessToken, user } = await loginRequest(email.trim(), password);
      setAuth(accessToken, user);
      router.push(useCart.getState().items.length > 0 ? '/checkout' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-8 md:py-14">
      <div className="overflow-hidden rounded-3xl border border-line bg-white md:grid md:grid-cols-2">
        <AuthShowcase />
        <div className="p-6 md:p-10">
          <h1 className="text-2xl font-bold">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-muted">Có tài khoản để đặt món, theo dõi đơn và tích điểm thưởng.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              Họ tên
              <input
                required
                maxLength={100}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              />
            </label>
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
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="password-hint"
                className="mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              />
              <span id="password-hint" className="mt-1 block text-xs font-normal text-muted">
                Ít nhất 8 ký tự
              </span>
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
              {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm">
            Đã có tài khoản?{' '}
            <Link href="/login" className="font-semibold text-leaf hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
