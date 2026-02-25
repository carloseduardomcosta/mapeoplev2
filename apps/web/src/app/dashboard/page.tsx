import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LogoutButton from './LogoutButton';
import StatusBadge from '@/components/StatusBadge';
import { CurrentUser, PaginatedResult, Resident, ResidentStatus } from '@/types/resident';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? 'http://api:3001';

const ALL_STATUSES: ResidentStatus[] = [
  'NAO_CONTATADO',
  'CONTATADO',
  'AUSENTE',
  'RECUSOU',
  'INTERESSADO',
];

async function fetchMe(token: string): Promise<{ res: Response; user: CurrentUser | null }> {
  const res = await fetch(`${INTERNAL_API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  console.log('[dashboard] /api/auth/me status:', res.status);
  if (!res.ok) {
    const body = await res.text().catch(() => '(sem body)');
    console.log('[dashboard] /api/auth/me erro body:', body);
    return { res, user: null };
  }
  return { res, user: await res.json() };
}

async function tryRefresh(refreshToken: string): Promise<string | null> {
  console.log('[dashboard] refresh_token presente, tentando renovar...');
  try {
    const refreshRes = await fetch(`${INTERNAL_API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refresh_token=${refreshToken}`,
      },
      body: JSON.stringify({}),
      cache: 'no-store',
    });
    console.log('[dashboard] NestJS refresh status:', refreshRes.status);
    if (!refreshRes.ok) return null;
    const data = await refreshRes.json();
    const newToken: string = data.accessToken;
    console.log('[dashboard] refresh ok, novo token (20 chars):', newToken.slice(0, 20) + '...');
    return newToken;
  } catch (err) {
    console.log('[dashboard] refresh exception:', err);
    return null;
  }
}

async function getUser(authToken: string, refreshToken?: string): Promise<CurrentUser | null> {
  const { res, user } = await fetchMe(authToken);
  if (user) return user;

  if (res.status === 401 && refreshToken) {
    const newToken = await tryRefresh(refreshToken);
    if (!newToken) return null;
    const { user: retryUser } = await fetchMe(newToken);
    return retryUser;
  }

  return null;
}

async function fetchStatusCount(token: string, status: ResidentStatus): Promise<number> {
  try {
    const res = await fetch(
      `${INTERNAL_API_URL}/api/residents?limit=1&status=${status}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
    );
    if (!res.ok) return 0;
    const data: PaginatedResult<Resident> = await res.json();
    return data.meta?.total ?? 0;
  } catch {
    return 0;
  }
}

