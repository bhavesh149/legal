import { createClient } from './supabase/client';
import { API_BASE } from './utils';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  // getSession() reads from localStorage and may be stale.
  // refreshSession() forces a token refresh if it's expired, then return it.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  // If the token is about to expire (within 60s), refresh it proactively.
  const expiresAt = session.expires_at ?? 0;
  const nowSecs = Math.floor(Date.now() / 1000);
  if (expiresAt - nowSecs < 60) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    const newToken = refreshed.session?.access_token;
    if (!newToken) throw new Error('Session refresh failed');
    return { Authorization: `Bearer ${newToken}` };
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export interface ScanResult {
  safety_score: number;
  summary: string;
  risk_area_count: number;
  disclaimer: string;
}

export interface AnalyzeResult {
  job_id: string;
  document_id: string;
  status: string;
}

export interface ClauseFinding {
  category: string;
  severity: 'red' | 'yellow' | 'green';
  title: string;
  explanation: string;
  market_comparison: string;
  suggested_redline: string;
  quoted_text: string;
  confidence: number;
}

export interface RiskReport {
  safetyScore: number;
  summary: string;
  findings: ClauseFinding[];
  disclaimer: string;
  createdAt: string;
}

export interface DocumentStatus {
  documentId: string;
  filename: string;
  status: 'uploaded' | 'processing' | 'complete' | 'failed';
  createdAt: string;
  report: RiskReport | null;
}

export interface RiskProfile {
  role?: string;
  risk_tolerance?: 'conservative' | 'balanced' | 'aggressive';
  priorities?: string[];
}

export async function scanDocument(file: File): Promise<ScanResult> {
  const form = new FormData();
  form.append('file', file);
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/documents/scan`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) throw new Error(`Scan failed: ${res.statusText}`);
  return res.json();
}

export async function analyzeDocument(
  file: File,
  profile: RiskProfile,
  category?: string,
): Promise<AnalyzeResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('profile', JSON.stringify(profile));
  if (category) form.append('category', category);
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) throw new Error(`Analyze failed: ${res.statusText}`);
  return res.json();
}

export async function getDocumentStatus(documentId: string): Promise<DocumentStatus> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/documents/${documentId}/status`, { headers });
  if (!res.ok) throw new Error(`Status fetch failed: ${res.statusText}`);
  return res.json();
}

export async function listDocuments(): Promise<DocumentStatus[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/documents`, { headers });
  if (!res.ok) throw new Error(`List failed: ${res.statusText}`);
  return res.json();
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations: unknown[];
  created_at: string;
}

export async function getChatHistory(documentId: string): Promise<ChatMessage[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/documents/${documentId}/messages`, { headers });
  if (!res.ok) return [];
  return res.json();
}

export async function streamChat(
  documentId: string,
  question: string,
  onToken: (token: string) => void,
  onCitations: (citations: unknown[]) => void,
  onDone: () => void,
): Promise<void> {
  const headers = await getAuthHeaders();
  const token = headers.Authorization.replace('Bearer ', '');

  const res = await fetch(`${API_BASE}/documents/${documentId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  });

  if (!res.body) {
    onDone();
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('event: token')) continue;
      if (line.startsWith('event: citations')) continue;
      if (line.startsWith('event: done')) {
        onDone();
        continue;
      }
      if (line.startsWith('data: ')) {
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (typeof parsed === 'string') {
            onToken(parsed);
          } else if (Array.isArray(parsed)) {
            onCitations(parsed);
          }
        } catch {
          onToken(raw);
        }
      }
    }
  }
  onDone();
}
