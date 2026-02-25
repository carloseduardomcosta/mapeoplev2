'use client';

import { useState } from 'react';
import { useSocketContext } from './SocketProvider';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  VOLUNTARIO: 'Voluntário',
};

export default function OnlineUsersPanel() {
  const { isConnected, onlineUsers } = useSocketContext();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors bg-white/10 hover:bg-white/20 border border-white/20"
        title={isConnected ? `${onlineUsers.length} online` : 'Desconectado'}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
          }`}
        />
        <span className="text-white">
          {isConnected ? onlineUsers.length : '—'}
        </span>
        <svg
          className={`w-3 h-3 text-blue-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {expanded && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800/95 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-400' : 'bg-red-400'
                }`}
              />
              <span className="text-white text-sm font-semibold">
                {isConnected ? 'Online' : 'Desconectado'}
              </span>
            </div>
            <span className="text-blue-300/70 text-xs">
              {onlineUsers.length} {onlineUsers.length === 1 ? 'usuário' : 'usuários'}
            </span>
          </div>

          {onlineUsers.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-blue-300/50 text-xs">Nenhum usuário online</p>
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto divide-y divide-white/5">
              {onlineUsers.map((user) => (
                <li key={user.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-white/5">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-8 h-8 rounded-full border border-green-400/50 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-500/30 border border-green-400/50 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{user.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-300/60 text-xs">
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                      <span className="text-blue-400/40 text-xs">
                        desde{' '}
                        {new Date(user.connectedAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
