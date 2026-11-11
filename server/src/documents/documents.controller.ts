import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { DocumentsService } from './documents.service';
import type { RiskProfile } from '../ai-engine-client/ai-engine-client.service';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /** Free quick scan — no persistence, no queue */
  @Post('scan')
  @UseInterceptors(FileInterceptor('file'))
  async scan(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.mimetype !== 'application/pdf')
      throw new BadRequestException('Only PDF files are accepted');
    return this.documentsService.scan(file.buffer, file.originalname, user.id);
  }

  /** Enqueue full analysis — persists Document + AnalysisJob */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async analyze(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
    @Body('profile') profileJson: string,
    @Body('category') category: string | undefined,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.mimetype !== 'application/pdf')
      throw new BadRequestException('Only PDF files are accepted');

    let profile: RiskProfile = {};
    if (profileJson) {
      try {
        profile = JSON.parse(profileJson) as RiskProfile;
      } catch {
        throw new BadRequestException('Invalid profile JSON');
      }
    }

    return this.documentsService.analyze(
      file.buffer,
      file.originalname,
      profile,
      user.id,
      category,
    );
  }

  /** Poll-through status: checks Postgres first, then AI engine if still in-flight */
  @Get(':id/status')
  async getStatus(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.getStatus(id, user.id);
  }

  /** List all documents for this user */
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return this.documentsService.listDocuments(user.id);
  }
}
