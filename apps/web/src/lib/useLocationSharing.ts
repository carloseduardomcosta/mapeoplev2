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
  startSharing: () => void;
  stopSharing: () => void;
  userLocations: Map<string, UserLocation>;
  error: string | null;
}

const LOCATION_UPDATE_INTERVAL = 10_000; // 10 seconds

/**
 * Hook para compartilhamento de localização GPS em tempo real via Socket.io.
 * Usa a Geolocation API do navegador e envia atualizações via WebSocket.
 */
export function useLocationSharing(socket: Socket | null): UseLocationSharingReturn {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocations, setUserLocations] = useState<Map<string, UserLocation>>(new Map());
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

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

  // ─── Start sharing ─────────────────────────────────────────────────────────

  const startSharing = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada neste navegador.');
      return;
    }

    setError(null);
    setIsSharing(true);

    // Watch position for high-accuracy updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        sendLocation(position);
      },
      (err) => {
        console.error('[Location] Geolocation error:', err.message);
        setError(`Erro de localização: ${err.message}`);
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

    console.log('[Location] Started sharing');
  }, [sendLocation]);

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
    };
  }, []);

  return {
    isSharing,
    startSharing,
    stopSharing,
    userLocations,
    error,
  };
}
