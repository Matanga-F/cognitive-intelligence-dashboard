// src/lib/types.ts — Complete CIOS Dashboard Types (All 26 Engines + Future)

// ── Engine ──────────────────────────────
export interface CIOSEngine {
  name: string;
  type?: string;
  status: 'running' | 'stopped' | 'initializing' | 'degraded' | 'error';
  engine_type?: string;
  state?: string;
  layer?: string;
  dependencies?: string[];
  uptime?: string;
  version?: string;
}

// ── World Model ────────────────────────
export interface WorldModelStats {
  entities: number;
  beliefs: number;
  relations: number;
  snapshots: number;
  inferences_applied: number;
  memory_enabled: boolean;
  memory_queries: number;
  memory_persists: number;
  entities_created: number;
  entities_updated: number;
  beliefs_added: number;
  snapshots_taken: number;
  persistence_enabled: boolean;
  last_memory_sync?: string;
}

export interface WorldEntity {
  id: string;
  type: string;
  properties: Record<string, any>;
  confidence: number;
  source: string;
  last_updated: string;
  relations?: Record<string, string[]>;
}

export interface WorldBelief {
  proposition: string;
  confidence: number;
  evidence: string[];
  contradicts: string[];
  timestamp: string;
}

export interface WorldRelation {
  source: string;
  relation: string;
  target: string;
  confidence?: number;
}

export interface DailyStats {
  date: string;
  entities_added: number;
}

// ── Event ──────────────────────────────
export interface CIOSEvent {
  id: string;
  timestamp: string;
  channel: string;
  eventType: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'CRITICAL';
  message: string;
  payload?: Record<string, any>;
  engineId?: string;
}

// ── Conversation ───────────────────────
export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
  confidence?: number;
  reasoningSteps?: ReasoningStep[];
}

export interface ReasoningStep {
  id: string;
  step: number;
  type: 'observation' | 'hypothesis' | 'inference' | 'conclusion';
  content: string;
  confidence: number;
}

// ── Health ─────────────────────────────
export interface SystemHealth {
  status?: string;
  uptime?: string;
  version?: string;
  kafka_connected?: boolean;
  db_connected?: boolean;
  memory_usage?: number;
  cpu_usage?: number;
  services?: Record<string, boolean>;
  engines_count?: number;
  active_sessions?: number;
}

export interface MnemonicHealth {
  total_writes: number;
  writes_succeeded: number;
  writes_failed: number;
  total_retrievals: number;
  retrievals_succeeded: number;
  retrievals_failed: number;
  hot_buffer_size: number;
  hash_chain_length: number;
  hash_chain_valid: boolean;
  events_flushed: number;
}

// ── Planner ────────────────────────────
export interface Plan {
  plan_id: string;
  goal: string;
  tasks: PlanTask[];
  created_at: string;
  estimated_completion: string;
  progress: number;
  status: string;
}

export interface PlanTask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  depends_on: string[];
  assigned_engine?: string;
  estimated_duration_seconds: number;
  priority: number;
  riskScore?: number;
}

// ── Simulator ──────────────────────────
export interface SimulationResult {
  action: string;
  risk_score: number;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';
  recommendation: string;
  confidence: number;
  requires_approval: boolean;
  diff?: StateDiff;
}

export interface StateDiff {
  entity_changes: number;
  belief_changes: number;
  relation_changes: number;
  risk_score: number;
  description: string;
}

export interface Snapshot {
  snapshot_id: string;
  label: string;
  timestamp: string;
  state_summary?: {
    entities: number;
    beliefs: number;
    relations: number;
  };
}

// ── Tool Registry ──────────────────────
export interface Tool {
  name: string;
  description: string;
  category: 'filesystem' | 'system' | 'network' | 'code' | 'cios';
  parameters: Record<string, ToolParameter>;
  requires_confirmation: boolean;
  timeout_seconds: number;
  max_retries?: number;
}

export interface ToolParameter {
  type: string;
  required?: boolean;
  description?: string;
  default?: any;
}

export interface ToolExecutionResult {
  status: 'completed' | 'timeout' | 'error';
  execution_id: string;
  tool: string;
  stdout?: string;
  stderr?: string;
  exit_code?: number;
  body?: string;
  status_code?: number;
  error?: string;
}

export interface ToolHistoryEntry {
  timestamp: string;
  tool: string;
  params: Record<string, string>;
  status: string;
}

// ── OSINT ──────────────────────────────
export interface OSINTStats {
  items_collected: number;
  items_processed: number;
  entities_extracted: number;
  relationships_mapped: number;
  signals_generated: number;
  events_published: number;
  errors: number;
  collections_completed: number;
}

export interface OSINTSource {
  name: string;
  enabled: boolean;
  type?: string;
}

