import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, AlertCircle, ArrowRight, Plus, RotateCw } from 'lucide-react';
import { useDiscussion } from '../../context/DiscussionContext';
import { DeliberationPill } from './DeliberationPill';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { AgentWorkspace } from '../inspector/AgentWorkspace';
import { LiveWorkflowTrace } from '../inspector/LiveWorkflowTrace';
import { ChatTurn } from '../../types';

interface StarterTopic {
  badge: string;
  query: string;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
const TOPIC_REFRESH_INTERVAL = 6 * 60 * 60 * 1000;
const FALLBACK_STARTER_TOPICS: StarterTopic[] = [
  {
    badge: 'Frontier AI & Search',
    query: 'Compare DeepSeek-R1 reinforcement learning reasoning tokens with OpenAI o1/o3 search trees.',
  },
  {
    badge: 'Grid Infrastructure',
    query: 'Can Small Modular Nuclear Reactors (SMRs) solve the 50GW grid bottleneck for frontier AI clusters by 2028?',
  },
  {
    badge: 'Biomolecular AI',
    query: 'Empirical reliability of AlphaFold 3 biomolecular complex predictions vs Cryo-EM experimental validation.',
  },
];

const TurnBlock: React.FC<{
  turn: ChatTurn;
  isFirst: boolean;
  isLast: boolean;
  firstTurnRef?: (element: HTMLDivElement | null) => void;
  turnRef?: (element: HTMLDivElement | null) => void;
  isInspectorExpanded: boolean;
  setIsInspectorExpanded: (v: boolean) => void;
}> = ({ turn, isFirst, isLast, firstTurnRef, turnRef, isInspectorExpanded, setIsInspectorExpanded }) => {
  const modeLabel =
    turn.accuracyMode === 'fast' ? '⚡ Fast Turn' :
    turn.accuracyMode === 'academic' ? '🎓 Academic Rigor' :
    '⚖ Balanced';

  return (
    <div
      ref={(element) => {
        if (isFirst) firstTurnRef?.(element);
        turnRef?.(element);
      }}
      className="space-y-4"
    >
      <div className="flex justify-end w-full animate-fade-in">
        <div className="query-bubble max-w-2xl lg:max-w-3xl px-5 py-3.5 rounded-2xl border border-emerald-500/30 shadow-sm flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3 text-[11px] text-emerald-400 font-semibold">
            <span>Research Inquiry</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] uppercase tracking-wider">
              {modeLabel}
            </span>
          </div>
          <p className="text-sm font-medium leading-relaxed break-words">{turn.query}</p>
        </div>
      </div>

      {isLast && isInspectorExpanded && (
        <div className="w-full animate-slide-up">
          <AgentWorkspace />
        </div>
      )}

      <ChatMessage
        query={turn.query}
        synthesis={turn.synthesis}
        stats={turn.stats}
        evidence={turn.evidence}
        model={turn.model}
        provider={turn.provider}
        onInspect={() => setIsInspectorExpanded(!isInspectorExpanded)}
        isInspecting={isLast && isInspectorExpanded}
        showInspectButton={isLast}
        timestamp={turn.timestamp}
      />
    </div>
  );
};

