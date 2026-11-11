import { Module } from '@nestjs/common';
import { AiEngineClientService } from './ai-engine-client.service';

@Module({
  providers: [AiEngineClientService],
  exports: [AiEngineClientService],
})
export class AiEngineClientModule {}
