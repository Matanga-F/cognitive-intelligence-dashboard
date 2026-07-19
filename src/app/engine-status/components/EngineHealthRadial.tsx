'use client';

import React from 'react';
import {
  RadialBarChart,
  RadialBar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const STATUS_DATA = [
  { name: 'Active', value: 6, fill: 'var(--status-active)' },
  { name: 'Degraded', value: 1, fill: 'var(--status-degraded)' },
  { name: 'Error', value: 1, fill: 'var(--status-error)' },
];

function RadialTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel-solid rounded-lg px-3 py-2 text-xs font-mono shadow-xl border border-border">
      <p className="text-foreground font-bold">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value} engines</p>
    </div>
  );
}

export default function EngineHealthRadial() {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <RadialBarChart
        cx="50%"
        cy="50%"
        innerRadius="40%"
        outerRadius="90%"
        data={STATUS_DATA}
        startAngle={180}
        endAngle={0}
      >
        <RadialBar dataKey="value" cornerRadius={4} background={{ fill: 'var(--muted)' }} />
        <Tooltip content={<RadialTooltip />} />
        <Legend
          iconSize={8}
          wrapperStyle={{ fontSize: '10px', fontFamily: 'var(--font-mono)', paddingTop: '8px' }}
        />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}