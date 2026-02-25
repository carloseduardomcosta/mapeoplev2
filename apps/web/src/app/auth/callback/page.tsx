'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = searchParams.get('token');
    const error = searchParams.get('error');

    console.log('[callback] token na URL (20 chars):', token ? token.slice(0, 20) + '...' : 'NENHUM');
    console.log('[callback] error na URL:', error ?? 'nenhum');

    if (error) {
      console.log('[callback] erro detectado → redirect /auth/error');
      router.replace(`/auth/error?code=${encodeURIComponent(error)}`);
      return;
    }

    if (!token) {
      console.log('[callback] sem token → redirect /login?error=auth_failed');
      router.replace('/login?error=auth_failed');
      return;
    }

    (async () => {
      try {
        console.log('[callback] chamando /api/auth/set-token...');
        const res = await fetch('/api/auth/set-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const body = await res.json().catch(() => null);
        console.log('[callback] set-token resposta → status:', res.status, 'body:', JSON.stringify(body));

        if (!res.ok) throw new Error('set-token failed');

        console.log('[callback] sucesso → redirecionando para /dashboard');
        window.location.href = '/dashboard';
      } catch (err) {
        console.log('[callback] erro ao setar token:', err);
        router.replace('/login?error=auth_failed');
      }
    })();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900">
      <div className="flex flex-col items-center gap-4">
        <svg
          className="w-10 h-10 text-blue-400 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        <p className="text-blue-200 text-sm font-medium">Autenticando...</p>
      </div>
    </main>
  );
}

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  );
}
