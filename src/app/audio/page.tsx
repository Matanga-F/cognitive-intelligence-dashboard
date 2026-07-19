'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Activity, Zap, Radio, Loader2 } from 'lucide-react';
import { apiGet } from '../../lib/api';

interface AudioStats {
  engine: string;
  stt_loaded: boolean;
  tts_loaded: boolean;
  vad_loaded: boolean;
  listening: boolean;
  utterances_processed: number;
  tts_requests: number;
  wake_words_detected: number;
}

export default function AudioPage() {
  const [stats, setStats] = useState<AudioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await apiGet('/audio/status');
        setStats(data);
      } catch (e: any) {
        setError(e?.message || 'Audio engine not available');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-primary" />
        <span className="ml-2 text-sm font-mono text-muted-foreground">Loading audio engine...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <MicOff size={48} className="text-red-400" />
        <h2 className="text-lg font-semibold text-foreground font-mono">Audio Engine Offline</h2>
        <p className="text-sm text-muted-foreground font-mono">{error}</p>
        <p className="text-xs text-muted-foreground/60 font-mono">
          Install dependencies: pip install faster-whisper piper-tts pyaudio torch
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
          stats?.listening ? 'bg-emerald-400/10 border-emerald-400/30' : 'bg-red-500/10 border-red-500/30'
        }`}>
          {stats?.listening ? (
            <Radio size={20} className="text-emerald-400 animate-pulse" />
          ) : (
            <MicOff size={20} className="text-red-400" />
          )}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground font-mono">Audio Perception</h1>
          <p className={`text-xs font-mono ${stats?.listening ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats?.listening ? '● Listening for wake word "CIOS"' : '● Offline'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'STT', loaded: stats?.stt_loaded, icon: <Mic size={14} /> },
          { label: 'TTS', loaded: stats?.tts_loaded, icon: <Volume2 size={14} /> },
          { label: 'VAD', loaded: stats?.vad_loaded, icon: <Activity size={14} /> },
          { label: 'Listening', loaded: stats?.listening, icon: <Radio size={14} /> },
        ].map(item => (
          <div key={item.label}
            className={`rounded-xl p-4 border ${
              item.loaded ? 'bg-emerald-400/5 border-emerald-400/20' : 'bg-red-500/5 border-red-500/20'
            }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={item.loaded ? 'text-emerald-400' : 'text-red-400'}>{item.icon}</span>
              <span className="text-xs font-mono font-bold text-foreground">{item.label}</span>
            </div>
            <p className={`text-sm font-mono font-bold ${item.loaded ? 'text-emerald-400' : 'text-red-400'}`}>
              {item.loaded ? 'LOADED' : 'OFFLINE'}
            </p>
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Utterances', value: stats?.utterances_processed || 0 },
          { label: 'TTS Requests', value: stats?.tts_requests || 0 },
          { label: 'Wake Words', value: stats?.wake_words_detected || 0 },
        ].map(metric => (
          <div key={metric.label} className="glass-panel-solid rounded-xl p-4 border border-border">
            <p className="text-2xs font-mono text-muted-foreground uppercase tracking-wider mb-1">{metric.label}</p>
            <p className="text-2xl font-mono font-bold text-primary tabular-nums">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="glass-panel-solid rounded-xl p-4 border border-border">
        <h3 className="text-sm font-semibold text-foreground font-mono mb-2">Quick Start</h3>
        <div className="space-y-2 text-xs font-mono text-muted-foreground">
          <p>1. Say <span className="text-primary font-bold">"CIOS"</span> to wake</p>
          <p>2. Ask: <span className="text-amber-400">"What's the system status?"</span></p>
          <p>3. Command: <span className="text-emerald-400">"Restart the scheduler"</span></p>
          <p>4. Query: <span className="text-accent">"What did we do yesterday?"</span></p>
        </div>
      </div>
    </div>
  );
}