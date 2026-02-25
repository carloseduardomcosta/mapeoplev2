'use client';

/**
 * Wrapper de fetch para Client Components.
 * Em caso de 401, tenta renovar o JWT via POST /api/auth/refresh
 * e refaz a requisição original. Se o refresh falhar, redireciona para /login.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, { ...init, credentials: 'include' });

  if (res.status !== 401) return res;

  // Tenta renovar o token
  const refreshRes = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });

  if (!refreshRes.ok) {
    // Refresh falhou — sessão encerrada
    window.location.href = '/login';
    // Retorna a resposta original de 401 para não lançar exceção antes do redirect
    return res;
  }

  // Retry da requisição original com o novo cookie já setado pelo refresh
  return fetch(input, { ...init, credentials: 'include' });
}
