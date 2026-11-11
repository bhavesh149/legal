import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';

export interface ScanResult {
  safety_score: number;
  summary: string;
  risk_area_count: number;
  disclaimer: string;
}

export interface AnalyzeJobEnqueued {
  job_id: string;
  document_id: string;
  status: string;
}

export interface SourceSpan {
  start: number;
  end: number;
}

export interface ClauseFinding {
  category: string;
  severity: 'red' | 'yellow' | 'green';
  title: string;
  explanation: string;
  market_comparison: string;
  suggested_redline: string;
  quoted_text: string;
  source_span: SourceSpan | null;
  confidence: number;
}

export interface AiRiskReport {
  safety_score: number;
  summary: string;
  findings: ClauseFinding[];
  disclaimer: string;
}

export interface JobStatusResult {
  job_id: string;
  document_id: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  report: AiRiskReport | null;
  error: string | null;
}

export interface RiskProfile {
  role?: string;
  risk_tolerance?: 'conservative' | 'balanced' | 'aggressive';
  priorities?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations: unknown[];
  created_at: string;
}

@Injectable()
export class AiEngineClientService {
  private readonly logger = new Logger(AiEngineClientService.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('aiEngine.baseUrl')!;
    this.token = this.configService.get<string>('aiEngine.internalToken')!;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
    };
  }

  private headersWithUser(userId: string): Record<string, string> {
    return { ...this.headers, 'X-User-Id': userId };
  }

  async scan(fileBuffer: Buffer, filename: string, userId: string): Promise<ScanResult> {
    const form = new FormData();
    form.append('file', fileBuffer, { filename, contentType: 'application/pdf' });

    const res = await fetch(`${this.baseUrl}/v1/scan`, {
      method: 'POST',
      headers: { ...this.headersWithUser(userId), ...form.getHeaders() },
      body: form.getBuffer() as unknown as BodyInit,
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`AI engine scan failed: ${res.status} ${text}`);
      throw new InternalServerErrorException('AI engine scan failed');
    }
    return res.json() as Promise<ScanResult>;
  }

  async analyze(
    fileBuffer: Buffer,
    filename: string,
    profile: RiskProfile,
    userId: string,
    category?: string,
  ): Promise<AnalyzeJobEnqueued> {
    const form = new FormData();
    form.append('file', fileBuffer, { filename, contentType: 'application/pdf' });
    form.append('profile', JSON.stringify(profile));
    if (category) form.append('category', category);

    const res = await fetch(`${this.baseUrl}/v1/analyze`, {
      method: 'POST',
      headers: { ...this.headersWithUser(userId), ...form.getHeaders() },
      body: form.getBuffer() as unknown as BodyInit,
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`AI engine analyze failed: ${res.status} ${text}`);
      throw new InternalServerErrorException('AI engine analyze failed');
    }
    return res.json() as Promise<AnalyzeJobEnqueued>;
  }

  async getJobStatus(jobId: string, userId: string): Promise<JobStatusResult> {
    const res = await fetch(`${this.baseUrl}/v1/jobs/${jobId}`, {
      headers: this.headersWithUser(userId),
    });
    if (!res.ok) {
      this.logger.error(`AI engine job status failed: ${res.status}`);
      throw new InternalServerErrorException('Failed to fetch job status');
    }
    return res.json() as Promise<JobStatusResult>;
  }

  async getChatHistory(documentId: string, userId: string): Promise<ChatMessage[]> {
    const res = await fetch(`${this.baseUrl}/v1/documents/${documentId}/messages`, {
      headers: this.headersWithUser(userId),
    });
    if (!res.ok) throw new InternalServerErrorException('Failed to fetch chat history');
    return res.json() as Promise<ChatMessage[]>;
  }

  async deleteChatHistory(documentId: string, userId: string): Promise<void> {
    await fetch(`${this.baseUrl}/v1/documents/${documentId}/messages`, {
      method: 'DELETE',
      headers: this.headersWithUser(userId),
    });
  }

  /** Returns the raw Response for SSE streaming (caller must handle the stream). */
  async streamChat(documentId: string, question: string, userId: string): Promise<Response> {
    return fetch(`${this.baseUrl}/v1/documents/${documentId}/messages`, {
      method: 'POST',
      headers: {
        ...this.headersWithUser(userId),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });
  }
}
