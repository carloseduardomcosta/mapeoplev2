'use client';

import { ReactNode } from 'react';
import SocketProvider from './SocketProvider';

interface Props {
  children: ReactNode;
}

/**
 * Wrapper para páginas autenticadas.
 * Inicializa a conexão Socket.io e disponibiliza o contexto.
 */
export default function AuthenticatedLayout({ children }: Props) {
  return <SocketProvider>{children}</SocketProvider>;
}
