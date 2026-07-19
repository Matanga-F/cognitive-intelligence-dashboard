'use client';

import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface EngineSparklineProps {
  data: { v: number }[];
  color: string;
}

function SparkTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel-solid rounded px-2 py-1 text-2xs font-mono border border-border shadow">
      <span style={{ color: 'var(--primary)' }}>{payload[0].value} evt/s</span>
    </div>
  );
}

export default function EngineSparkline({ data, color }: EngineSparklineProps) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip content={<SparkTooltip />} />
      </LineChart>
    </ResponsiveContainer>
  );
}