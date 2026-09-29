import React from 'react';
import {
  Brain,
  Search,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Radio,
  BookOpen,
} from 'lucide-react';
import { Agent } from '../../types';

interface AgentCardProps {
  agent: Agent;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const getTheme = () => {
    switch (agent.id) {
      case 'research':
        return {
          border: 'border-sky-500/30',
          bg: 'bg-gradient-to-b from-[#131b29] to-[#0e141f]',
          accent: 'text-sky-400',
          icon: <Search className="w-4 h-4 text-sky-400" />,
          pill: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        };
      case 'analyst':
        return {
          border: 'border-amber-500/30',
          bg: 'bg-gradient-to-b from-[#1c1811] to-[#12100d]',
          accent: 'text-amber-400',
          icon: <Scale className="w-4 h-4 text-amber-400" />,
          pill: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        };
      case 'critic':
        return {
          border: 'border-rose-500/30',
          bg: 'bg-gradient-to-b from-[#1c1216] to-[#130d10]',
          accent: 'text-rose-400',
          icon: <ShieldCheck className="w-4 h-4 text-rose-400" />,
          pill: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        };
    }
  };

  const theme = getTheme();

  const getStatusBadge = () => {
    switch (agent.status) {
      case 'thinking':
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-400 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/25 animate-pulse">
            <Radio className="w-3 h-3 animate-spin" /> Thinking
          </span>
        );
      case 'speaking':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
            Speaking
          </span>
        );
      case 'reading':
      case 'reviewing':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-400 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25">
            <BookOpen className="w-3 h-3" /> Evaluating peer
          </span>
        );
      case 'confident':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40">
            <CheckCircle2 className="w-3 h-3" /> Confident (Silent)
          </span>
        );
      case 'refining':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 animate-pulse">
            Refining Stance
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
            <CheckCircle2 className="w-3 h-3" /> Consensus Ready
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25">
            <AlertCircle className="w-3 h-3" /> Fault
          </span>
        );
      default:
        return (
          <span className="text-[11px] text-muted-2 px-2.5 py-0.5 rounded-full bg-[#18202d] border border-[#273247]">
            Idle
          </span>
        );
    }
  };

  return (
    <div
      className={`rounded-2xl p-4 border ${theme.border} ${theme.bg} shadow-glass transition-all duration-300 flex flex-col gap-3`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-black/30 border border-white/10 shrink-0">
            {theme.icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-serif font-bold text-sm text-white tracking-tight leading-snug truncate">
              {agent.name}
            </h3>
            <p className="text-[11px] font-medium text-muted truncate">{agent.role}</p>
          </div>
        </div>

        {typeof agent.confidence === 'number' && (
          <span
            className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border shrink-0 ${theme.pill}`}
            title={`Confidence: ${Math.round(agent.confidence * 100)}%`}
          >
            {Math.round(agent.confidence * 100)}%
          </span>
        )}
      </div>

      {/* Status Pill */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-2">Status</span>
        {getStatusBadge()}
      </div>

      {/* Thought Stream Box */}
      <div className="p-3 rounded-xl bg-black/40 border border-white/5 max-h-28 overflow-y-auto">
        <p className="text-xs text-[#c0cad8] leading-relaxed italic">
          {agent.current_reasoning || 'Waiting for debate to begin...'}
        </p>
      </div>
    </div>
  );

};