export interface OSINTCollectionResult {
  success: boolean;
  source: string;
  collected_count?: number;
  type?: string;
  artifacts?: any[];
  request_id?: string;
  error?: string;
}

// ── Knowledge Graph ────────────────────
export interface KGEntity {
  id: string;
  type: string;
  domain: string;
  attributes?: Record<string, any>;
}

export interface KGRelationship {
  source_id: string;
  target_id: string;
  type: string;
  strength?: number;
}

export interface KGCommunity {
  id: string;
  entities: string[];
  density?: number;
}

export interface KGStats {
  entities: number;
  relationships: number;
  communities?: number;
}

// ── Anomaly Detection ──────────────────
export interface AnomalyAlert {
  id: string;
  timestamp: string;
  sensor_id: string;
  domain: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  anomaly_score: number;
  message: string;
  value?: number;
  unit?: string;
}

export interface AnomalyStats {
  total_anomalies: number;
  last_24h: number;
  by_severity?: Record<string, number>;
}

// ── Remediation ────────────────────────
export interface RemediationAction {
  id: string;
  action_type: string;
  status: string;
  description?: string;
  timestamp: string;
  priority?: string;
  domain?: string;
}

// ── Federated Learning ─────────────────
export interface FLClient {
  client_id: string;
  status: string;
  last_seen?: string;
  rounds_completed?: number;
}

export interface FLStats {
  status: string;
  clients: number;
  current_round?: number;
  model_version?: string;
}

// ── Project Intelligence ───────────────
export interface ProjectStats {
  completion_pct: number;
  components: number;
  sessions?: number;
  decisions?: number;
  next_actions?: string[];
}

export interface ProjectSession {
  topic: string;
  date: string;
  decisions: string[];
  changes: string[];
  engines_built?: number;
  domains_created?: number;
  key_achievements?: string[];
}

// ── Audio Perception ───────────────────
export interface AudioStatus {
  engine: string;
  stt_loaded: boolean;
  tts_loaded: boolean;
  vad_loaded: boolean;
  listening: boolean;
  current_voice: string;
  available_voices: number;
  utterances_processed: number;
  tts_requests: number;
  wake_words_detected: number;
  total_audio_seconds: number;
}

export interface Voice {
  name: string;
  display_name: string;
  language: string;
  quality: string;
  size_mb: number;
}

export interface AudioDevice {
  index: number;
  name: string;
  max_input_channels: number;
  max_output_channels: number;
  default_sample_rate: number;
}

// ── Vision Perception ──────────────────
export interface VisionStatus {
  engine: string;
  detector_loaded: boolean;
  embedder_loaded: boolean;
  camera_active: boolean;
  camera_fps: number;
  frames_processed: number;
  objects_detected: number;
}

export interface DetectedObject {
  class_name: string;
  confidence: number;
  bbox: number[];
}

export interface DetectionResult {
  objects: DetectedObject[];
  count: number;
  inference_ms: number;
  frame_id?: string;
}

// ── Auth / RBAC ────────────────────────
export interface User {
  user_id: string;
  username: string;
  email?: string;
  authority_level?: string;
  role?: string;
}

export interface AuthStats {
  total_users: number;
  active_sessions: number;
  roles_count?: number;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

// ── Governance / Compliance ────────────
export interface PolicyStatus {
  name: string;
  status: 'active' | 'inactive' | 'violated';
  violations: number;
  engine: string;
  last_updated?: string;
}

export interface ApprovalItem {
  id: string;
  action: string;
  requestedBy: string;
  risk: 'LOW' | 'MED' | 'HIGH';
  timestamp: string;
}

export interface IntegrationHealth {
  name: string;
  status: 'connected' | 'degraded' | 'disconnected';
  syncType: string;
  lastSync: string;
}

// ── Telemetry ──────────────────────────
export interface TelemetryReading {
  sensor_id: string;
  domain: string;
  value: number;
  unit: string;
  timestamp?: string;
  is_anomaly?: boolean;
  metadata?: Record<string, any>;
}

export interface TelemetryStats {
  total_readings: number;
  active_sensors: number;
  domains_active: number;
  last_reading_at?: string;
}

// ── API Response Wrappers ──────────────
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
  total?: number;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  limit: number;
  offset: number;
  total: number;
}

// ── Dashboard State ────────────────────
export interface DashboardMetrics {
  engines: number;
  worldModel: number;
  events: number;
  memory: number;
  uptime: string;
  version: string;
  healthStatus: 'online' | 'degraded' | 'offline';
}

export interface SidebarEngineStatus {
  name: string;
  status: 'running' | 'stopped' | 'degraded' | 'error' | 'initializing';
  type?: string;
}

// ── Navigation ─────────────────────────
export interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  pinned?: boolean;
}

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  external?: boolean;
}