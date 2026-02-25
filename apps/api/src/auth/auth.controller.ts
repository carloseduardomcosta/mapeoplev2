import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { User } from '@prisma/client';

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ─── GET /api/auth/google ─────────────────────────────────────────────────
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Passport redireciona para o Google — sem corpo de resposta
  }

  // ─── GET /api/auth/google/callback ────────────────────────────────────────
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const isProd = process.env.NODE_ENV === 'production';

    try {
      const tokens = await this.authService.login(req.user as User, req.ip);

      // Refresh token em cookie httpOnly (não acessível via JS)
      res.cookie('refresh_token', tokens.refreshToken, {
        ...COOKIE_OPTS,
        secure: isProd,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Auth token em cookie com duração de 15 min
      res.cookie('auth_token', tokens.accessToken, {
        ...COOKIE_OPTS,
        secure: isProd,
        maxAge: 15 * 60 * 1000,
      });

      // Redireciona para o frontend; token também na URL para facilitar o boot do cliente
      res.redirect(`${frontendUrl}/auth/callback?token=${tokens.accessToken}`);
    } catch {
      res.redirect(`${frontendUrl}/auth/error?code=acesso_negado`);
    }
  }

  // ─── POST /api/auth/refresh ───────────────────────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request, @Res() res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const token = dto.refreshToken ?? (req.cookies as Record<string, string>)?.refresh_token;

    if (!token) throw new UnauthorizedException('Refresh token não fornecido.');

    const tokens = await this.authService.refresh(token);

    // Atualiza cookies com novos tokens
    res.cookie('refresh_token', tokens.refreshToken, {
      ...COOKIE_OPTS,
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('auth_token', tokens.accessToken, {
      ...COOKIE_OPTS,
      secure: isProd,
      maxAge: 15 * 60 * 1000,
    });

    res.json({ accessToken: tokens.accessToken, user: tokens.user });
  }

  // ─── POST /api/auth/logout ────────────────────────────────────────────────
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: User, @Req() req: Request, @Res() res: Response) {
    await this.authService.logout(user.id, req.ip);
    res.clearCookie('auth_token', COOKIE_OPTS);
    res.clearCookie('refresh_token', COOKIE_OPTS);
    res.json({ message: 'Logout realizado com sucesso.' });
  }

  // ─── POST /api/auth/set-token ─────────────────────────────────────────────
  @Post('set-token')
  setToken(@Body('token') token: string, @Res() res: Response) {
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 min
    });
    return res.json({ ok: true });
  }

  // ─── GET /api/auth/me ─────────────────────────────────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User) {
    return this.authService.getMe(user.id);
  }
}
