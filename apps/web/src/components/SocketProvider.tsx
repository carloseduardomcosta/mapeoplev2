'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { useSocket, OnlineUser } from '@/lib/useSocket';
import { uploadPublicKey } from '@/lib/crypto';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: OnlineUser[];
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  onlineUsers: [],
});

export function useSocketContext() {
  return useContext(SocketContext);
}

interface Props {
  children: ReactNode;
}

/**
 * Provider que inicializa a conexão Socket.io uma única vez
 * e disponibiliza para toda a árvore de componentes.
 * Também garante que a chave pública E2E do usuário seja enviada ao servidor.
 */
export default function SocketProvider({ children }: Props) {
  const { socket, isConnected, onlineUsers } = useSocket();

  // Upload E2E public key when connected
  useEffect(() => {
    if (isConnected) {
      uploadPublicKey().catch((err) =>
        console.error('[SocketProvider] Failed to upload E2E public key:', err),
      );
    }
  }, [isConnected]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}
