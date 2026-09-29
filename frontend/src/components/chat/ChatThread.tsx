import React, { useEffect, useRef } from 'react';
import { Sparkles, AlertCircle, ArrowRight, Plus } from 'lucide-react';
import { useDiscussion } from '../../context/DiscussionContext';
import { DeliberationPill } from './DeliberationPill';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { AgentWorkspace } from '../inspector/AgentWorkspace';
import { ChatTurn } from '../../types';

// Component to render a single completed turn
const TurnBlock: React.FC<{
  turn: ChatTurn;
  isLast: boolean;
  isInspectorExpanded: boolean;
  setIsInspectorExpanded: (v: boolean) => void;
}> = ({ turn, isLast, isInspectorExpanded, setIsInspectorExpanded }) => {
  const modeLabel =
    turn.accuracyMode === 'fast' ? '⚡ Fast Turn' :
    turn.accuracyMode === 'academic' ? '🎓 Academic Rigor' :
    '⚖ Balanced';

  return (
    <div className="space-y-4">
      {/* User Query Bubble */}
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

      {/* Agent workspace for last turn when expanded */}
      {isLast && isInspectorExpanded && (
        <div className="w-full animate-slide-up">
          <AgentWorkspace />
        </div>
      )}

      {/* Synthesis Answer */}
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
  } = useDiscussion();

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when turns change or running
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [turns, running, collectiveReasoning]);

  const starterTopics = [
    {
      title: 'Architecture & Scaling',
      query: 'Evaluate architectural trade-offs between ARM and x86 in modern data centers.',
      badge: 'Hardware & Cloud',
    },
    {
      title: 'Empirical Verification',
      query: 'Is isolated nicotine beneficial for health, or does cigarette smoke overwhelm any benefit?',
      badge: 'Medical & Evidence',
    },
    {
      title: 'Algorithmic Rigor',
      query: 'What are the primary theoretical limitations of current Quantum Error Correction codes?',
      badge: 'Quantum Computing',
    },
  ];

  const hasTurns = turns.length > 0;
  const isSessionLoaded = currentSessionId !== null && hasTurns;
  const currentModeLabel =
    accuracyMode === 'fast' ? '⚡ Fast Turn' :
    accuracyMode === 'academic' ? '🎓 Academic Rigor' :
    '⚖ Balanced';

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] overflow-x-hidden w-full">
      {/* Scrollable Conversation Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden w-full chat-scroll-stream">
        <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto w-full px-4 md:px-8 pt-8 pb-16 space-y-8 min-w-0">

          {/* Welcome / Empty State */}
          {!hasTurns && !running && !currentQuery && (
            <div className="max-w-3xl xl:max-w-4xl mx-auto my-12 text-center space-y-6 animate-fade-in">
              <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500/20 via-sky-500/20 to-purple-500/20 border border-emerald-500/30 text-emerald-400 shadow-glow">
                <Sparkles className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="font-serif text-3xl font-bold tracking-tight">
                  What technical problem shall we investigate?
                </h2>
                <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
                  A collaborative team of AI agents (Researcher, Analyst, Verifier) will ground claims in evidence and resolve uncertainties with minimal communication overhead.
                </p>
              </div>

              {/* Starter Topic Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4 text-left">
                {starterTopics.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => startDiscussion(topic.query)}
                    className="p-4 rounded-2xl bg-[#131926] border border-[#252f43] hover:border-emerald-500/40 hover:bg-[#182133] transition-all flex flex-col justify-between gap-3 text-xs group shadow-sm"
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
          )}

          {/* Render all completed turns */}
          {turns.map((turn, idx) => (
            <TurnBlock
              key={turn.id}
              turn={turn}
              isLast={idx === turns.length - 1}
              isInspectorExpanded={isInspectorExpanded}
              setIsInspectorExpanded={setIsInspectorExpanded}
            />
          ))}

          {/* Current in-progress query */}
          {currentQuery && !turns.find(t => t.query === currentQuery && t.synthesis) && (
            <div className="space-y-4">
              {/* Current user query bubble */}
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

              {/* Live Deliberation Indicator */}
              {running && <DeliberationPill />}

              {/* Expandable Technical Workspace */}
              {isInspectorExpanded && (
                <div className="w-full animate-slide-up">
                  <AgentWorkspace />
                </div>
              )}

              {/* Final synthesis (once complete) */}
              {collectiveReasoning && (
                <ChatMessage
                  query={currentQuery}
                  synthesis={collectiveReasoning}
                  stats={stats}
                  evidence={evidence}
                  model={model}
                  provider={provider}
                  onInspect={() => setIsInspectorExpanded(!isInspectorExpanded)}
                  isInspecting={isInspectorExpanded}
                  showInspectButton={true}
                />
              )}
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Investigation Interrupted:</strong> {error}
              </div>
            </div>
          )}

          {/* Spacer + New session prompt after turns */}
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

          <div ref={bottomRef} className="h-6" />
        </div>
      </div>

      {/* Fixed Bottom Input Bar with smooth fade overlay */}
      <div className="chat-input-wrapper w-full flex-shrink-0">
        <div className="chat-fade-bottom-overlay" aria-hidden="true" />
        <ChatInput />
      </div>
    </div>
  );
};

