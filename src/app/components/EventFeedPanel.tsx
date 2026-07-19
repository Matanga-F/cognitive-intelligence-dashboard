'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RefreshCw, Trash2, Pin, PinOff, ChevronDown, ChevronRight,
  AlertTriangle, Info, Bug, AlertCircle, Zap, Radio,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { apiGet } from '../../lib/api';
import type { CIOSEvent } from '../../lib/types';

const ThroughputChart = dynamic(() => import('./ThroughputChart'), { ssr: false });

// ── Types ─────────────────────────────
type Channel = 'ALL' | 'PERCEPTION' | 'REASONING' | 'MEMORY' | 'ACTION' | 'SYSTEM' | 'INTEGRATION' | 'WORLD_MODEL' | 'PLANNING';
type Severity = 'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'CRITICAL';

interface EventDisplay {
  id: string;
  timestamp: string;
  channel: string;
  eventType: string;
  severity: string;
  message: string;
  engineId: string;
  payload?: Record<string, unknown>;
}

// ── Constants ─────────────────────────
const CHANNELS: Channel[] = ['ALL', 'PERCEPTION', 'REASONING', 'MEMORY', 'ACTION', 'SYSTEM', 'INTEGRATION', 'WORLD_MODEL'];
const SEVERITIES: Severity[] = ['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG', 'CRITICAL'];

const CHANNEL_CLASSES: Record<string, string> = {
  PERCEPTION: 'channel-perception bg-channel-perception',
  REASONING: 'channel-reasoning bg-channel-reasoning',
  MEMORY: 'channel-memory bg-channel-memory',
  ACTION: 'channel-action bg-channel-action',
  SYSTEM: 'channel-system bg-channel-system',
  INTEGRATION: 'channel-integration bg-channel-integration',
  WORLD_MODEL: 'channel-world-model bg-channel-perception',
  PLANNING: 'channel-planning bg-channel-planning',
};

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  INFO: <Info size={11} className="severity-info" />,
  WARN: <AlertTriangle size={11} className="severity-warn" />,
  ERROR: <AlertCircle size={11} className="severity-error" />,
  DEBUG: <Bug size={11} className="severity-debug" />,
  CRITICAL: <Zap size={11} className="severity-critical" />,
};

const SEVERITY_CLASSES: Record<string, string> = {
  INFO: 'severity-info',
  WARN: 'severity-warn',
  ERROR: 'severity-error',
  DEBUG: 'severity-debug',
  CRITICAL: 'severity-critical',
};

function getTimeString(): string {
  const now = new Date();
  return `${now.getUTCHours().toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}:${now.getUTCSeconds().toString().padStart(2, '0')}`;
}