export const ChatThread: React.FC = () => {
  const {
    running,
    currentQuery,
    collectiveReasoning,
    error,
    stats,
    evidence,
    model,
    provider,
    isInspectorExpanded,
    setIsInspectorExpanded,
    startDiscussion,
    accuracyMode,
    turns,
    newSession,
    sessions,
    currentSessionId,
    workflowTrace,
  } = useDiscussion();

  const [starterTopics, setStarterTopics] = useState(FALLBACK_STARTER_TOPICS);
  const [isRefreshingTopics, setIsRefreshingTopics] = useState(false);
  const starterTopicsRef = useRef(starterTopics);
  const refreshTopicsRef = useRef<(forceRefresh?: boolean) => Promise<void>>(async () => {});
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstTurnRef = useRef<HTMLDivElement>(null);
  const latestTurnRef = useRef<HTMLDivElement>(null);

  // Align each completed turn with the first turn's top position.
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    const firstTurn = firstTurnRef.current;
    const latestTurn = latestTurnRef.current;
    if (!scrollContainer || !firstTurn || !latestTurn) return;

    const targetTop = latestTurn.getBoundingClientRect().top - firstTurn.getBoundingClientRect().top;
    scrollContainer.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }, [turns]);

  useEffect(() => {
    if (running && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [running, collectiveReasoning]);

  useEffect(() => {
    if (running || currentQuery || turns.length > 0) return;

    let isMounted = true;
    const refreshTopics = async (forceRefresh = false) => {
      setIsRefreshingTopics(true);
      try {
        const params = new URLSearchParams();
        if (forceRefresh) {
          params.set('refresh', 'true');
          starterTopicsRef.current.forEach((topic) => params.append('exclude', topic.query));
        }
        const queryString = params.toString();
        const response = await fetch(`${API_BASE_URL}/api/suggestions${queryString ? `?${queryString}` : ''}`);
        if (!response.ok) return;
        const topics = await response.json() as StarterTopic[];
        if (isMounted && Array.isArray(topics) && topics.length > 0) {
          setStarterTopics(topics);
        }
      } catch {
        return;
      } finally {
        if (isMounted) setIsRefreshingTopics(false);
      }
    };

    refreshTopicsRef.current = refreshTopics;
    void refreshTopics();
    const intervalId = window.setInterval(() => void refreshTopics(), TOPIC_REFRESH_INTERVAL);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [running, currentQuery, turns.length]);

  useEffect(() => {
    starterTopicsRef.current = starterTopics;
  }, [starterTopics]);

  const hasTurns = turns.length > 0;
  const isSessionLoaded = currentSessionId !== null && hasTurns;
  const currentModeLabel =
    accuracyMode === 'fast' ? '⚡ Fast Turn' :
    accuracyMode === 'academic' ? '🎓 Academic Rigor' :
    '⚖ Balanced';

  return (
    <div className="view-enter flex flex-col flex-1 min-h-0 h-full overflow-x-hidden w-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden w-full pt-[72px] chat-scroll-stream">
        <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto w-full px-4 md:px-8 pt-8 pb-16 space-y-8 min-w-0">

          {!hasTurns && !running && !currentQuery && (
            <div className="max-w-3xl xl:max-w-4xl mx-auto my-12 text-center space-y-6 animate-fade-in">
              <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500/20 via-sky-500/20 to-purple-500/20 border border-emerald-500/30 text-emerald-400 shadow-glow">
                <Sparkles className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="font-serif text-2xl font-bold text-white tracking-tight">
                  What technical problem shall we investigate?
                </h2>
                <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
                  A collaborative team of AI agents (Researcher, Analyst, Verifier) will ground claims in evidence and resolve uncertainties with minimal communication overhead.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void refreshTopicsRef.current(true)}
                    disabled={isRefreshingTopics}
                    aria-label="Refresh suggested topics"
                    title="Refresh suggested topics"
                    className="motion-press p-1 text-muted hover:text-emerald-300 disabled:cursor-wait disabled:opacity-60"
                  >
                    <RotateCw className={`h-4 w-4 ${isRefreshingTopics ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="stagger-enter grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1 text-left">
                  {starterTopics.map((topic) => (
                    <button
                      key={topic.query}
                      onClick={() => startDiscussion(topic.query)}
                      className="motion-lift motion-press p-4 rounded-2xl bg-[#131926] border border-[#252f43] hover:border-emerald-500/40 hover:bg-[#182133] transition-all flex flex-col justify-between gap-3 text-xs group shadow-sm"
                    >
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                        {topic.badge}
                      </span>
                      <p className="font-medium text-white group-hover:text-emerald-300 transition-colors leading-relaxed">
                        {topic.query}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-muted-2 group-hover:text-muted">
                        <span>Investigate</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {turns.map((turn, idx) => (
            <TurnBlock
              key={turn.id}
              turn={turn}
              isFirst={idx === 0}
              isLast={idx === turns.length - 1}
              firstTurnRef={idx === 0 ? (element) => { firstTurnRef.current = element; } : undefined}
              turnRef={idx === turns.length - 1 ? (element) => { latestTurnRef.current = element; } : undefined}
              isInspectorExpanded={isInspectorExpanded}
              setIsInspectorExpanded={setIsInspectorExpanded}
            />
          ))}

          {running && currentQuery && (
            <div className="space-y-4">
              <div className="flex justify-end w-full animate-fade-in">
                <div className="query-bubble max-w-2xl lg:max-w-3xl px-5 py-3.5 rounded-2xl border border-emerald-500/30 shadow-sm flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3 text-[11px] text-emerald-400 font-semibold">
                    <span>Research Inquiry</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] uppercase tracking-wider">
                      {currentModeLabel}
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed break-words">{currentQuery}</p>
                </div>
              </div>

              <DeliberationPill />

              {isInspectorExpanded && (
                <div className="w-full space-y-4 animate-slide-up">
                  {(running || workflowTrace.length > 0) && <LiveWorkflowTrace />}
                  <AgentWorkspace />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Investigation Interrupted:</strong> {error}
              </div>
            </div>
          )}

          {hasTurns && !running && (
            <div className="flex items-center justify-center py-4">
              <button
                onClick={newSession}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[#141b27] hover:bg-[#1a2236] border border-[#252f43] hover:border-emerald-500/40 text-muted hover:text-emerald-300 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Start New Session
              </button>
            </div>
          )}

          <div className="h-6" />
        </div>
      </div>

      <div className="chat-input-wrapper w-full flex-shrink-0">
        <div className="chat-fade-bottom-overlay" aria-hidden="true" />
        <ChatInput />
      </div>
    </div>
  );
};

