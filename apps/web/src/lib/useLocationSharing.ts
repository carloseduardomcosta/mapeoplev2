'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export interface UserLocation {
  userId: string;
  name: string;
  image: string | null;
  lat: number;
  lng: number;
  accuracy: number;
  updatedAt: string;
}

interface UseLocationSharingReturn {
  isSharing: boolean;
  permissionDenied: boolean;
  stopSharing: () => void;
  userLocations: Map<string, UserLocation>;
  error: string | null;
}

const LOCATION_UPDATE_INTERVAL = 10_000; // 10 seconds

/**
 * Hook para compartilhamento de localização GPS em tempo real via Socket.io.
 * Solicita permissão e inicia o compartilhamento automaticamente quando
 * o socket está conectado e a página do mapa é aberta.
 */
export function useLocationSharing(socket: Socket | null): UseLocationSharingReturn {
  const [isSharing, setIsSharing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocations, setUserLocations] = useState<Map<string, UserLocation>>(new Map());
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const isSharingRef = useRef(false); // ref to avoid stale closure in auto-start

  // ─── Listen for location events from other users ────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const handleLocationUpdated = (data: UserLocation) => {
      console.log('[Location] Received update from:', data.name);
      setUserLocations((prev) => {
        const next = new Map(prev);
        next.set(data.userId, data);
        return next;
      });
    };

    const handleLocationRemoved = (data: { userId: string }) => {
      console.log('[Location] User stopped sharing:', data.userId);
      setUserLocations((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };

    const handleLocationAll = (locations: UserLocation[]) => {
      console.log('[Location] Received all locations:', locations.length);
      const map = new Map<string, UserLocation>();
      locations.forEach((loc) => map.set(loc.userId, loc));
      setUserLocations(map);
    };

    socket.on('location:updated', handleLocationUpdated);
    socket.on('location:removed', handleLocationRemoved);
    socket.on('location:all', handleLocationAll);

    // Request current locations on connect
    socket.emit('location:list');

    return () => {
      socket.off('location:updated', handleLocationUpdated);
      socket.off('location:removed', handleLocationRemoved);
      socket.off('location:all', handleLocationAll);
    };
  }, [socket]);

  // ─── Send location update ──────────────────────────────────────────────────

  const sendLocation = useCallback(
    (position: GeolocationPosition) => {
      if (!socket) return;

      const { latitude: lat, longitude: lng, accuracy } = position.coords;
      lastPositionRef.current = { lat, lng };

      socket.emit('location:update', { lat, lng, accuracy });
      console.log(`[Location] Sent update: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${accuracy?.toFixed(0)}m)`);
    },
    [socket],
  );

  // ─── Internal start sharing (no external trigger needed) ──────────────────

  const startSharing = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada neste navegador.');
      console.warn('[Location] Geolocation API not available');
      return;
    }

    if (isSharingRef.current) {
      console.log('[Location] Already sharing, skipping startSharing');
      return;
    }

    setError(null);
    setPermissionDenied(false);

    console.log('[Location] Requesting geolocation permission...');

    // Watch position for high-accuracy updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!isSharingRef.current) {
          isSharingRef.current = true;
          setIsSharing(true);
          console.log('[Location] ✓ Permission granted, started sharing');
        }
        sendLocation(position);
      },
      (err) => {
        console.error('[Location] Geolocation error:', err.code, err.message);
        if (err.code === 1) {
          // PERMISSION_DENIED
          setPermissionDenied(true);
          setError('Permissão de localização negada. Clique no ícone de cadeado na barra de endereço para permitir.');
        } else if (err.code === 2) {
          // POSITION_UNAVAILABLE
          setError('Localização indisponível. Verifique se o GPS está ativado.');
        } else {
          setError(`Erro ao obter localização: ${err.message}`);
        }
        isSharingRef.current = false;
        setIsSharing(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      },
    );

    // Also send periodic updates (in case watchPosition doesn't fire often enough)
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        sendLocation,
        () => {}, // Ignore errors in periodic updates
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 },
      );
    }, LOCATION_UPDATE_INTERVAL);
  }, [sendLocation]);

  // ─── Auto-start when socket connects ──────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    // Start immediately if socket is already connected
    if (socket.connected) {
      console.log('[Location] Socket already connected — auto-starting location sharing');
      startSharing();
      return;
    }

    // Otherwise wait for connect event
    const handleConnect = () => {
      console.log('[Location] Socket connected — auto-starting location sharing');
      startSharing();
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [socket, startSharing]);

  // ─── Stop sharing ──────────────────────────────────────────────────────────

  const stopSharing = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    socket?.emit('location:stop');
    isSharingRef.current = false;
    setIsSharing(false);
    lastPositionRef.current = null;

    console.log('[Location] Stopped sharing');
  }, [socket]);

  // ─── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Notify server that user left the map page
      if (isSharingRef.current && socket) {
        socket.emit('location:stop');
        console.log('[Location] Cleanup: emitted location:stop on unmount');
      }
      isSharingRef.current = false;
    };
  }, [socket]);

  return {
    isSharing,
    permissionDenied,
    stopSharing,
    userLocations,
    error,
  };
}
