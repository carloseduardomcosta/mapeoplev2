'use client';

import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import TerritoryForm from '../TerritoryForm';
import { PolygonPoint } from '@/types/territory';

export default function NewTerritoryPage() {
  const router = useRouter();

  async function handleSubmit(data: {
    number: number;
    name: string;
    description?: string;
    polygon: PolygonPoint[];
    color: string;
  }) {
    const res = await fetchWithAuth('/api/territories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push('/territories');
      return { ok: true };
    }

    const body = await res.json().catch(() => ({}));
    const message =
      Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? 'Erro ao criar território.');
    return { ok: false, message };
  }

  return <TerritoryForm isNew onSubmit={handleSubmit} />;
}
