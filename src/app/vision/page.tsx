'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, Video, Image as ImageIcon, Play, Square, RotateCcw, 
  Download, Maximize2, Mic, MicOff, Volume2, VolumeX,
  Activity, Eye, Zap, AlertTriangle, Cpu
} from 'lucide-react';
import { apiGet } from '../../lib/api';

// ── Types ─────────────────────────────
interface VisionStream {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'error' | 'loading';
  resolution: string;
  fps: number;
  source: string;
  description?: string;
  lastFrame?: string; // base64 or url placeholder
  analytics?: {
    objects: number;
    motion: number;
    confidence: number;
  };
}

// ── Mock Data (Fallback if backend is offline) ──
const MOCK_STREAMS: VisionStream[] = [
  {
    id: 'cam-1',
    name: 'Main Entry Camera',
    status: 'active',
    resolution: '1920x1080',
    fps: 30,
    source: 'rtsp://192.168.1.101:554/stream1',
    description: 'Primary entryway monitoring with motion detection.',
    lastFrame: '/api/placeholder/400/300',
    analytics: { objects: 12, motion: 34, confidence: 94 },
  },
  {
    id: 'cam-2',
    name: 'Server Room Feed',
    status: 'active',
    resolution: '2560x1440',
    fps: 60,
    source: 'rtsp://192.168.1.102:554/stream2',
    description: 'High-frame-rate monitoring for server infrastructure.',
    lastFrame: '/api/placeholder/400/300',
    analytics: { objects: 3, motion: 5, confidence: 99 },
  },
  {
    id: 'cam-3',
    name: 'Perimeter Security',
    status: 'idle',
    resolution: '1920x1080',
    fps: 15,
    source: 'rtsp://192.168.1.103:554/stream3',
    description: 'Outdoor perimeter security. Currently on standby.',
    lastFrame: '/api/placeholder/400/300',
    analytics: { objects: 0, motion: 0, confidence: 0 },
  },
];

