import React from 'react';
import { Sparkles, ArrowRight, Eye, ShieldCheck, Search, Scale } from 'lucide-react';
import { useDiscussion } from '../../context/DiscussionContext';

export const DeliberationPill: React.FC = () => {
  const { currentRound, agents, isInspectorExpanded, setIsInspectorExpanded } = useDiscussion();

  const getActiveStep = () => {
    if (currentRound === 1) {
      return {
        agent: 'Dr. Elena Chen',
        role: 'Grounding Evidence & Querying Academic Sources',
        icon: <Search className="w-4 h-4 text-sky-400" />,
        color: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
      };
    }
    if (currentRound === 2) {
      return {
        agent: 'Team Cross-Talk',
        role: 'Selective Gating: Evaluating Uncertainty & Verifying Claims',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
        color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      };
    }
    return {
      agent: 'Marcus Vance & Dr. Sarah Lin',
      role: 'Synthesizing Consensus & Resolving Trade-offs',
      icon: <Scale className="w-4 h-4 text-amber-400" />,
      color: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    };
  };

  const step = getActiveStep();

  return (
    <div className="flex flex-col items-center justify-center my-6 animate-fade-in">
      <div className="flex items-center gap-3.5 px-5 py-3 rounded-2xl bg-[#141b27]/90 border border-[#2b3548] shadow-glass max-w-xl w-full">
        <div className="relative flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-xl bg-[#1c2433] border border-[#344158]">
          <span className="absolute w-full h-full rounded-xl bg-emerald-500/20 animate-ping opacity-75" />
          <Sparkles className="w-4 h-4 text-emerald-400 relative z-10 animate-pulse" />
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">{step.agent}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1e2637] text-muted border border-[#2a3449]">
              Round {currentRound} of 3
            </span>
          </div>
          <span className="text-xs text-[#848fa5] truncate mt-0.5">{step.role}</span>
        </div>

        <button
          onClick={() => setIsInspectorExpanded(!isInspectorExpanded)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex-shrink-0 ${
            isInspectorExpanded 
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-glow'
              : 'bg-[#1d2636] text-muted hover:text-white hover:bg-[#253044] border-[#2e3b50]'
          }`}
          title="Toggle Technical Agent Inspector"
        >
          <Eye className={`w-3.5 h-3.5 ${isInspectorExpanded ? 'text-emerald-400' : ''}`} />
          <span>{isInspectorExpanded ? 'Minimize' : 'Inspect'}</span>
        </button>
      </div>
    </div>
  );
};
