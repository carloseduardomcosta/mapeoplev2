import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import NavBar from '@/components/NavBar';
import InvitesClient from './InvitesClient';
import { CurrentUser } from '@/types/resident';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? 'http://api:3001';

export interface PendingUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'VOLUNTARIO';
  status: string;
  createdAt: string;
}

async function getMe(token: string): Promise<CurrentUser | null> {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getPendingUsers(token: string): Promise<PendingUser[]> {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/invites/pending`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function InvitesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) redirect('/login');

  const user = await getMe(token);
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const pendingUsers = await getPendingUsers(token);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
      <NavBar />
      <InvitesClient initialPendingUsers={pendingUsers} />
    </div>
  );
}
