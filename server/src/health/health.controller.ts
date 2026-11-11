import { Controller, Get, Headers } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import * as jwt from 'jsonwebtoken';

@Controller('healthz')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', postgres: 'ok' };
    } catch {
      return { status: 'degraded', postgres: 'error' };
    }
  }

  /** Debug-only: verify the bearer token and return the decoded payload or the error.
   *  Remove this in production. */
  @Get('jwt-debug')
  debugJwt(@Headers('authorization') authHeader: string) {
    const secret = this.configService.get<string>('supabase.jwtSecret') ?? '';
    const token = authHeader?.replace('Bearer ', '') ?? '';
    if (!token) return { error: 'No Authorization header' };
    // Show the raw claims without verifying (so we can see what's in the token)
    const decoded = jwt.decode(token, { complete: true });
    // Try to verify with the raw secret string (what Supabase gotrue uses)
    try {
      const verified = jwt.verify(token, secret, { algorithms: ['HS256'] });
      return { ok: true, payload: verified };
    } catch (e: unknown) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        decoded_header: decoded?.header,
        decoded_payload: decoded?.payload,
        secret_length: secret.length,
        secret_prefix: secret.slice(0, 8),
      };
    }
  }
}

