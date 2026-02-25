'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { z } from 'zod';
import { Resident, ResidentStatus } from '@/types/resident';
import StatusBadge from '@/components/StatusBadge';
import NavBar from '@/components/NavBar';

const LIBRARIES: ('places')[] = ['places'];

const STATUS_OPTIONS: { value: ResidentStatus; label: string }[] = [
  { value: 'NAO_CONTATADO', label: 'Não Contatado' },
  { value: 'CONTATADO', label: 'Contatado' },
  { value: 'AUSENTE', label: 'Ausente' },
  { value: 'RECUSOU', label: 'Recusou' },
  { value: 'INTERESSADO', label: 'Interessado' },
];

const schema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  address: z.string().min(5, 'Endereço inválido'),
  lat: z.number({ required_error: 'Selecione um endereço válido pelo autocomplete' }),
  lng: z.number({ required_error: 'Selecione um endereço válido pelo autocomplete' }),
  phone: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['NAO_CONTATADO', 'CONTATADO', 'AUSENTE', 'RECUSOU', 'INTERESSADO']),
  visitDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ResidentFormProps {
  initialValues?: Resident | null;
  onSubmit: (data: FormData) => Promise<{ ok: boolean; message?: string }>;
  isNew?: boolean;
}

export default function ResidentForm({ initialValues, onSubmit, isNew = true }: ResidentFormProps) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  });

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [form, setForm] = useState<Partial<FormData>>({
    fullName: initialValues?.fullName ?? '',
    address: initialValues?.address ?? '',
    lat: initialValues?.lat,
    lng: initialValues?.lng,
    phone: initialValues?.phone ?? '',
    notes: initialValues?.notes ?? '',
    status: initialValues?.status ?? 'NAO_CONTATADO',
    visitDate: initialValues?.visitDate
      ? new Date(initialValues.visitDate).toISOString().split('T')[0]
      : '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [addressInput, setAddressInput] = useState(initialValues?.address ?? '');

  function handleChange(field: keyof FormData, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function onAutocompleteLoad(ac: google.maps.places.Autocomplete) {
    autocompleteRef.current = ac;
  }

  function onPlaceChanged() {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const address = place.formatted_address ?? addressInput;

    setAddressInput(address);
    setForm((prev) => ({ ...prev, address, lat, lng }));
    setErrors((prev) => ({ ...prev, address: undefined, lat: undefined, lng: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const parsed = schema.safeParse({
      ...form,
      phone: form.phone || undefined,
      notes: form.notes || undefined,
      visitDate: form.visitDate || undefined,
    });

    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      parsed.error.errors.forEach((err) => {
        const key = err.path[0] as keyof FormData;
        fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit(parsed.data);
      if (!result.ok) {
        setSubmitError(result.message ?? 'Erro ao salvar. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-blue-300/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors';
  const errorClass = 'text-red-400 text-xs mt-1';
  const labelClass = 'block text-blue-200 text-sm font-medium mb-1.5';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
      <NavBar />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Cabeçalho */}
        <div className="mb-6">
          <Link
            href="/residents"
            className="inline-flex items-center gap-1.5 text-blue-300 hover:text-white text-sm transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para Moradores
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {isNew ? 'Novo Morador' : 'Editar Morador'}
          </h1>
          <p className="text-blue-300 text-sm mt-1">
            {isNew ? 'Preencha os dados do morador' : 'Atualize os dados do morador'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl space-y-5"
        >
          {/* Nome */}
          <div>
            <label className={labelClass}>
              Nome Completo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.fullName ?? ''}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="Ex: João da Silva"
              className={inputClass}
            />
            {errors.fullName && <p className={errorClass}>{errors.fullName}</p>}
          </div>

          {/* Endereço com Google Places Autocomplete (API clássica) */}
          <div>
            <label className={labelClass}>
              Endereço <span className="text-red-400">*</span>
            </label>
            {isLoaded ? (
              <Autocomplete
                onLoad={onAutocompleteLoad}
                onPlaceChanged={onPlaceChanged}
                options={{ componentRestrictions: { country: 'br' } }}
              >
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => {
                    setAddressInput(e.target.value);
                    setForm((prev) => ({ ...prev, address: e.target.value, lat: undefined, lng: undefined }));
                  }}
                  placeholder="Digite o endereço e selecione uma sugestão..."
                  className={inputClass}
                />
              </Autocomplete>
            ) : (
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="Carregando Google Maps..."
                disabled
                className={inputClass + ' opacity-50'}
              />
            )}
            {errors.address && <p className={errorClass}>{errors.address}</p>}
            {errors.lat && <p className={errorClass}>{errors.lat}</p>}
            {form.lat && form.lng && (
              <p className="text-green-400 text-xs mt-1">
                Coordenadas: {form.lat.toFixed(6)}, {form.lng.toFixed(6)}
              </p>
            )}
          </div>

          {/* Telefone */}
          <div>
            <label className={labelClass}>Telefone</label>
            <input
              type="tel"
              value={form.phone ?? ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="(47) 99999-9999"
              className={inputClass}
            />
          </div>

          {/* Status */}
          <div>
            <label className={labelClass}>
              Status <span className="text-red-400">*</span>
            </label>
            <select
              value={form.status ?? 'NAO_CONTATADO'}
              onChange={(e) => handleChange('status', e.target.value as ResidentStatus)}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-800">
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="mt-1.5">
              <StatusBadge status={(form.status as ResidentStatus) ?? 'NAO_CONTATADO'} />
            </div>
          </div>

          {/* Data da visita */}
          <div>
            <label className={labelClass}>Data da Visita</label>
            <input
              type="date"
              value={form.visitDate ?? ''}
              onChange={(e) => handleChange('visitDate', e.target.value)}
              className={inputClass + ' [color-scheme:dark]'}
            />
          </div>

          {/* Observações */}
          <div>
            <label className={labelClass}>Observações</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Anotações sobre o morador ou visita..."
              rows={3}
              className={inputClass + ' resize-none'}
            />
          </div>

          {/* Erro geral */}
          {submitError && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-300 text-sm">{submitError}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !isLoaded}
              className="flex-1 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                isNew ? 'Cadastrar Morador' : 'Salvar Alterações'
              )}
            </button>
            <Link
              href="/residents"
              className="px-4 py-2.5 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
