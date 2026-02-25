'use client';

import { useEffect, useRef, useState } from 'react';
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
 *
 * IMPORTANT: socket is stored in a ref but exposed as state to trigger
 * re-renders when connection state changes.
 */
export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
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

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socketRef.current = newSocket;
    // Expose socket instance via state so consumers re-render when it's ready
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[useSocket] ✓ Connected:', newSocket.id);
      setIsConnected(true);
      // Request current online users list immediately after connect
      newSocket.emit('users:list');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[useSocket] ✗ Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.log('[useSocket] Connection error:', err.message);
      setIsConnected(false);
    });

    // Listen for online users updates — keep state fresh
    newSocket.on('users:online', (users: OnlineUser[]) => {
      console.log('[useSocket] Online users updated:', users.length);
      setOnlineUsers(users);
    });

    return () => {
      console.log('[useSocket] Cleaning up socket connection');
      newSocket.removeAllListeners();
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, []);

  return { socket, isConnected, onlineUsers };
}
