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
} from '../types';
import { useSettings } from './SettingsContext';

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
  // State
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isInspectorExpanded: boolean;
  setIsInspectorExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  accuracyMode: AccuracyMode;
  setAccuracyMode: (mode: AccuracyMode) => void;

  // Live discussion state (current in-progress query)
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

  // Multi-turn turns for current session
  turns: ChatTurn[];

  // Session history (sidebar)
  sessions: ChatSession[];
  currentSessionId: string | null;

  // Actions
  startDiscussion: (task: string, modeOverride?: AccuracyMode) => Promise<void>;
  stopDiscussion: () => Promise<void>;
  clearHistory: () => void;
  loadSession: (sessionId: string) => void;
  newSession: () => void;
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

  // Completed turns in current session
  const [turns, setTurns] = useState<ChatTurn[]>([]);

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('ctmars_sessions_v2');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Refs for live snapshot capture (used in async recordTurn)
  const accuracyModeRef = useRef(accuracyMode);
  accuracyModeRef.current = accuracyMode;
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

  // Keep refs in sync with state
  useEffect(() => { evidenceRef.current = evidence; }, [evidence]);
  useEffect(() => { streamMessagesRef.current = streamMessages; }, [streamMessages]);
  useEffect(() => { decisionsRef.current = decisions; }, [decisions]);
  useEffect(() => { agentsRef.current = agents; }, [agents]);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { currentQueryRef.current = currentQuery; }, [currentQuery]);
  useEffect(() => { providerRef.current = provider; }, [provider]);
  useEffect(() => { modelRef.current = model; }, [model]);
  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);

  // Sync sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ctmars_sessions_v2', JSON.stringify(sessions));
    } catch {
      // ignore
    }
  }, [sessions]);

  // Connect WebSocket
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let isCleanedUp = false;

    const connect = () => {
      if (isCleanedUp) return;
      const isDev = window.location.port === '5173';
      const hostName = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
      const wsHost = isDev ? `${hostName}:8000` : window.location.host;
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const url = `${proto}://${wsHost}/ws`;

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

    // Check status API
    fetch('/api/status')
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
        if (evt.provider) setProvider(evt.provider);
        if (evt.model) setModel(evt.model);
        setAgents((prev) => ({
          research: { ...prev.research, status: 'thinking', current_reasoning: 'Investigating query...', confidence: null },
          analyst: { ...prev.analyst, status: 'idle', current_reasoning: 'Waiting for evidence...', confidence: null },
          critic: { ...prev.critic, status: 'idle', current_reasoning: 'Waiting to review assertions...', confidence: null },
        }));
        break;

      case 'round_started':
        setCurrentRound(evt.round);
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
        }
        break;

      case 'message_sent':
        if (evt.message) {
          const msg = evt.message;
          setStreamMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              round: msg.round,
              sender: msg.sender,
              receiver: msg.receiver,
              content: msg.content,
              confidence: msg.confidence,
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

        // Trigger celebratory confetti
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#38d39f', '#5fa8ff', '#e8b355'],
        });

        // Record completed turn
        recordTurn(evt.collective_reasoning, evt.stats);
        break;

      case 'discussion_error':
        setRunning(false);
        setError(evt.message || 'Discussion encountered an error.');
        break;

      case 'discussion_cancelled':
        setRunning(false);
        setError('Discussion was cancelled.');
        break;
    }
  };

  const recordTurn = (synthesis: string, finalStats: DiscussionStats) => {
    const newTurn: ChatTurn = {
      id: `turn-${Date.now()}`,
      query: currentQueryRef.current,
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

    // Read refs synchronously BEFORE any state setters
    const existingSessionId = currentSessionIdRef.current;

    if (existingSessionId) {
      // Existing session — update its turns array
      setTurns((prev) => [...prev, newTurn]);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === existingSessionId
            ? { ...s, turns: [...(s.turns || []), newTurn] }
            : s
        )
      );
    } else {
      // New session — generate ID now, update ref IMMEDIATELY to prevent duplicates
      const newSessionId = `session-${Date.now()}`;
      currentSessionIdRef.current = newSessionId; // synchronous guard

      const sessionTitle =
        currentQueryRef.current.slice(0, 65) +
        (currentQueryRef.current.length > 65 ? '...' : '');

      const newSession: ChatSession = {
        id: newSessionId,
        title: sessionTitle,
        timestamp: new Date().toLocaleString(),
        turns: [newTurn],
        accuracy_mode: accuracyModeRef.current,
        provider: providerRef.current,
        model: modelRef.current,
      };

      setTurns([newTurn]);                          // fresh turn list for new session
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
    setError(null);
    setRunning(true);
    setCollectiveReasoning(null);
    setCurrentRound(1);
    setDecisions([]);
    setStreamMessages([]);
    setEvidence([]);

    try {
      const res = await fetch('/api/start', {
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
      await fetch('/api/stop', { method: 'POST' });
    } catch (err) {
      console.warn('Stop discussion error:', err);
    }
  };

  const clearHistory = () => {
    setSessions([]);
    localStorage.removeItem('ctmars_sessions_v2');
  };

  const newSession = () => {
    setCurrentSessionId(null);
    setTurns([]);
    setCurrentQuery('');
    setCollectiveReasoning(null);
    setError(null);
    setEvidence([]);
    setStreamMessages([]);
    setDecisions([]);
    setAgents(INITIAL_AGENTS);
  };

  const loadSession = (sessionId: string) => {
    const sess = sessions.find((s) => s.id === sessionId);
    if (!sess) return;

    setCurrentSessionId(sess.id);
    setTurns(sess.turns || []);
    setCurrentQuery('');
    setCollectiveReasoning(null);
    setError(null);
    setActiveTab('chat');

    // Load last turn's data for context
    const lastTurn = sess.turns?.[sess.turns.length - 1];
    if (lastTurn) {
      setEvidence(lastTurn.evidence);
      setStreamMessages(lastTurn.streamMessages);
      setDecisions(lastTurn.decisions);
      if (lastTurn.stats) setStats(lastTurn.stats);
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

        turns,

        sessions,
        currentSessionId,

        startDiscussion,
        stopDiscussion,
        clearHistory,
        loadSession,
        newSession,
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
