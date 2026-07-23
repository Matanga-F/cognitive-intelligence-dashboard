'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Download, Trash2, ChevronDown, ChevronRight,
  Brain, User, Loader2, Zap, Hash, Clock, Copy, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiPost } from '../../../lib/api';
import type { ConversationTurn, ReasoningStep } from '../../../lib/types';
import {
  getLocalTimezone,
  getTimeZoneAbbreviation,
  getCurrentLocalTime,
  formatLocalTime,
} from '../../../lib/timezone';

// ── Helpers ───────────────────────────
const SESSION_ID = `dash-${typeof window !== 'undefined' ? Date.now().toString(36) : 'ssr'}-${Math.random().toString(36).slice(2, 6)}`;

const INITIAL_CONTENT = 'C.I.O.S online. All systems operational. How may I assist you, Sir?';

function getLocalTimeString(): string {
  const now = getCurrentLocalTime();
  const abbr = getTimeZoneAbbreviation();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} ${abbr}`;
}

const REASONING_STYLES: Record<string, string> = {
  observation: 'text-primary border-l-primary/50',
  hypothesis: 'text-accent border-l-accent/50',
  inference: 'text-amber-400 border-l-amber-400/50',
  conclusion: 'text-emerald-400 border-l-emerald-400/50',
};

// ── Component ─────────────────────────
export default function ConversationPanel() {
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTraces, setExpandedTraces] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [timezoneAbbr, setTimezoneAbbr] = useState('UTC');

  // Set initial turn on client only (avoids hydration mismatch)
  useEffect(() => {
    setTimezoneAbbr(getTimeZoneAbbreviation());
    setTurns([{
      id: 'turn-init',
      role: 'assistant',
      content: INITIAL_CONTENT,
      timestamp: getLocalTimeString(),
      model: 'CIOS',
    }]);
    setMounted(true);
  }, []);

  // Auto-scroll to bottom when turns change
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [turns]);

  const toggleTrace = useCallback((id: string) => {
    setExpandedTraces(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleCopy = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  // ── Send Message to CIOS ────────────
  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    const userTurn: ConversationTurn = {
      id: `turn-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: getLocalTimeString(),
    };

    setTurns(prev => [...prev, userTurn]);
    setInputValue('');
    setIsLoading(true);

    try {
      const startTime = performance.now();
      const response = await apiPost('/assistant/chat', {
        message: text,
        session_id: SESSION_ID,
      });
      const latencyMs = Math.round(performance.now() - startTime);

      const responseContent = response?.response || '';
      const assistantTurn: ConversationTurn = {
        id: `turn-cios-${Date.now()}`,
        role: 'assistant',
        content: responseContent || 'No response received.',
        timestamp: getLocalTimeString(),
        model: response?.model_used || 'CIOS',
        tokensIn: text.split(' ').length,
        tokensOut: responseContent ? responseContent.split(' ').length : 0,
        latencyMs,
        confidence: typeof response?.confidence === 'number' ? response.confidence : undefined,
        reasoningSteps: response?.reasoning_trace || undefined,
      };

      setTurns(prev => [...prev, assistantTurn]);
    } catch (error: any) {
      const errorTurn: ConversationTurn = {
        id: `turn-error-${Date.now()}`,
        role: 'assistant',
        content: `Connection error: ${error?.message || 'Unable to reach CIOS'}. Verify CIOS is running on port 8000.`,
        timestamp: getLocalTimeString(),
        model: 'ERROR',
      };
      setTurns(prev => [...prev, errorTurn]);
      toast.error('Failed to reach CIOS');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [inputValue, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setTurns([{
      id: 'turn-init',
      role: 'assistant',
      content: INITIAL_CONTENT,
      timestamp: getLocalTimeString(),
      model: 'CIOS',
    }]);
    toast.info('Conversation cleared');
  };

  const handleExport = () => {
    const data = turns.map(t => `[${t.timestamp}] ${t.role.toUpperCase()}: ${t.content}`).join('\n\n');
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cios-conversation-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Conversation exported');
  };

  // ── Helper: render confidence badge ─
  const renderConfidence = (confidence: number | undefined) => {
    if (confidence == null || confidence <= 0) return null;
    const pct = Math.round(confidence * 100);
    const color = confidence > 0.9 ? 'text-emerald-400' : confidence > 0.7 ? 'text-amber-400' : 'text-red-400';
    return (
      <span className={`text-2xs font-mono ${color}`}>
        {pct}% conf
      </span>
    );
  };

  // Don't render until client-side hydration is complete
  if (!mounted) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 flex items-center px-4 py-3 border-b border-border">
          <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Brain size={16} className="text-accent" /> Cognitive Conversation
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Brain size={16} className="text-accent" /> Cognitive Conversation
          </h1>
          <span className="text-2xs font-mono px-2 py-0.5 bg-muted rounded border border-border text-muted-foreground">
            {turns.length} turns
          </span>
          <span className="text-2xs font-mono px-2 py-0.5 bg-primary/10 rounded border border-primary/20 text-primary">
            {timezoneAbbr}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-ghost-cios flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border">
            <Download size={12} /><span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={handleClear} className="btn-ghost-cios flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border">
            <Trash2 size={12} /><span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={logRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4" role="log">
        {turns.map(turn => (
          <div key={turn.id} className={`animate-fade-in flex gap-3 ${turn.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${
              turn.role === 'assistant' ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-primary/10 border-primary/30 text-primary'
            }`}>
              {turn.role === 'assistant' ? <Brain size={14} /> : <User size={14} />}
            </div>

            {/* Bubble */}
            <div className={`flex-1 min-w-0 max-w-[85%] ${turn.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
              {/* Meta */}
              <div className={`flex items-center gap-2 flex-wrap ${turn.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className={`text-xs font-mono font-bold ${turn.role === 'assistant' ? 'text-accent' : 'text-primary'}`}>
                  {turn.role === 'assistant' ? 'C.I.O.S' : 'YOU'}
                </span>
                <span className="text-2xs font-mono text-muted-foreground flex items-center gap-1">
                  <Clock size={9} />{turn.timestamp}
                </span>
                {turn.model && (
                  <span className="text-2xs font-mono px-1.5 py-0.5 bg-muted rounded border border-border text-muted-foreground">
                    {turn.model}
                  </span>
                )}
                {turn.tokensOut !== undefined && turn.tokensOut > 0 && (
                  <span className="text-2xs font-mono flex items-center gap-1 text-muted-foreground">
                    <Hash size={9} />{turn.tokensIn}↑ {turn.tokensOut}↓
                  </span>
                )}
                {turn.latencyMs !== undefined && turn.latencyMs > 0 && (
                  <span className={`text-2xs font-mono flex items-center gap-1 ${turn.latencyMs > 800 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                    <Zap size={9} />{turn.latencyMs}ms
                  </span>
                )}
                {renderConfidence(turn.confidence)}
              </div>

              {/* Content */}
              <div className={`relative group rounded-xl px-4 py-3 text-sm leading-relaxed border ${
                turn.role === 'assistant' ? 'glass-panel-solid border-border' : 'bg-primary/10 border-primary/20'
              }`}>
                <p className="whitespace-pre-wrap break-words">{turn.content}</p>
                <button onClick={() => handleCopy(turn.id, turn.content)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 rounded hover:bg-secondary">
                  {copiedId === turn.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} className="text-muted-foreground" />}
                </button>
              </div>

              {/* Reasoning Trace */}
              {turn.reasoningSteps && turn.reasoningSteps.length > 0 && (
                <div className="w-full">
                  <button onClick={() => toggleTrace(turn.id)}
                    className="flex items-center gap-1.5 text-2xs font-mono text-muted-foreground hover:text-foreground py-1">
                    {expandedTraces.has(turn.id) ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    <Brain size={10} className="text-accent" /> Reasoning ({turn.reasoningSteps.length} steps)
                  </button>
                  {expandedTraces.has(turn.id) && (
                    <div className="reasoning-trace rounded-lg p-3 space-y-2 mt-1 animate-fade-in">
                      {turn.reasoningSteps.map(step => (
                        <div key={step.id} className={`flex gap-3 pl-3 border-l-2 ${REASONING_STYLES[step.type] || 'border-l-border'}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-2xs font-mono font-bold uppercase">{step.type}</span>
                              <span className="text-2xs font-mono text-muted-foreground">step {step.step}</span>
                              <span className="text-2xs font-mono text-emerald-400">{Math.round(step.confidence * 100)}%</span>
                            </div>
                            <p className="text-xs text-foreground/80">{step.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading */}
        {isLoading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border bg-accent/10 border-accent/30 text-accent">
              <Brain size={14} />
            </div>
            <div className="glass-panel-solid border border-border rounded-xl px-4 py-3 flex items-center gap-2">
              <Loader2 size={14} className="text-accent animate-spin" />
              <span className="text-xs font-mono text-muted-foreground">Processing…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message C.I.O.S… (Enter to send)"
            className="input-cios flex-1 rounded-xl px-4 py-3 text-sm"
            disabled={isLoading}
            aria-label="Conversation input"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            className="btn-primary-cios flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}