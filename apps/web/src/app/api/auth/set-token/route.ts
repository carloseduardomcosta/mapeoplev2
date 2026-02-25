import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  console.log('[set-token] token recebido (20 chars):', token ? token.slice(0, 20) + '...' : 'NENHUM');

  if (!token || typeof token !== 'string') {
    console.log('[set-token] token inválido → 400');
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
  }

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 15 * 60, // 15 min — alinhado com expiração do JWT
  };

  console.log('[set-token] gravando cookie auth_token com opções:', JSON.stringify(cookieOptions));

  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth_token', token, cookieOptions);

  console.log('[set-token] cookie gravado, Set-Cookie header:', res.headers.get('set-cookie'));

  return res;
}
