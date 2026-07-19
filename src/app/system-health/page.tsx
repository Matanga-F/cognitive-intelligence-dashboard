'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, Radio, Cpu, Clock, Shield, RefreshCw, Loader2 } from 'lucide-react';
import { apiGet } from '../../lib/api';

interface HealthData {
  status?: string;
  uptime?: string;
  version?: string;
  kafka_connected?: boolean;
  db_connected?: boolean;
  memory_usage?: number;
  cpu_usage?: number;
  services?: Record<string, boolean>;
  engines_count?: number;
  active_sessions?: number;
}

interface SystemHealth {
  state?: string;
  uptime?: number;
  engine_name?: string;
  engine_type?: string;
  total_writes?: number;
  writes_succeeded?: number;
  retrievals_succeeded?: number;
  total_retrievals?: number;
  hot_buffer_size?: number;
  hash_chain_length?: number;
  hash_chain_valid?: boolean;
  healthy?: boolean;
  status?: string;
  engines?: Record<string, any>;
  circuit_breakers?: Record<string, string>;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [engines, setEngines] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState('');

  async function fetchAll() {
    setLoading(true);
    try {
      const [h, sh, eng] = await Promise.all([
        apiGet('/health'),
        apiGet('/system/health'),
        apiGet('/engines'),
      ]);
      setHealth(h);
      setSystemHealth(sh);
      setEngines(eng?.engines || eng || {});
      setLastRefresh(new Date().toLocaleTimeString('en-GB', { timeZone: 'UTC' }) + ' UTC');
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, []);

  const engineList = Array.isArray(engines) ? engines : Object.keys(engines).filter(k => !['instance_id','is_running','status'].includes(k));
  const runningCount = Array.isArray(engines) 
    ? engines.filter((e: any) => e.state === 'running' || e.status === 'running' || e === 'running').length 
    : engineList.length;
  const totalEngines = engineList.length || Object.keys(engines).length || 0;

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Loader2 size={24} className="animate-spin text-primary" />
        <span className="text-sm font-mono text-muted-foreground">Loading system health...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            health?.status === 'healthy' || systemHealth?.healthy
              ? 'bg-emerald-400/10 border-emerald-400/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <Activity size={20} className={health?.status === 'healthy' || systemHealth?.healthy ? 'text-emerald-400' : 'text-red-400'} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground font-mono">System Health</h1>
            <p className={`text-xs font-mono ${health?.status === 'healthy' || systemHealth?.healthy ? 'text-emerald-400' : 'text-red-400'}`}>
              {health?.status === 'healthy' || systemHealth?.healthy ? '● All systems operational' : '● Issues detected'}
            </p>
          </div>
        </div>
        <button onClick={fetchAll} className="btn-ghost-cios flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="glass-panel rounded-xl p-4 border border-red-500/30 bg-red-500/5">
          <p className="text-xs font-mono text-red-400">{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'UPTIME', value: health?.uptime || systemHealth?.uptime || '--', icon: <Clock size={14} />, color: 'text-primary' },
          { label: 'VERSION', value: health?.version || '--', icon: <Shield size={14} />, color: 'text-accent' },
          { label: 'ENGINES', value: `${runningCount}/${totalEngines}`, icon: <Cpu size={14} />, color: runningCount === totalEngines ? 'text-emerald-400' : 'text-amber-400' },
          { label: 'MEMORY', value: health?.memory_usage ? `${health.memory_usage}%` : '--', icon: <Server size={14} />, color: 'text-primary' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-panel-solid rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <span className={kpi.color}>{kpi.icon}</span>
              <span className="text-2xs font-mono font-bold text-muted-foreground tracking-wider">{kpi.label}</span>
            </div>
            <p className={`text-sm font-mono font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Kafka', connected: health?.kafka_connected !== false, icon: <Radio size={14} /> },
          { label: 'PostgreSQL', connected: health?.db_connected !== false, icon: <Database size={14} /> },
          { label: 'API', connected: !!health, icon: <Server size={14} /> },
        ].map(svc => (
          <div key={svc.label} className={`glass-panel-solid rounded-xl p-4 border ${
            svc.connected ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-red-500/20 bg-red-500/5'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={svc.connected ? 'text-emerald-400' : 'text-red-400'}>{svc.icon}</span>
                <span className="text-xs font-mono font-bold text-foreground">{svc.label}</span>
              </div>
              <span className={`text-2xs font-mono font-bold px-2 py-0.5 rounded ${
                svc.connected ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {svc.connected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Mnemonic Health (if available) */}
      {systemHealth && (
        <div className="glass-panel rounded-xl border border-border p-4">
          <h3 className="text-xs font-semibold text-foreground font-mono mb-3">Mnemonic Engine</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Writes', value: `${systemHealth.writes_succeeded || 0}/${systemHealth.total_writes || 0}` },
              { label: 'Retrievals', value: `${systemHealth.retrievals_succeeded || 0}/${systemHealth.total_retrievals || 0}` },
              { label: 'Hot Buffer', value: systemHealth.hot_buffer_size || 0 },
              { label: 'Hash Chain', value: systemHealth.hash_chain_length || 0 },
            ].map(m => (
              <div key={m.label} className="bg-muted/50 rounded-lg p-3 border border-border/50">
                <p className="text-2xs font-mono text-muted-foreground mb-1">{m.label}</p>
                <p className="text-xs font-mono font-bold text-foreground tabular-nums">{m.value}</p>
              </div>
            ))}
          </div>
          {systemHealth.hash_chain_valid !== undefined && (
            <div className="mt-2 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${systemHealth.hash_chain_valid ? 'bg-emerald-400' : 'bg-red-500'}`} />
              <span className="text-2xs font-mono text-muted-foreground">
                Hash Chain: {systemHealth.hash_chain_valid ? 'VALID' : 'INVALID'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Last Refresh */}
      <div className="text-center text-2xs font-mono text-muted-foreground">
        Last refreshed: {lastRefresh} | Auto-refresh: 15s
      </div>
    </div>
  );
}