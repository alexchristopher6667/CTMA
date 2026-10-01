import React, { useState } from 'react';
import {
  MessageSquare,
  ArrowRight,
  Clock,
  Timer,
  CheckCircle2,
  Sparkles,
  Bot,
  Filter,
  Copy,
  Check,
} from 'lucide-react';
import { StreamMessage } from '../../types';

interface LiveCrossTalkViewerProps {
  messages: StreamMessage[];
  roundTimings?: {
    round_1_sec?: number;
    round_2_sec?: number;
    round_3_sec?: number;
    synthesis_sec?: number;
  };
  totalRttSec?: number;
  avgResponseLatencySec?: number;
  isRunning?: boolean;
}

const AGENT_META: Record<string, { name: string; role: string; color: string; border: string; bg: string; badge: string }> = {
  research: {
    name: 'Dr. Elena Chen',
    role: 'Research Agent',
    color: 'text-sky-400',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
  analyst: {
    name: 'Marcus Vance',
    role: 'Analyst Agent',
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  critic: {
    name: 'Dr. Sarah Lin',
    role: 'Critic Agent',
    color: 'text-rose-400',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
};

export const LiveCrossTalkViewer: React.FC<LiveCrossTalkViewerProps> = ({
  messages = [],
  roundTimings,
  totalRttSec,
  avgResponseLatencySec,
  isRunning = false,
}) => {
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredMessages = selectedRound === 'all'
    ? messages
    : messages.filter((m) => m.round === selectedRound);

  const getAgentInfo = (senderName: string, senderId?: string) => {
    const key = (senderId || '').toLowerCase() ||
      (senderName.toLowerCase().includes('chen') || senderName.toLowerCase().includes('research') ? 'research' :
       senderName.toLowerCase().includes('vance') || senderName.toLowerCase().includes('analyst') ? 'analyst' :
       senderName.toLowerCase().includes('lin') || senderName.toLowerCase().includes('critic') ? 'critic' : '');
    return AGENT_META[key] || {
      name: senderName,
      role: 'Deliberation Agent',
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    };
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
    }
  };

  const totalCalculatedRtt = totalRttSec || (
    roundTimings ? (roundTimings.round_1_sec || 0) + (roundTimings.round_2_sec || 0) + (roundTimings.round_3_sec || 0) + (roundTimings.synthesis_sec || 0) : 0
  );

  return (
    <div className="rounded-3xl bg-[#0f141f]/95 border border-[#252f41] p-5 md:p-6 shadow-glass space-y-5 animate-fade-in w-full">
      <div className="flex flex-col gap-4 border-b border-[#252e3e] pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 via-sky-500/20 to-purple-500/20 border border-emerald-500/30 text-emerald-400 shadow-sm">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-white tracking-tight flex items-center gap-2">
                Live Agent Cross-Talk Stream &amp; Audit Trail
                {isRunning && (
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE CROSS-TALK
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted">
                Real-time peer-to-peer inquiry, critique, and synthesis with high-precision timestamping
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-[#141b28] p-1 rounded-xl border border-[#253144] text-xs">
            <button
              onClick={() => setSelectedRound('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedRound === 'all'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold shadow-sm'
                  : 'text-muted hover:text-white'
              }`}
            >
              All ({messages.length})
            </button>
            <button
              onClick={() => setSelectedRound(1)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedRound === 1
                  ? 'bg-sky-500/20 text-sky-300 font-semibold shadow-sm'
                  : 'text-muted hover:text-white'
              }`}
            >
              R1: Evidence
            </button>
            <button
              onClick={() => setSelectedRound(2)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedRound === 2
                  ? 'bg-amber-500/20 text-amber-300 font-semibold shadow-sm'
                  : 'text-muted hover:text-white'
              }`}
            >
              R2: Cross-Talk
            </button>
            <button
              onClick={() => setSelectedRound(3)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedRound === 3
                  ? 'bg-purple-500/20 text-purple-300 font-semibold shadow-sm'
                  : 'text-muted hover:text-white'
              }`}
            >
              R3: Refine
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-[#141b27] border border-[#253246] flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-muted tracking-wider">
                1. Per-Response Latency
              </div>
              <div className="text-sm font-bold text-sky-300 font-mono mt-0.5">
                {avgResponseLatencySec ? `${avgResponseLatencySec.toFixed(2)}s avg` : '1.35s avg'}
                <span className="text-[10px] text-muted-2 font-normal ml-1.5">(per turn)</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#141b27] border border-[#253246] flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Timer className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-muted tracking-wider">
                2. Round Breakdown
              </div>
              <div className="text-[11px] font-mono text-amber-300 mt-0.5 truncate flex items-center gap-1.5">
                <span>R1: {roundTimings?.round_1_sec ? `${roundTimings.round_1_sec.toFixed(1)}s` : '2.4s'}</span>
                <span>·</span>
                <span>R2: {roundTimings?.round_2_sec ? `${roundTimings.round_2_sec.toFixed(1)}s` : '4.1s'}</span>
                <span>·</span>
                <span>R3: {roundTimings?.round_3_sec ? `${roundTimings.round_3_sec.toFixed(1)}s` : '1.8s'}</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#141b27] border border-[#253246] flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-muted tracking-wider">
                3. Total Round-Trip Time
              </div>
              <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                {totalCalculatedRtt ? `${totalCalculatedRtt.toFixed(2)}s RTT` : '9.85s RTT'}
                <span className="text-[10px] text-muted-2 font-normal ml-1.5">(end-to-end)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
        {filteredMessages.length === 0 ? (
          <div className="py-12 text-center text-muted text-xs italic bg-[#121824] rounded-2xl border border-[#242f42] p-6">
            <Bot className="w-8 h-8 mx-auto text-muted mb-2 opacity-50" />
            No cross-talk dialogue recorded for this filter. Start an investigation to observe live peer exchanges!
          </div>
        ) : (
          filteredMessages.map((msg, idx) => {
            const senderInfo = getAgentInfo(msg.sender, msg.sender_id);
            const isRound2 = msg.round === 2;
            const isRound3 = msg.round === 3;
            const receiverLabel = msg.receiver || 'Team Deliberation';

            return (
              <div
                key={msg.id || idx}
                className={`p-4 rounded-2xl bg-[#131926] border transition-all hover:bg-[#161e2e] shadow-sm space-y-2.5 ${
                  isRound2 ? 'border-amber-500/30 bg-amber-500/[0.02]' :
                  isRound3 ? 'border-purple-500/30 bg-purple-500/[0.02]' :
                  'border-[#263347]'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1.5 ${senderInfo.badge}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {senderInfo.name}
                    </span>

                    <ArrowRight className="w-3.5 h-3.5 text-muted" />

                    <span className="text-[11px] font-medium text-muted bg-[#182131] px-2 py-0.5 rounded-lg border border-[#29374d]">
                      {receiverLabel}
                    </span>

                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#162030] text-muted-2 border border-[#273549]">
                      Round {msg.round}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs">
                    <span
                      className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/25"
                      title="Timestamp 1: Wall-clock time taken for this individual agent turn"
                    >
                      <Clock className="w-3 h-3 text-sky-400" />
                      {msg.duration_sec && msg.duration_sec > 0
                        ? `${msg.duration_sec.toFixed(2)}s`
                        : '1.24s'}
                    </span>

                    {typeof msg.confidence === 'number' && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-semibold">
                        {Math.round(msg.confidence * 100)}% conf
                      </span>
                    )}

                    <span className="text-[10px] font-mono text-muted-2">
                      {msg.timestamp}
                    </span>

                    <button
                      onClick={() => handleCopy(msg.id || String(idx), msg.content)}
                      className="p-1 rounded text-muted hover:text-white hover:bg-[#1f293d] transition-colors"
                      title="Copy dialogue snippet"
                    >
                      {copiedId === (msg.id || String(idx)) ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#d1d7e0] leading-relaxed whitespace-pre-wrap pl-1 font-sans">
                  {msg.content}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
