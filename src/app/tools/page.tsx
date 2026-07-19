'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Wrench, Play, Terminal, Globe, FileText, Code, Database, Cpu, Trash2, Plus, Loader2, CheckCircle, XCircle, Clock, RefreshCw, Search, ChevronDown } from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';

interface Tool {
  name: string;
  description: string;
  category: string;
  requires_confirmation: boolean;
  timeout_seconds: number;
  parameters: Record<string, any>;
}

interface ExecutionResult {
  status: string;
  execution_id?: string;
  tool?: string;
  stdout?: string;
  stderr?: string;
  exit_code?: number;
  body?: string;
  status_code?: number;
  error?: string;
}

interface HistoryEntry {
  timestamp: string;
  tool: string;
  params: Record<string, string>;
  status: string;
}

export default function ToolRegistryPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const paramInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchTools();
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchTools() {
    try {
      const [toolData, catData] = await Promise.all([
        apiGet('/tools/list'),
        apiGet('/tools/categories'),
      ]);
      setTools(toolData?.tools || []);
      if (catData?.categories) {
        const catMap: Record<string, number> = {};
        catData.categories.forEach((c: any) => { catMap[c.name] = c.count; });
        setCategories(catMap);
      }
    } catch {}
    setLoading(false);
  }

  async function fetchHistory() {
    try {
      const data = await apiGet('/tools/history?limit=10');
      setHistory(data?.history || []);
    } catch {}
  }

  async function executeTool() {
    if (!selectedTool) return;
    setExecuting(true);
    setResult(null);
    try {
      const result = await apiPost('/tools/execute', {
        tool: selectedTool.name,
        params,
      });
      setResult(result);
      fetchHistory();
    } catch (e: any) {
      setResult({ status: 'error', error: e?.message || 'Execution failed' });
    }
    setExecuting(false);
  }

  function selectTool(tool: Tool) {
    setSelectedTool(tool);
    setResult(null);
    // Initialize params with defaults
    const defaults: Record<string, string> = {};
    Object.entries(tool.parameters || {}).forEach(([key, config]: [string, any]) => {
      defaults[key] = config?.default || '';
    });
    setParams(defaults);
  }

  const filteredTools = tools.filter(t => {
    const matchCat = !categoryFilter || t.category === categoryFilter;
    const matchSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const categoryIcons: Record<string, React.ReactNode> = {
    filesystem: <FileText size={12} />,
    system: <Terminal size={12} />,
    network: <Globe size={12} />,
    code: <Code size={12} />,
    cios: <Cpu size={12} />,
  };

  const categoryColors: Record<string, string> = {
    filesystem: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    system: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    network: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    code: 'text-accent bg-accent/10 border-accent/20',
    cios: 'text-primary bg-primary/10 border-primary/20',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Loader2 size={24} className="animate-spin text-primary" />
        <span className="text-sm font-mono text-muted-foreground">Loading tools...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-primary/10 border-primary/30">
          <Wrench size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground font-mono">Tool Registry</h1>
          <p className="text-xs text-muted-foreground font-mono">
            {tools.length} tools registered · {categories ? Object.keys(categories).length : 0} categories
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden">
        {/* Tool List */}
        <div className="glass-panel rounded-xl border border-border overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border space-y-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tools..."
                className="input-cios w-full pl-7 pr-2 py-1.5 text-2xs rounded-md"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setCategoryFilter('')}
                className={`px-2 py-0.5 rounded text-2xs font-mono ${!categoryFilter ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                All
              </button>
              {Object.entries(categories).map(([name, count]) => (
                <button key={name} onClick={() => setCategoryFilter(name)}
                  className={`px-2 py-0.5 rounded text-2xs font-mono ${categoryFilter === name ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {name} ({count})
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredTools.map(tool => (
              <button
                key={tool.name}
                onClick={() => selectTool(tool)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                  selectedTool?.name === tool.name
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-secondary/30 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={categoryColors[tool.category] || 'text-muted-foreground'}>
                    {categoryIcons[tool.category] || <Wrench size={12} />}
                  </span>
                  <span className="text-xs font-mono font-bold text-foreground">{tool.name}</span>
                  {tool.requires_confirmation && (
                    <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400">CONFIRM</span>
                  )}
                </div>
                <p className="text-2xs font-mono text-muted-foreground mt-1 truncate">{tool.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Tool Detail + Execute */}
        <div className="lg:col-span-2 flex flex-col space-y-4 overflow-hidden">
          {selectedTool ? (
            <>
              {/* Tool Detail */}
              <div className="glass-panel rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-2xs font-mono font-bold ${categoryColors[selectedTool.category] || ''}`}>
                      {selectedTool.category}
                    </span>
                    <h3 className="text-sm font-semibold text-foreground font-mono">{selectedTool.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xs font-mono text-muted-foreground">
                      <Clock size={10} className="inline mr-1" />{selectedTool.timeout_seconds}s timeout
                    </span>
                  </div>
                </div>
                <p className="text-xs font-mono text-muted-foreground mb-3">{selectedTool.description}</p>

                {/* Parameters */}
                {Object.keys(selectedTool.parameters || {}).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-2xs font-mono text-muted-foreground tracking-wider uppercase">Parameters</p>
                    {Object.entries(selectedTool.parameters).map(([key, config]: [string, any]) => (
                      <div key={key}>
                        <label className="text-2xs font-mono text-muted-foreground">
                          {key} {config?.required ? '(required)' : '(optional)'}
                        </label>
                        <input
                          type="text"
                          value={params[key] || ''}
                          onChange={e => setParams(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={config?.description || key}
                          className="input-cios w-full mt-1 px-3 py-2 text-xs rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={executeTool}
                  disabled={executing}
                  className="btn-primary-cios flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm mt-4 disabled:opacity-40"
                >
                  {executing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  Execute {selectedTool.name}
                </button>
              </div>

              {/* Result */}
              {result && (
                <div className={`glass-panel rounded-xl border p-4 ${
                  result.status === 'completed' ? 'border-emerald-400/20' :
                  result.status === 'error' || result.status === 'timeout' ? 'border-red-500/20' : 'border-border'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {result.status === 'completed' ? <CheckCircle size={14} className="text-emerald-400" /> :
                     result.status === 'timeout' ? <Clock size={14} className="text-amber-400" /> :
                     <XCircle size={14} className="text-red-400" />}
                    <span className="text-xs font-mono font-bold text-foreground">
                      {result.status?.toUpperCase()}
                    </span>
                    {result.execution_id && (
                      <span className="text-2xs font-mono text-muted-foreground">{result.execution_id}</span>
                    )}
                  </div>
                  {result.stdout && (
                    <pre className="text-2xs font-mono text-emerald-400 bg-black/20 rounded p-3 overflow-x-auto max-h-48">{result.stdout}</pre>
                  )}
                  {result.stderr && (
                    <pre className="text-2xs font-mono text-red-400 bg-black/20 rounded p-3 overflow-x-auto max-h-48">{result.stderr}</pre>
                  )}
                  {result.body && (
                    <pre className="text-2xs font-mono text-foreground/80 bg-black/20 rounded p-3 overflow-x-auto max-h-48">{result.body}</pre>
                  )}
                  {result.error && (
                    <p className="text-2xs font-mono text-red-400">{result.error}</p>
                  )}
                  {result.exit_code !== undefined && (
                    <p className="text-2xs font-mono text-muted-foreground mt-1">Exit code: {result.exit_code}</p>
                  )}
                </div>
              )}

              {/* History */}
              <div className="flex-1 overflow-y-auto space-y-1">
                <p className="text-2xs font-mono text-muted-foreground tracking-wider uppercase px-1">Recent Executions</p>
                {history.slice(0, 8).map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/30 transition-colors">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      entry.status === 'completed' ? 'bg-emerald-400' :
                      entry.status === 'error' ? 'bg-red-500' : 'bg-amber-400'
                    }`} />
                    <span className="text-2xs font-mono text-foreground">{entry.tool}</span>
                    <span className="text-2xs font-mono text-muted-foreground truncate flex-1">
                      {Object.values(entry.params || {}).join(' ')}
                    </span>
                    <span className="text-2xs font-mono text-muted-foreground">{entry.timestamp?.slice(11, 19)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
              <Wrench size={48} className="text-muted-foreground" />
              <div>
                <p className="text-sm font-mono text-muted-foreground">Select a tool</p>
                <p className="text-xs font-mono text-muted-foreground/60 mt-1">Choose from the list to view details and execute</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}