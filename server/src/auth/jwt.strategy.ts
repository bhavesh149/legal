import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { ProfilesService } from '../profiles/profiles.service';

export interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  aud?: string | string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  private static readonly logger = new Logger('JwtStrategy');

  constructor(
    configService: ConfigService,
    private readonly profilesService: ProfilesService,
  ) {
    const jwksUri = configService.get<string>('supabase.jwksUrl');
    if (!jwksUri) throw new Error('SUPABASE_JWKS_URL is not configured');

    JwtStrategy.logger.log(`Using JWKS URI: ${jwksUri}`);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Fetch the RS256 public key dynamically from Supabase's JWKS endpoint.
      // Caches keys locally so it doesn't fetch on every request.
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri,
      }),
      algorithms: ['ES256'],
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    JwtStrategy.logger.debug(`validate — sub=${payload.sub} email=${payload.email ?? '(none)'}`);
    if (!payload.sub) {
      throw new UnauthorizedException('Missing sub claim in token');
    }
    const email = payload.email ?? '';
    const profile = await this.profilesService.findOrCreate(payload.sub, email);
    return { id: profile.id, email: profile.email };
  }
}
