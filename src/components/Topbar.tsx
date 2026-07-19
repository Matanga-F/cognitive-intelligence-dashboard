'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiGet } from '../lib/api';

export default function Topbar() {
  const [clockStr, setClockStr] = useState('--:--:-- UTC');
  const [healthStatus, setHealthStatus] = useState<'online' | 'degraded' | 'offline'>('online');
  const [metrics, setMetrics] = useState({ engines: '--', worldModel: '--', events: '--', memory: '--' });

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClockStr(
        `${now.getUTCHours().toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}:${now.getUTCSeconds().toString().padStart(2, '0')} UTC`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Live data from CIOS
  useEffect(() => {
    async function fetchData() {
      try {
        const [health, engines, world] = await Promise.all([
          apiGet('/health'),
          apiGet('/engines'),
          apiGet('/world/stats'),
        ]);

        // Health status
        if (health) {
          const ok = health.status === 'healthy' || health.status === 'ok';
          setHealthStatus(ok ? 'online' : 'degraded');
        } else {
          setHealthStatus('offline');
        }

        // Metrics
        const engineList = engines?.engines || Object.keys(engines || {}).filter(k => !['instance_id','is_running','status'].includes(k)) || [];
        setMetrics({
          engines: `${engineList.length}`,
          worldModel: world?.entities?.toLocaleString() || '--',
          events: '--', // no direct endpoint yet
          memory: world?.memory_events || '--',
        });
      } catch {
        setHealthStatus('offline');
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const openMobileSidebar = () => {
    document.getElementById('sidebar-mobile-trigger')?.click();
  };

  const HealthIcon = healthStatus === 'online' ? CheckCircle : healthStatus === 'degraded' ? AlertTriangle : WifiOff;
  const healthColor = healthStatus === 'online' ? 'text-primary' : healthStatus === 'degraded' ? 'text-amber-400' : 'text-red-500';
  const healthLabel = healthStatus === 'online' ? 'All Systems Nominal' : healthStatus === 'degraded' ? 'Degraded' : 'Offline';

  return (
    <header className="h-14 glass-panel border-b border-border flex items-center px-3 gap-3 shrink-0 z-30">
      <button onClick={openMobileSidebar} className="lg:hidden btn-ghost-cios p-2 rounded-lg" aria-label="Open navigation">
        <Menu size={18} />
      </button>
      <span className="lg:hidden font-mono font-bold text-sm text-primary tracking-widest">C.I.O.S</span>

      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border">
        <HealthIcon size={13} className={`${healthColor} shrink-0`} />
        <span className={`text-xs font-mono font-medium ${healthColor}`}>{healthLabel}</span>
      </div>

      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border">
        <span className="text-xs font-mono text-muted-foreground tracking-wider">{clockStr}</span>
      </div>

      <div className="flex-1" />

      <div className="hidden xl:flex items-center gap-1">
        {[
          { label: 'ENG', value: metrics.engines, title: 'Active Engines' },
          { label: 'WM', value: metrics.worldModel, title: 'World Model Entities' },
          { label: 'EVT', value: metrics.events, title: 'Total Events' },
          { label: 'MEM', value: metrics.memory, title: 'Memory Events' },
        ].map((m) => (
          <div key={m.label} title={m.title} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/50 rounded border border-border">
            <span className="text-2xs font-mono font-semibold text-muted-foreground tracking-widest">{m.label}</span>
            <span className="text-xs font-mono font-bold text-primary tabular-nums">{m.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 rounded border border-border">
        <Wifi size={13} className={healthStatus === 'online' ? 'text-primary animate-neon-pulse' : 'text-red-500'} />
        <span className="hidden sm:block text-2xs font-mono text-muted-foreground">{healthStatus === 'online' ? 'LIVE' : 'DOWN'}</span>
      </div>
    </header>
  );
}