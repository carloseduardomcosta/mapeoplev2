import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, AuditEventType } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user, ip } = ctx.switchToHttp().getRequest();

    if (!user || !requiredRoles.includes(user.role)) {
      if (user?.id) {
        await this.prisma.auditLog.create({
          data: {
            userId: user.id,
            eventType: AuditEventType.ACCESS_DENIED,
            ipAddress: ip,
            metadata: {
              requiredRoles,
              userRole: user?.role ?? null,
              handler: ctx.getHandler().name,
            },
          },
        });
      }
      throw new ForbiddenException('Permissão insuficiente.');
    }

    return true;
  }
}
