'use client';

export const dynamic = 'force-dynamic';

import { use, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getChatHistory, streamChat } from '@/lib/api';
import type { ChatMessage } from '@/lib/api';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Loader2, Bot, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Citation {
  chunk_id?: string;
  text?: string;
  score?: number;
}

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  streaming?: boolean;
}

function CitationChip({ citation, index }: { citation: Citation; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded bg-[#171A1E] text-[#CBA96B] text-[10px] px-1.5 py-0.5 font-mono font-bold ml-1 hover:bg-[#22272E] transition-colors border border-[#CBA96B]/30 cursor-pointer"
        title="View source excerpt"
      >
        [{index + 1}]
      </button>
      {open && citation.text && (
        <span className="absolute bottom-6 left-0 z-20 w-72 rounded-xl border border-[#22272E] bg-[#111417] p-3 shadow-2xl text-xs text-[#F1F3F4] leading-relaxed">
          <span className="font-semibold text-[#88929A] block mb-1">Source excerpt:</span>
          <span className="italic font-mono text-[11px] text-[#F1F3F4]">&ldquo;{citation.text}&rdquo;</span>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            className="mt-2 block text-[11px] text-[#CBA96B] hover:underline cursor-pointer font-semibold"
          >
            Close
          </button>
        </span>
      )}
    </span>
  );
}

function MarkdownMessage({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none
      prose-p:my-1.5 prose-p:leading-relaxed prose-p:text-[#F1F3F4]
      prose-headings:font-bold prose-headings:text-white prose-headings:mt-3 prose-headings:mb-1
      prose-strong:font-bold prose-strong:text-[#CBA96B]
      prose-ul:my-1.5 prose-ul:pl-5 prose-li:my-0.5
      prose-ol:my-1.5 prose-ol:pl-5
      prose-blockquote:border-l-2 prose-blockquote:border-[#CBA96B]/50 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-[#88929A]
      prose-code:bg-[#0B0D0F] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:text-[#E0C58A]
    ">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
      {streaming && (
        <span className="inline-block w-1.5 h-4 bg-[#CBA96B] animate-pulse ml-0.5 align-middle rounded-sm" />
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: DisplayMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex gap-3 items-start', isUser && 'flex-row-reverse')}>
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#0B0D0F] font-bold text-xs shadow-md',
        isUser ? 'bg-gradient-to-br from-[#E0C58A] to-[#CBA96B]' : 'bg-[#171A1E] text-[#CBA96B] border border-[#22272E]',
      )}>
        {isUser ? <User className="h-4 w-4 text-[#0B0D0F]" /> : <Bot className="h-4 w-4 text-[#CBA96B]" />}
      </div>

      <div className={cn(
        'max-w-[85%] rounded-2xl px-4.5 py-3.5 text-xs sm:text-sm',
        isUser
          ? 'bg-gradient-to-br from-[#E0C58A] to-[#CBA96B] text-[#0B0D0F] font-semibold rounded-tr-sm shadow-md'
          : 'bg-[#111417] border border-[#22272E] text-[#F1F3F4] rounded-tl-sm shadow-xl',
      )}>
        {isUser ? (
          <span className="whitespace-pre-wrap leading-relaxed">{msg.content}</span>
        ) : (
          <MarkdownMessage content={msg.content} streaming={msg.streaming} />
        )}

        {msg.citations.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1 border-t border-[#22272E] pt-2 text-[11px]">
            <span className="text-[#88929A] font-medium mr-1">Sources:</span>
            {msg.citations.map((c, i) => (
              <CitationChip key={i} citation={c} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getChatHistory(id).then((history) => {
      setMessages(
        history.map((m: ChatMessage) => ({
          role: m.role,
          content: m.content,
          citations: (m.citations as Citation[]) ?? [],
        })),
      );
      setHistoryLoaded(true);
    });
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || streaming) return;
    setInput('');

    setMessages((prev) => [...prev, { role: 'user', content: q, citations: [] }]);

    let streamIndex = -1;
    setMessages((prev) => {
      streamIndex = prev.length;
      return [...prev, { role: 'assistant', content: '', citations: [], streaming: true }];
    });

    setStreaming(true);
    let accumulated = '';
    let finalCitations: Citation[] = [];

    try {
      await streamChat(
        id,
        q,
        (token) => {
          accumulated += token;
          setMessages((prev) => {
            const updated = [...prev];
            const idx = updated.findIndex((_, i) => i === prev.length - 1 && updated[i].streaming);
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], content: accumulated };
            }
            return updated;
          });
        },
        (citations) => {
          finalCitations = citations as Citation[];
        },
        () => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.streaming) {
              updated[updated.length - 1] = {
                ...last,
                content: accumulated,
                citations: finalCitations,
                streaming: false,
              };
            }
            return updated;
          });
          setStreaming(false);
        },
      );
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.streaming) {
          updated[updated.length - 1] = {
            ...last,
            content: accumulated || 'Sorry, something went wrong. Please try again.',
            streaming: false,
          };
        }
        return updated;
      });
      setStreaming(false);
    }

    void streamIndex;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0B0D0F] text-[#F1F3F4]">
      <Navbar />

      {/* Sub-header */}
      <div className="border-b border-[#22272E] bg-[#111417] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/documents/${id}`}>
            <Button variant="outline" size="sm" className="border-[#22272E] bg-[#171A1E] text-[#F1F3F4] hover:text-white cursor-pointer">
              <ArrowLeft className="h-4 w-4 mr-1" /> View Report
            </Button>
          </Link>
          <span className="text-sm font-bold text-[#F1F3F4] flex items-center gap-2">
            AI Legal Assistant
          </span>
        </div>
        <span className="text-xs text-[#88929A] hidden sm:block">
          Shift+Enter for newline · Enter to send
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 max-w-4xl mx-auto w-full">
        {!historyLoaded && (
          <div className="flex justify-center pt-10">
            <Loader2 className="h-5 w-5 animate-spin text-[#88929A]" />
          </div>
        )}

        {historyLoaded && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="h-12 w-12 rounded-2xl bg-[#171A1E] border border-[#CBA96B]/30 flex items-center justify-center text-[#CBA96B] mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-[#F1F3F4] font-bold text-base mb-1">Ask anything about this contract</h3>
            <p className="text-xs text-[#88929A] max-w-sm mb-6">Answers are strictly grounded in the document text with source citations.</p>
            <div className="flex flex-col gap-2.5 w-full max-w-md">
              {[
                'What are the termination conditions?',
                'What are my obligations as a contractor?',
                'Are there any unusual clauses I should know about?',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); }}
                  className="rounded-xl border border-[#22272E] bg-[#111417] px-4 py-3 text-xs text-[#F1F3F4] text-left hover:border-[#CBA96B]/40 hover:text-white transition-colors cursor-pointer"
                >
                  &ldquo;{suggestion}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-[#22272E] bg-[#111417] p-4">
        <div className="mx-auto max-w-3xl flex items-end gap-3">
          <textarea
            className="flex-1 resize-none rounded-xl border border-[#22272E] bg-[#171A1E] px-4 py-3 text-sm text-[#F1F3F4] focus:outline-none focus:border-[#CBA96B] min-h-[48px] max-h-[160px] leading-relaxed placeholder:text-[#88929A]/50"
            placeholder="Ask a question about this contract…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={streaming}
          />
          <Button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            className="shrink-0 h-12 w-12 p-0 rounded-xl gold-button cursor-pointer font-bold shadow-lg"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin text-[#0B0D0F]" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
