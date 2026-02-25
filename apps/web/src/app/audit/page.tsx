'use client';

import { useState, useEffect, useCallback } from 'react';
import NavBar from '@/components/NavBar';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface AuditUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
}

interface AuditResident {
  id: string;
  fullName: string;
}

interface AuditLog {
  id: string;
  eventType: string;
  userId: string;
  user: AuditUser;
  residentId: string | null;
  resident: AuditResident | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditStats {
  totalToday: number;
  totalWeek: number;
  totalAll: number;
  byType: { eventType: string; count: number }[];
}

interface PaginatedAudit {
  data: AuditLog[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const EVENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  LOGIN:                    { label: 'Login',                  color: 'bg-green-500/20 text-green-300 border-green-500/30',  icon: '🔓' },
  LOGOUT:                   { label: 'Logout',                 color: 'bg-gray-500/20 text-gray-300 border-gray-500/30',    icon: '🔒' },
  ACCESS_DENIED:            { label: 'Acesso Negado',          color: 'bg-red-500/20 text-red-300 border-red-500/30',       icon: '🚫' },
  RESIDENT_CREATED:         { label: 'Morador Criado',         color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',    icon: '➕' },
  RESIDENT_UPDATED:         { label: 'Morador Atualizado',     color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',    icon: '✏️' },
  RESIDENT_DELETED:         { label: 'Morador Excluído',       color: 'bg-red-500/20 text-red-300 border-red-500/30',       icon: '🗑️' },
  STATUS_CHANGED:           { label: 'Status Alterado',        color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: '🔄' },
  MESSAGE_SENT:             { label: 'Mensagem Enviada',       color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: '💬' },
  DATA_EXPORTED:            { label: 'Dados Exportados',       color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',    icon: '📤' },
  INVITE_SENT:              { label: 'Convite Enviado',        color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', icon: '📧' },
  INVITE_ACCEPTED:          { label: 'Convite Aceito',         color: 'bg-green-500/20 text-green-300 border-green-500/30',  icon: '✅' },
  TERRITORY_CREATED:        { label: 'Território Criado',      color: 'bg-teal-500/20 text-teal-300 border-teal-500/30',    icon: '🗺️' },
  TERRITORY_UPDATED:        { label: 'Território Atualizado',  color: 'bg-teal-500/20 text-teal-300 border-teal-500/30',    icon: '🗺️' },
  TERRITORY_DELETED:        { label: 'Território Excluído',    color: 'bg-red-500/20 text-red-300 border-red-500/30',       icon: '🗺️' },
  TERRITORY_SESSION_STARTED:{ label: 'Sessão Iniciada',        color: 'bg-green-500/20 text-green-300 border-green-500/30',  icon: '▶️' },
  TERRITORY_SESSION_ENDED:  { label: 'Sessão Encerrada',       color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: '⏹️' },
};

const ALL_EVENT_TYPES = Object.keys(EVENT_LABELS);

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState('');
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch audit logs ─────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '50');
      if (eventType) params.set('eventType', eventType);
      if (userId) params.set('userId', userId);
      if (search.trim()) params.set('search', search.trim());
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetchWithAuth(`/api/audit?${params.toString()}`);
      if (res.status === 403) {
        setError('Acesso restrito a administradores.');
        return;
      }
      if (!res.ok) throw new Error('Erro ao carregar logs');
      const data: PaginatedAudit = await res.json();
      setLogs(data.data);
      setMeta(data.meta);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, eventType, userId, search, dateFrom, dateTo]);

  // ─── Fetch stats and users ────────────────────────────────────────────────
  useEffect(() => {
    fetchWithAuth('/api/audit/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setStats(data); })
      .catch(() => {});

    fetchWithAuth('/api/audit/users')
      .then((res) => (res.ok ? res.json() : []))
      .then(setUsers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function getEventInfo(type: string) {
    return EVENT_LABELS[type] ?? { label: type, color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', icon: '📋' };
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
        <NavBar />

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Logs de Auditoria</h1>
              <p className="text-blue-300 text-sm mt-1">Histórico completo de ações do sistema</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Stats cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-blue-300 text-xs font-medium">Hoje</p>
                <p className="text-white text-2xl font-bold mt-1">{stats.totalToday}</p>
                <p className="text-blue-400/60 text-xs">eventos</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-blue-300 text-xs font-medium">Últimos 7 dias</p>
                <p className="text-white text-2xl font-bold mt-1">{stats.totalWeek}</p>
                <p className="text-blue-400/60 text-xs">eventos</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-blue-300 text-xs font-medium">Total</p>
                <p className="text-white text-2xl font-bold mt-1">{stats.totalAll}</p>
                <p className="text-blue-400/60 text-xs">eventos registrados</p>
              </div>
            </div>
          )}

          {/* Top event types this week */}
          {stats && stats.byType.length > 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-blue-300 text-xs font-medium mb-3">Eventos mais frequentes (7 dias)</p>
              <div className="flex flex-wrap gap-2">
                {stats.byType.slice(0, 8).map((item) => {
                  const info = getEventInfo(item.eventType);
                  return (
                    <button
                      key={item.eventType}
                      onClick={() => { setEventType(item.eventType); setPage(1); }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors hover:opacity-80 ${info.color}`}
                    >
                      <span>{info.icon}</span>
                      {info.label}
                      <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-[10px]">{item.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="text-blue-300 text-xs font-medium mb-1 block">Tipo de Evento</label>
                <select
                  value={eventType}
                  onChange={(e) => { setEventType(e.target.value); setPage(1); }}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
                >
                  <option value="" className="bg-slate-800">Todos</option>
                  {ALL_EVENT_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-slate-800">
                      {getEventInfo(type).label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-blue-300 text-xs font-medium mb-1 block">Usuário</label>
                <select
                  value={userId}
                  onChange={(e) => { setUserId(e.target.value); setPage(1); }}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
                >
                  <option value="" className="bg-slate-800">Todos</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-800">{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-blue-300 text-xs font-medium mb-1 block">De</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-blue-300 text-xs font-medium mb-1 block">Até</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-blue-300 text-xs font-medium mb-1 block">Buscar</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchLogs(); } }}
                  placeholder="Nome, e-mail..."
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-blue-300/50 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
            {(eventType || userId || dateFrom || dateTo || search) && (
              <button
                onClick={() => { setEventType(''); setUserId(''); setDateFrom(''); setDateTo(''); setSearch(''); setPage(1); }}
                className="mt-3 text-blue-400 hover:text-blue-300 text-xs font-medium"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Logs table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-blue-300/60 text-sm">Nenhum log encontrado com os filtros aplicados.</p>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-blue-300 text-xs">
                      <th className="text-left px-4 py-3 font-medium">Data/Hora</th>
                      <th className="text-left px-4 py-3 font-medium">Evento</th>
                      <th className="text-left px-4 py-3 font-medium">Usuário</th>
                      <th className="text-left px-4 py-3 font-medium">Detalhes</th>
                      <th className="text-left px-4 py-3 font-medium">IP</th>
                      <th className="text-left px-4 py-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {logs.map((log) => {
                      const info = getEventInfo(log.eventType);
                      const isExpanded = expandedLog === log.id;
                      return (
                        <>
                          <tr key={log.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-blue-200 text-xs whitespace-nowrap">
                              {formatDate(log.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${info.color}`}>
                                <span>{info.icon}</span>
                                {info.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {log.user.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={log.user.image} alt={log.user.name}
                                    className="w-6 h-6 rounded-full border border-white/20" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-blue-500/30 border border-white/20 flex items-center justify-center text-white text-xs font-bold">
                                    {log.user.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-white text-xs font-medium truncate">{log.user.name}</p>
                                  <p className="text-blue-400/50 text-[10px] truncate">{log.user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-blue-300/70 text-xs max-w-[200px] truncate">
                              {log.resident ? (
                                <span>Morador: {log.resident.fullName}</span>
                              ) : log.metadata ? (
                                <span>{JSON.stringify(log.metadata).slice(0, 80)}</span>
                              ) : (
                                <span className="text-blue-400/30">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-blue-400/50 text-xs font-mono">
                              {log.ipAddress ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              {log.metadata && (
                                <button
                                  onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              )}
                            </td>
                          </tr>
                          {isExpanded && log.metadata && (
                            <tr key={`${log.id}-meta`}>
                              <td colSpan={6} className="px-4 py-3 bg-white/5">
                                <pre className="text-blue-200 text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-blue-300 text-sm">
                Página {meta.page} de {meta.totalPages} · {meta.total} registros
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="px-3 py-1.5 rounded-lg text-sm text-blue-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(meta.totalPages - 4, page - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      disabled={loading}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        pageNum === page
                          ? 'bg-blue-500 text-white'
                          : 'text-blue-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages || loading}
                  className="px-3 py-1.5 rounded-lg text-sm text-blue-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