// ── Component ─────────────────────────
export default function VisionPage() {
  const [streams, setStreams] = useState<VisionStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // ── Fetch Vision Streams ────────────
  useEffect(() => {
    async function fetchVisionData() {
      try {
        // Attempt to fetch from the CIOS backend
        const data = await apiGet('/vision/streams');
        if (data && Array.isArray(data.streams)) {
          setStreams(data.streams);
        } else {
          // Fallback to mock data if endpoint isn't ready
          setStreams(MOCK_STREAMS);
        }
      } catch {
        // Fallback to mock data on error
        setStreams(MOCK_STREAMS);
      } finally {
        setLoading(false);
      }
    }

    fetchVisionData();
    // Refresh every 15 seconds to update analytics
    const interval = setInterval(fetchVisionData, 15000);
    return () => clearInterval(interval);
  }, []);

  const selectedStream = streams.find(s => s.id === selectedStreamId) || streams[0];

  // ── Handlers ────────────────────────
  const toggleRecording = () => setIsRecording(!isRecording);
  const toggleMute = () => setIsMuted(!isMuted);
  const toggleAudio = () => setAudioEnabled(!audioEnabled);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-emerald-400';
      case 'idle': return 'text-amber-400';
      case 'error': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-400 animate-pulse';
      case 'idle': return 'bg-amber-400';
      case 'error': return 'bg-red-500';
      default: return 'bg-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden bg-background">
      
      {/* ── Header ────────────────────── */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Eye size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Vision Interface</h1>
            <p className="text-xs text-muted-foreground font-mono">
              {streams.filter(s => s.status === 'active').length} Active Streams
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button 
            onClick={toggleAudio}
            className={`btn-ghost-cios p-2 rounded-lg text-xs ${audioEnabled ? 'text-primary border-primary/30' : ''}`}
          >
            {audioEnabled ? <Mic size={14} /> : <MicOff size={14} />}
          </button>
          <button 
            onClick={toggleRecording}
            className={`btn-ghost-cios p-2 rounded-lg text-xs ${isRecording ? 'text-red-500 border-red-500/30 animate-pulse' : ''}`}
          >
            {isRecording ? <Square size={14} /> : <Video size={14} />}
          </button>
          <button className="btn-primary-cios flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs">
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* ── Main Content ───────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 gap-3">
        
        {/* ── Left: Video Player ───────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-card border border-border rounded-lg overflow-hidden relative">
          {loading ? (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="flex flex-col items-center gap-3">
                <Camera size={32} className="text-muted-foreground animate-pulse" />
                <span className="text-sm font-mono text-muted-foreground">Loading Streams...</span>
              </div>
            </div>
          ) : selectedStream ? (
            <>
              {/* Video Area */}
              <div className="flex-1 bg-black relative flex items-center justify-center min-h-[200px] lg:min-h-[400px]">
                <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-black/50" />
                
                {/* Placeholder for actual video feed */}
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 font-mono text-sm select-none">
                  <div className="flex flex-col items-center gap-4">
                    <Eye size={48} className="opacity-20" />
                    <span>Live Feed: {selectedStream.name}</span>
                    <span className="text-2xs">(Waiting for RTSP Stream)</span>
                  </div>
                </div>

                {/* Overlay Controls */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded hover:bg-white/10 text-foreground/80 transition-colors">
                      <Play size={14} />
                    </button>
                    <button className="p-1.5 rounded hover:bg-white/10 text-foreground/80 transition-colors">
                      <RotateCcw size={14} />
                    </button>
                    <button onClick={toggleMute} className="p-1.5 rounded hover:bg-white/10 text-foreground/80 transition-colors">
                      {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xs font-mono text-muted-foreground/80">{selectedStream.resolution} • {selectedStream.fps}fps</span>
                    <button className="p-1.5 rounded hover:bg-white/10 text-foreground/80 transition-colors">
                      <Maximize2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Top Left Status Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1">
                  <span className={`w-2 h-2 rounded-full ${getStatusDot(selectedStream.status)}`} />
                  <span className={`text-2xs font-mono uppercase font-bold ${getStatusColor(selectedStream.status)}`}>
                    {selectedStream.status}
                  </span>
                </div>

                {/* Top Right Analytics */}
                {selectedStream.analytics && selectedStream.status === 'active' && (
                  <div className="absolute top-3 right-3 flex gap-2 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5">
                    <div className="flex items-center gap-1.5 text-2xs font-mono text-emerald-400">
                      <Zap size={10} />
                      <span>{selectedStream.analytics.objects} objects</span>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div className="flex items-center gap-1.5 text-2xs font-mono text-blue-400">
                      <Activity size={10} />
                      <span>{selectedStream.analytics.motion}% motion</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Stream Info Footer */}
              <div className="shrink-0 px-4 py-2 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{selectedStream.name}</span>
                  <span className="text-2xs text-muted-foreground font-mono hidden sm:block">
                    • {selectedStream.source}
                  </span>
                </div>
                {selectedStream.description && (
                  <span className="text-2xs text-muted-foreground hidden sm:block">
                    {selectedStream.description}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/20 text-muted-foreground font-mono text-sm">
              No stream selected
            </div>
          )}
        </div>

        {/* ── Right: Stream List ───────── */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col border border-border rounded-lg overflow-hidden bg-card">
          <div className="shrink-0 px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase font-mono">
              Available Streams
            </span>
            <span className="text-2xs font-mono text-muted-foreground bg-muted/50 px-1.5 rounded">
              {streams.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-1 space-y-1">
            {streams.map(stream => {
              const isSelected = selectedStreamId === stream.id || (!selectedStreamId && streams[0]?.id === stream.id);
              return (
                <button
                  key={stream.id}
                  onClick={() => setSelectedStreamId(stream.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 text-left
                    ${isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-secondary/50 border border-transparent'}
                  `}
                >
                  <div className="shrink-0 w-16 h-10 rounded bg-muted/50 border border-border relative overflow-hidden flex items-center justify-center">
                    <Camera size={12} className="text-muted-foreground/50" />
                    <span className={`absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${getStatusDot(stream.status)}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium truncate text-foreground">{stream.name}</span>
                      <span className={`text-2xs font-mono ${getStatusColor(stream.status)}`}>
                        {stream.status === 'active' ? 'LIVE' : stream.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xs font-mono text-muted-foreground">{stream.resolution}</span>
                      <span className="text-2xs text-muted-foreground/50">•</span>
                      <span className="text-2xs font-mono text-muted-foreground">{stream.fps} fps</span>
                    </div>
                  </div>
                  
                  {stream.analytics && stream.status === 'active' && (
                    <div className="shrink-0 flex items-center gap-1 text-2xs font-mono text-emerald-400/80">
                      <Activity size={10} />
                      <span>{stream.analytics.motion}%</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer: System Info */}
          <div className="shrink-0 px-3 py-2 border-t border-border bg-muted/10 flex items-center justify-between text-2xs font-mono text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Cpu size={10} />
              <span>Vision Engine v2.4.1</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={10} className="text-amber-400" />
              <span>2 Alerts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}