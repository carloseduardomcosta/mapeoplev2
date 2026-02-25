'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GoogleMap, Marker, InfoWindow, Polygon, useLoadScript } from '@react-google-maps/api';
import UserLocationMarker from '@/components/UserLocationMarker';
import NavBar from '@/components/NavBar';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { useSocketContext } from '@/components/SocketProvider';
import StatusBadge from '@/components/StatusBadge';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { useLocationSharing, UserLocation } from '@/lib/useLocationSharing';
import { Resident, ResidentStatus } from '@/types/resident';
import { Territory } from '@/types/territory';

const LIBRARIES: ('places')[] = ['places'];

const MAP_CENTER = { lat: -26.8442, lng: -49.1672 };

// Perímetro municipal de Timbó/SC — IBGE código 4218202
// Centro: -26.8255, -49.2726 | Área: ~130km²
const TIMBO_BOUNDARY = [
  { lat: -26.7195, lng: -49.2380 },
  { lat: -26.7220, lng: -49.2180 },
  { lat: -26.7280, lng: -49.1980 },
  { lat: -26.7350, lng: -49.1820 },
  { lat: -26.7450, lng: -49.1650 },
  { lat: -26.7580, lng: -49.1480 },
  { lat: -26.7720, lng: -49.1350 },
  { lat: -26.7880, lng: -49.1250 },
  { lat: -26.8050, lng: -49.1200 },
  { lat: -26.8220, lng: -49.1230 },
  { lat: -26.8380, lng: -49.1280 },
  { lat: -26.8520, lng: -49.1220 },
  { lat: -26.8650, lng: -49.1150 },
  { lat: -26.8780, lng: -49.1120 },
  { lat: -26.8920, lng: -49.1180 },
  { lat: -26.9050, lng: -49.1300 },
  { lat: -26.9150, lng: -49.1480 },
  { lat: -26.9200, lng: -49.1680 },
  { lat: -26.9220, lng: -49.1900 },
  { lat: -26.9200, lng: -49.2120 },
  { lat: -26.9150, lng: -49.2320 },
  { lat: -26.9070, lng: -49.2500 },
  { lat: -26.8960, lng: -49.2660 },
  { lat: -26.8820, lng: -49.2800 },
  { lat: -26.8660, lng: -49.2900 },
  { lat: -26.8490, lng: -49.2960 },
  { lat: -26.8310, lng: -49.2980 },
  { lat: -26.8140, lng: -49.2940 },
  { lat: -26.7970, lng: -49.2870 },
  { lat: -26.7810, lng: -49.2780 },
  { lat: -26.7650, lng: -49.2660 },
  { lat: -26.7500, lng: -49.2540 },
  { lat: -26.7370, lng: -49.2480 },
  { lat: -26.7250, lng: -49.2430 },
  { lat: -26.7195, lng: -49.2380 },
];
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

const STATUS_COLORS: Record<ResidentStatus, string> = {
  NAO_CONTATADO: '#6B7280',
  CONTATADO: '#3B82F6',
  AUSENTE: '#EAB308',
  RECUSOU: '#EF4444',
  INTERESSADO: '#22C55E',
};

