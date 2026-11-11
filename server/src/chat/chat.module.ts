import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { AiEngineClientModule } from '../ai-engine-client/ai-engine-client.module';

@Module({
  imports: [AiEngineClientModule],
  controllers: [ChatController],
})
export class ChatModule {}
