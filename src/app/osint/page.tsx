'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Radio,
  Search,
  Zap,
  Loader2,
  RefreshCw,
  Play,
  Database,
  FileText,
} from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';

interface OSINTSource {
  name: string;
  enabled: boolean;
  type?: string;
}

interface OSINTStats {
  items_collected?: number;
  items_processed?: number;
  entities_extracted?: number;
  relationships_mapped?: number;
  signals_generated?: number;
  events_published?: number;
  errors?: number;
  collections_completed?: number;
}

interface CollectionResult {
  success: boolean;
  source: string;
  collected_count?: number;
  artifacts?: any[];
  request_id?: string;
  error?: string;
}

export default function OSINTPage() {
  const [stats, setStats] = useState<OSINTStats | null>(null);
  const [sources, setSources] = useState<OSINTSource[]>([]);
  const [results, setResults] = useState<CollectionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [selectedSource, setSelectedSource] = useState('');
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'collect' | 'results'>('dashboard');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const [statData, sourceData] = await Promise.all([
        apiGet('/osint/stats'),
        apiGet('/osint/sources'),
      ]);
      setStats(statData || {});
      setSources(sourceData?.sources || sourceData || []);
    } catch (error) {
      console.error('Failed to fetch OSINT data:', error);
    }
    setLoading(false);
  }

  async function collectFromSource(source?: string) {
    setCollecting(true);
    const src = source || selectedSource || 'news_aggregator';
    try {
      const result = await apiPost('/osint/collect', {
        source: src,
        query: query ? { q: query } : {},
        limit: 10,
      });
      setResults(prev => [
        {
          success: result?.success ?? true,
          source: src,
          collected_count: result?.collected_count || 0,
          artifacts: result?.artifacts || [],
          request_id: result?.request_id,
        },
        ...prev,
      ].slice(0, 50));
    } catch (e: any) {
      setResults(prev => [
        {
          success: false,
          source: src,
          error: e?.message || 'Collection failed',
        },
        ...prev,
      ].slice(0, 50));
    }
    setCollecting(false);
    fetchData();
  }

  async function runFullIntelligence() {
    setCollecting(true);
    const src = selectedSource || 'news_aggregator';
    try {
      const result = await apiPost('/osint/intelligence', {
        source: src,
        query: query ? { q: query } : {},
        limit: 10,
        enable_entity_extraction: true,
        enable_relationship_mapping: true,
        enable_anomaly_detection: true,
        enable_threat_classification: true,
      });
      setResults(prev => [
        {
          success: result?.success ?? true,
          source: src,
          collected_count: result?.collected_count || result?.pipeline_result?.collected_count || 0,
          artifacts: result?.artifacts || result?.pipeline_result?.raw_artifacts || [],
          request_id: result?.request_id,
        },
        ...prev,
      ].slice(0, 50));
    } catch (e: any) {
      setResults(prev => [
        {
          success: false,
          source: src,
          error: e?.message || 'Intelligence workflow failed',
        },
        ...prev,
      ].slice(0, 50));
    }
    setCollecting(false);
    fetchData();
  }

  async function clearCache() {
    try {
      await fetch('http://localhost:8000/osint/cache', { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  const sourceList: OSINTSource[] = Array.isArray(sources)
  ? sources
  : Object.keys(sources || {}).map(k => ({ name: k, enabled: true, type: 'source' as const }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Loader2 size={24} className="animate-spin text-primary" />
        <span className="text-sm font-mono text-muted-foreground">Loading OSINT data...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-blue-400/10 border-blue-400/30">
            <Globe size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground font-mono">OSINT Intelligence</h1>
            <p className="text-xs text-muted-foreground font-mono">
              {stats?.items_collected || 0} collected · {stats?.entities_extracted || 0} entities · {sourceList.length} sources
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearCache}
            className="btn-ghost-cios flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border"
          >
            <RefreshCw size={12} /> Clear Cache
          </button>
          <button
            onClick={fetchData}
            className="btn-ghost-cios px-3 py-1.5 rounded-lg text-xs font-mono border"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: 'Collected', value: stats?.items_collected || 0, color: 'text-primary' },
          { label: 'Processed', value: stats?.items_processed || 0, color: 'text-blue-400' },
          { label: 'Entities', value: stats?.entities_extracted || 0, color: 'text-emerald-400' },
          { label: 'Relations', value: stats?.relationships_mapped || 0, color: 'text-accent' },
          { label: 'Signals', value: stats?.signals_generated || 0, color: 'text-amber-400' },
          {
            label: 'Errors',
            value: stats?.errors || 0,
            color: (stats?.errors || 0) > 0 ? 'text-red-400' : 'text-muted-foreground',
          },
        ].map(kpi => (
          <div key={kpi.label} className="glass-panel-solid rounded-xl p-3 border border-border text-center">
            <p className="text-2xs font-mono text-muted-foreground tracking-wider mb-1">{kpi.label}</p>
            <p className={`text-lg font-mono font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'dashboard' as const, label: 'Sources', icon: <Database size={12} /> },
          { id: 'collect' as const, label: 'Collect', icon: <Radio size={12} /> },
          { id: 'results' as const, label: 'Results', icon: <FileText size={12} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold transition-all border-b-2 ${
              activeTab === tab.id
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {/* Dashboard — Sources */}
        {activeTab === 'dashboard' && (
          <div className="h-full overflow-y-auto space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {sourceList.map(source => (
                <div
                  key={source.name}
                  className="glass-panel-solid rounded-lg border border-border p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        source.enabled !== false ? 'bg-emerald-400' : 'bg-muted-foreground'
                      }`}
                    />
                    <div>
                      <p className="text-xs font-mono font-bold text-foreground">{source.name}</p>
                      <p className="text-2xs font-mono text-muted-foreground">
                        {source.enabled !== false ? 'Active' : 'Disabled'} · {source.type || 'source'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSource(source.name);
                      setActiveTab('collect');
                    }}
                    className="text-2xs font-mono text-primary hover:underline"
                  >
                    Collect
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collect */}
        {activeTab === 'collect' && (
          <div className="h-full overflow-y-auto space-y-4">
            <div className="glass-panel rounded-xl border border-border p-4 space-y-3">
              <div>
                <label className="text-2xs font-mono text-muted-foreground tracking-wider">Source</label>
                <select
                  value={selectedSource}
                  onChange={e => setSelectedSource(e.target.value)}
                  className="input-cios w-full mt-1 px-3 py-2 text-xs rounded-lg"
                >
                  <option value="">Select source...</option>
                  {sourceList.map(s => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-2xs font-mono text-muted-foreground tracking-wider">Search Query</label>
                <div className="relative mt-1">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search term or keyword..."
                    className="input-cios w-full pl-8 pr-3 py-2 text-xs rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => collectFromSource()}
                  disabled={collecting}
                  className="btn-primary-cios flex items-center gap-2 px-4 py-2 rounded-lg text-sm disabled:opacity-40"
                >
                  {collecting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  Collect
                </button>
                <button
                  onClick={runFullIntelligence}
                  disabled={collecting}
                  className="btn-ghost-cios flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono border"
                >
                  <Zap size={14} />
                  Full Intelligence
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {activeTab === 'results' && (
          <div className="h-full overflow-y-auto space-y-2">
            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
                <Radio size={48} className="text-muted-foreground" />
                <div>
                  <p className="text-sm font-mono text-muted-foreground">No collection results yet</p>
                  <p className="text-xs font-mono text-muted-foreground/60 mt-1">
                    Run a collection to see results here
                  </p>
                </div>
              </div>
            ) : (
              results.map((r, i) => (
                <div
                  key={i}
                  className={`glass-panel-solid rounded-xl border overflow-hidden ${
                    r.success ? 'border-border' : 'border-red-500/30'
                  }`}
                >
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          r.success ? 'bg-emerald-400' : 'bg-red-500'
                        }`}
                      />
                      <span className="text-xs font-mono font-bold text-foreground">{r.source}</span>
                      {r.collected_count !== undefined && (
                        <span className="text-2xs font-mono text-primary">{r.collected_count} items</span>
                      )}
                    </div>
                    <span className="text-2xs font-mono text-muted-foreground">
                      {r.request_id?.slice(0, 12)}
                    </span>
                  </div>
                  {r.error && (
                    <div className="px-4 pb-3">
                      <p className="text-2xs font-mono text-red-400">{r.error}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}