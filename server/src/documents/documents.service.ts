import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiEngineClientService, RiskProfile } from '../ai-engine-client/ai-engine-client.service';
import { DocumentStatus, JobStatus } from '@prisma/client';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineClientService,
  ) {}

  async scan(fileBuffer: Buffer, filename: string, userId: string) {
    return this.aiEngine.scan(fileBuffer, filename, userId);
  }

  async analyze(
    fileBuffer: Buffer,
    filename: string,
    profile: RiskProfile,
    userId: string,
    category?: string,
  ) {
    const enqueued = await this.aiEngine.analyze(fileBuffer, filename, profile, userId, category);

    // Persist Document + AnalysisJob so we can track ownership and result
    await this.prisma.document.create({
      data: {
        id: enqueued.document_id,
        profileId: userId,
        filename,
        category: category ?? null,
        status: DocumentStatus.processing,
        job: {
          create: {
            id: enqueued.job_id,
            status: JobStatus.queued,
          },
        },
      },
    });

    return enqueued;
  }

  async getStatus(documentId: string, userId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { job: true, report: true },
    });

    if (!doc) throw new NotFoundException('Document not found');
    if (doc.profileId !== userId) throw new ForbiddenException('Access denied');

    // If already resolved locally, return immediately (avoids re-polling the AI engine)
    if (doc.status === DocumentStatus.complete && doc.report) {
      return this.formatStatus(doc);
    }

    if (doc.status === DocumentStatus.failed) {
      return this.formatStatus(doc);
    }

    // Poll-through to AI engine for live status
    if (!doc.job) return this.formatStatus(doc);

    const aiStatus = await this.aiEngine.getJobStatus(doc.job.id, userId);

    if (aiStatus.status === 'complete' && aiStatus.report) {
      const report = aiStatus.report;
      // Use interactive transaction so all three writes are atomic
      const updatedDoc = await this.prisma.$transaction(async (tx) => {
        await tx.analysisJob.update({
          where: { id: doc.job!.id },
          data: { status: JobStatus.complete, completedAt: new Date() },
        });
        // Upsert the report so a re-poll never fails with unique constraint
        await tx.riskReport.upsert({
          where: { documentId },
          create: {
            documentId,
            safetyScore: report.safety_score,
            summary: report.summary,
            findings: report.findings as object[],
            disclaimer: report.disclaimer,
          },
          update: {
            safetyScore: report.safety_score,
            summary: report.summary,
            findings: report.findings as object[],
            disclaimer: report.disclaimer,
          },
        });
        return tx.document.update({
          where: { id: documentId },
          data: { status: DocumentStatus.complete },
          include: { job: true, report: true },
        });
      });
      return this.formatStatus(updatedDoc);
    }

    if (aiStatus.status === 'failed') {
      await this.prisma.$transaction(async (tx) => {
        await tx.document.update({
          where: { id: documentId },
          data: { status: DocumentStatus.failed },
        });
        await tx.analysisJob.update({
          where: { id: doc.job!.id },
          data: { status: JobStatus.failed, completedAt: new Date() },
        });
      });
    } else if (aiStatus.status === 'queued' || aiStatus.status === 'processing') {
      const localJobStatus =
        aiStatus.status === 'queued' ? JobStatus.queued : JobStatus.processing;
      await this.prisma.analysisJob.update({
        where: { id: doc.job.id },
        data: { status: localJobStatus },
      });
    }

    return {
      documentId,
      status: aiStatus.status,
      report: null,
    };
  }

  async listDocuments(userId: string) {
    const docs = await this.prisma.document.findMany({
      where: { profileId: userId },
      include: { report: true, job: true },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((d) => this.formatStatus(d));
  }

  private formatStatus(doc: {
    id: string;
    filename: string;
    status: DocumentStatus;
    createdAt: Date;
    report?: {
      safetyScore: number;
      summary: string;
      findings: unknown;
      disclaimer: string;
      createdAt: Date;
    } | null;
    job?: { status: JobStatus } | null;
  }) {
    return {
      documentId: doc.id,
      filename: doc.filename,
      status: doc.status,
      createdAt: doc.createdAt,
      report: doc.report
        ? {
            safetyScore: doc.report.safetyScore,
            summary: doc.report.summary,
            findings: doc.report.findings,
            disclaimer: doc.report.disclaimer,
            createdAt: doc.report.createdAt,
          }
        : null,
    };
  }
}