function generateId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Component ─────────────────────────
export default function EventFeedPanel() {
  const [channelFilter, setChannelFilter] = useState<Channel>('ALL');
  const [severityFilter, setSeverityFilter] = useState<Severity>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [events, setEvents] = useState<EventDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const streamRef = useRef<HTMLDivElement>(null);

  // ── Fetch events from CIOS ──────────
  const fetchEvents = useCallback(async () => {
    try {
      // Try anomaly alerts first (most structured event feed)
      const anomalies = await apiGet('/anomaly/alerts?limit=20');
      if (anomalies?.alerts && Array.isArray(anomalies.alerts)) {
        const mapped: EventDisplay[] = anomalies.alerts.map((a: any, i: number) => ({
          id: a.id || generateId(),
          timestamp: a.timestamp || a.created_at || getTimeString(),
          channel: 'SYSTEM',
          eventType: 'anomaly.detected',
          severity: (a.severity || 'WARN').toUpperCase(),
          message: a.message || a.description || `Anomaly: ${a.anomaly_type || 'unknown'}`,
          engineId: 'eng-anomaly',
          payload: a,
        }));
        setEvents(mapped);
        setLoading(false);
        return;
      }

      // Fallback: remediation history
      const remediation = await apiGet('/remediation/history?limit=20');
      if (remediation?.actions && Array.isArray(remediation.actions)) {
        const mapped: EventDisplay[] = remediation.actions.map((r: any, i: number) => ({
          id: r.id || generateId(),
          timestamp: r.timestamp || r.created_at || getTimeString(),
          channel: 'ACTION',
          eventType: 'remediation.executed',
          severity: r.status === 'failed' ? 'ERROR' : 'INFO',
          message: r.description || `Remediation: ${r.action_type || 'unknown'}`,
          engineId: 'eng-remediation',
          payload: r,
        }));
        setEvents(mapped);
        setLoading(false);
        return;
      }

      // Fallback: health endpoint for system events
      const health = await apiGet('/health');
      if (health) {
        const systemEvents: EventDisplay[] = [
          {
            id: generateId(),
            timestamp: getTimeString(),
            channel: 'SYSTEM',
            eventType: 'health.check',
            severity: health.status === 'healthy' ? 'INFO' : 'WARN',
            message: `System health: ${health.status || 'unknown'}. Uptime: ${health.uptime || 'N/A'}`,
            engineId: 'eng-system',
            payload: health,
          },
        ];
        setEvents(systemEvents);
      }
      setLoading(false);
    } catch {
      setLoading(false);
      if (events.length === 0) {
        setEvents([{
          id: generateId(),
          timestamp: getTimeString(),
          channel: 'SYSTEM',
          eventType: 'connection.error',
          severity: 'WARN',
          message: 'Unable to fetch events from CIOS. Verify the backend is running on port 8000.',
          engineId: 'eng-dashboard',
        }]);
      }
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && streamRef.current) {
      streamRef.current.scrollTop = 0;
    }
  }, [events, autoScroll]);

  // ── Filters ─────────────────────────
  const filtered = events.filter(e => {
    const matchChannel = channelFilter === 'ALL' || e.channel.toUpperCase() === channelFilter;
    const matchSeverity = severityFilter === 'ALL' || e.severity === severityFilter;
    const matchSearch = !searchQuery ||
      e.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.eventType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchChannel && matchSeverity && matchSearch;
  });

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleClear = useCallback(() => {
    setEvents([]);
    toast.info('Event feed cleared');
  }, []);

  const counts = {
    total: events.length,
    errors: events.filter(e => e.severity === 'ERROR' || e.severity === 'CRITICAL').length,
    warnings: events.filter(e => e.severity === 'WARN').length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Radio size={16} className="text-primary" />
              Live Event Stream
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-2xs font-mono px-2 py-0.5 bg-muted rounded border border-border text-muted-foreground">
                {counts.total} events
              </span>
              {counts.errors > 0 && (
                <span className="text-2xs font-mono px-2 py-0.5 bg-red-500/10 rounded border border-red-500/30 text-red-400">
                  {counts.errors} errors
                </span>
              )}
              {counts.warnings > 0 && (
                <span className="text-2xs font-mono px-2 py-0.5 bg-amber-500/10 rounded border border-amber-500/30 text-amber-400">
                  {counts.warnings} warnings
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border ${autoScroll ? 'bg-primary/10 border-primary/30 text-primary' : 'btn-ghost-cios'}`}>
              {autoScroll ? <Pin size={12} /> : <PinOff size={12} />}
              <span className="hidden sm:inline">Auto</span>
            </button>
            <button onClick={fetchEvents}
              className="btn-ghost-cios flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border">
              <RefreshCw size={12} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={handleClear}
              className="btn-ghost-cios flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border">
              <Trash2 size={12} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        {/* Throughput chart */}
        <div className="glass-panel-solid rounded-lg p-3 border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-2xs font-mono font-semibold text-muted-foreground tracking-widest uppercase">
              Event Throughput — Last 60s
            </span>
            <span className="text-2xs font-mono text-primary font-bold">{counts.total} events</span>
          </div>
          <ThroughputChart />
        </div>

        {/* Search */}
        <input type="text" value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search events by message or type…"
          className="input-cios w-full rounded-lg px-3 py-2 text-xs" />

        {/* Channel filters */}
        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map(ch => (
            <button key={`ch-${ch}`} onClick={() => setChannelFilter(ch)}
              className={`px-2.5 py-1 rounded-full text-2xs font-mono font-semibold border transition-all duration-150 ${
                channelFilter === ch
                  ? ch === 'ALL' ? 'bg-primary/20 border-primary/40 text-primary' : `${CHANNEL_CLASSES[ch] || ''} font-bold`
                  : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
              }`}>
              {ch}
            </button>
          ))}
        </div>

        {/* Severity filters */}
        <div className="flex flex-wrap gap-1.5">
          {SEVERITIES.map(sv => (
            <button key={`sv-${sv}`} onClick={() => setSeverityFilter(sv)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-mono font-semibold border transition-all duration-150 ${
                severityFilter === sv
                  ? sv === 'ALL' ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-secondary border-border text-foreground'
                  : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
              }`}>
              {sv !== 'ALL' && SEVERITY_ICONS[sv]}
              {sv}
            </button>
          ))}
        </div>
      </div>

      {/* Event stream */}
      <div ref={streamRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1 font-mono" role="log">
        {loading && events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Radio size={32} className="text-muted-foreground animate-pulse-slow" />
            <p className="text-sm font-mono text-muted-foreground">Loading events from CIOS…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Radio size={32} className="text-muted-foreground" />
            <p className="text-sm font-mono text-muted-foreground">No events match current filters</p>
          </div>
        ) : (
          filtered.map(event => {
            const isExpanded = expandedIds.has(event.id);
            const chClass = CHANNEL_CLASSES[event.channel.toUpperCase()] || '';
            return (
              <div key={event.id}
                className={`event-stream-item rounded-lg border border-border/50 overflow-hidden ${
                  event.severity === 'CRITICAL' ? 'border-red-500/30 bg-red-500/5' :
                  event.severity === 'ERROR' ? 'border-red-400/20 bg-red-500/3' :
                  event.severity === 'WARN' ? 'border-amber-400/20 bg-amber-500/3' : 'hover:bg-secondary/30'
                }`}>
                <button className="w-full flex items-start gap-2 px-3 py-2 text-left"
                  onClick={() => toggleExpand(event.id)} aria-expanded={isExpanded}>
                  <span className="text-2xs text-muted-foreground tabular-nums shrink-0 mt-0.5 w-14">{event.timestamp}</span>
                  <span className={`text-2xs font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${chClass}`}>
                    {event.channel.substring(0, 8)}
                  </span>
                  <span className="shrink-0 mt-0.5">{SEVERITY_ICONS[event.severity]}</span>
                  <span className="text-2xs text-muted-foreground shrink-0 hidden sm:block w-36 truncate mt-0.5">
                    {event.eventType}
                  </span>
                  <span className={`text-xs flex-1 min-w-0 truncate ${SEVERITY_CLASSES[event.severity] || ''}`}>
                    {event.message}
                  </span>
                  <span className="text-muted-foreground shrink-0 ml-1 mt-0.5">
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-border/30">
                    <div className="reasoning-trace rounded-lg p-3 text-xs space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                        <span className="font-bold text-accent">Engine:</span>
                        <span className="text-foreground">{event.engineId}</span>
                        <span className="font-bold text-accent ml-3">Type:</span>
                        <span className="text-foreground">{event.eventType}</span>
                      </div>
                      {event.payload && (
                        <div>
                          <p className="text-muted-foreground text-2xs mb-1 font-semibold tracking-wider uppercase">Payload</p>
                          <pre className="text-foreground/80 text-2xs leading-relaxed overflow-x-auto no-scrollbar">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}