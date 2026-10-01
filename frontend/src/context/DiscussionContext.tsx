import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Agent,
  AgentId,
  AppTab,
  AccuracyMode,
  ChatSession,
  ChatTurn,
  CommunicationDecision,
  DiscussionStats,
  EvidenceItem,
  StreamMessage,
  TraceEvent,
} from '../types';
import { useSettings } from './SettingsContext';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

const INITIAL_AGENTS: Record<AgentId, Agent> = {
  research: {
    id: 'research',
    name: 'Dr. Elena Chen',
    role: 'Research Agent',
    description: 'Evidence & Web Grounding',
    status: 'idle',
    current_reasoning: 'Waiting for a research question...',
  },
  analyst: {
    id: 'analyst',
    name: 'Marcus Vance',
    role: 'Analyst Agent',
    description: 'Trade-offs & Implications',
    status: 'idle',
    current_reasoning: 'Waiting for team findings...',
  },
  critic: {
    id: 'critic',
    name: 'Dr. Sarah Lin',
    role: 'Critic Agent (Verifier)',
    description: 'Fact-checking & Scrutiny',
    status: 'idle',
    current_reasoning: 'Waiting to review assertions...',
  },
};

const MODE_THRESHOLDS: Record<AccuracyMode, number> = {
  fast: 0.50,
  balanced: 0.75,
  academic: 0.90,
};

interface DiscussionContextValue {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isInspectorExpanded: boolean;
  setIsInspectorExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  accuracyMode: AccuracyMode;
  setAccuracyMode: (mode: AccuracyMode) => void;

  running: boolean;
  currentRound: number;
  currentQuery: string;
  provider: string;
  model: string;
  agents: Record<AgentId, Agent>;
  evidence: EvidenceItem[];
  streamMessages: StreamMessage[];
  decisions: CommunicationDecision[];
  stats: DiscussionStats;
  collectiveReasoning: string | null;
  error: string | null;
  isBackendConnected: boolean;

  workflowTrace: TraceEvent[];

  turns: ChatTurn[];

  sessions: ChatSession[];
  currentSessionId: string | null;

  startDiscussion: (task: string, modeOverride?: AccuracyMode) => Promise<void>;
  stopDiscussion: () => Promise<void>;
  clearHistory: () => void;
  loadSession: (sessionId: string) => void;
  newSession: () => void;
  deleteSession: (sessionId: string, e?: React.MouseEvent) => void;
}

export const generateUniqueId = (prefix: string = 'id'): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

export function sanitizeSessions(rawSessions: any[]): ChatSession[] {
  if (!Array.isArray(rawSessions)) return [];
  const seenIds = new Set<string>();
  const sanitized: ChatSession[] = [];

  for (let idx = 0; idx < rawSessions.length; idx++) {
    const raw = rawSessions[idx];
    if (!raw || typeof raw !== 'object') continue;

    // Ensure strictly unique session ID
    let sessId = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : '';
    if (!sessId || seenIds.has(sessId)) {
      sessId = generateUniqueId('sess');
    }
    seenIds.add(sessId);

    // Sanitize turns
    const rawTurns = Array.isArray(raw.turns) ? raw.turns : [];
    const seenTurnIds = new Set<string>();
    const cleanedTurns: ChatTurn[] = [];

    for (const t of rawTurns) {
      if (!t || typeof t !== 'object') continue;
      let turnId = typeof t.id === 'string' && t.id.trim() ? t.id.trim() : '';
      if (!turnId || seenTurnIds.has(turnId)) {
        turnId = generateUniqueId('turn');
      }
      seenTurnIds.add(turnId);

      cleanedTurns.push({
        ...t,
        id: turnId,
        query: t.query || 'Research Inquiry',
        synthesis: t.synthesis || '',
        evidence: Array.isArray(t.evidence) ? t.evidence : [],
        streamMessages: Array.isArray(t.streamMessages) ? t.streamMessages : [],
        decisions: Array.isArray(t.decisions) ? t.decisions : [],
        agentSnapshots: t.agentSnapshots || INITIAL_AGENTS,
        accuracyMode: t.accuracyMode || 'balanced',
        provider: t.provider || 'groq',
        model: t.model || 'openai/gpt-oss-20b',
        timestamp: t.timestamp || new Date().toLocaleTimeString(),
      });
    }

    let title = typeof raw.title === 'string' ? raw.title.trim() : '';
    if (!title || title.toLowerCase() === 'untitled investigation') {
      const firstTurnQuery = cleanedTurns[0]?.query?.trim();
      if (firstTurnQuery && firstTurnQuery.toLowerCase() !== 'research inquiry') {
        title = firstTurnQuery.slice(0, 65) + (firstTurnQuery.length > 65 ? '...' : '');
      } else {
        title = `Investigation #${idx + 1}`;
      }
    }

    sanitized.push({
      ...raw,
      id: sessId,
      title,
      timestamp: raw.timestamp || new Date().toLocaleString(),
      turns: cleanedTurns,
      accuracy_mode: raw.accuracy_mode || 'balanced',
      provider: raw.provider || 'groq',
      model: raw.model || 'openai/gpt-oss-20b',
    });
  }

  return sanitized;
}

