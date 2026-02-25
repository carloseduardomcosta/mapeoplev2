'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/app/dashboard/LogoutButton';
import OnlineUsersPanel from './OnlineUsersPanel';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface NavLink {
  href: string;
  label: string;
  adminOnly?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Início' },
  { href: '/residents', label: 'Moradores' },
  { href: '/territories', label: 'Territórios' },
  { href: '/map', label: 'Mapa' },
  { href: '/chat', label: 'Chat' },
  { href: '/audit', label: 'Auditoria', adminOnly: true },
];

export default function NavBar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);

  useEffect(() => {
    fetchWithAuth('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setUserRole(data.role);
          setUserImage(data.image);
        }
      })
      .catch(() => {});
  }, []);

  const isAdmin = userRole === 'ADMIN';
  const visibleLinks = NAV_LINKS.filter((link) => !link.adminOnly || isAdmin);

  return (
    <nav className="bg-slate-900/80 backdrop-blur-sm border-b border-white/10 px-4 py-3 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm hidden sm:block">Mapeople 2.0</span>
          </Link>

          {visibleLinks.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors duration-150 ${
                  active
                    ? 'text-white border-b-2 border-blue-400 pb-0.5'
                    : 'text-blue-300 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <OnlineUsersPanel />

          {/* Profile link */}
          <Link
            href="/profile"
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            title="Meu Perfil"
          >
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userImage}
                alt="Perfil"
                className="w-7 h-7 rounded-full border border-white/20"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-blue-500/30 border border-white/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </Link>

          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
