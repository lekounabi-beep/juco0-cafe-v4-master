'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { EspressoBackground } from '@/components/EspressoBackground';
import { ADMIN_AUTH } from '@/config/admin-auth';
import { setAdminSession } from '@/lib/auth/admin-session';

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [invalidFields, setInvalidFields] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInvalidFields(false);

    if (!username || !password) {
      setError('Please fill in all fields');
      triggerInvalid();
      return;
    }

    setLoading(true);

    const valid =
      username === ADMIN_AUTH.username && password === ADMIN_AUTH.password;

    if (valid) {
      setAdminSession();
      router.push('/admin');
      return;
    }

    setError('Wrong credentials');
    triggerInvalid();
    setLoading(false);
  };

  const triggerInvalid = () => {
    setInvalidFields(true);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const inputClass = (invalid: boolean) =>
    `w-full rounded-xl border px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 transition-colors ${
      invalid
        ? 'border-red-500/60 bg-red-500/10 focus:border-red-500/80 focus:ring-red-500/20'
        : 'border-white/10 bg-white/5 focus:border-white/20 focus:ring-white/10'
    }`;

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-lg font-semibold text-white">Admin Login</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-8">
        <div className={`space-y-4 ${shake ? 'admin-login-shake' : ''}`}>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/90">
              Admin Access
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">Admin Login</h2>
            <p className="mt-1 text-sm text-white/60">
              Enter credentials to access dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-username" className="mb-2 block text-sm font-medium text-white/80">
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setInvalidFields(false);
                }}
                placeholder="Admin"
                autoComplete="username"
                className={inputClass(invalidFields)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-2 block text-sm font-medium text-white/80">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setInvalidFields(false);
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                className={inputClass(invalidFields)}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </main>

      <style jsx global>{`
        @keyframes admin-login-shake-keyframes {
          0%,
          100% {
            transform: translateX(0);
          }
          20%,
          60% {
            transform: translateX(-6px);
          }
          40%,
          80% {
            transform: translateX(6px);
          }
        }
        .admin-login-shake {
          animation: admin-login-shake-keyframes 0.45s ease-in-out;
        }
      `}</style>
    </div>
  );
}