const DiscussionContext = createContext<DiscussionContextValue | undefined>(undefined);

export const DiscussionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();

  const [activeTab, setActiveTab] = useState<AppTab>('chat');
  const [isInspectorExpanded, setIsInspectorExpanded] = useState<boolean>(false);
  const [accuracyMode, setAccuracyMode] = useState<AccuracyMode>(settings.defaultMode);

  const [running, setRunning] = useState<boolean>(false);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [provider, setProvider] = useState<string>('groq');
  const [model, setModel] = useState<string>('openai/gpt-oss-20b');
  const [agents, setAgents] = useState<Record<AgentId, Agent>>(INITIAL_AGENTS);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [streamMessages, setStreamMessages] = useState<StreamMessage[]>([]);
  const [decisions, setDecisions] = useState<CommunicationDecision[]>([]);
  const [stats, setStats] = useState<DiscussionStats>({
    confidence_threshold: settings.defaultThreshold,
    uncertainty_threshold: Math.round((1 - settings.defaultThreshold) * 100) / 100,
    messages_sent: 0,
    messages_bypassed: 0,
    overhead_reduction_pct: 0,
    tokens_saved: 0,
  });
  const [collectiveReasoning, setCollectiveReasoning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  const [workflowTrace, setWorkflowTrace] = useState<TraceEvent[]>([]);

  const [turns, setTurns] = useState<ChatTurn[]>([]);

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const savedV2 = localStorage.getItem('ctmars_sessions_v2');
      if (savedV2) return sanitizeSessions(JSON.parse(savedV2));
      const savedV1 = localStorage.getItem('ctmars_sessions');
      if (savedV1) return sanitizeSessions(JSON.parse(savedV1));
    } catch {
    }
    return [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const pushTrace = (evt: Omit<TraceEvent, 'id' | 'timestamp'>) => {
    const traceEvt: TraceEvent = {
      ...evt,
      id: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    setWorkflowTrace((prev) => [...prev, traceEvt]);
  };

  const agentName = (id: string): string => {
    const names: Record<string, string> = {
      research: 'Dr. Elena Chen',
      analyst: 'Marcus Vance',
      critic: 'Dr. Sarah Lin',
    };
    return names[id] || id;
  };

  // Refs for live snapshot capture (used in async recordTurn)
  const accuracyModeRef = useRef(accuracyMode);
  accuracyModeRef.current = accuracyMode;
  useEffect(() => {
    if (currentSessionId !== null || running || turns.length > 0) return;
    setAccuracyMode(settings.defaultMode);
    accuracyModeRef.current = settings.defaultMode;
  }, [settings.defaultMode, currentSessionId, running, turns.length]);

  const evidenceRef = useRef<EvidenceItem[]>([]);
  const streamMessagesRef = useRef<StreamMessage[]>([]);
  const decisionsRef = useRef<CommunicationDecision[]>([]);
  const agentsRef = useRef<Record<AgentId, Agent>>(INITIAL_AGENTS);
  const statsRef = useRef<DiscussionStats>(stats);
  const currentQueryRef = useRef<string>('');
  const providerRef = useRef<string>('groq');
  const modelRef = useRef<string>('openai/gpt-oss-20b');
  const currentSessionIdRef = useRef<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => { evidenceRef.current = evidence; }, [evidence]);
  useEffect(() => { streamMessagesRef.current = streamMessages; }, [streamMessages]);
  useEffect(() => { decisionsRef.current = decisions; }, [decisions]);
  useEffect(() => { agentsRef.current = agents; }, [agents]);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { currentQueryRef.current = currentQuery; }, [currentQuery]);
  useEffect(() => { providerRef.current = provider; }, [provider]);
  useEffect(() => { modelRef.current = model; }, [model]);
  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);

  useEffect(() => {
    try {
      localStorage.setItem('ctmars_sessions_v2', JSON.stringify(sessions));
    } catch {
    }
  }, [sessions]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let isCleanedUp = false;

    const connect = () => {
      if (isCleanedUp) return;
      let url: string;
      if (API_BASE_URL) {
        const backendUrl = new URL(API_BASE_URL);
        backendUrl.protocol = backendUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        backendUrl.pathname = '/ws';
        url = backendUrl.toString();
      } else {
        const isDev = window.location.port === '5173';
        const hostName = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
        const wsHost = isDev ? `${hostName}:8000` : window.location.host;
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        url = `${proto}://${wsHost}/ws`;
      }

      try {
        ws = new WebSocket(url);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!isCleanedUp) setIsBackendConnected(true);
        };

        ws.onclose = () => {
          if (!isCleanedUp) {
            setIsBackendConnected(false);
            reconnectTimeout = setTimeout(connect, 2000);
          }
        };

        ws.onerror = () => {
          if (!isCleanedUp) setIsBackendConnected(false);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketEvent(data);
          } catch (err) {
            console.warn('WS parse error:', err);
          }
        };
      } catch {
        if (!isCleanedUp) {
          setIsBackendConnected(false);
          reconnectTimeout = setTimeout(connect, 2000);
        }
      }
    };

    connect();

    fetch(`${API_BASE_URL}/api/status`)
      .then((res) => res.json())
      .then((data) => {
        if (data.provider) setProvider(data.provider);
        if (data.model) setModel(data.model);
      })
      .catch((err) => console.warn('Status fetch error:', err));

    return () => {
      isCleanedUp = true;
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, []);

  const handleWebSocketEvent = (evt: any) => {
    switch (evt.type) {
      case 'discussion_started':
        setRunning(true);
        setCurrentRound(1);
        setError(null);
        setCollectiveReasoning(null);
        setEvidence([]);
        setStreamMessages([]);
        setDecisions([]);
        setWorkflowTrace([]);
        if (evt.task) {
          setCurrentQuery(evt.task);
          currentQueryRef.current = evt.task;
        }
        if (evt.provider) setProvider(evt.provider);
        if (evt.model) setModel(evt.model);
        setAgents((prev) => ({
          research: { ...prev.research, status: 'thinking', current_reasoning: 'Investigating query...', confidence: null },
          analyst: { ...prev.analyst, status: 'idle', current_reasoning: 'Waiting for evidence...', confidence: null },
          critic: { ...prev.critic, status: 'idle', current_reasoning: 'Waiting to review assertions...', confidence: null },
        }));
        pushTrace({
          type: 'start',
          title: 'Discussion Started',
          detail: `Provider: ${evt.provider || 'auto'} · Model: ${evt.model || 'unknown'} · Mode: ${evt.mode || 'balanced'}`,
          meta: { provider: evt.provider, model: evt.model, mode: evt.mode },
        });
        break;

      case 'round_started':
        setCurrentRound(evt.round);
        pushTrace({
          type: 'milestone',
          title: `Round ${evt.round}: ${evt.label || 'In Progress'}`,
          detail: evt.label,
        });
        break;

      case 'round_finished':
        pushTrace({
          type: 'milestone',
          title: `Round ${evt.round} Complete`,
        });
        break;

      case 'agent_status':
        if (evt.agent && agents[evt.agent as AgentId]) {
          setAgents((prev) => ({
            ...prev,
            [evt.agent as AgentId]: {
              ...prev[evt.agent as AgentId],
              status: evt.status,
            },
          }));
          // Trace thinking/reading status transitions
          if (evt.status === 'thinking') {
            pushTrace({
              type: 'think',
              agentId: evt.agent,
              agentName: agentName(evt.agent),
              title: `${agentName(evt.agent)} is analyzing the prompt...`,
              detail: 'Reasoning and formulating response',
            });
          } else if (evt.status === 'reading') {
            pushTrace({
              type: 'think',
              agentId: evt.agent,
              agentName: agentName(evt.agent),
              title: `${agentName(evt.agent)} is reading peer findings...`,
              detail: evt.from ? `Reading message from ${agentName(evt.from)}` : 'Processing incoming data',
            });
          }
        }
        break;

      case 'agent_finished':
        if (evt.agent && agents[evt.agent as AgentId]) {
          setAgents((prev) => ({
            ...prev,
            [evt.agent as AgentId]: {
              ...prev[evt.agent as AgentId],
              status: 'speaking',
              current_reasoning: evt.reasoning,
              confidence: typeof evt.confidence === 'number' ? evt.confidence : prev[evt.agent as AgentId].confidence,
              uncertainty: typeof evt.confidence === 'number' ? roundNumber(1 - evt.confidence, 2) : prev[evt.agent as AgentId].uncertainty,
            },
          }));
          pushTrace({
            type: 'milestone',
            agentId: evt.agent,
            agentName: agentName(evt.agent),
            title: `${agentName(evt.agent)} completed Round ${evt.round}`,
            detail: typeof evt.confidence === 'number' ? `Confidence: ${Math.round(evt.confidence * 100)}%` : undefined,
            meta: { confidence: evt.confidence, round: evt.round },
          });
        }
        break;

      case 'agent_error':
        if (evt.agent && agents[evt.agent as AgentId]) {
          setAgents((prev) => ({
            ...prev,
            [evt.agent as AgentId]: {
              ...prev[evt.agent as AgentId],
              status: 'error',
              current_reasoning: `Error: ${evt.message}`,
            },
          }));
        }
        break;

      case 'evidence_discovered':
        if (evt.evidence && Array.isArray(evt.evidence)) {
          setEvidence((prev) => {
            const existingUrls = new Set(prev.map((e) => e.source_url).filter(Boolean));
            const newItems = evt.evidence.filter((e: EvidenceItem) => !e.source_url || !existingUrls.has(e.source_url));
            return [...prev, ...newItems];
          });
          // Trace each evidence item
          for (const item of evt.evidence) {
            pushTrace({
              type: 'search',
              agentId: evt.agent,
              agentName: agentName(evt.agent || 'research'),
              title: item.source_title || item.claim || 'Evidence discovered',
              detail: item.claim ? `"${(item.claim as string).slice(0, 120)}${(item.claim as string).length > 120 ? '...' : ''}"` : undefined,
              meta: { url: item.source_url, source_type: item.source_type, confidence: item.confidence },
            });
          }
        }
        break;

      case 'message_sent':
        if (evt.message) {
          const msg = evt.message;
          setStreamMessages((prev) => [
            ...prev,
            {
              id: msg.id || `${Date.now()}-${Math.random()}`,
              round: msg.round,
              sender: msg.sender,
              receiver: msg.receiver,
              content: msg.content,
              confidence: msg.confidence,
              duration_sec: msg.duration_sec || 0,
              message_type: msg.message_type,
              sender_id: evt.sender_id,
              receiver_id: evt.receiver_id,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        }
        break;

      case 'communication_decision':
        setDecisions((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            decision: evt.decision,
            sender_id: evt.sender_id,
            receiver_id: evt.receiver_id,
            sender_name: evt.sender_name,
            receiver_name: evt.receiver_name,
            confidence: evt.confidence,
            uncertainty: evt.uncertainty,
            threshold: evt.threshold,
            reason: evt.reason,
            sent_count: evt.sent_count,
            bypassed_count: evt.bypassed_count,
            tokens_saved: evt.tokens_saved,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        pushTrace({
          type: 'decision',
          agentId: evt.sender_id,
          agentName: evt.sender_name,
          title: evt.decision === 'bypass'
            ? `${evt.sender_name} bypassed ${evt.receiver_name}`
            : `${evt.sender_name} approached ${evt.receiver_name}`,
          detail: evt.reason,
          meta: {
            decision: evt.decision,
            d_score: evt.d_score,
            confidence: evt.confidence,
            threshold: evt.threshold,
          },
        });

        if (typeof evt.sent_count === 'number' && typeof evt.bypassed_count === 'number') {
          const total = Math.max(1, evt.sent_count + evt.bypassed_count);
          setStats((prev) => ({
            ...prev,
            messages_sent: evt.sent_count,
            messages_bypassed: evt.bypassed_count,
            overhead_reduction_pct: Math.round((evt.bypassed_count / total) * 100),
            tokens_saved: evt.tokens_saved,
          }));
        }
        break;

      case 'discussion_finished':
        setRunning(false);
        setCollectiveReasoning(evt.collective_reasoning);
        if (evt.stats) {
          setStats(evt.stats);
        }
        pushTrace({
          type: 'finish',
          title: 'Discussion Complete — Synthesis Ready',
          detail: evt.stats ? `Energy: ${(evt.stats.energy_multi_wh ?? 0).toFixed(4)} Wh · Carbon: ${(evt.stats.carbon_multi_g ?? 0).toFixed(4)} gCO2eq` : undefined,
          meta: evt.stats,
        });
        setAgents((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((id) => {
            updated[id as AgentId] = {
              ...updated[id as AgentId],
              status: 'completed',
            };
          });
          return updated;
        });

        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#38d39f', '#5fa8ff', '#e8b355'],
        });

        recordTurn(evt.collective_reasoning, evt.stats, evt.task);
        break;

      case 'discussion_error':
        setRunning(false);
        setError(evt.message || 'Discussion encountered an error.');
        pushTrace({
          type: 'error',
          title: 'Error',
          detail: evt.message || 'Discussion encountered an error.',
        });
        break;

      case 'discussion_cancelled':
        setRunning(false);
        setError('Discussion was cancelled.');
        pushTrace({
          type: 'error',
          title: 'Discussion Cancelled',
          detail: 'The discussion was cancelled by the user.',
        });
        break;
    }
  };

  const recordTurn = (synthesis: string, finalStats: DiscussionStats, taskOverride?: string) => {
    const rawQuery = taskOverride || currentQueryRef.current || '';
    const queryText = rawQuery.trim();
    const newTurn: ChatTurn = {
      id: generateUniqueId('turn'),
      query: queryText || 'Research Inquiry',
      synthesis,
      stats: finalStats,
      evidence: [...evidenceRef.current],
      streamMessages: [...streamMessagesRef.current],
      decisions: [...decisionsRef.current],
      agentSnapshots: { ...agentsRef.current },
      accuracyMode: accuracyModeRef.current,
      provider: providerRef.current,
      model: modelRef.current,
      timestamp: new Date().toLocaleTimeString(),
    };

    // Capture the session ID before updating state.
    const existingSessionId = currentSessionIdRef.current;

    if (existingSessionId) {
      // Append the turn and move the session to the top.
      setTurns((prev) => [...prev, newTurn]);
      setSessions((prev) => {
        const existing = prev.find((s) => s.id === existingSessionId);
        if (!existing) return prev;
        const updatedSession: ChatSession = {
          ...existing,
          timestamp: new Date().toLocaleString(),
          turns: [...(existing.turns || []), newTurn],
        };
        return [updatedSession, ...prev.filter((s) => s.id !== existingSessionId)];
      });
    } else {
      const newSessionId = generateUniqueId('sess');
      currentSessionIdRef.current = newSessionId; // synchronous guard

      const sessionTitle = queryText
        ? queryText.slice(0, 65) + (queryText.length > 65 ? '...' : '')
        : `Investigation (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;

      const newSession: ChatSession = {
        id: newSessionId,
        title: sessionTitle,
        timestamp: new Date().toLocaleString(),
        turns: [newTurn],
        accuracy_mode: accuracyModeRef.current,
        provider: providerRef.current,
        model: modelRef.current,
      };

      setTurns([newTurn]); // fresh turn list for new session
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(newSessionId);
    }
  };

  const startDiscussion = async (taskQuery: string, modeOverride?: AccuracyMode) => {
    const q = taskQuery.trim();
    if (!q) return;

    const mode = modeOverride || accuracyMode;
    const threshold = MODE_THRESHOLDS[mode] || settings.defaultThreshold;

    setCurrentQuery(q);
    currentQueryRef.current = q; // Synchronous ref guard
    setError(null);
    setRunning(true);
    setCollectiveReasoning(null);
    setCurrentRound(1);
    setDecisions([]);
    decisionsRef.current = [];
    setStreamMessages([]);
    streamMessagesRef.current = [];
    setEvidence([]);
    evidenceRef.current = [];
    setWorkflowTrace([]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: q,
          confidence_threshold: threshold,
          mode: mode,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.message || `Failed to start discussion (HTTP ${res.status})`);
      }
    } catch (err: any) {
      setRunning(false);
      setError(err.message || 'Network error while starting discussion.');
    }
  };

  const stopDiscussion = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/stop`, { method: 'POST' });
    } catch (err) {
      console.warn('Stop discussion error:', err);
    }
  };

  const clearHistory = () => {
    setSessions([]);
    localStorage.removeItem('ctmars_sessions_v2');
    newSession();
  };

  const newSession = () => {
    if (running) return;
    setCurrentSessionId(null);
    currentSessionIdRef.current = null; // Synchronous ref guard
    setTurns([]);
    setCurrentQuery('');
    currentQueryRef.current = '';
    setCollectiveReasoning(null);
    setError(null);
    setEvidence([]);
    evidenceRef.current = [];
    setStreamMessages([]);
    streamMessagesRef.current = [];
    setDecisions([]);
    decisionsRef.current = [];
    setWorkflowTrace([]);
    setAgents(INITIAL_AGENTS);
    agentsRef.current = INITIAL_AGENTS;
    setAccuracyMode(settings.defaultMode);
    accuracyModeRef.current = settings.defaultMode;
    setActiveTab('chat');
  };

  const loadSession = (sessionId: string) => {
    if (running) return; // Prevent corrupting in-progress live deliberation
    const sess = sessions.find((s) => s.id === sessionId);
    if (!sess) return;

    setCurrentSessionId(sess.id);
    currentSessionIdRef.current = sess.id; // Synchronous ref guard
    const sessTurns = sess.turns || [];
    setTurns(sessTurns);
    setCurrentQuery('');
    currentQueryRef.current = '';
    setCollectiveReasoning(null);
    setError(null);
    setWorkflowTrace([]);
    setActiveTab('chat');

    const lastTurn = sessTurns[sessTurns.length - 1];
    if (lastTurn) {
      setEvidence(lastTurn.evidence || []);
      evidenceRef.current = lastTurn.evidence || [];
      setStreamMessages(lastTurn.streamMessages || []);
      streamMessagesRef.current = lastTurn.streamMessages || [];
      setDecisions(lastTurn.decisions || []);
      decisionsRef.current = lastTurn.decisions || [];
      if (lastTurn.stats) {
        setStats(lastTurn.stats);
        statsRef.current = lastTurn.stats;
      }
      if (lastTurn.agentSnapshots) {
        setAgents(lastTurn.agentSnapshots);
        agentsRef.current = lastTurn.agentSnapshots;
      } else {
        setAgents(INITIAL_AGENTS);
        agentsRef.current = INITIAL_AGENTS;
      }
      if (lastTurn.accuracyMode) {
        setAccuracyMode(lastTurn.accuracyMode);
        accuracyModeRef.current = lastTurn.accuracyMode;
      }
    } else {
      setEvidence([]);
      evidenceRef.current = [];
      setStreamMessages([]);
      streamMessagesRef.current = [];
      setDecisions([]);
      decisionsRef.current = [];
      setAgents(INITIAL_AGENTS);
      agentsRef.current = INITIAL_AGENTS;
    }
  };

  const deleteSession = (sessionId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (running && currentSessionIdRef.current === sessionId) return;

    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId || currentSessionIdRef.current === sessionId) {
      newSession();
    }
  };

  return (
    <DiscussionContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isInspectorExpanded,
        setIsInspectorExpanded,
        accuracyMode,
        setAccuracyMode,

        running,
        currentRound,
        currentQuery,
        provider,
        model,
        agents,
        evidence,
        streamMessages,
        decisions,
        stats,
        collectiveReasoning,
        error,
        isBackendConnected,

        workflowTrace,

        turns,

        sessions,
        currentSessionId,

        startDiscussion,
        stopDiscussion,
        clearHistory,
        loadSession,
        newSession,
        deleteSession,
      }}
    >
      {children}
    </DiscussionContext.Provider>
  );
};

export const useDiscussion = () => {
  const ctx = useContext(DiscussionContext);
  if (!ctx) throw new Error('useDiscussion must be used within DiscussionProvider');
  return ctx;
};

function roundNumber(num: number, dec: number): number {
  const factor = Math.pow(10, dec);
  return Math.round(num * factor) / factor;
}
