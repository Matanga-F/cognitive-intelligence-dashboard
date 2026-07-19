'use client';

import React, { useState, useEffect } from 'react';
import { Database, GitBranch, Network, Search, Loader2, RefreshCw, ChevronRight, Box, Link, Filter, Plus, X } from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';

interface KGEntity {
  id: string;
  type: string;
  domain: string;
  attributes?: Record<string, any>;
}

interface Relationship {
  source_id: string;
  target_id: string;
  type: string;
  strength?: number;
}

interface Community {
  id: string;
  entities: string[];
  density?: number;
}

export default function KnowledgeGraphPage() {
  const [entities, setEntities] = useState<KGEntity[]>([]);
  const [entityDetail, setEntityDetail] = useState<any>(null);
  const [relationships, setRelationships] = useState<any>({});
  const [communities, setCommunities] = useState<Community[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'entities' | 'relationships' | 'communities'>('entities');
  const [domainFilter, setDomainFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreateEntity, setShowCreateEntity] = useState(false);
  const [showCreateRelation, setShowCreateRelation] = useState(false);
  const [newEntity, setNewEntity] = useState({ id: '', type: 'agent', domain: 'default' });
  const [newRelation, setNewRelation] = useState({ source_id: '', target_id: '', type: 'depends_on' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [entData, statData] = await Promise.all([
        apiGet('/kg/entities'),
        apiGet('/kg/stats'),
      ]);
      setEntities(entData?.entities || entData?.data || []);
      setStats(statData || {});
    } catch {}
    setLoading(false);
  }

  async function selectEntity(id: string) {
    setSelectedEntity(id);
    try {
      const [detail, rels] = await Promise.all([
        apiGet(`/kg/entities/${id}`),
        apiGet(`/kg/entities/${id}/relationships`),
      ]);
      setEntityDetail(detail);
      setRelationships(rels || {});
    } catch {}
  }

  async function detectCommunities() {
    try {
      const result = await apiPost('/kg/communities', {});
      setCommunities(result?.communities || []);
    } catch {}
  }

  async function createEntity() {
    try {
      await apiPost('/kg/entities', newEntity);
      setShowCreateEntity(false);
      setNewEntity({ id: '', type: 'agent', domain: 'default' });
      fetchData();
    } catch {}
  }

  async function createRelationship() {
    try {
      await apiPost('/kg/relationships', newRelation);
      setShowCreateRelation(false);
      setNewRelation({ source_id: '', target_id: '', type: 'depends_on' });
      if (selectedEntity) selectEntity(selectedEntity);
    } catch {}
  }

  const filteredEntities = entities.filter(e => {
    const matchSearch = !searchQuery || e.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDomain = !domainFilter || e.domain === domainFilter;
    const matchType = !typeFilter || e.type === typeFilter;
    return matchSearch && matchDomain && matchType;
  });

  const domains = [...new Set(entities.map(e => e.domain).filter(Boolean))];
  const types = [...new Set(entities.map(e => e.type).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Loader2 size={24} className="animate-spin text-primary" />
        <span className="text-sm font-mono text-muted-foreground">Loading knowledge graph...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-emerald-400/10 border-emerald-400/30">
            <Database size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground font-mono">Knowledge Graph</h1>
            <p className="text-xs text-muted-foreground font-mono">
              {entities.length} entities · {stats?.relationships || 0} relationships · {domains.length} domains
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={detectCommunities} className="btn-ghost-cios flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border">
            <Network size={12} />
            Communities
          </button>
          <button onClick={() => setShowCreateEntity(true)} className="btn-ghost-cios flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border">
            <Plus size={12} />
            Entity
          </button>
          <button onClick={() => setShowCreateRelation(true)} className="btn-ghost-cios flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border">
            <Link size={12} />
            Relation
          </button>
          <button onClick={fetchData} className="btn-ghost-cios px-3 py-1.5 rounded-lg text-xs font-mono border">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Entities', value: entities.length, icon: <Box size={14} /> },
          { label: 'Relations', value: stats?.relationships || stats?.relations_count || 0, icon: <Link size={14} /> },
          { label: 'Domains', value: domains.length, icon: <Database size={14} /> },
        ].map(kpi => (
          <div key={kpi.label} className="glass-panel-solid rounded-xl p-3 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-emerald-400">{kpi.icon}</span>
              <span className="text-2xs font-mono text-muted-foreground tracking-wider">{kpi.label}</span>
            </div>
            <p className="text-lg font-mono font-bold text-foreground tabular-nums">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search entities by ID..."
            className="input-cios w-full pl-8 pr-3 py-2 text-xs rounded-lg"
          />
        </div>
        <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)}
          className="input-cios px-3 py-2 text-xs rounded-lg">
          <option value="">All Domains</option>
          {domains.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="input-cios px-3 py-2 text-xs rounded-lg">
          <option value="">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden">
        {/* Entity List */}
        <div className="glass-panel rounded-xl border border-border overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-2xs font-mono text-muted-foreground tracking-wider uppercase">Entities</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredEntities.slice(0, 100).map(entity => (
              <button
                key={entity.id}
                onClick={() => selectEntity(entity.id)}
                className={`w-full text-left px-3 py-2 border-b border-border/30 hover:bg-secondary/30 transition-colors ${
                  selectedEntity === entity.id ? 'bg-emerald-400/5 border-l-2 border-l-emerald-400' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-2xs font-mono ${
                    entity.type === 'agent' ? 'bg-primary/10 text-primary' :
                    entity.type === 'concept' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'
                  }`}>{entity.type}</span>
                  <span className="text-xs font-mono text-foreground truncate">{entity.id}</span>
                </div>
                <p className="text-2xs font-mono text-muted-foreground mt-0.5">{entity.domain}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Entity Detail */}
        <div className="lg:col-span-2 glass-panel rounded-xl border border-border overflow-hidden flex flex-col">
          {selectedEntity && entityDetail ? (
            <>
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-bold text-foreground">{selectedEntity}</span>
                  <span className="text-2xs font-mono text-muted-foreground">
                    Type: {entityDetail.type || entityDetail.entity_type} · Domain: {entityDetail.domain}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Attributes */}
                {entityDetail.attributes && Object.keys(entityDetail.attributes).length > 0 && (
                  <div>
                    <p className="text-2xs font-mono text-muted-foreground tracking-wider mb-2">Attributes</p>
                    <pre className="text-2xs font-mono text-foreground/80 bg-muted/30 rounded p-3 overflow-x-auto">
                      {JSON.stringify(entityDetail.attributes, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Relationships */}
                {relationships && Object.keys(relationships).length > 0 && (
                  <div>
                    <p className="text-2xs font-mono text-muted-foreground tracking-wider mb-2">Relationships</p>
                    <div className="space-y-1">
                      {Object.entries(relationships).map(([relType, targets]: [string, any]) => (
                        <div key={relType} className="bg-muted/30 rounded p-2">
                          <span className="text-2xs font-mono font-bold text-emerald-400">{relType}</span>
                          <span className="text-2xs font-mono text-muted-foreground ml-2">
                            → {(Array.isArray(targets) ? targets : []).join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full JSON */}
                <div>
                  <p className="text-2xs font-mono text-muted-foreground tracking-wider mb-2">Full Record</p>
                  <pre className="text-2xs font-mono text-foreground/80 bg-muted/30 rounded p-3 overflow-x-auto max-h-64">
                    {JSON.stringify(entityDetail, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          ) : communities.length > 0 ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-2xs font-mono text-muted-foreground tracking-wider mb-2">Communities Detected</p>
              {communities.map((c, i) => (
                <div key={i} className="glass-panel-solid rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-foreground">Community {i + 1}</span>
                    <span className="text-2xs font-mono text-muted-foreground">{c.entities?.length || 0} entities</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(c.entities || []).slice(0, 10).map((e: string) => (
                      <span key={e} className="px-1.5 py-0.5 rounded text-2xs font-mono bg-muted text-muted-foreground">{e}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <Database size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-sm font-mono text-muted-foreground">Select an entity or detect communities</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Entity Modal */}
      {showCreateEntity && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowCreateEntity(false)}>
          <div className="glass-panel rounded-xl border border-border p-6 w-96" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground font-mono">Create Entity</h3>
              <button onClick={() => setShowCreateEntity(false)}><X size={14} className="text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Entity ID" value={newEntity.id}
                onChange={e => setNewEntity(p => ({ ...p, id: e.target.value }))}
                className="input-cios w-full px-3 py-2 text-xs rounded-lg" />
              <select value={newEntity.type} onChange={e => setNewEntity(p => ({ ...p, type: e.target.value }))}
                className="input-cios w-full px-3 py-2 text-xs rounded-lg">
                <option value="agent">Agent</option>
                <option value="object">Object</option>
                <option value="location">Location</option>
                <option value="concept">Concept</option>
                <option value="event">Event</option>
              </select>
              <input type="text" placeholder="Domain" value={newEntity.domain}
                onChange={e => setNewEntity(p => ({ ...p, domain: e.target.value }))}
                className="input-cios w-full px-3 py-2 text-xs rounded-lg" />
              <button onClick={createEntity} disabled={!newEntity.id}
                className="btn-primary-cios w-full py-2 rounded-lg text-sm disabled:opacity-40">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Relation Modal */}
      {showCreateRelation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowCreateRelation(false)}>
          <div className="glass-panel rounded-xl border border-border p-6 w-96" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground font-mono">Create Relationship</h3>
              <button onClick={() => setShowCreateRelation(false)}><X size={14} className="text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Source Entity ID" value={newRelation.source_id}
                onChange={e => setNewRelation(p => ({ ...p, source_id: e.target.value }))}
                className="input-cios w-full px-3 py-2 text-xs rounded-lg" />
              <input type="text" placeholder="Target Entity ID" value={newRelation.target_id}
                onChange={e => setNewRelation(p => ({ ...p, target_id: e.target.value }))}
                className="input-cios w-full px-3 py-2 text-xs rounded-lg" />
              <input type="text" placeholder="Relation type" value={newRelation.type}
                onChange={e => setNewRelation(p => ({ ...p, type: e.target.value }))}
                className="input-cios w-full px-3 py-2 text-xs rounded-lg" />
              <button onClick={createRelationship} disabled={!newRelation.source_id || !newRelation.target_id}
                className="btn-primary-cios w-full py-2 rounded-lg text-sm disabled:opacity-40">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}