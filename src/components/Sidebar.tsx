'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Radio, MessageSquare, Cpu, ChevronLeft, ChevronRight, Activity, Zap,
  Search, Star, Clock, BarChart3, Shield, Database, Brain, Layers,
  ChevronDown, Gauge, Server, AlertTriangle, Bell, BellOff, Settings,
  User, LogOut, HelpCircle, Compass, Bookmark, Sliders, RefreshCw,
  Sun, Moon, Terminal, Wrench, Eye, Box, Target, Globe
} from 'lucide-react';
import AppLogo from '../components/ui/AppLogo';
import { apiGet } from '../lib/api';

// ── Types ─────────────────────────────
interface EngineInfo {
  name: string;
  status: string;
  type?: string;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  pinned?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  external?: boolean;
}

// ── Navigation Structure ──────────────
const NAV_SECTIONS: NavSection[] = [
  {
    id: 'favorites',
    label: 'Pinned',
    icon: <Star size={12} />,
    pinned: true,
    items: [
      { href: '/', label: 'Event Feed', icon: <Radio size={14} />, badge: 'LIVE', badgeColor: 'text-emerald-400' },
      { href: '/engine-status', label: 'Engines', icon: <Cpu size={14} /> },
      { href: '/vision', label: 'Vision', icon: <Eye size={14} /> },
      { href: '/conversation', label: 'Conversation', icon: <MessageSquare size={14} /> },
      
    ],
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    icon: <BarChart3 size={12} />,
    pinned: true,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <Gauge size={14} /> },
      { href: '/alerts', label: 'Alerts', icon: <Bell size={14} />, badge: '3', badgeColor: 'text-red-400' },
      { href: '/slos', label: 'SLOs', icon: <Shield size={14} /> },
    ],
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: <Compass size={12} />,
    items: [
      { href: '/explore/metrics', label: 'Metrics', icon: <Activity size={14} /> },
      { href: '/explore/logs', label: 'Logs', icon: <Terminal size={14} /> },
      { href: '/explore/traces', label: 'Traces', icon: <Layers size={14} /> },
      { href: '/explore/profiles', label: 'Profiles', icon: <Sliders size={14} /> },
    ],
  },
  {
    id: 'cognitive',
    label: 'Cognitive',
    icon: <Brain size={12} />,
    pinned: true,
    items: [
      { href: '/conversation', label: 'Assistant', icon: <MessageSquare size={14} /> },
      { href: '/knowledge-graph', label: 'Knowledge Graph', icon: <Database size={14} /> },
      { href: '/world-model', label: 'World Model', icon: <Layers size={14} /> },
      { href: '/planner', label: 'Planner', icon: <Target size={14} /> },
      { href: '/simulator', label: 'Simulator', icon: <Shield size={14} /> },
      { href: '/tools', label: 'Tools', icon: <Wrench size={14} /> },
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    icon: <Server size={12} />,
    items: [
      { href: '/infrastructure/kafka', label: 'Kafka', icon: <Layers size={14} /> },
      { href: '/infrastructure/postgresql', label: 'PostgreSQL', icon: <Database size={14} /> },
      { href: '/infrastructure/redis', label: 'Redis', icon: <RefreshCw size={14} /> },
      { href: '/infrastructure/docker', label: 'Docker', icon: <Server size={14} /> },
    ],
  },
  {
    id: 'security',
    label: 'Security & Governance',
    icon: <Shield size={12} />,
    items: [
      { href: '/security/audit-logs', label: 'Audit Logs', icon: <Clock size={14} /> },
      { href: '/security/policies', label: 'Policies', icon: <Shield size={14} /> },
      { href: '/security/rbac', label: 'RBAC', icon: <User size={14} /> },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings size={12} />,
    items: [
      { href: '/settings/configuration', label: 'Configuration', icon: <Wrench size={14} /> },
      { href: '/settings/api-keys', label: 'API Keys', icon: <Terminal size={14} /> },
      { href: '/settings/plugins', label: 'Plugins', icon: <Sliders size={14} /> },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: <Server size={12} />,
    pinned: true,
    items: [
        { href: '/system-health', label: 'Health', icon: <Activity size={14} /> },
    ],
    },
    {
    id: 'knowledge',
    label: 'Knowledge',
    icon: <Brain size={12} />,
    items: [
        { href: '/world-model', label: 'World Model', icon: <Box size={14} /> },
    ],
    },
    {
    id: 'intelligence',
    label: 'Intelligence',
    icon: <Globe size={12} />,
    items: [
        { href: '/osint', label: 'OSINT', icon: <Globe size={14} /> },
    ],
    },
];

const STATUS_DOT: Record<string, string> = {
  running: 'bg-emerald-400',
  online: 'bg-emerald-400',
  active: 'bg-emerald-400',
  degraded: 'bg-amber-400',
  warning: 'bg-amber-400',
  error: 'bg-red-500 animate-pulse',
  stopped: 'bg-red-500',
  offline: 'bg-muted-foreground',
  initializing: 'bg-accent animate-pulse',
};

const STATUS_LABEL: Record<string, string> = {
  running: 'Online',
  online: 'Online',
  active: 'Online',
  degraded: 'Degraded',
  warning: 'Warning',
  error: 'Error',
  stopped: 'Offline',
  offline: 'Offline',
  initializing: 'Init',
};

// ── Component ─────────────────────────
export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [engines, setEngines] = useState<EngineInfo[]>([]);
  const [uptime, setUptime] = useState('--');
  const [version, setVersion] = useState('--');
  const [healthStatus, setHealthStatus] = useState<'online' | 'degraded' | 'offline'>('online');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['favorites', 'monitoring', 'cognitive'])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [alertCount, setAlertCount] = useState(0);
  const pathname = usePathname();

  // ── Fetch live data ─────────────────
  useEffect(() => {
    async function load() {
      try {
        // Engines
        const data = await apiGet('/engines');
        const engineList = data?.engines || [];
        const mapped: EngineInfo[] = Array.isArray(engineList)
          ? engineList.map((e: any) => ({
              name: typeof e === 'string' ? e : (e.name || e[0] || 'unknown'),
              status: e.status || e.state || 'running',
              type: e.engine_type || e.type || '',
            }))
          : Object.keys(engineList).map(k => ({
              name: k,
              status: 'running',
              type: '',
            }));
        setEngines(mapped.slice(0, 12));

        // Health
        const health = await apiGet('/health');
        setUptime(health?.uptime || '--');
        setVersion(health?.version || '--');
        
        const status = health?.status || (health ? 'online' : 'offline');
        setHealthStatus(
          status === 'healthy' || status === 'ok' ? 'online' :
          status === 'degraded' ? 'degraded' : 'offline'
        );

        // Alerts
        const anomalies = await apiGet('/anomaly/alerts?limit=1');
        if (anomalies?.alerts) {
          setAlertCount(Array.isArray(anomalies.alerts) ? anomalies.alerts.length : 0);
        }
      } catch {
        setHealthStatus('offline');
      }
    }
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const healthColor = healthStatus === 'online' ? 'text-emerald-400' :
    healthStatus === 'degraded' ? 'text-amber-400' : 'text-red-500';
  const healthBg = healthStatus === 'online' ? 'bg-emerald-400/10 border-emerald-400/30' :
    healthStatus === 'degraded' ? 'bg-amber-400/10 border-amber-400/30' : 'bg-red-500/10 border-red-500/30';

  const filteredSections = searchQuery
    ? NAV_SECTIONS.map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(section => section.items.length > 0)
    : NAV_SECTIONS;

  const engineHealth = engines.length > 0
    ? engines.filter(e => e.status === 'running' || e.status === 'active' || e.status === 'online').length
    : 0;

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <button id="sidebar-mobile-trigger" className="hidden" onClick={() => setMobileOpen(true)} aria-label="Open sidebar" />

      <aside
        className={`cios-sidebar flex flex-col h-full z-50 relative shrink-0 border-r border-border
          ${collapsed ? 'collapsed' : ''}
          fixed lg:relative
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-transform duration-300 lg:transition-none`}
        style={{ width: collapsed ? 64 : 260, background: 'var(--card)' }}
      >
        {/* ── Logo ────────────────────── */}
        <div className={`flex items-center h-14 border-b border-border px-3 shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <AppLogo size={28} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-mono font-bold text-sm text-primary tracking-widest">C.I.O.S</div>
              <div className={`text-2xs font-mono ${healthColor}`}>
                {healthStatus === 'online' ? '● Online' : healthStatus === 'degraded' ? '● Degraded' : '● Offline'}
              </div>
            </div>
          )}
        </div>

        {/* ── Search ──────────────────── */}
        {!collapsed && (
          <div className="px-3 py-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Find a dashboard…"
                className="input-cios w-full pl-7 pr-2 py-1.5 text-2xs rounded-md"
              />
            </div>
          </div>
        )}

        {/* ── Quick Stats Bar ─────────── */}
        {!collapsed && (
          <div className={`mx-3 mb-2 rounded-lg p-2.5 border ${healthBg}`}>
            <div className="flex items-center justify-between">
              <span className="text-2xs font-mono text-muted-foreground">Engines</span>
              <span className={`text-2xs font-mono font-bold ${healthColor}`}>
                {engineHealth}/{engines.length}
              </span>
            </div>
            <div className="h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  healthStatus === 'online' ? 'bg-emerald-400' :
                  healthStatus === 'degraded' ? 'bg-amber-400' : 'bg-red-500'
                }`}
                style={{ width: engines.length > 0 ? `${(engineHealth / engines.length) * 100}%` : '0%' }}
              />
            </div>
            {alertCount > 0 && (
              <div className="flex items-center gap-1.5 mt-2 text-2xs font-mono text-red-400">
                <AlertTriangle size={10} />
                {alertCount} active alert{alertCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* ── Navigation ──────────────── */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-1 no-scrollbar">
          {filteredSections.map(section => {
            const isExpanded = expandedSections.has(section.id);
            return (
              <div key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-mono font-semibold
                    text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-150
                    ${collapsed ? 'justify-center' : ''}`}
                >
                  {section.icon}
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left tracking-wider uppercase">{section.label}</span>
                      <ChevronDown size={10}
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                    </>
                  )}
                </button>

                {isExpanded && (
                  <div className="space-y-0.5 ml-1 mt-0.5">
                    {section.items.map(item => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={`${section.id}-${item.href}-${item.label}`}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`group flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-all duration-150 relative
                            ${isActive
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'text-secondary-foreground hover:bg-secondary/50 hover:text-foreground border border-transparent'
                            }
                            ${collapsed ? 'justify-center' : ''}`}
                          title={collapsed ? item.label : undefined}
                          target={item.external ? '_blank' : undefined}
                        >
                          <span className="shrink-0">{item.icon}</span>
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-xs truncate">{item.label}</span>
                              {item.badge && (
                                <span className={`text-2xs font-mono font-bold px-1 rounded ${item.badgeColor || 'text-primary'} bg-primary/10`}>
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                          {isActive && !collapsed && (
                            <div className="w-1 h-4 rounded-full bg-primary absolute left-0" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Engine List ────────────── */}
          {!collapsed && (
            <div className="pt-3">
              <button
                onClick={() => toggleSection('engines')}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-mono font-semibold
                  text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-150"
              >
                <Gauge size={12} />
                <span className="flex-1 text-left tracking-wider uppercase">Engine Status</span>
                <ChevronDown size={10}
                  className={`transition-transform duration-200 ${expandedSections.has('engines') ? 'rotate-0' : '-rotate-90'}`} />
              </button>
              {expandedSections.has('engines') && (
                <div className="space-y-0.5 mt-1 ml-1 max-h-48 overflow-y-auto no-scrollbar">
                  {engines.map(eng => (
                    <div key={eng.name}
                      className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-secondary/30 transition-colors duration-100"
                      title={`${eng.name}: ${STATUS_LABEL[eng.status] || eng.status}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[eng.status] || 'bg-muted-foreground'}`} />
                      <span className="text-2xs font-mono text-muted-foreground truncate flex-1">
                        {eng.name.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-2xs font-mono ${
                        eng.status === 'running' || eng.status === 'online' ? 'text-emerald-400' :
                        eng.status === 'degraded' || eng.status === 'warning' ? 'text-amber-400' :
                        eng.status === 'error' || eng.status === 'stopped' ? 'text-red-400' : 'text-muted-foreground'
                      }`}>
                        {STATUS_LABEL[eng.status] || eng.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* ── User Section ────────────── */}
        <div className="border-t border-border">
          {!collapsed && (
            <div className="px-3 py-2 space-y-1">
              <Link href="/" className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs text-secondary-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-150">
                <User size={13} />
                <span className="font-mono">Profile</span>
              </Link>
              <Link href="/" className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs text-secondary-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-150">
                <Settings size={13} />
                <span className="font-mono">Settings</span>
              </Link>
              <Link href="/" className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs text-secondary-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-150">
                <HelpCircle size={13} />
                <span className="font-mono">Help & Feedback</span>
              </Link>
            </div>
          )}

          {/* System info footer */}
          {!collapsed && (
            <div className="px-3 py-2 border-t border-border space-y-1">
              <div className="flex items-center gap-2 text-2xs font-mono text-muted-foreground">
                <Activity size={11} className="text-primary" />
                Uptime: {uptime}
              </div>
              <div className="flex items-center gap-2 text-2xs font-mono text-muted-foreground">
                <Zap size={11} className="text-accent" />
                v{version}
              </div>
            </div>
          )}
        </div>

        {/* ── Collapse toggle ─────────── */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6
            bg-card border border-border rounded-full items-center justify-center
            text-muted-foreground hover:text-foreground hover:border-primary/40
            transition-all duration-150 z-10"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>
    </>
  );
}
