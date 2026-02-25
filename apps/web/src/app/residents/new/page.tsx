'use client';

import { useRouter } from 'next/navigation';
import ResidentForm from '../ResidentForm';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

export default function NewResidentPage() {
  const router = useRouter();

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
    const res = await fetchWithAuth('/api/residents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push('/residents');
      return { ok: true };
    }

    const body = await res.json().catch(() => ({}));
    const message =
      Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? 'Erro ao cadastrar morador.');
    return { ok: false, message };
  }

  return <ResidentForm onSubmit={handleSubmit} isNew />;
}
