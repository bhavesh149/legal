import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaService } from '../prisma.service';
import { AiEngineClientModule } from '../ai-engine-client/ai-engine-client.module';

@Module({
  imports: [AiEngineClientModule],
  providers: [DocumentsService, PrismaService],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
