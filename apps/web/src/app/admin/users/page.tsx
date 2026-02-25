'use client';

import { useState, useEffect, useCallback } from 'react';
import NavBar from '@/components/NavBar';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface UserItem {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: 'ADMIN' | 'VOLUNTARIO';
  isActive: boolean;
  createdAt: string;
  _count: {
    createdResidents: number;
    auditLogs: number;
    territorySessions: number;
  };
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: { role: string; count: number }[];
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN: { label: 'Admin', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  VOLUNTARIO: { label: 'Voluntário', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (filterRole) params.set('role', filterRole);
      if (filterActive) params.set('isActive', filterActive);

      const res = await fetchWithAuth(`/api/users?${params.toString()}`);
      if (res.status === 403) {
        setError('Acesso restrito a administradores.');
        return;
      }
      if (!res.ok) throw new Error('Erro ao carregar usuários');
      setUsers(await res.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, filterRole, filterActive]);

  useEffect(() => {
    fetchUsers();
    fetchWithAuth('/api/users/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setStats(data); })
      .catch(() => {});
  }, [fetchUsers]);

  async function toggleActive(user: UserItem) {
    setUpdatingId(user.id);
    try {
      const res = await fetchWithAuth(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar');
      await fetchUsers();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function changeRole(user: UserItem, newRole: string) {
    setUpdatingId(user.id);
    try {
      const res = await fetchWithAuth(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar');
      await fetchUsers();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUpdatingId(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
        <NavBar />

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Gerenciar Usuários</h1>
            <p className="text-blue-300 text-sm mt-1">Ativar, desativar e alterar permissões dos usuários</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">{error}</div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-blue-300 text-xs font-medium">Total</p>
                <p className="text-white text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-green-300 text-xs font-medium">Ativos</p>
                <p className="text-white text-2xl font-bold mt-1">{stats.active}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-red-300 text-xs font-medium">Inativos</p>
                <p className="text-white text-2xl font-bold mt-1">{stats.inactive}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-purple-300 text-xs font-medium">Admins</p>
                <p className="text-white text-2xl font-bold mt-1">
                  {stats.byRole.find((r) => r.role === 'ADMIN')?.count ?? 0}
                </p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-blue-300/50 focus:outline-none focus:border-blue-400"
              />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
              >
                <option value="" className="bg-slate-800">Todas as funções</option>
                <option value="ADMIN" className="bg-slate-800">Admin</option>
                <option value="VOLUNTARIO" className="bg-slate-800">Voluntário</option>
              </select>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
              >
                <option value="" className="bg-slate-800">Todos os status</option>
                <option value="true" className="bg-slate-800">Ativos</option>
                <option value="false" className="bg-slate-800">Inativos</option>
              </select>
            </div>
          </div>

          {/* Users list */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-blue-300/60 text-sm">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {users.map((user) => {
                const roleInfo = ROLE_LABELS[user.role] ?? ROLE_LABELS.VOLUNTARIO;
                const isUpdating = updatingId === user.id;
                return (
                  <div
                    key={user.id}
                    className={`bg-white/5 backdrop-blur-sm rounded-xl p-4 border transition-colors ${
                      user.isActive ? 'border-white/10' : 'border-red-500/20 bg-red-500/5'
                    } ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {user.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.image} alt={user.name}
                            className="w-10 h-10 rounded-full border-2 border-white/20 flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-500/30 border-2 border-white/20 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium text-sm truncate">{user.name}</p>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${roleInfo.color}`}>
                              {roleInfo.label}
                            </span>
                            {!user.isActive && (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                                Inativo
                              </span>
                            )}
                          </div>
                          <p className="text-blue-400/60 text-xs truncate">{user.email}</p>
                          <div className="flex items-center gap-3 mt-1 text-blue-400/40 text-[10px]">
                            <span>Desde {formatDate(user.createdAt)}</span>
                            <span>{user._count.createdResidents} moradores</span>
                            <span>{user._count.territorySessions} sessões</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          value={user.role}
                          onChange={(e) => changeRole(user, e.target.value)}
                          className="bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-400"
                        >
                          <option value="VOLUNTARIO" className="bg-slate-800">Voluntário</option>
                          <option value="ADMIN" className="bg-slate-800">Admin</option>
                        </select>

                        <button
                          onClick={() => toggleActive(user)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            user.isActive
                              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
                              : 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30'
                          }`}
                        >
                          {user.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
