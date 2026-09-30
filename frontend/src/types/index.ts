export type AgentId = 'research' | 'analyst' | 'critic';

export type AgentStatusType =
  | 'idle'
  | 'thinking'
  | 'speaking'
  | 'challenging'
  | 'reading'
  | 'reviewing'
  | 'refining'
  | 'confident'
  | 'waiting'
  | 'completed'
  | 'error';

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  status: AgentStatusType;
  current_reasoning?: string;
  confidence?: number | null;
  uncertainty?: number | null;
}

export interface EvidenceItem {
  claim: string;
  evidence: string;
  source_title: string | null;
  source_url: string | null;
  source_type: 'tier1' | 'tier2' | 'tier3' | null;
  confidence: number;
  uncertainty: number;
}

export interface StreamMessage {
  id: string;
  round: number;
  sender: string;
  receiver: string | null;
  content: string;
  confidence?: number | null;
  timestamp: string;
}

export interface CommunicationDecision {
  id: string;
  decision: 'bypass' | 'approach';
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  receiver_name: string;
  confidence: number;
  uncertainty: number;
  threshold: number;
  reason: string;
  sent_count: number;
  bypassed_count: number;
  tokens_saved: number;
  timestamp: string;
}

export interface DiscussionStats {
  confidence_threshold: number;
  uncertainty_threshold: number;
  messages_sent: number;
  messages_bypassed: number;
  overhead_reduction_pct: number;
  tokens_saved: number;
  // Telemetry (TASK_BENCHMARK) — all default to 0 for backward compat
  latency_multi_sec?: number;
  latency_single_sec?: number;
  latency_delta_pct?: number;
  energy_multi_wh?: number;
  energy_single_wh?: number;
  energy_delta_pct?: number;
  carbon_multi_g?: number;
  carbon_single_g?: number;
  carbon_saved_g?: number;
  concurrency_time_saved_sec?: number;
}

// ---------------------------------------------------------------------------
// Live Workflow Trace
// ---------------------------------------------------------------------------

export type TraceEventType =
  | 'start'
  | 'think'
  | 'search'
  | 'decision'
  | 'message'
  | 'milestone'
  | 'finish'
  | 'error';

export interface TraceEvent {
  id: string;
  timestamp: string;
  type: TraceEventType;
  agentId?: string;
  agentName?: string;
  title: string;
  detail?: string;
  meta?: Record<string, any>;
}

export type AccuracyMode = 'fast' | 'balanced' | 'academic';

export type AppTab = 'chat' | 'dashboard' | 'settings';

export interface ChatTurn {
  id: string;
  query: string;
  synthesis: string;
  stats?: DiscussionStats;
  evidence: EvidenceItem[];
  streamMessages: StreamMessage[];
  decisions: CommunicationDecision[];
  agentSnapshots: Record<AgentId, Agent>;
  accuracyMode: AccuracyMode;
  provider: string;
  model: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  turns: ChatTurn[];
  accuracy_mode: AccuracyMode;
  provider: string;
  model: string;
}

export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentColor = 'emerald' | 'cyan' | 'violet' | 'amber' | 'rose';
export type FontSize = 'compact' | 'normal' | 'large';

export interface AppSettings {
  theme: ThemeMode;
  accentColor: AccentColor;
  fontSize: FontSize;
  defaultMode: AccuracyMode;
  defaultThreshold: number;
  preferredProvider: 'groq' | 'openai' | 'auto';
  searchDepth: 'standard' | 'academic';
}

