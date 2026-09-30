import React, { useEffect, useRef } from 'react';
import {
  Brain,
  Search,
  GitMerge,
  MessageSquare,
  Flag,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useDiscussion } from '../../context/DiscussionContext';
import { TraceEvent, TraceEventType } from '../../types';

// Agent color mapping (Research = Sky, Analyst = Amber, Critic = Rose)
const AGENT_COLORS: Record<string, { dot: string; text: string; border: string; bg: string }> = {
  research: {
    dot: 'bg-sky-400',
    text: 'text-sky-300',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
  },
  analyst: {
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
  },
  critic: {
    dot: 'bg-rose-400',
    text: 'text-rose-300',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
  },
};

const DEFAULT_COLOR = {
  dot: 'bg-emerald-400',
  text: 'text-emerald-300',
  border: 'border-emerald-500/30',
  bg: 'bg-emerald-500/10',
};

// Event-type icon and style mapping
const EVENT_CONFIG: Record<
  TraceEventType,
  {
    icon: React.ReactNode;
    dotColor: string;
    label: string;
  }
> = {
  start: {
    icon: <Zap className="w-3.5 h-3.5" />,
    dotColor: 'bg-emerald-400',
    label: 'START',
  },
  think: {
    icon: <Brain className="w-3.5 h-3.5" />,
    dotColor: 'bg-purple-400',
    label: 'THINKING',
  },
  search: {
    icon: <Search className="w-3.5 h-3.5" />,
    dotColor: 'bg-sky-400',
    label: 'EVIDENCE',
  },
  decision: {
    icon: <GitMerge className="w-3.5 h-3.5" />,
    dotColor: 'bg-amber-400',
    label: 'DECISION',
  },
  message: {
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    dotColor: 'bg-blue-400',
    label: 'MESSAGE',
  },
  milestone: {
    icon: <Flag className="w-3.5 h-3.5" />,
    dotColor: 'bg-emerald-400',
    label: 'MILESTONE',
  },
  finish: {
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    dotColor: 'bg-emerald-400',
    label: 'COMPLETE',
  },
  error: {
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    dotColor: 'bg-rose-400',
    label: 'ERROR',
  },
};

const TraceItem: React.FC<{ event: TraceEvent; isLast: boolean }> = ({ event, isLast }) => {
  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.milestone;
  const agentColor = event.agentId ? AGENT_COLORS[event.agentId] || DEFAULT_COLOR : DEFAULT_COLOR;

  const isDecisionBypass = event.type === 'decision' && event.meta?.decision === 'bypass';
  const isDecisionApproach = event.type === 'decision' && event.meta?.decision === 'approach';

  return (
    <div className="relative flex gap-3 group animate-fade-in">
      {/* Timeline connector line */}
      <div className="flex flex-col items-center flex-shrink-0 w-8">
        {/* Dot */}
        <div
          className={`
            relative z-10 flex items-center justify-center w-7 h-7 rounded-full
            border-2 ${isLast ? 'border-emerald-400/60' : 'border-[#263143]'}
            ${event.type === 'think' ? 'animate-pulse' : ''}
            bg-[#121722] shadow-sm
          `}
        >
          <span className={agentColor.text}>{config.icon}</span>
        </div>
        {/* Vertical line */}
        {!isLast && (
          <div className="w-px flex-1 bg-gradient-to-b from-[#263143] to-transparent min-h-[16px]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        {/* Header row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type badge */}
          <span
            className={`
              text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded
              ${
                event.type === 'error'
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                  : isDecisionBypass
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                  : isDecisionApproach
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                  : event.type === 'search'
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/25'
                  : event.type === 'think'
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
              }
            `}
          >
            {isDecisionBypass ? 'BYPASS' : isDecisionApproach ? 'APPROACH' : config.label}
          </span>

          {/* Agent name */}
          {event.agentName && (
            <span className={`text-[11px] font-semibold ${agentColor.text}`}>
              {event.agentName}
            </span>
          )}

          {/* Timestamp */}
          <span className="text-[10px] font-mono text-muted-2 ml-auto flex-shrink-0">
            {event.timestamp}
          </span>
        </div>

        {/* Title */}
        <p
          className={`text-xs font-medium mt-1 leading-relaxed ${
            event.type === 'think'
              ? 'italic text-[#848fa5]'
              : event.type === 'error'
              ? 'text-rose-300'
              : 'text-white/90'
          }`}
        >
          {event.title}
        </p>

        {/* Detail */}
        {event.detail && (
          <p className="text-[11px] text-muted mt-1 leading-relaxed line-clamp-2">
            {event.detail}
          </p>
        )}

        {/* Meta badges for decisions */}
        {event.type === 'decision' && event.meta && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {typeof event.meta.d_score === 'number' && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1a2233] border border-[#2a3449] text-muted">
                D={event.meta.d_score.toFixed(2)}
              </span>
            )}
            {typeof event.meta.confidence === 'number' && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1a2233] border border-[#2a3449] text-muted">
                C={Math.round(event.meta.confidence * 100)}%
              </span>
            )}
            {typeof event.meta.threshold === 'number' && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1a2233] border border-[#2a3449] text-muted">
                θ={Math.round(event.meta.threshold * 100)}%
              </span>
            )}
          </div>
        )}

        {/* Source link for evidence */}
        {event.type === 'search' && event.meta?.url && (
          <a
            href={event.meta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="truncate max-w-[200px]">{event.meta.url}</span>
          </a>
        )}
      </div>
    </div>
  );
};

export const LiveWorkflowTrace: React.FC = () => {
  const { workflowTrace, running } = useDiscussion();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [workflowTrace.length]);

  if (workflowTrace.length === 0) {
    return (
      <div className="rounded-2xl bg-[#121722]/95 border border-[#263143] shadow-glass p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-serif font-bold text-base text-white tracking-tight">
            Live Execution Timeline
          </h3>
        </div>
        <p className="text-xs text-muted-2 italic text-center py-6">
          Workflow events will stream here in real-time during deliberation...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#121722]/95 border border-[#263143] shadow-glass overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#252e3e]">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            {running && (
              <span className="absolute w-full h-full rounded-xl bg-emerald-500/20 animate-ping opacity-50" />
            )}
            <Zap className="w-3.5 h-3.5 relative z-10" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-white tracking-tight flex items-center gap-2">
              Live Execution Timeline
              {running && (
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 animate-pulse">
                  Streaming
                </span>
              )}
            </h3>
          </div>
        </div>
        <span className="text-[10px] font-mono text-muted-2">
          {workflowTrace.length} event{workflowTrace.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Timeline container with auto-scroll */}
      <div
        ref={scrollRef}
        className="max-h-96 overflow-y-auto px-5 pt-4 pb-2"
        style={{ scrollBehavior: 'smooth' }}
      >
        {workflowTrace.map((event, idx) => (
          <TraceItem
            key={event.id}
            event={event}
            isLast={idx === workflowTrace.length - 1}
          />
        ))}
      </div>
    </div>
  );
};
