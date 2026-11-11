import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [PassportModule, ProfilesModule],
  providers: [JwtStrategy],
  exports: [JwtStrategy],
})
export class AuthModule {}