function getMarkerIcon(status: ResidentStatus): string {
  const color = STATUS_COLORS[status] ?? '#6B7280';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="${color}" stroke="white" stroke-width="2.5"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const MAP_OPTIONS: google.maps.MapOptions = {
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#1e2a3a' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1e2a3a' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8bb4d0' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d4a6b' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b99c0' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1f2d' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1a3048' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
};

function MapContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const initLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
  const initLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  });

  const [residents, setResidents] = useState<Resident[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [selected, setSelected] = useState<Resident | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSessions, setShowSessions] = useState(false);
  const [center, setCenter] = useState(
    initLat && initLng ? { lat: initLat, lng: initLng } : MAP_CENTER,
  );
  const [me, setMe] = useState<{ id: string; name: string; image: string | null } | null>(null);

  // Fetch current user for marker differentiation
  useEffect(() => {
    fetchWithAuth('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setMe(data); })
      .catch(() => {});
  }, []);

  // Location sharing via Socket.io
  const { socket } = useSocketContext();
  const { isSharing, permissionDenied, stopSharing, userLocations, error: locationError } = useLocationSharing(socket);

  const fetchResidents = useCallback(async () => {
    setLoading(true);
    try {
      // Load all residents with automatic pagination
      const allResidents: Resident[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await fetchWithAuth(`/api/residents?limit=100&page=${page}`);
        if (!res.ok) break;
        const data = await res.json();
        const batch: Resident[] = data.data ?? [];
        allResidents.push(...batch);

        if (page >= data.totalPages || batch.length === 0) {
          hasMore = false;
        } else {
          page++;
        }
      }

      setResidents(allResidents);
      console.log(`[Map] Loaded ${allResidents.length} residents (${page} pages)`);

      if (highlightId) {
        const found = allResidents.find((r) => r.id === highlightId);
        if (found) setSelected(found);
      }
    } finally {
      setLoading(false);
    }
  }, [highlightId]);

  const fetchTerritories = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/territories');
      if (!res.ok) return;
      setTerritories(await res.json());
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  useEffect(() => {
    fetchTerritories();
    const interval = setInterval(fetchTerritories, 15000);
    return () => clearInterval(interval);
  }, [fetchTerritories]);

  const activeSessions = territories.filter((t) => t.activeSession);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4 flex-1">
        <p className="text-red-300 text-lg font-semibold">Erro ao carregar o Google Maps</p>
        <p className="text-blue-300 text-sm mt-2">Verifique a chave NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
      </div>
    );
  }

  return (
    <>
      {/* Legenda */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-3 bg-slate-900/60 border-b border-white/10 shrink-0">
        <span className="text-blue-300 text-sm font-medium">Mapa de Moradores</span>
        {!loading && (
          <span className="text-blue-400/70 text-xs">{residents.length} carregados</span>
        )}
        {activeSessions.length > 0 && (
          <button
            onClick={() => setShowSessions((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-green-300 bg-green-500/20 border border-green-500/30 px-2.5 py-1 rounded-full transition-colors hover:bg-green-500/30"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            {activeSessions.length} em campo
          </button>
        )}
        <div className="flex flex-wrap items-center gap-3 ml-auto">
          {(Object.entries(STATUS_COLORS) as [ResidentStatus, string][]).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full border border-white/40 shrink-0"
                style={{ backgroundColor: color }}
              />
              <StatusBadge status={status} />
            </div>
          ))}
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative w-full flex">
        <div className="flex-1 relative">
          {!isLoaded || loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-blue-300 text-sm">
                  {!isLoaded ? 'Carregando Google Maps...' : 'Carregando moradores...'}
                </p>
              </div>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={center}
              zoom={initLat && initLng ? 17 : 14}
              options={MAP_OPTIONS}
              onClick={() => { setSelected(null); setSelectedTerritory(null); }}
            >
              {residents.map((resident) => (
                <Marker
                  key={resident.id}
                  position={{ lat: resident.lat, lng: resident.lng }}
                  icon={{
                    url: getMarkerIcon(resident.status),
                    scaledSize: new window.google.maps.Size(28, 28),
                    anchor: new window.google.maps.Point(14, 14),
                  }}
                  onClick={() => {
                    setSelected(resident);
                    setSelectedTerritory(null);
                    setCenter({ lat: resident.lat, lng: resident.lng });
                  }}
                  title={resident.fullName}
                />
              ))}

              {/* Territory polygons */}
              {territories.map((territory) => (
                <Polygon
                  key={territory.id}
                  paths={territory.polygon}
                  options={{
                    strokeColor: territory.color,
                    strokeWeight: 2,
                    strokeOpacity: 0.85,
                    fillColor: territory.color,
                    fillOpacity: territory.activeSession ? 0.20 : 0.06,
                    clickable: true,
                  }}
                  onClick={() => {
                    setSelectedTerritory(territory);
                    setSelected(null);
                  }}
                />
              ))}

              {/* Municipal boundary */}
              <Polygon
                paths={TIMBO_BOUNDARY}
                options={{
                  strokeColor: '#FF4444',
                  strokeWeight: 2,
                  strokeOpacity: 0.8,
                  fillColor: '#4488FF',
                  fillOpacity: 0.05,
                  clickable: false,
                }}
              />

              {selected && (
                <InfoWindow
                  position={{ lat: selected.lat, lng: selected.lng }}
                  onCloseClick={() => setSelected(null)}
                  options={{ pixelOffset: new window.google.maps.Size(0, -14) }}
                >
                  <div className="min-w-[200px] max-w-[280px]">
                    <p className="font-semibold text-gray-900 text-sm mb-1">{selected.fullName}</p>
                    <div className="mb-2">
                      <StatusBadge status={selected.status} />
                    </div>
                    <p className="text-gray-600 text-xs mb-1 leading-relaxed">{selected.address}</p>
                    {selected.phone && (
                      <p className="text-gray-600 text-xs mb-2">{selected.phone}</p>
                    )}
                    {selected.notes && (
                      <p className="text-gray-500 text-xs italic mb-2 border-t border-gray-200 pt-1.5">
                        {selected.notes}
                      </p>
                    )}
                    <Link
                      href={`/residents/${selected.id}/edit`}
                      className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors mt-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </Link>
                  </div>
                </InfoWindow>
              )}

              {selectedTerritory && selectedTerritory.polygon.length > 0 && (() => {
                // Compute centroid for InfoWindow position
                const pts = selectedTerritory.polygon;
                const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
                const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
                return (
                  <InfoWindow
                    position={{ lat, lng }}
                    onCloseClick={() => setSelectedTerritory(null)}
                  >
                    <div className="min-w-[180px] max-w-[260px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: selectedTerritory.color + '33', color: selectedTerritory.color }}
                        >
                          #{selectedTerritory.number}
                        </span>
                        <p className="font-semibold text-gray-900 text-sm">{selectedTerritory.name}</p>
                      </div>
                      {selectedTerritory.description && (
                        <p className="text-gray-500 text-xs mb-2">{selectedTerritory.description}</p>
                      )}
                      {selectedTerritory.activeSession ? (
                        <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded px-2 py-1 mb-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          Em campo: {selectedTerritory.activeSession.user?.name}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-xs mb-2">Disponível</p>
                      )}
                      <Link
                        href="/territories"
                        className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                      >
                        Ver Territórios
                      </Link>
                    </div>
                  </InfoWindow>
                );
              })()}
              {/* Live user locations — circular profile photo markers */}
              {Array.from(userLocations.values()).map((loc: UserLocation) => (
                <UserLocationMarker
                  key={`loc-${loc.userId}`}
                  location={loc}
                  isMe={loc.userId === me?.id}
                />
              ))}
            </GoogleMap>
          )}

          {/* FABs */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-10">
            {/* Location sharing indicator — auto-starts on page open */}
            <button
              onClick={isSharing ? stopSharing : undefined}
              className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
                isSharing
                  ? 'bg-green-500 hover:bg-green-400 hover:scale-110 animate-pulse cursor-pointer'
                  : permissionDenied
                  ? 'bg-red-500/80 cursor-not-allowed'
                  : 'bg-slate-700/80 cursor-wait'
              }`}
              title={
                isSharing
                  ? 'Localização ativa — clique para parar'
                  : permissionDenied
                  ? 'Permissão negada — clique no cadeado para permitir'
                  : 'Aguardando permissão de localização...'
              }
              disabled={!isSharing && !permissionDenied}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Add resident FAB */}
            <Link
              href="/residents/new"
              className="w-14 h-14 bg-blue-500 hover:bg-blue-400 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
              title="Adicionar Morador"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Link>
          </div>

          {/* Location error / permission toast */}
          {locationError && (
            <div className="absolute bottom-6 left-6 max-w-xs bg-red-500/90 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg z-10 flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{locationError}</span>
            </div>
          )}

          {/* Live users count */}
          {userLocations.size > 0 && (
            <div className="absolute top-4 right-4 bg-green-500/90 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg z-10 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              {userLocations.size} ao vivo
            </div>
          )}
        </div>

        {/* Active sessions panel */}
        {showSessions && activeSessions.length > 0 && (
          <div className="w-64 shrink-0 bg-slate-900/80 border-l border-white/10 flex flex-col overflow-y-auto z-10">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-white text-sm font-semibold">Em campo agora</span>
              <button
                onClick={() => setShowSessions(false)}
                className="text-blue-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ul className="divide-y divide-white/10">
              {activeSessions.map((t) => (
                <li key={t.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <p className="text-white text-sm font-medium truncate">
                      #{t.number} {t.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-4">
                    {t.activeSession?.user?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.activeSession.user.image} alt={t.activeSession.user.name}
                        className="w-5 h-5 rounded-full border border-green-400/50" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-green-500/30 border border-green-400/50 flex items-center justify-center text-green-300 text-xs font-bold">
                        {t.activeSession?.user?.name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                    )}
                    <p className="text-green-300 text-xs truncate">{t.activeSession?.user?.name}</p>
                  </div>
                  <p className="text-blue-400/50 text-xs ml-4 mt-0.5">
                    desde {new Date(t.activeSession!.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

export default function MapPage() {
  return (
    <AuthenticatedLayout>
    <div className="h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex flex-col">
      <NavBar />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <MapContent />
      </Suspense>
    </div>
    </AuthenticatedLayout>
  );
}
