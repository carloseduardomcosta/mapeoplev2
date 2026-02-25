'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { Territory } from '@/types/territory';

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState<string | null>(null);

  const fetchTerritories = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/territories');
      if (!res.ok) return;
      const data: Territory[] = await res.json();
      setTerritories(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTerritories();
    const interval = setInterval(fetchTerritories, 15000);
    return () => clearInterval(interval);
  }, [fetchTerritories]);

  async function handleStartSession(id: string) {
    setSessionLoading(id);
    try {
      const res = await fetchWithAuth(`/api/territories/${id}/start-session`, { method: 'POST' });
      if (res.ok) fetchTerritories();
    } finally {
      setSessionLoading(null);
    }
  }

  async function handleEndSession(id: string) {
    setSessionLoading(id);
    try {
      const res = await fetchWithAuth(`/api/territories/${id}/end-session`, { method: 'POST' });
      if (res.ok) fetchTerritories();
    } finally {
      setSessionLoading(null);
    }
  }

  async function handleDelete(territory: Territory) {
    if (!confirm(`Excluir o território "${territory.name}"? Esta ação não pode ser desfeita.`)) return;
    const res = await fetchWithAuth(`/api/territories/${territory.id}`, { method: 'DELETE' });
    if (res.ok) fetchTerritories();
  }

  return (
    <AuthenticatedLayout>
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
      <NavBar />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Territórios</h1>
            <p className="text-blue-300 text-sm mt-0.5">
              {territories.length} {territories.length === 1 ? 'território cadastrado' : 'territórios cadastrados'}
            </p>
          </div>
          <Link
            href="/territories/new"
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Território
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : territories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <svg className="w-14 h-14 text-blue-400/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-blue-200 font-medium">Nenhum território cadastrado</p>
            <p className="text-blue-400 text-sm mt-1">Comece criando o primeiro território</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {territories.map((territory) => (
              <TerritoryCard
                key={territory.id}
                territory={territory}
                sessionLoading={sessionLoading === territory.id}
                onStartSession={() => handleStartSession(territory.id)}
                onEndSession={() => handleEndSession(territory.id)}
                onDelete={() => handleDelete(territory)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    </AuthenticatedLayout>
  );
}

interface CardProps {
  territory: Territory;
  sessionLoading: boolean;
  onStartSession: () => void;
  onEndSession: () => void;
  onDelete: () => void;
}

function TerritoryCard({ territory, sessionLoading, onStartSession, onEndSession, onDelete }: CardProps) {
  const active = territory.activeSession;

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden flex flex-col">
      {/* Color bar */}
      <div className="h-1.5" style={{ backgroundColor: territory.color }} />

      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full border"
                style={{ borderColor: territory.color, color: territory.color, backgroundColor: territory.color + '22' }}
              >
                #{territory.number}
              </span>
              {active && (
                <span className="flex items-center gap-1 text-xs font-medium text-green-300 bg-green-500/20 border border-green-500/30 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                  Em campo
                </span>
              )}
            </div>
            <h2 className="text-white font-semibold mt-1 truncate">{territory.name}</h2>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Link
              href={`/territories/${territory.id}/edit`}
              className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Editar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Link>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              title="Excluir"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Description */}
        {territory.description && (
          <p className="text-blue-300 text-sm leading-relaxed line-clamp-2">{territory.description}</p>
        )}

        {/* Polygon info */}
        <p className="text-blue-400/60 text-xs">{territory.polygon.length} pontos no polígono</p>

        {/* Active session info */}
        {active ? (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
            {active.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.user.image} alt={active.user.name}
                className="w-7 h-7 rounded-full border border-green-400/50 shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-green-500/30 border border-green-400/50 flex items-center justify-center text-green-300 text-xs font-bold shrink-0">
                {active.user?.name?.charAt(0).toUpperCase() ?? '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-green-200 text-xs font-medium truncate">{active.user?.name}</p>
              <p className="text-green-400/60 text-xs">
                desde {new Date(active.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[52px] flex items-center">
            <p className="text-blue-400/40 text-xs italic">Território disponível</p>
          </div>
        )}

        {/* Session button */}
        <div className="mt-auto pt-1">
          {active ? (
            <button
              onClick={onEndSession}
              disabled={sessionLoading}
              className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 font-medium text-sm py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              {sessionLoading ? (
                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
              Sair de campo
            </button>
          ) : (
            <button
              onClick={onStartSession}
              disabled={sessionLoading}
              className="w-full flex items-center justify-center gap-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 font-medium text-sm py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              {sessionLoading ? (
                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              )}
              Entrar em campo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
