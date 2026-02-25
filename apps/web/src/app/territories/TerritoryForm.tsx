'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  GoogleMap,
  DrawingManager,
  Polygon,
  useLoadScript,
} from '@react-google-maps/api';
import NavBar from '@/components/NavBar';
import { PolygonPoint, Territory } from '@/types/territory';

const LIBRARIES: ('places' | 'drawing')[] = ['places', 'drawing'];

const MAP_CENTER = { lat: -26.8255, lng: -49.2726 };
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

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

const PRESET_COLORS = [
  '#4488FF', '#22C55E', '#EF4444', '#F59E0B',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
];

interface FormData {
  number: string;
  name: string;
  description: string;
  color: string;
}

interface Props {
  initial?: Territory;
  isNew?: boolean;
  onSubmit: (data: {
    number: number;
    name: string;
    description?: string;
    polygon: PolygonPoint[];
    color: string;
  }) => Promise<{ ok: boolean; message?: string }>;
}

export default function TerritoryForm({ initial, isNew, onSubmit }: Props) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  });

  const [form, setForm] = useState<FormData>({
    number: initial?.number?.toString() ?? '',
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    color: initial?.color ?? '#4488FF',
  });
  const [polygon, setPolygon] = useState<PolygonPoint[]>(initial?.polygon ?? []);
  const [drawingMode, setDrawingMode] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const drawnPolygonRef = useRef<google.maps.Polygon | null>(null);

  const handlePolygonComplete = useCallback((poly: google.maps.Polygon) => {
    // Remove previous drawn polygon
    if (drawnPolygonRef.current) {
      drawnPolygonRef.current.setMap(null);
    }
    drawnPolygonRef.current = poly;
    poly.setEditable(true);

    const extractPoints = () => {
      const path = poly.getPath();
      const pts: PolygonPoint[] = [];
      for (let i = 0; i < path.getLength(); i++) {
        const pt = path.getAt(i);
        pts.push({ lat: pt.lat(), lng: pt.lng() });
      }
      setPolygon(pts);
    };

    extractPoints();
    // Update on edit
    poly.getPath().addListener('set_at', extractPoints);
    poly.getPath().addListener('insert_at', extractPoints);
    poly.getPath().addListener('remove_at', extractPoints);

    setDrawingMode(false);
  }, []);

  function clearPolygon() {
    if (drawnPolygonRef.current) {
      drawnPolygonRef.current.setMap(null);
      drawnPolygonRef.current = null;
    }
    setPolygon([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (polygon.length < 3) {
      setError('Desenhe um polígono com pelo menos 3 pontos no mapa.');
      return;
    }

    const num = parseInt(form.number, 10);
    if (isNaN(num) || num < 1) {
      setError('Número do território inválido.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit({
        number: num,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        polygon,
        color: form.color,
      });
      if (!result.ok) setError(result.message ?? 'Erro ao salvar território.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex flex-col">
      <NavBar />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar */}
        <div className="w-full lg:w-96 shrink-0 flex flex-col bg-slate-900/60 border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto">
          <div className="p-5 flex-1">
            <div className="mb-5">
              <h1 className="text-xl font-bold text-white">
                {isNew ? 'Novo Território' : 'Editar Território'}
              </h1>
              <p className="text-blue-300 text-sm mt-0.5">
                Preencha os dados e desenhe o polígono no mapa
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" id="territory-form">
              {/* Number */}
              <div>
                <label className="block text-blue-300 text-sm font-medium mb-1.5">
                  Número <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  placeholder="Ex: 1"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-blue-300/50 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-blue-300 text-sm font-medium mb-1.5">
                  Nome <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Centro Norte"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-blue-300/50 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-blue-300 text-sm font-medium mb-1.5">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Observações sobre este território..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-blue-300/50 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 resize-none"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-blue-300 text-sm font-medium mb-1.5">Cor</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        form.color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-7 h-7 rounded-full border-2 border-white/30 bg-transparent cursor-pointer overflow-hidden"
                    title="Cor personalizada"
                  />
                </div>
              </div>

              {/* Polygon status */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-blue-300 text-sm font-medium">Polígono</span>
                  {polygon.length > 0 && (
                    <button
                      type="button"
                      onClick={clearPolygon}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                {polygon.length === 0 ? (
                  <p className="text-blue-400/60 text-xs">Nenhum polígono desenhado ainda</p>
                ) : (
                  <p className="text-green-300 text-xs">{polygon.length} pontos definidos</p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-500/20 border border-red-400/40 text-red-200 rounded-xl px-4 py-3 text-sm">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  {error}
                </div>
              )}
            </form>
          </div>

          {/* Footer buttons */}
          <div className="p-5 border-t border-white/10 flex gap-3">
            <Link
              href="/territories"
              className="flex-1 text-center bg-white/10 hover:bg-white/20 text-blue-200 text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              form="territory-form"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {/* Drawing controls */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawingMode(true)}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl shadow-lg transition-colors ${
                drawingMode
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800/90 text-blue-200 hover:bg-slate-700/90 border border-white/20'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              {drawingMode ? 'Desenhando...' : 'Desenhar Polígono'}
            </button>
          </div>

          {loadError ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-red-300">Erro ao carregar Google Maps</p>
            </div>
          ) : !isLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-blue-300 text-sm">Carregando mapa...</p>
              </div>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={MAP_CENTER}
              zoom={13}
              options={MAP_OPTIONS}
            >
              {/* Show existing polygon for edit */}
              {!drawnPolygonRef.current && polygon.length > 2 && (
                <Polygon
                  paths={polygon}
                  options={{
                    strokeColor: form.color,
                    strokeWeight: 2,
                    strokeOpacity: 0.9,
                    fillColor: form.color,
                    fillOpacity: 0.2,
                    editable: false,
                  }}
                />
              )}

              <DrawingManager
                drawingMode={drawingMode ? google.maps.drawing.OverlayType.POLYGON : null}
                options={{
                  drawingControl: false,
                  polygonOptions: {
                    strokeColor: form.color,
                    strokeWeight: 2,
                    strokeOpacity: 0.9,
                    fillColor: form.color,
                    fillOpacity: 0.2,
                    editable: true,
                    draggable: false,
                  },
                }}
                onPolygonComplete={handlePolygonComplete}
              />
            </GoogleMap>
          )}
        </div>
      </div>
    </div>
  );
}
