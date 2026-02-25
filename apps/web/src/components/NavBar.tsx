'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/app/dashboard/LogoutButton';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Início' },
  { href: '/residents', label: 'Moradores' },
  { href: '/territories', label: 'Territórios' },
  { href: '/map', label: 'Mapa' },
];

export default function NavBar() {
  const pathname = usePathname();

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

          {NAV_LINKS.map((link) => {
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

        <LogoutButton />
      </div>
    </nav>
  );
}
