'use client';

import { useState } from 'react';
import NavBar from '@/components/NavBar';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

export default function PrivacyPage() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ─── Export personal data ─────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true);
    setMessage(null);
    try {
      const res = await fetchWithAuth('/api/auth/my-data');
      if (!res.ok) throw new Error('Erro ao exportar dados');
      const data = await res.json();

      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mapeople-meus-dados-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Seus dados foram exportados com sucesso.' });
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setExporting(false);
    }
  }

  // ─── Delete account ───────────────────────────────────────────────────────
  async function handleDelete() {
    if (deleteConfirmText !== 'EXCLUIR MINHA CONTA') return;

    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetchWithAuth('/api/auth/delete-account', { method: 'POST' });
      if (!res.ok) throw new Error('Erro ao excluir conta');

      setMessage({ type: 'success', text: 'Sua conta foi removida. Você será redirecionado...' });
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
        <NavBar />

        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Privacidade e Dados Pessoais</h1>
            <p className="text-blue-300 text-sm mt-1">
              Gerencie seus dados conforme a Lei Geral de Proteção de Dados (LGPD)
            </p>
          </div>

          {/* Message */}
          {message && (
            <div className={`rounded-xl p-4 text-sm border ${
              message.type === 'success'
                ? 'bg-green-500/20 border-green-500/30 text-green-300'
                : 'bg-red-500/20 border-red-500/30 text-red-300'
            }`}>
              {message.text}
            </div>
          )}

          {/* Privacy policy summary */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 space-y-4">
            <h2 className="text-white font-semibold text-lg">Seus Direitos (LGPD)</h2>

            <div className="space-y-3 text-blue-200 text-sm leading-relaxed">
              <p>
                O <strong className="text-white">Mapeople</strong> coleta e processa dados pessoais
                exclusivamente para fins de mapeamento voluntário e coordenação de equipes.
                Conforme a LGPD (Lei 13.709/2018), você tem os seguintes direitos:
              </p>

              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">1.</span>
                  <span><strong className="text-white">Acesso</strong> — Você pode exportar todos os seus dados pessoais armazenados no sistema.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">2.</span>
                  <span><strong className="text-white">Retificação</strong> — Seus dados são sincronizados com sua conta Google e podem ser atualizados por lá.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">3.</span>
                  <span><strong className="text-white">Eliminação</strong> — Você pode solicitar a exclusão completa da sua conta e dados pessoais.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">4.</span>
                  <span><strong className="text-white">Portabilidade</strong> — Seus dados são exportados em formato JSON, legível por máquina.</span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm">
              <p className="text-blue-200">
                <strong className="text-white">Dados coletados:</strong> Nome, e-mail e foto (via Google OAuth),
                endereço IP de acesso, registros de atividade no sistema, e dados de moradores cadastrados por você.
              </p>
              <p className="text-blue-200 mt-2">
                <strong className="text-white">Mensagens:</strong> São criptografadas de ponta a ponta (E2E) e
                não podem ser lidas pelo servidor.
              </p>
            </div>
          </div>

          {/* Export data */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-white font-semibold text-lg mb-2">Exportar Meus Dados</h2>
            <p className="text-blue-300 text-sm mb-4">
              Baixe uma cópia completa de todos os seus dados pessoais em formato JSON.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/30 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {exporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar Dados (JSON)
                </>
              )}
            </button>
          </div>

          {/* Delete account */}
          <div className="bg-red-500/10 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
            <h2 className="text-red-300 font-semibold text-lg mb-2">Excluir Minha Conta</h2>
            <p className="text-red-200/70 text-sm mb-4">
              Esta ação é <strong className="text-red-300">irreversível</strong>. Todos os seus dados pessoais serão
              anonimizados e sua conta será desativada permanentemente.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-sm font-medium rounded-lg transition-colors"
              >
                Solicitar Exclusão
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-red-200/70 text-sm">
                  Para confirmar, digite <strong className="text-red-300">EXCLUIR MINHA CONTA</strong> abaixo:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="EXCLUIR MINHA CONTA"
                  className="w-full bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 text-red-200 text-sm placeholder-red-300/30 focus:outline-none focus:border-red-400"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleteConfirmText !== 'EXCLUIR MINHA CONTA' || deleting}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-600/30 disabled:text-red-300/50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                  </button>
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                    className="px-6 py-2.5 text-blue-300 hover:text-white text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-blue-400/40">
            Mapeople v2.0 — Em conformidade com a LGPD (Lei 13.709/2018)
          </p>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