async function fetchActiveSessionsCount(token: string): Promise<number> {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/territories/active-sessions`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!authToken) redirect('/login');

  const user = await getUser(authToken, refreshToken);
  if (!user) redirect('/login');

  const [counts, activeSessionsCount] = await Promise.all([
    Promise.all(ALL_STATUSES.map((s) => fetchStatusCount(authToken, s))),
    fetchActiveSessionsCount(authToken),
  ]);
  const statusCounts = Object.fromEntries(
    ALL_STATUSES.map((s, i) => [s, counts[i]]),
  ) as Record<ResidentStatus, number>;
  const totalResidents = counts.reduce((a, b) => a + b, 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
      {/* Header */}
      <header className="px-4 py-4 border-b border-white/10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center shadow">
              <svg
                className="w-5 h-5 text-white"
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
            <span className="text-white font-semibold text-lg">Mapeople 2.0</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Card de boas-vindas */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl flex items-center gap-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name}
              className="w-14 h-14 rounded-full border-2 border-blue-400 shadow shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-blue-500/30 border-2 border-blue-400 flex items-center justify-center text-xl text-white font-bold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-white">
              Olá, {user.name.split(' ')[0]}!
            </h2>
            <p className="text-blue-200 text-sm">{user.email}</p>
            <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {user.role}
            </span>
          </div>
        </div>

        {/* Stats de moradores */}
        <div>
          <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-3 opacity-60">
            Resumo de Moradores
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 col-span-2 sm:col-span-1 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold text-white">{totalResidents}</span>
              <span className="text-blue-200 text-xs mt-1">Total</span>
            </div>

            {(
              [
                { status: 'NAO_CONTATADO' as ResidentStatus, textColor: 'text-gray-300' },
                { status: 'CONTATADO' as ResidentStatus, textColor: 'text-blue-300' },
                { status: 'AUSENTE' as ResidentStatus, textColor: 'text-yellow-300' },
                { status: 'RECUSOU' as ResidentStatus, textColor: 'text-red-300' },
                { status: 'INTERESSADO' as ResidentStatus, textColor: 'text-green-300' },
              ] as const
            ).map(({ status, textColor }) => (
              <div
                key={status}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 flex flex-col items-center justify-center text-center"
              >
                <span className={`text-2xl font-bold ${textColor}`}>
                  {statusCounts[status]}
                </span>
                <div className="mt-1">
                  <StatusBadge status={status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botões de navegação */}
        <div>
          <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-3 opacity-60">
            Acesso Rápido
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link
              href="/map"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-5 border border-white/20 transition-colors group flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-blue-500/30 rounded-lg flex items-center justify-center group-hover:bg-blue-500/50 transition-colors shrink-0">
                <svg
                  className="w-5 h-5 text-blue-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Ver Mapa</p>
                <p className="text-blue-300 text-xs">Visualizar moradores no mapa</p>
              </div>
            </Link>

            <Link
              href="/residents"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-5 border border-white/20 transition-colors group flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-blue-500/30 rounded-lg flex items-center justify-center group-hover:bg-blue-500/50 transition-colors shrink-0">
                <svg
                  className="w-5 h-5 text-blue-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Gerenciar Moradores</p>
                <p className="text-blue-300 text-xs">Listar, cadastrar e editar</p>
              </div>
            </Link>

            <Link
              href="/territories"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-5 border border-white/20 transition-colors group flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-blue-500/30 rounded-lg flex items-center justify-center group-hover:bg-blue-500/50 transition-colors shrink-0 relative">
                <svg
                  className="w-5 h-5 text-blue-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                {activeSessionsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {activeSessionsCount}
                  </span>
                )}
              </div>
              <div>
                <p className="text-white font-medium">Territórios</p>
                <p className="text-blue-300 text-xs">
                  {activeSessionsCount > 0
                    ? `${activeSessionsCount} voluntário${activeSessionsCount > 1 ? 's' : ''} em campo`
                    : 'Gerenciar territórios'}
                </p>
              </div>
            </Link>

            <Link
              href="/chat"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-5 border border-white/20 transition-colors group flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-purple-500/30 rounded-lg flex items-center justify-center group-hover:bg-purple-500/50 transition-colors shrink-0">
                <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Chat</p>
                <p className="text-blue-300 text-xs">Mensagens criptografadas E2E</p>
              </div>
            </Link>

            {user.role === 'ADMIN' && (
              <Link
                href="/invites"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-5 border border-white/20 transition-colors group flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-blue-500/30 rounded-lg flex items-center justify-center group-hover:bg-blue-500/50 transition-colors shrink-0">
                  <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">Convidar Usuário</p>
                  <p className="text-blue-300 text-xs">Enviar convite por e-mail</p>
                </div>
              </Link>
            )}

            {user.role === 'ADMIN' && (
              <Link
                href="/admin/users"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-5 border border-white/20 transition-colors group flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-indigo-500/30 rounded-lg flex items-center justify-center group-hover:bg-indigo-500/50 transition-colors shrink-0">
                  <svg className="w-5 h-5 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">Gerenciar Usuários</p>
                  <p className="text-blue-300 text-xs">Ativar, desativar, alterar funções</p>
                </div>
              </Link>
            )}

            {user.role === 'ADMIN' && (
              <Link
                href="/audit"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-5 border border-white/20 transition-colors group flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-teal-500/30 rounded-lg flex items-center justify-center group-hover:bg-teal-500/50 transition-colors shrink-0">
                  <svg className="w-5 h-5 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">Auditoria</p>
                  <p className="text-blue-300 text-xs">Logs de ações do sistema</p>
                </div>
              </Link>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-blue-400/50">
          v2.0.0 — Mapeople · Sistema de Mapeamento Voluntário — Timbó/SC
        </p>
      </div>
    </main>
  );
}
