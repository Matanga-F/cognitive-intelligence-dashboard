'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Target, List, Zap, Clock, CheckCircle, Loader2, Send, ChevronRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { apiPost, apiGet } from '../../lib/api';

interface Task {
  description: string;
  status: 'pending' | 'running' | 'completed';
  riskScore?: number;
}

interface Plan {
  plan_id: string;
  goal: string;
  task_count?: number;
  tasks?: string[];
  tasks_list?: string[];
}

export default function PlannerPage() {
  const [goal, setGoal] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-built goal templates
  const templates = [
    'Prepare quarterly board deck',
    'Deploy new engine to production',
    'Investigate anomaly spike in telemetry',
    'System health check and remediation',
    'Onboard new team member',
    'Security audit and compliance review',
  ];

  async function decomposeGoal(goalText: string) {
    if (!goalText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await apiPost('/planner/decompose', { goal: goalText });
      if (result?.plan_id) {
        const plan: Plan = {
          plan_id: result.plan_id,
          goal: goalText,
          task_count: result.task_count || result.tasks_list?.length || 0,
          tasks_list: result.tasks_list || result.tasks || [],
        };
        setPlans(prev => [plan, ...prev].slice(0, 10));
        setActivePlan(plan);
        
        // Convert to task objects
        const taskList = (plan.tasks_list || []).map((t: string, i: number) => ({
          description: t,
          status: 'pending' as const,
        }));
        setTasks(taskList);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to decompose goal');
    } finally {
      setLoading(false);
    }
  }

  async function simulateTask(index: number) {
    const task = tasks[index];
    if (!task) return;
    
    try {
      const result = await apiPost('/simulator/risk-check', { action: task.description });
      setTasks(prev => prev.map((t, i) => 
        i === index ? { ...t, riskScore: result?.risk_score, status: 'completed' as const } : t
      ));
    } catch {}
  }

  async function simulateAll() {
    for (let i = 0; i < tasks.length; i++) {
      await simulateTask(i);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      decomposeGoal(goal);
      setGoal('');
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-accent/10 border-accent/30">
          <Target size={20} className="text-accent" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground font-mono">HTN Planner</h1>
          <p className="text-xs text-muted-foreground font-mono">
            Goal decomposition · {plans.length} plans created
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={goal}
          onChange={e => setGoal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a goal... (e.g. 'Prepare quarterly board deck')"
          className="input-cios flex-1 rounded-xl px-4 py-3 text-sm"
          disabled={loading}
        />
        <button
          onClick={() => decomposeGoal(goal)}
          disabled={loading || !goal.trim()}
          className="btn-primary-cios flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Decompose
        </button>
      </div>

      {/* Templates */}
      <div>
        <p className="text-2xs font-mono text-muted-foreground mb-2 tracking-wider uppercase">Quick Templates</p>
        <div className="flex flex-wrap gap-2">
          {templates.map(t => (
            <button
              key={t}
              onClick={() => decomposeGoal(t)}
              className="px-3 py-1.5 rounded-full text-2xs font-mono border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="glass-panel rounded-xl p-3 border border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={12} className="text-red-400" />
            <span className="text-xs font-mono text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Active Plan */}
      {activePlan && (
        <div className="glass-panel rounded-xl border border-border overflow-hidden flex-1">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground font-mono">{activePlan.goal}</h3>
              <p className="text-2xs font-mono text-muted-foreground">
                Plan ID: {activePlan.plan_id} · {tasks.length} tasks
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={simulateAll} className="btn-ghost-cios flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border">
                <Zap size={11} />
                Risk Check All
              </button>
              <button onClick={() => setActivePlan(null)} className="btn-ghost-cios px-2.5 py-1.5 rounded-lg text-xs font-mono border">
                <RefreshCw size={11} />
              </button>
            </div>
          </div>

          {/* Task List */}
          <div className="overflow-y-auto p-3 space-y-1">
            {tasks.map((task, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  task.status === 'completed'
                    ? 'bg-emerald-400/5 border border-emerald-400/20'
                    : 'hover:bg-secondary/30 border border-transparent'
                }`}
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                  task.status === 'completed'
                    ? 'bg-emerald-400/10 text-emerald-400'
                    : 'bg-muted/50 text-muted-foreground'
                }`}>
                  {task.status === 'completed' ? <CheckCircle size={12} /> : <span className="text-2xs font-mono">{i + 1}</span>}
                </div>
                <span className={`text-xs font-mono flex-1 ${task.status === 'completed' ? 'text-emerald-400' : 'text-foreground'}`}>
                  {task.description}
                </span>
                {task.riskScore !== undefined && (
                  <span className={`text-2xs font-mono font-bold px-2 py-0.5 rounded ${
                    task.riskScore > 0.7 ? 'bg-red-500/10 text-red-400' :
                    task.riskScore > 0.4 ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-400/10 text-emerald-400'
                  }`}>
                    RISK: {Math.round(task.riskScore * 100)}%
                  </span>
                )}
                {task.status === 'pending' && (
                  <button
                    onClick={() => simulateTask(i)}
                    className="text-2xs font-mono text-muted-foreground hover:text-primary px-2 py-0.5 rounded border border-border hover:border-primary/30 transition-all"
                  >
                    Check Risk
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="px-4 py-2 border-t border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xs font-mono text-muted-foreground">Progress</span>
              <span className="text-2xs font-mono text-primary tabular-nums">
                {tasks.filter(t => t.status === 'completed').length}/{tasks.length}
              </span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Plan History */}
      {plans.length > 0 && !activePlan && (
        <div className="flex-1 overflow-y-auto space-y-2">
          <p className="text-2xs font-mono text-muted-foreground tracking-wider uppercase">Recent Plans</p>
          {plans.map(plan => (
            <button
              key={plan.plan_id}
              onClick={() => { setActivePlan(plan); }}
              className="w-full glass-panel-solid rounded-lg border border-border p-4 text-left hover:border-primary/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-foreground">{plan.goal}</span>
                <ChevronRight size={12} className="text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-2xs font-mono text-muted-foreground">{plan.plan_id}</span>
                <span className="text-2xs font-mono text-primary">{plan.task_count} tasks</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {!activePlan && plans.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <Target size={48} className="text-muted-foreground" />
          <div>
            <p className="text-sm font-mono text-muted-foreground">No plans yet</p>
            <p className="text-xs font-mono text-muted-foreground/60 mt-1">Enter a goal above or select a template</p>
          </div>
        </div>
      )}
    </div>
  );
}