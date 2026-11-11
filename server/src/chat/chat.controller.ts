import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AiEngineClientService } from '../ai-engine-client/ai-engine-client.service';

@Controller('documents/:documentId/messages')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly aiEngine: AiEngineClientService) {}

  /**
   * SSE passthrough proxy — streams tokens directly to the browser without buffering.
   * The AI engine emits: event: token / event: citations / event: done
   */
  @Post()
  async chat(
    @Param('documentId') documentId: string,
    @Body('question') question: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    if (!question?.trim()) throw new BadRequestException('question is required');

    const upstreamRes = await this.aiEngine.streamChat(documentId, question, user.id);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering in production

    if (!upstreamRes.body) {
      res.write('event: done\ndata: \n\n');
      res.end();
      return;
    }

    // Pipe the upstream SSE stream directly to the response
    const reader = upstreamRes.body.getReader();
    const decoder = new TextDecoder();

    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } finally {
        res.end();
      }
    };

    pump().catch(() => res.end());
  }

  @Get()
  async getHistory(
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.aiEngine.getChatHistory(documentId, user.id);
  }

  @Delete()
  async clearHistory(
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    await this.aiEngine.deleteChatHistory(documentId, user.id);
    res.status(204).send();
  }
}
