import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interceptor que sanitiza dados sensíveis nas respostas da API.
 * Remove ou mascara campos que não devem ser expostos conforme LGPD.
 */
@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SanitizeInterceptor.name);

  // Campos que devem ser removidos das respostas
  private readonly SENSITIVE_FIELDS = [
    'inviteToken',
    'inviteExpires',
    'googleId',
    'refreshTokens',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => this.sanitize(data)),
    );
  }

  private sanitize(data: any): any {
    if (data === null || data === undefined) return data;
    if (Array.isArray(data)) return data.map((item) => this.sanitize(item));
    if (typeof data !== 'object') return data;

    const sanitized = { ...data };

    for (const field of this.SENSITIVE_FIELDS) {
      if (field in sanitized) {
        delete sanitized[field];
      }
    }

    // Recursively sanitize nested objects
    for (const key of Object.keys(sanitized)) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    }

    return sanitized;
  }
}
