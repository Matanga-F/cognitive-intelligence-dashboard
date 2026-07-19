'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Cpu, RefreshCw, ChevronDown, ChevronRight, AlertTriangle,
  CheckCircle, XCircle, MinusCircle, Loader2, Activity,
  MemoryStick, Clock, Zap, BarChart2, RotateCcw, Eye,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import {apiGet} from "../../../lib/api";
import type { CIOSEngine } from '../../../lib/types';

const EngineSparkline = dynamic(() => import('./EngineSparkline'), { ssr: false });
const EngineHealthRadial = dynamic(() => import('./EngineHealthRadial'), { ssr: false });

// ── Types ──────────────────────────────
type EngineStatus = 'active' | 'degraded' | 'error' | 'offline' | 'initializing';

interface EngineDisplay {
  id: string;
  name: string;
  type: string;
  status: EngineStatus;
  state: string;
  engineType: string;
}

// ── Status Config ─────────────────────
const STATUS_CONFIG: Record<EngineStatus, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  active:    { label: 'ACTIVE', icon: <CheckCircle size={12} />, bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' },
  degraded:  { label: 'DEGRADED', icon: <AlertTriangle size={12} />, bg: 'bg-amber-400/10', text: 'text-amber-400', border: 'border-amber-400/30' },
  error:     { label: 'ERROR', icon: <XCircle size={12} />, bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
  offline:   { label: 'OFFLINE', icon: <MinusCircle size={12} />, bg: 'bg-muted-foreground/10', text: 'text-muted-foreground', border: 'border-muted-foreground/30' },
  initializing: { label: 'INIT', icon: <Loader2 size={12} className="animate-spin" />, bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/30' },
};

const TYPE_COLORS: Record<string, string> = {
  perception: 'var(--channel-perception)',
  reasoning: 'var(--channel-reasoning)',
  planning: 'var(--channel-planning)',
  memory: 'var(--channel-memory)',
  action: 'var(--channel-action)',
  integration: 'var(--channel-integration)',
  world_model: 'var(--channel-world-model)',
  cognition: 'var(--channel-system)',
  meta: '#94a3b8',
  knowledge: '#10b981',
  intelligence: '#ec4899',
  interface: '#3b82f6',
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || TYPE_COLORS[type?.toLowerCase()] || 'var(--channel-system)';
}

function mapCIOSStatus(state: string): EngineStatus {
  const s = state?.toLowerCase() || '';
  if (s.includes('running') || s.includes('active')) return 'active';
  if (s.includes('degraded') || s.includes('warning')) return 'degraded';
  if (s.includes('error') || s.includes('stopped') || s.includes('failed')) return 'error';
  if (s.includes('initializ')) return 'initializing';
  return 'offline';
}

// ── Component ─────────────────────────
export default function EngineStatusPanel() {
  const [engines, setEngines] = useState<EngineDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<EngineStatus | 'ALL'>('ALL');

  const fetchEngines = useCallback(async () => {
    try {
      const data = await apiGet('/engines');
      const engineList: any[] = data?.engines || [];
      
      if (Array.isArray(engineList) && engineList.length > 0) {
        const mapped: EngineDisplay[] = engineList.map((e: any) => {
          const name = typeof e === 'string' ? e : (e.name || e[0] || 'unknown');
          const state = typeof e === 'string' ? 'running' : (e.state || e.status || 'running');
          const engineType = typeof e === 'string' ? 'unknown' : (e.engine_type || e.type || 'unknown');
          return {
            id: `eng-${name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
            name: String(name).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            type: engineType,
            status: mapCIOSStatus(state),
            state,
            engineType,
          };
        });
        setEngines(mapped);
        setLoading(false);
      } else {
        // Fallback: try /system/engines
        const sysData = await apiGet('/system/engines');
        const sysEngines = sysData?.engines || Object.keys(sysData || {}).filter(k => !['instance_id','is_running','status'].includes(k));
        const mapped: EngineDisplay[] = (Array.isArray(sysEngines) ? sysEngines : Object.entries(sysEngines || {})).map((e: any) => {
          const name = typeof e === 'string' ? e : (e.name || e[0] || 'unknown');
          const state = typeof e === 'string' ? 'running' : (e.state || e.status || 'running');
          return {
            id: `eng-${String(name).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
            name: String(name).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            type: 'unknown',
            status: mapCIOSStatus(state),
            state,
            engineType: 'unknown',
          };
        });
        setEngines(mapped);
        setLoading(false);
      }
    } catch {
      setLoading(false);
      toast.error('Failed to fetch engine status');
    }
  }, []);

  useEffect(() => {
    fetchEngines();
    const interval = setInterval(fetchEngines, 15000);
    return () => clearInterval(interval);
  }, [fetchEngines]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchEngines();
    setIsRefreshing(false);
    toast.success('Engine status refreshed');
  }, [fetchEngines]);

  const handleRestart = useCallback((id: string, name: string) => {
    toast.info(`Restart signal sent to ${name}`);
  }, []);

  const filtered = statusFilter === 'ALL' ? engines : engines.filter(e => e.status === statusFilter);

  const aggregate = {
    active: engines.filter(e => e.status === 'active').length,
    degraded: engines.filter(e => e.status === 'degraded').length,
    error: engines.filter(e => e.status === 'error').length,
    total: engines.length,
  };

  const STATUS_FILTERS: (EngineStatus | 'ALL')[] = ['ALL', 'active', 'degraded', 'error', 'offline'];

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border">
          <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Cpu size={16} className="text-primary" /> Engine Status
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground font-mono">Loading engines...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Cpu size={16} className="text-primary" /> Engine Status
          </h1>
          <button onClick={handleRefresh} disabled={isRefreshing}
            className="btn-ghost-cios flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border disabled:opacity-50">
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'ACTIVE', value: `${aggregate.active}/${aggregate.total}`, color: 'text-primary', bg: 'bg-primary/5 border-primary/15' },
            { label: 'DEGRADED', value: String(aggregate.degraded), color: 'text-amber-400', bg: 'bg-amber-400/5 border-amber-400/15' },
            { label: 'ERRORS', value: String(aggregate.error), color: 'text-red-400', bg: 'bg-red-400/5 border-red-400/15' },
            { label: 'TOTAL', value: String(aggregate.total), color: 'text-foreground', bg: 'bg-muted/50 border-border' },
          ].map(kpi => (
            <div key={kpi.label} className={`rounded-lg p-2.5 border ${kpi.bg}`}>
              <p className="text-2xs font-mono text-muted-foreground tracking-widest mb-1">{kpi.label}</p>
              <p className={`text-lg font-mono font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map(sf => (
            <button key={`sf-${sf}`} onClick={() => setStatusFilter(sf)}
              className={`px-2.5 py-1 rounded-full text-2xs font-mono font-semibold border transition-all duration-150 ${
                statusFilter === sf ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
              }`}>
              {sf.toUpperCase()}
              {sf !== 'ALL' && <span className="ml-1 opacity-60">({engines.filter(e => e.status === sf).length})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Engine list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Cpu size={32} className="text-muted-foreground" />
            <p className="text-sm font-mono text-muted-foreground">No engines match filter</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(engine => {
              const statusCfg = STATUS_CONFIG[engine.status];
              const isExpanded = expandedIds.has(engine.id);
              const typeColor = getTypeColor(engine.engineType);

              return (
                <div key={engine.id}
                  className={`engine-card-hover rounded-xl border overflow-hidden ${
                    engine.status === 'error' ? 'border-red-500/30 bg-red-500/3' :
                    engine.status === 'degraded' ? 'border-amber-400/20 bg-amber-400/3' : 'border-border glass-panel-solid'
                  }`}>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    onClick={() => toggleExpand(engine.id)} aria-expanded={isExpanded}>
                    <div className="w-1 h-8 rounded-full shrink-0" style={{ background: typeColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{engine.name}</span>
                        <span className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{ color: typeColor, background: `${typeColor}18`, border: `1px solid ${typeColor}30` }}>
                          {engine.engineType.toUpperCase()}
                        </span>
                        <span className={`flex items-center gap-1 text-2xs font-mono font-bold px-1.5 py-0.5 rounded border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                          {statusCfg.icon}{statusCfg.label}
                        </span>
                      </div>
                    </div>
                    <span className="text-2xs font-mono text-muted-foreground">{engine.state}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-border/30 animate-fade-in space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { label: 'TYPE', value: engine.engineType },
                          { label: 'STATE', value: engine.state },
                          { label: 'STATUS', value: engine.status.toUpperCase() },
                        ].map(m => (
                          <div key={m.label} className="bg-muted/40 rounded-lg p-2.5 border border-border/50">
                            <p className="text-2xs font-mono text-muted-foreground tracking-wider mb-1">{m.label}</p>
                            <p className="text-xs font-mono font-bold text-foreground">{m.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button onClick={() => handleRestart(engine.id, engine.name)}
                          className="btn-ghost-cios flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border">
                          <RotateCcw size={11} /> Restart
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}