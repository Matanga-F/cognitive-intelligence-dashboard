'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Eye, Zap, Activity, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';

interface VisionStats {
  engine: string;
  detector_loaded: boolean;
  embedder_loaded: boolean;
  camera_active: boolean;
  camera_fps: number;
  frames_processed: number;
  objects_detected: number;
}

interface DetectionResult {
  objects: { class_name: string; confidence: number; bbox: number[] }[];
  count: number;
  inference_ms: number;
}

export default function VisionPage() {
  const [stats, setStats] = useState<VisionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await apiGet('/vision/status');
        setStats(data);
      } catch (e: any) {
        setError(e?.message || 'Vision engine not available');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Detect
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('http://localhost:8000/vision/detect', {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        const data = await res.json();
        setDetection(data);
      }
    } catch (e: any) {
      setError('Detection failed: ' + e.message);
    } finally {
      setUploading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-primary" />
        <span className="ml-2 text-sm font-mono text-muted-foreground">Loading vision engine...</span>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <Eye size={48} className="text-red-400" />
        <h2 className="text-lg font-semibold text-foreground font-mono">Vision Engine Offline</h2>
        <p className="text-sm text-muted-foreground font-mono">{error}</p>
        <p className="text-xs text-muted-foreground/60 font-mono">
          Install: pip install ultralytics transformers torch opencv-python pillow
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
          stats?.camera_active ? 'bg-emerald-400/10 border-emerald-400/30' : 'bg-muted border-border'
        }`}>
          <Camera size={20} className={stats?.camera_active ? 'text-emerald-400 animate-pulse' : 'text-muted-foreground'} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground font-mono">Vision Perception</h1>
          <p className={`text-xs font-mono ${stats?.camera_active ? 'text-emerald-400' : 'text-muted-foreground'}`}>
            {stats?.camera_active ? `● Camera active — ${stats.camera_fps} FPS` : '● Camera offline'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'YOLO', loaded: stats?.detector_loaded, icon: <Eye size={14} /> },
          { label: 'CLIP', loaded: stats?.embedder_loaded, icon: <Zap size={14} /> },
          { label: 'Camera', loaded: stats?.camera_active, icon: <Camera size={14} /> },
          { label: 'FPS', loaded: (stats?.camera_fps || 0) > 0, icon: <Activity size={14} /> },
        ].map(item => (
          <div key={item.label}
            className={`rounded-xl p-4 border ${
              item.loaded ? 'bg-emerald-400/5 border-emerald-400/20' : 'bg-muted/50 border-border'
            }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={item.loaded ? 'text-emerald-400' : 'text-muted-foreground'}>{item.icon}</span>
              <span className="text-xs font-mono font-bold text-foreground">{item.label}</span>
            </div>
            <p className={`text-sm font-mono font-bold ${item.loaded ? 'text-emerald-400' : 'text-muted-foreground'}`}>
              {item.label === 'FPS' ? `${stats?.camera_fps || 0} fps` : item.loaded ? 'LOADED' : 'OFFLINE'}
            </p>
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Frames', value: stats?.frames_processed || 0 },
          { label: 'Objects Detected', value: stats?.objects_detected || 0 },
          { label: 'Camera FPS', value: `${stats?.camera_fps || 0}` },
        ].map(metric => (
          <div key={metric.label} className="glass-panel-solid rounded-xl p-4 border border-border">
            <p className="text-2xs font-mono text-muted-foreground uppercase tracking-wider mb-1">{metric.label}</p>
            <p className="text-2xl font-mono font-bold text-primary tabular-nums">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Image Upload & Detection */}
      <div className="glass-panel-solid rounded-xl p-4 border border-border">
        <h3 className="text-sm font-semibold text-foreground font-mono mb-3">Test Detection</h3>
        
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn-primary-cios flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Upload Image
        </button>

        {preview && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-2xs font-mono text-muted-foreground mb-1">Preview</p>
              <img src={preview} alt="Preview" className="rounded-lg max-h-64 border border-border" />
            </div>
            
            {detection && (
              <div>
                <p className="text-2xs font-mono text-muted-foreground mb-1">
                  Detection ({detection.count} objects, {detection.inference_ms}ms)
                </p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {detection.objects.map((obj, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded bg-muted/50 text-xs font-mono">
                      <span className="text-foreground">{obj.class_name}</span>
                      <span className="text-primary font-bold">{(obj.confidence * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}