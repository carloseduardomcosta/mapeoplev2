import Link from 'next/link';

const ERROR_MESSAGES: Record<string, string> = {
  acesso_negado: 'Acesso negado. Sua conta aguarda aprovação do administrador.',
  auth_failed: 'Falha na autenticação. Tente novamente.',
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const message =
    code && ERROR_MESSAGES[code]
      ? ERROR_MESSAGES[code]
      : 'Ocorreu um erro inesperado.';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900 px-4">
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20 text-center">
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-7 h-7 text-red-400"
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
          </div>
        </div>

        <h1 className="text-xl font-semibold text-white mb-3">Erro de Autenticação</h1>
        <p className="text-sm text-blue-200 mb-7 leading-relaxed">{message}</p>

        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl shadow transition-colors duration-150"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Voltar ao login
        </Link>
      </div>

      <p className="mt-8 text-xs text-blue-400/50">v0.1.0 — Mapeople</p>
    </main>
  );
}
