'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ResidentForm from '../../ResidentForm';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { Resident } from '@/types/resident';
import NavBar from '@/components/NavBar';

export default function EditResidentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [resident, setResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchWithAuth(`/api/residents/${id}`)
      .then(async (res) => {
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) return;
        const data: Resident = await res.json();
        setResident(data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: {
    fullName: string;
    address: string;
    lat: number;
    lng: number;
    phone?: string;
    notes?: string;
    status: string;
    visitDate?: string;
  }) {
    const res = await fetchWithAuth(`/api/residents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push('/residents');
      return { ok: true };
    }

    const body = await res.json().catch(() => ({}));
    const message =
      Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? 'Erro ao salvar.');
    return { ok: false, message };
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
        <NavBar />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (notFound || !resident) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
        <NavBar />
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <p className="text-white text-xl font-semibold">Morador não encontrado</p>
          <button
            onClick={() => router.push('/residents')}
            className="mt-4 text-blue-300 hover:text-white text-sm transition-colors"
          >
            Voltar para Moradores
          </button>
        </div>
      </div>
    );
  }

  return <ResidentForm initialValues={resident} onSubmit={handleSubmit} isNew={false} />;
}
