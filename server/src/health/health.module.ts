import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [PrismaService],
  controllers: [HealthController],
  // ConfigService is provided globally via ConfigModule.forRoot({ isGlobal: true })
})
export class HealthModule {}
