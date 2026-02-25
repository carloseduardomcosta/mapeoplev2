import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditEventType, Role, User } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { SendInviteDto } from './dto/send-invite.dto';
import { ChangeRoleDto } from './dto/change-role.dto';

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── POST /invites/send ───────────────────────────────────────────────────

  async sendInvite(dto: SendInviteDto, admin: User, ipAddress?: string) {
    const { email } = dto;

    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing?.isActive) {
      throw new BadRequestException('Este e-mail já possui conta ativa.');
    }

    const inviteToken = randomUUID();
    const inviteExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

    if (existing) {
      // Reenvio de convite para usuário já cadastrado mas inativo
      await this.prisma.user.update({
        where: { email },
        data: { inviteToken, inviteExpires },
      });
    } else {
      await this.prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
          isActive: false,
          role: Role.VOLUNTARIO,
          inviteToken,
          inviteExpires,
        },
      });
    }

    await this.sendInviteEmail(email, inviteToken);

    await this.prisma.auditLog.create({
      data: {
        eventType: AuditEventType.INVITE_SENT,
        userId: admin.id,
        ipAddress,
        metadata: { invitedEmail: email },
      },
    });

    this.logger.log(`Convite enviado para ${email} por ${admin.email}`);
    return { message: `Convite enviado para ${email}.` };
  }

  // ─── GET /invites/accept/:token ───────────────────────────────────────────

  async acceptInvite(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { inviteToken: token },
    });

    if (!user) {
      throw new NotFoundException('Token de convite inválido.');
    }

    if (!user.inviteExpires || user.inviteExpires < new Date()) {
      throw new BadRequestException('Token de convite expirado. Solicite um novo convite.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        inviteToken: null,
        inviteExpires: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: AuditEventType.INVITE_ACCEPTED,
        userId: user.id,
        metadata: { email: user.email },
      },
    });

    this.logger.log(`Convite aceito: ${user.email}`);
    return { message: 'Conta ativada com sucesso! Faça login para continuar.' };
  }

  // ─── GET /invites/pending ─────────────────────────────────────────────────

  async listPending() {
    return this.prisma.user.findMany({
      where: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        inviteExpires: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── PATCH /invites/:userId/approve ──────────────────────────────────────

  async approveUser(userId: string, admin: User, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`Usuário ${userId} não encontrado.`);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true, inviteToken: null, inviteExpires: null },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: AuditEventType.INVITE_ACCEPTED,
        userId: admin.id,
        ipAddress,
        metadata: { approvedUserId: userId, approvedEmail: user.email, manual: true },
      },
    });

    this.logger.log(`Usuário ${user.email} aprovado manualmente por ${admin.email}`);
    return updated;
  }

  // ─── PATCH /invites/:userId/role ──────────────────────────────────────────

  async changeRole(userId: string, dto: ChangeRoleDto, admin: User, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`Usuário ${userId} não encontrado.`);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: AuditEventType.ACCESS_DENIED, // reutilizando — sem evento específico para role change
        userId: admin.id,
        ipAddress,
        metadata: {
          action: 'ROLE_CHANGED',
          targetUserId: userId,
          from: user.role,
          to: dto.role,
        },
      },
    });

    this.logger.log(`Role de ${user.email} alterado de ${user.role} para ${dto.role} por ${admin.email}`);
    return updated;
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────

  private async sendInviteEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const acceptUrl = `${frontendUrl}/invite/accept?token=${token}`;
    const fromAddress = this.config.get<string>('SMTP_FROM', 'Mapeople <noreply@mapeople.app>');

    const transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f6f8; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 32px 40px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Mapeople 2.0</h1>
      <p style="color: #bfdbfe; margin: 6px 0 0; font-size: 14px;">Sistema de Mapeamento Voluntário — Timbó/SC</p>
    </div>
    <div style="padding: 32px 40px;">
      <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 12px;">Você foi convidado!</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Você recebeu um convite para acessar o <strong>Mapeople 2.0</strong>.
        Clique no botão abaixo para ativar sua conta e começar a colaborar com o mapeamento voluntário.
      </p>
      <a href="${acceptUrl}"
         style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none;
                padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
        Ativar minha conta
      </a>
      <p style="color: #94a3b8; font-size: 13px; margin: 24px 0 0;">
        ⚠️ Este link expira em <strong>48 horas</strong>. Caso não reconheça este convite, ignore este e-mail.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        Se o botão não funcionar, copie e cole este link no navegador:<br>
        <span style="color: #2563eb;">${acceptUrl}</span>
      </p>
    </div>
  </div>
</body>
</html>`;

    try {
      await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject: 'Você foi convidado para o Mapeople 2.0',
        html,
      });
      this.logger.log(`Email de convite enviado para ${email}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar email para ${email}`, err);
      throw new BadRequestException('Falha ao enviar e-mail de convite. Verifique as configurações SMTP.');
    }
  }
}
