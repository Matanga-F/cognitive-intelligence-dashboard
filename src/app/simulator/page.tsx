'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Camera,
  Zap,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Play,
} from 'lucide-react';
import { apiPost, apiGet } from '../../lib/api';

interface SimulationResult {
  action: string;
  risk_score: number;
  risk_level: string;
  recommendation: string;
  confidence: number;
  requires_approval: boolean;
}

interface Snapshot {
  snapshot_id: string;
  label: string;
  timestamp: string;
}

export default function SimulatorPage() {
  const [action, setAction] = useState('');
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'simulate' | 'snapshots'>('simulate');

  useEffect(() => {
    fetchSnapshots();
  }, []);

  async function fetchSnapshots() {
    try {
      const data = await apiGet('/simulator/snapshots');
      setSnapshots(data?.snapshots || []);
    } catch (error) {
      console.error('Failed to fetch snapshots:', error);
    }
  }

  async function runSimulation() {
    if (!action.trim()) return;
    setLoading(true);
    try {
      const result = await apiPost('/simulator/simulate', { action: action.trim() });
      const newResult: SimulationResult = {
        action: action.trim(),
        risk_score: result?.risk_score || 0,
        risk_level: result?.risk_level || 'UNKNOWN',
        recommendation: result?.recommendation || '',
        confidence: result?.confidence || 0,
        requires_approval: result?.requires_approval || false,
      };
      setResults(prev => [newResult, ...prev].slice(0, 20));
      setAction('');
    } catch (error) {
      console.error('Simulation failed:', error);
    }
    setLoading(false);
  }

  async function quickRiskCheck() {
    if (!action.trim()) return;
    try {
      const result = await apiPost('/simulator/risk-check', { action: action.trim() });
      const newResult: SimulationResult = {
        action: action.trim(),
        risk_score: result?.risk_score || 0,
        risk_level: result?.risk_level || 'UNKNOWN',
        recommendation: result?.safe_to_execute ? 'Safe to execute' : 'Requires review',
        confidence: 0.9,
        requires_approval: result?.requires_approval || false,
      };
      setResults(prev => [newResult, ...prev].slice(0, 20));
      setAction('');
    } catch (error) {
      console.error('Quick risk check failed:', error);
    }
  }

  async function takeSnapshot() {
    if (!snapshotLabel.trim()) return;
    try {
      const result = await apiPost('/simulator/snapshot', { label: snapshotLabel.trim() });
      if (result?.snapshot_id) {
        const newSnap: Snapshot = {
          snapshot_id: result.snapshot_id,
          label: snapshotLabel.trim(),
          timestamp: result?.timestamp || new Date().toISOString(),
        };
        setSnapshots(prev => [newSnap, ...prev].slice(0, 20));
        setSnapshotLabel('');
      }
    } catch (error) {
      console.error('Failed to take snapshot:', error);
    }
  }

  async function deleteSnapshot(id: string) {
    try {
      await fetch(`http://localhost:8000/simulator/snapshot/${id}`, { method: 'DELETE' });
      setSnapshots(prev => prev.filter(s => s.snapshot_id !== id));
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') runSimulation();
  }

  const riskTests = [
    'shutdown the production database',
    'delete all customer records',
    'restart the scheduler engine',
    'read the configuration file',
    'deploy new version to staging',
    'drop the world_model table',
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-amber-400/10 border-amber-400/30">
          <Shield size={20} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground font-mono">World Simulator</h1>
          <p className="text-xs text-muted-foreground font-mono">
            Consequence prediction · {results.length} simulations · {snapshots.length} snapshots
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={action}
          onChange={e => setAction(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter an action to simulate... (e.g. 'shutdown the database')"
          className="input-cios flex-1 rounded-xl px-4 py-3 text-sm"
          disabled={loading}
        />
        <button
          onClick={runSimulation}
          disabled={loading || !action.trim()}
          className="btn-primary-cios flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          Simulate
        </button>
        <button
          onClick={quickRiskCheck}
          disabled={!action.trim()}
          className="btn-ghost-cios flex items-center gap-2 px-3 py-3 rounded-xl text-xs font-mono border"
        >
          <Zap size={14} />
          Quick
        </button>
      </div>

      {/* Risk Test Templates */}
      <div>
        <p className="text-2xs font-mono text-muted-foreground mb-2 tracking-wider uppercase">
          Test Scenarios
        </p>
        <div className="flex flex-wrap gap-2">
          {riskTests.map(t => (
            <button
              key={t}
              onClick={() => setAction(t)}
              className="px-3 py-1.5 rounded-full text-2xs font-mono border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'simulate' as const, label: 'Simulations', icon: <Activity size={12} /> },
          { id: 'snapshots' as const, label: 'Snapshots', icon: <Camera size={12} /> },
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

      {/* Simulations */}
      {activeTab === 'simulate' && (
        <div className="flex-1 overflow-y-auto space-y-2">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
              <Shield size={48} className="text-muted-foreground" />
              <div>
                <p className="text-sm font-mono text-muted-foreground">No simulations yet</p>
                <p className="text-xs font-mono text-muted-foreground/60 mt-1">
                  Enter an action above to predict its consequences
                </p>
              </div>
            </div>
          ) : (
            results.map((r, i) => (
              <div
                key={i}
                className={`glass-panel-solid rounded-xl border overflow-hidden animate-fade-in ${
                  r.risk_score > 0.7
                    ? 'border-red-500/30'
                    : r.risk_score > 0.4
                    ? 'border-amber-400/30'
                    : 'border-emerald-400/30'
                }`}
              >
                <div className="px-4 py-3 flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      r.risk_score > 0.7
                        ? 'bg-red-500/10 text-red-400'
                        : r.risk_score > 0.4
                        ? 'bg-amber-400/10 text-amber-400'
                        : 'bg-emerald-400/10 text-emerald-400'
                    }`}
                  >
                    {r.risk_score > 0.7 ? (
                      <XCircle size={14} />
                    ) : r.risk_score > 0.4 ? (
                      <AlertTriangle size={14} />
                    ) : (
                      <CheckCircle size={14} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-bold text-foreground">{r.action}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span
                        className={`text-xs font-mono font-bold ${
                          r.risk_score > 0.7
                            ? 'text-red-400'
                            : r.risk_score > 0.4
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        RISK: {Math.round(r.risk_score * 100)}% — {r.risk_level}
                      </span>
                      <span className="text-2xs font-mono text-muted-foreground">
                        Confidence: {Math.round(r.confidence * 100)}%
                      </span>
                      {r.requires_approval && (
                        <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400">
                          APPROVAL REQUIRED
                        </span>
                      )}
                    </div>
                    <p className="text-2xs font-mono text-muted-foreground mt-1">
                      {r.recommendation}
                    </p>
                  </div>
                </div>
                <div className="h-1 bg-muted">
                  <div
                    className={`h-full transition-all duration-700 ${
                      r.risk_score > 0.7
                        ? 'bg-red-500'
                        : r.risk_score > 0.4
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${r.risk_score * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Snapshots */}
      {activeTab === 'snapshots' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={snapshotLabel}
              onChange={e => setSnapshotLabel(e.target.value)}
              placeholder="Snapshot label... (e.g. 'pre-deployment')"
              className="input-cios flex-1 rounded-xl px-4 py-3 text-sm"
            />
            <button
              onClick={takeSnapshot}
              disabled={!snapshotLabel.trim()}
              className="btn-primary-cios flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
            >
              <Camera size={16} />
              Take Snapshot
            </button>
          </div>

          {snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
              <Camera size={48} className="text-muted-foreground" />
              <div>
                <p className="text-sm font-mono text-muted-foreground">No snapshots yet</p>
                <p className="text-xs font-mono text-muted-foreground/60 mt-1">
                  Capture world state before risky operations
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {snapshots.map(snap => (
                <div
                  key={snap.snapshot_id}
                  className="glass-panel-solid rounded-lg border border-border p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Camera size={14} className="text-primary" />
                    <div>
                      <p className="text-xs font-mono font-bold text-foreground">{snap.label}</p>
                      <p className="text-2xs font-mono text-muted-foreground">
                        {snap.snapshot_id} · {snap.timestamp?.slice(0, 19)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteSnapshot(snap.snapshot_id)}
                    className="text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}