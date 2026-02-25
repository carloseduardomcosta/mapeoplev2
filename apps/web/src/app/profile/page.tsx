'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setUser(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!user) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
          <p className="text-blue-300">Erro ao carregar perfil.</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
        <NavBar />

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* Profile card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name}
                className="w-24 h-24 rounded-full border-4 border-white/20 mx-auto"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-500/30 border-4 border-white/20 mx-auto flex items-center justify-center text-white text-3xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}

            <h1 className="text-white text-xl font-bold mt-4">{user.name}</h1>
            <p className="text-blue-300 text-sm">{user.email}</p>

            <div className="flex items-center justify-center gap-3 mt-3">
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                user.role === 'ADMIN'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}>
                {user.role === 'ADMIN' ? 'Administrador' : 'Voluntário'}
              </span>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                user.isActive
                  ? 'bg-green-500/20 text-green-300 border-green-500/30'
                  : 'bg-red-500/20 text-red-300 border-red-500/30'
              }`}>
                {user.isActive ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <p className="text-blue-400/50 text-xs mt-4">
              Membro desde {new Date(user.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Info */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 space-y-4">
            <h2 className="text-white font-semibold">Informações da Conta</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-blue-300 text-sm">Nome</span>
                <span className="text-white text-sm">{user.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-blue-300 text-sm">E-mail</span>
                <span className="text-white text-sm">{user.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-blue-300 text-sm">Função</span>
                <span className="text-white text-sm">{user.role === 'ADMIN' ? 'Administrador' : 'Voluntário'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-blue-300 text-sm">Autenticação</span>
                <span className="text-white text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google OAuth
                </span>
              </div>
            </div>

            <p className="text-blue-400/40 text-xs">
              Seus dados são sincronizados com sua conta Google.
              Para alterar nome ou foto, atualize diretamente no Google.
            </p>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/privacy"
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-medium group-hover:text-blue-300 transition-colors">
                    Privacidade e Dados
                  </p>
                  <p className="text-blue-400/50 text-xs">Exportar dados, excluir conta (LGPD)</p>
                </div>
              </div>
            </Link>

            {user.role === 'ADMIN' && (
              <Link
                href="/admin/users"
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium group-hover:text-purple-300 transition-colors">
                      Gerenciar Usuários
                    </p>
                    <p className="text-blue-400/50 text-xs">Ativar, desativar, alterar permissões</p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
