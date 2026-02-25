'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

const ERROR_MESSAGES: Record<string, string> = {
  acesso_negado: 'Acesso negado. Sua conta aguarda aprovação do administrador.',
  auth_failed: 'Falha na autenticação. Tente novamente.',
  default: 'Ocorreu um erro inesperado. Tente novamente.',
};

function LoginContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error');
  const errorMessage = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.default)
    : null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900 px-4">
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg
              className="w-9 h-9 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Mapeople 2.0</h1>
          <p className="mt-2 text-sm text-blue-200 text-center leading-snug">
            Sistema de Mapeamento Voluntário
            <br />
            <span className="text-blue-300/80">Timbó / SC</span>
          </p>
        </div>

        {/* Erro */}
        {errorMessage && (
          <div className="mb-5 flex items-start gap-2.5 bg-red-500/20 border border-red-400/40 rounded-lg px-4 py-3">
            <svg
              className="w-5 h-5 text-red-300 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
            <p className="text-sm text-red-200">{errorMessage}</p>
          </div>
        )}

        {/* Botões */}
        <div className="flex flex-col gap-3">
          <a
            href={`${API_URL}/api/auth/google`}
            className="flex items-center justify-center gap-3 w-full bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 font-medium py-3 px-4 rounded-xl shadow transition-colors duration-150"
          >
            {/* Ícone Google oficial */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Entrar com Google
          </a>

          <button
            disabled
            title="Em breve"
            className="flex items-center justify-center gap-3 w-full bg-white/10 text-white/40 font-medium py-3 px-4 rounded-xl cursor-not-allowed border border-white/10 select-none"
          >
            {/* Ícone Microsoft */}
            <svg className="w-5 h-5 shrink-0 opacity-40" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022" />
              <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00" />
              <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF" />
              <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900" />
            </svg>
            Entrar com Microsoft
            <span className="text-xs text-white/30 ml-1">(Em breve)</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-blue-400/50">v0.1.0 — Mapeople</p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
