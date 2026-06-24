'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { isAdminSessionActive, clearAdminSession } from '@/lib/auth/admin-session';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const [checked, setChecked] = useState(isLoginPage);

  useEffect(() => {
    if (isLoginPage) {
      if (isAdminSessionActive()) {
        router.replace('/admin');
      }
      setChecked(true);
      return;
    }

    if (!isAdminSessionActive()) {
      router.replace('/admin/login');
      return;
    }

    setChecked(true);
  }, [isLoginPage, router]);

  const handleLogout = () => {
    clearAdminSession();
    router.push('/admin/login');
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="fixed right-4 top-4 z-50">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
      {children}
    </>
  );
}
