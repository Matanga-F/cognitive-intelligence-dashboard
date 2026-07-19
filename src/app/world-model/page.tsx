'use client';

import React, { useState, useEffect } from 'react';
import { Box, Brain, Link, Search, RefreshCw, Loader2, ChevronRight, Filter } from 'lucide-react';
import { apiGet } from '../../lib/api';

interface WorldStats {
  entities: number;
  beliefs: number;
  relations: number;
  snapshots: number;
  entities_created: number;
  entities_updated: number;
  beliefs_added: number;
  inferences_applied: number;
  memory_enabled: boolean;
  memory_queries: number;
  memory_persists: number;
}

interface Entity {
  id: string;
  type: string;
  properties: Record<string, any>;
  confidence: number;
  source: string;
  last_updated: string;
}

interface Belief {
  proposition: string;
  confidence: number;
  evidence: string[];
  timestamp: string;
}

interface Relation {
  source: string;
  relation: string;
  target: string;
  confidence?: number;
}

export default function WorldModelPage() {
  const [stats, setStats] = useState<WorldStats | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [beliefs, setBeliefs] = useState<Belief[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [activeTab, setActiveTab] = useState<'entities' | 'beliefs' | 'relations'>('entities');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function fetchData() {
    try {
      const results = await Promise.allSettled([
        apiGet('/world/stats'),
        apiGet('/world/entities'),
        apiGet('/world/beliefs'),
      ]);

      const s = results[0].status === 'fulfilled' ? results[0].value : null;
      const e = results[1].status === 'fulfilled' ? results[1].value : null;
      const b = results[2].status === 'fulfilled' ? results[2].value : null;

      setStats(s || { entities: 0, beliefs: 0, relations: 0 });
      setEntities(e?.entities || []);
      setBeliefs(b?.beliefs || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, []);

  const filteredEntities = entities.filter(e => {
    const matchSearch = !search || e.id.toLowerCase().includes(search.toLowerCase()) || JSON.stringify(e.properties).toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || e.type === typeFilter;
    return matchSearch && matchType;
  });

  const filteredBeliefs = beliefs.filter(b => !search || b.proposition.toLowerCase().includes(search.toLowerCase()));

  const entityTypes = [...new Set(entities.map(e => e.type))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Loader2 size={24} className="animate-spin text-primary" />
        <span className="text-sm font-mono text-muted-foreground">Loading world model...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-primary/10 border-primary/30">
            <Box size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground font-mono">World Model</h1>
            <p className="text-xs text-muted-foreground font-mono">
              {stats?.entities || 0} entities · {stats?.beliefs || 0} beliefs · {stats?.relations || 0} relations
            </p>
          </div>
        </div>
        <button onClick={fetchData} className="btn-ghost-cios flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border">
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Entities', value: stats?.entities || 0, sub: `${stats?.entities_created || 0} today`, icon: <Box size={14} /> },
          { label: 'Beliefs', value: stats?.beliefs || 0, sub: `${stats?.beliefs_added || 0} added`, icon: <Brain size={14} /> },
          { label: 'Relations', value: stats?.relations || 0, icon: <Link size={14} /> },
          { label: 'Snapshots', value: stats?.snapshots || 0, icon: <Filter size={14} /> },
        ].map(kpi => (
          <div key={kpi.label} className="glass-panel-solid rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-primary">{kpi.icon}</span>
              <span className="text-2xs font-mono font-bold text-muted-foreground tracking-wider">{kpi.label}</span>
            </div>
            <p className="text-xl font-mono font-bold text-primary tabular-nums">{kpi.value}</p>
            {kpi.sub && <p className="text-2xs font-mono text-muted-foreground">{kpi.sub}</p>}
          </div>
        ))}
      </div>

      {/* Memory Status */}
      {stats?.memory_enabled !== undefined && (
        <div className={`glass-panel rounded-xl p-3 border ${stats.memory_enabled ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-amber-400/20 bg-amber-400/5'}`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${stats.memory_enabled ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-xs font-mono text-foreground">
              Memory: {stats.memory_enabled ? 'ENABLED' : 'DISABLED'}
            </span>
            <span className="text-2xs font-mono text-muted-foreground">
              Queries: {stats.memory_queries || 0} · Persists: {stats.memory_persists || 0}
            </span>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search entities, beliefs..."
            className="input-cios w-full pl-8 pr-3 py-2 text-xs rounded-lg"
          />
        </div>
        {activeTab === 'entities' && (
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="input-cios px-3 py-2 text-xs rounded-lg"
          >
            <option value="">All Types</option>
            {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['entities', 'beliefs', 'relations'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-mono font-bold transition-all border-b-2 ${
              activeTab === tab
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {activeTab === 'entities' && filteredEntities.map(entity => (
          <div key={entity.id} className="glass-panel-solid rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === entity.id ? null : entity.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
            >
              <ChevronRight size={12} className={`text-muted-foreground transition-transform ${expandedId === entity.id ? 'rotate-90' : ''}`} />
              <span className={`px-1.5 py-0.5 rounded text-2xs font-mono font-bold ${
                entity.type === 'agent' ? 'bg-primary/10 text-primary' :
                entity.type === 'concept' ? 'bg-accent/10 text-accent' :
                entity.type === 'event' ? 'bg-amber-400/10 text-amber-400' :
                entity.type === 'location' ? 'bg-emerald-400/10 text-emerald-400' :
                'bg-muted text-muted-foreground'
              }`}>{entity.type}</span>
              <span className="text-xs font-mono text-foreground flex-1 truncate">{entity.id}</span>
              <span className="text-2xs font-mono text-muted-foreground">{entity.source}</span>
            </button>
            {expandedId === entity.id && (
              <div className="px-4 pb-3 pt-1 border-t border-border/30 space-y-2 animate-fade-in">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/40 rounded p-2">
                    <p className="text-2xs font-mono text-muted-foreground">Confidence</p>
                    <p className="text-xs font-mono font-bold text-foreground">{entity.confidence}</p>
                  </div>
                  <div className="bg-muted/40 rounded p-2">
                    <p className="text-2xs font-mono text-muted-foreground">Last Updated</p>
                    <p className="text-xs font-mono font-bold text-foreground">{entity.last_updated?.slice(0, 19) || '--'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-2xs font-mono text-muted-foreground mb-1">Properties</p>
                  <pre className="text-2xs font-mono text-foreground/80 bg-muted/30 rounded p-2 overflow-x-auto">
                    {JSON.stringify(entity.properties, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}

        {activeTab === 'beliefs' && filteredBeliefs.map((belief, i) => (
          <div key={i} className="glass-panel-solid rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-foreground">{belief.proposition}</span>
              <span className={`text-2xs font-mono font-bold px-2 py-0.5 rounded ${
                belief.confidence > 0.9 ? 'bg-emerald-400/10 text-emerald-400' :
                belief.confidence > 0.7 ? 'bg-amber-400/10 text-amber-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {Math.round(belief.confidence * 100)}% conf
              </span>
            </div>
            {belief.evidence?.length > 0 && (
              <div className="space-y-1">
                <p className="text-2xs font-mono text-muted-foreground">Evidence:</p>
                {belief.evidence.map((e, j) => (
                  <p key={j} className="text-2xs font-mono text-muted-foreground pl-2 border-l border-border">• {e}</p>
                ))}
              </div>
            )}
            <p className="text-2xs font-mono text-muted-foreground mt-2">{belief.timestamp?.slice(0, 19)}</p>
          </div>
        ))}

        {activeTab === 'relations' && (
          <div className="text-center text-xs font-mono text-muted-foreground py-8">
            Relations view — query specific entity IDs to see their connections
          </div>
        )}
      </div>
    </div>
  );
}