import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const internalApiUrl = process.env.INTERNAL_API_URL ?? 'http://api:3001';
  const refreshToken = req.cookies.get('refresh_token')?.value;

  console.log('[refresh-route] refresh_token presente:', !!refreshToken);

  if (!refreshToken) {
    return NextResponse.json({ error: 'Sem refresh token' }, { status: 401 });
  }

  try {
    const apiRes = await fetch(`${internalApiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refresh_token=${refreshToken}`,
      },
      body: JSON.stringify({}),
      cache: 'no-store',
    });

    console.log('[refresh-route] NestJS /api/auth/refresh status:', apiRes.status);

    if (!apiRes.ok) {
      const body = await apiRes.text().catch(() => '');
      console.log('[refresh-route] refresh falhou, body:', body);
      return NextResponse.json({ error: 'Refresh inválido ou expirado' }, { status: 401 });
    }

    const data = await apiRes.json();
    const newAccessToken: string = data.accessToken;
    console.log('[refresh-route] novo access token (20 chars):', newAccessToken.slice(0, 20) + '...');

    const isProd = process.env.NODE_ENV === 'production';
    const res = NextResponse.json({ ok: true });

    // Seta novo auth_token
    res.cookies.set('auth_token', newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    // Extrai e repassa o refresh_token rotacionado do NestJS (pode vir em múltiplos Set-Cookie)
    const setCookieHeader = apiRes.headers.get('set-cookie');
    if (setCookieHeader) {
      const match = setCookieHeader.match(/refresh_token=([^;]+)/);
      if (match) {
        console.log('[refresh-route] atualizando refresh_token rotacionado');
        res.cookies.set('refresh_token', match[1], {
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60,
        });
      }
    }

    console.log('[refresh-route] Set-Cookie header final:', res.headers.get('set-cookie'));
    return res;
  } catch (err) {
    console.log('[refresh-route] erro interno:', err);
    return NextResponse.json({ error: 'Erro interno no refresh' }, { status: 500 });
  }
}
