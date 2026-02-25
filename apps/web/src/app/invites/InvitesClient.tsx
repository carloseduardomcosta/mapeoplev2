'use client';

import { useState } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { PendingUser } from './page';

type Role = 'ADMIN' | 'SUPERVISOR' | 'VOLUNTARIO';

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  VOLUNTARIO: 'Voluntário',
};

interface Props {
  initialPendingUsers: PendingUser[];
}

export default function InvitesClient({ initialPendingUsers }: Props) {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>(initialPendingUsers);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('VOLUNTARIO');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  async function refreshPending() {
    const res = await fetchWithAuth('/api/invites/pending');
    if (res.ok) setPendingUsers(await res.json());
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetchWithAuth('/api/invites/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      if (res.ok) {
        setSendResult({ ok: true, msg: `Convite enviado para ${inviteEmail.trim()}` });
        setInviteEmail('');
      } else {
        const body = await res.json().catch(() => ({}));
        setSendResult({ ok: false, msg: body?.message ?? 'Erro ao enviar convite.' });
      }
    } catch {
      setSendResult({ ok: false, msg: 'Erro de rede ao enviar convite.' });
    } finally {
      setSending(false);
    }
  }

  async function handleApprove(userId: string) {
    setApprovingId(userId);
    try {
      const res = await fetchWithAuth(`/api/invites/${userId}/approve`, { method: 'PATCH' });
      if (res.ok) await refreshPending();
    } finally {
      setApprovingId(null);
    }
  }

  async function handleRoleChange(userId: string, role: Role) {
    setChangingRoleId(userId);
    try {
      const res = await fetchWithAuth(`/api/invites/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        setPendingUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role } : u)),
        );
      }
    } finally {
      setChangingRoleId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-white">Gerenciar Convites</h1>
        <p className="text-blue-300 text-sm mt-1">Envie convites e gerencie usuários pendentes</p>
      </div>

      {/* Formulário de convite */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Enviar Convite por E-mail
        </h2>

        <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@exemplo.com"
            required
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-blue-300/50 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Role)}
            className="bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 appearance-none cursor-pointer"
          >
            {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([value, label]) => (
              <option key={value} value={value} className="bg-slate-800 text-white">
                {label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={sending}
            className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-medium py-2.5 px-5 rounded-xl transition-colors text-sm shrink-0"
          >
            {sending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </form>

        {sendResult && (
          <div className={`mt-3 flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
            sendResult.ok
              ? 'bg-green-500/20 border border-green-400/40 text-green-200'
              : 'bg-red-500/20 border border-red-400/40 text-red-200'
          }`}>
            {sendResult.ok ? (
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            )}
            {sendResult.msg}
          </div>
        )}
      </div>

      {/* Lista de usuários pendentes */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Usuários Pendentes
          </h2>
          <span className="text-xs text-blue-300/70 bg-blue-500/20 border border-blue-500/30 rounded-full px-2.5 py-0.5">
            {pendingUsers.length}
          </span>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <svg className="w-10 h-10 text-blue-400/40 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-blue-300/60 text-sm">Nenhum usuário pendente</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {pendingUsers.map((user) => (
              <li key={user.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Avatar + info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {user.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.picture} alt={user.name}
                      className="w-10 h-10 rounded-full border border-blue-400/50 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500/30 border border-blue-400/50 flex items-center justify-center text-white font-semibold shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.name}</p>
                    <p className="text-blue-300/70 text-xs truncate">{user.email}</p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Select de role */}
                  <select
                    value={user.role}
                    disabled={changingRoleId === user.id}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                    className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-400 disabled:opacity-50 cursor-pointer appearance-none"
                  >
                    {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([value, label]) => (
                      <option key={value} value={value} className="bg-slate-800 text-white">
                        {label}
                      </option>
                    ))}
                  </select>

                  {/* Botão aprovar */}
                  <button
                    onClick={() => handleApprove(user.id)}
                    disabled={approvingId === user.id}
                    className="flex items-center gap-1.5 bg-green-500/20 hover:bg-green-500/40 border border-green-500/30 text-green-300 disabled:opacity-50 font-medium text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {approvingId === user.id ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    Aprovar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
