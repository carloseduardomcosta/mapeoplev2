'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import StatusBadge from '@/components/StatusBadge';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { Resident, ResidentStatus, PaginatedResult } from '@/types/resident';

const STATUS_OPTIONS: { value: ResidentStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'NAO_CONTATADO', label: 'Não Contatado' },
  { value: 'CONTATADO', label: 'Contatado' },
  { value: 'AUSENTE', label: 'Ausente' },
  { value: 'RECUSOU', label: 'Recusou' },
  { value: 'INTERESSADO', label: 'Interessado' },
];

export default function ResidentsPage() {
  const router = useRouter();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ResidentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const fetchResidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetchWithAuth(`/api/residents?${params.toString()}`);
      if (!res.ok) return;
      const data: PaginatedResult<Resident> = await res.json();
      setResidents(data.data ?? []);
      setMeta(data.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir o morador "${name}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(id);
    try {
      const res = await fetchWithAuth(`/api/residents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchResidents();
      } else {
        const body = await res.json().catch(() => ({}));
        alert(body.message ?? 'Erro ao excluir morador.');
      }
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(dateStr?: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
      <NavBar />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Título e botão */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Moradores</h1>
            <p className="text-blue-300 text-sm mt-0.5">
              {meta.total} {meta.total === 1 ? 'morador cadastrado' : 'moradores cadastrados'}
            </p>
          </div>
          <Link
            href="/residents/new"
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Morador
          </Link>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou endereço..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2 text-white placeholder-blue-300/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ResidentStatus | '');
              setPage(1);
            }}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 sm:w-52"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-800">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tabela */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : residents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg className="w-12 h-12 text-blue-400/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-blue-200 font-medium">Nenhum morador encontrado</p>
              <p className="text-blue-400 text-sm mt-1">
                {search || statusFilter ? 'Tente ajustar os filtros' : 'Comece cadastrando o primeiro morador'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs font-semibold text-blue-300 uppercase tracking-wider px-4 py-3">
                      Nome
                    </th>
                    <th className="text-left text-xs font-semibold text-blue-300 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Endereço
                    </th>
                    <th className="text-left text-xs font-semibold text-blue-300 uppercase tracking-wider px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-semibold text-blue-300 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                      Voluntário
                    </th>
                    <th className="text-left text-xs font-semibold text-blue-300 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                      Data Visita
                    </th>
                    <th className="text-right text-xs font-semibold text-blue-300 uppercase tracking-wider px-4 py-3">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {residents.map((resident) => (
                    <tr key={resident.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white text-sm font-medium">{resident.fullName}</p>
                          {resident.phone && (
                            <p className="text-blue-300 text-xs mt-0.5">{resident.phone}</p>
                          )}
                          <p className="text-blue-400/60 text-xs mt-0.5 md:hidden truncate max-w-[200px]">
                            {resident.address}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-blue-200 text-sm truncate max-w-[200px]" title={resident.address}>
                          {resident.address}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={resident.status} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-blue-200 text-sm">
                          {resident.createdBy?.name ?? '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-blue-200 text-sm">{formatDate(resident.visitDate)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/map?highlight=${resident.id}&lat=${resident.lat}&lng=${resident.lng}`}
                            title="Ver no mapa"
                            className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => router.push(`/residents/${resident.id}/edit`)}
                            title="Editar"
                            className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(resident.id, resident.fullName)}
                            disabled={deletingId === resident.id}
                            title="Excluir"
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          >
                            {deletingId === resident.id ? (
                              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginação */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-blue-300 text-sm">
              Página {meta.page} de {meta.totalPages} · {meta.total} moradores
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
  );
}
