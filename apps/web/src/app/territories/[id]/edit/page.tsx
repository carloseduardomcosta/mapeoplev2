'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import TerritoryForm from '../../TerritoryForm';
import { Territory, PolygonPoint } from '@/types/territory';

export default function EditTerritoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [territory, setTerritory] = useState<Territory | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchWithAuth(`/api/territories/${id}`)
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); return; }
        setTerritory(await res.json());
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: {
    number: number;
    name: string;
    description?: string;
    polygon: PolygonPoint[];
    color: string;
  }) {
    const res = await fetchWithAuth(`/api/territories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push('/territories');
      return { ok: true };
    }

    const body = await res.json().catch(() => ({}));
    const message =
      Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? 'Erro ao atualizar território.');
    return { ok: false, message };
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !territory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
        <p className="text-red-300">Território não encontrado.</p>
      </div>
    );
  }

  return <TerritoryForm initial={territory} onSubmit={handleSubmit} />;
}
