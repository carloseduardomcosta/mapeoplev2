'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface OnlineUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
  connectedAt: string;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: OnlineUser[];
}

/**
 * Hook que gerencia a conexão Socket.io com autenticação via cookie.
 * Reconecta automaticamente e mantém a lista de usuários online.
 */
export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    // Determine the Socket.io URL based on environment
    // In production behind Nginx, it's the same origin
    // In dev, API runs on port 3001
    const socketUrl =
      process.env.NEXT_PUBLIC_API_URL ??
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

    console.log('[useSocket] Connecting to:', socketUrl);

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      // Token will be sent via cookie (auth_token)
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[useSocket] ✓ Connected:', socket.id);
      setIsConnected(true);
      // Request current online users
      socket.emit('users:list');
    });

    socket.on('disconnect', (reason) => {
      console.log('[useSocket] ✗ Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.log('[useSocket] Connection error:', err.message);
      setIsConnected(false);
    });

    // Listen for online users updates
    socket.on('users:online', (users: OnlineUser[]) => {
      console.log('[useSocket] Online users updated:', users.length);
      setOnlineUsers(users);
    });

    return () => {
      console.log('[useSocket] Cleaning up socket connection');
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    onlineUsers,
  };
}
