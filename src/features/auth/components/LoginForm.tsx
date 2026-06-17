/**
 * Login Form component
 */

'use client';

import { useState } from 'react';
import { useLogin } from '../hooks/useLogin';
import { signInWithGoogle } from '@/integrations/supabase/services/auth.service';
import { EspressoBackground } from '@/components/EspressoBackground';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

export function LoginForm() {
  const { login, loading } = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Παρακαλώ συμπληρώστε όλα τα πεδία');
      return;
    }

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href="/" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-lg font-semibold text-white">Σύνδεση</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-white/80">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-white/80">
              Κωδικός
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
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
                Σύνδεση...
              </span>
            ) : (
              'Σύνδεση'
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-black/40 px-2 text-white/60">ή</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {googleLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Σύνδεση με Google...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Συνέχεια με Google
              </span>
            )}
          </button>

          <div className="text-center">
            <p className="text-sm text-white/60">
              Δεν έχετε λογαριασμό;{' '}
              <Link href="/register" className="text-primary hover:underline">
                Εγγραφή
              </Link>
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
