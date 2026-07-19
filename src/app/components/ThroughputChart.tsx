'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { apiGet } from '../../lib/api';

interface DataPoint {
  t: string;
  evts: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel-solid rounded-lg px-3 py-2 text-xs font-mono shadow-xl border border-border">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-primary font-bold">{payload[0].value} events</p>
    </div>
  );
}

function getTimeLabel(secondsAgo: number): string {
  if (secondsAgo === 0) return 'now';
  return `-${secondsAgo}s`;
}

export default function ThroughputChart() {
  const [data, setData] = useState<DataPoint[]>([]);
  const historyRef = useRef<number[]>(Array(12).fill(0));
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchEventCount() {
        try {
            // Get anomaly alerts count (real-time events)
            const anomalies = await apiGet('/anomaly/alerts?limit=1');
            let count = 0;
            if (anomalies?.alerts) {
            count += Array.isArray(anomalies.alerts) ? anomalies.alerts.length : 0;
            }

            // Get remediation history count
            const remediation = await apiGet('/remediation/history?limit=1');
            if (remediation?.actions) {
            count += Array.isArray(remediation.actions) ? remediation.actions.length : 0;
            }

            // Get recent entities created today
            const world = await apiGet('/world/stats');
            if (world?.entities_created) {
            count += world.entities_created;
            }

            // Calculate delta from last count (actual throughput)
            const history = historyRef.current;
            const lastCount = history.length > 0 ? history[history.length - 1] : count;
            const delta = Math.max(0, count - lastCount);
            
            history.push(delta || count);
            if (history.length > 13) history.shift();

            const points: DataPoint[] = history.map((val, i) => ({
            t: getTimeLabel((history.length - 1 - i) * 5),
            evts: val,
            }));
            setData(points);
        } catch {}
        }

    // Initial fetch
    fetchEventCount();

    // Poll every 5 seconds
    intervalRef.current = setInterval(fetchEventCount, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-20">
        <span className="text-xs font-mono text-muted-foreground">Collecting data…</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="t"
          tick={{ fill: 'var(--muted-foreground)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
          interval={2}
        />
        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="evts"
          stroke="var(--primary)"
          strokeWidth={1.5}
          fill="url(#throughputGrad)"
          isAnimationActive={true}
          animationDuration={300}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}