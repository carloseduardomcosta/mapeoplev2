import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/auth'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const allCookies = req.cookies.getAll();
  const token = req.cookies.get('auth_token')?.value;

  console.log('[middleware] url:', req.nextUrl.toString());
  console.log('[middleware] cookies:', allCookies.map((c) => `${c.name}=${c.value.slice(0, 10)}...`));
  console.log('[middleware] auth_token found:', !!token);

  if (isPublic(pathname)) {
    console.log('[middleware] decisão: público → passa');
    return NextResponse.next();
  }

  if (!token) {
    console.log('[middleware] decisão: sem token → redirect /login');
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    return NextResponse.redirect(loginUrl);
  }

  console.log('[middleware] decisão: token ok → passa');
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
