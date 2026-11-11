import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('supabase-jwt') {
  private readonly logger = new Logger('JwtAuthGuard');

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,
    info: Error | string | null,
  ): TUser {
    if (err || !user) {
      // Log the real reason so it appears in the NestJS console
      this.logger.warn(
        `Auth failed — err=${err?.message ?? 'none'} info=${
          info instanceof Error ? info.message : String(info ?? 'none')
        }`,
      );
      throw err ?? new UnauthorizedException(
        info instanceof Error ? info.message : (info ?? 'Unauthorized'),
      );
    }
    return user;
  }
}
