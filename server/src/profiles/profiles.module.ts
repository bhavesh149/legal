import { Module } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [ProfilesService, PrismaService],
  controllers: [ProfilesController],
  exports: [ProfilesService],
})
export class ProfilesModule {}
