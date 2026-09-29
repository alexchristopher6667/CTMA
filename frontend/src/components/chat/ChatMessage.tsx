import React, { useState } from 'react';
import {
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  TrendingDown,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatContent } from '../../utils/formatContent';
import { DiscussionStats, EvidenceItem } from '../../types';

interface ChatMessageProps {
  query: string;
  synthesis: string;
  stats?: DiscussionStats;
  evidence: EvidenceItem[];
  model: string;
  provider: string;
  onInspect: () => void;
  isInspecting?: boolean;
  showInspectButton?: boolean;
  timestamp?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  query,
  synthesis,
  stats,
  evidence,
  model,
  provider,
  onInspect,
  isInspecting,
  showInspectButton = true,
  timestamp,
}) => {
  const [copied, setCopied] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const handleCopy = async () => {
    const div = document.createElement('div');
    div.innerHTML = formatContent(synthesis);
    const plainText = div.innerText || div.textContent || synthesis;

    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const formattedHtml = formatContent(synthesis);

  return (
    <div className="w-full min-w-0 animate-fade-in overflow-hidden">
      {/* Assistant Synthesis Bubble */}
      <div className="flex gap-3 md:gap-4 items-start w-full min-w-0">
        {/* Assistant Avatar */}
        <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 text-emerald-400 shadow-sm mt-1">
          <Sparkles className="w-4 h-4" />
        </div>

        {/* Synthesis Body */}
        <div className="flex-1 min-w-0 max-w-full rounded-2xl bg-[#121722]/95 border border-[#263143] p-5 md:p-6 shadow-glass space-y-5 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#252e3e] pb-3.5 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-base font-bold text-white tracking-tight">
                Collective Multi-Agent Synthesis
              </span>
              <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/25">
                {provider}:{model}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {showInspectButton && (
              <button
                onClick={onInspect}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  isInspecting
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                    : 'bg-[#1a2333] text-muted hover:text-white border-[#2b394f]'
                }`}
                title="Inspect multi-agent reasoning and verification network"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isInspecting ? 'Hide Agents' : 'Inspect Agents'}</span>
              </button>
              )}

              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  copied
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-[#18202e] text-[#848fa5] hover:text-white border-[#273448]'
                }`}
                title="Copy formatted answer to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Answer'}</span>
              </button>
            </div>
          </div>

          {/* Formatted Content Body */}
          <div
            className="synthesis-content text-sm leading-relaxed text-[#c9d1d9]"
            dangerouslySetInnerHTML={{ __html: formattedHtml }}
          />

          {/* Efficiency & Gating Metrics Bar */}
          {stats && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#171f2c] border border-[#263447] text-xs flex-wrap gap-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <TrendingDown className="w-4 h-4" />
                <span className="font-semibold">{stats.overhead_reduction_pct}% Overhead Reduced</span>
                <span className="text-muted text-[11px]">({stats.messages_bypassed} unneeded turns avoided)</span>
              </div>

              <div className="flex items-center gap-4 text-muted text-[11px]">
                <span>
                  Tokens Saved: <strong className="text-white font-mono">~{stats.tokens_saved}</strong>
                </span>
                <span>
                  Threshold: <strong className="text-white font-mono">{stats.confidence_threshold * 100}%</strong>
                </span>
              </div>
            </div>
          )}

          {/* Grounded Sources Section */}
          {evidence && evidence.length > 0 && (
            <div className="border-t border-[#232b3b] pt-3">
              <button
                onClick={() => setSourcesOpen(!sourcesOpen)}
                className="flex items-center justify-between w-full py-1 text-xs font-semibold text-muted hover:text-white transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Grounded Evidence ({evidence.length} sources cited)
                </span>
                {sourcesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {sourcesOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pt-2">
                  {evidence.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.source_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg bg-[#161d2a] border border-[#273245] hover:border-sky-500/40 hover:bg-[#1a2335] transition-all flex flex-col gap-1 text-xs group"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            item.source_type === 'tier1'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : item.source_type === 'tier2'
                              ? 'bg-sky-500/15 text-sky-300'
                              : 'bg-purple-500/15 text-purple-300'
                          }`}
                        >
                          {item.source_type || 'Web'}
                        </span>
                        <ExternalLink className="w-3 h-3 text-muted group-hover:text-sky-400" />
                      </div>
                      <span className="font-semibold text-white truncate">{item.source_title || 'Reference Source'}</span>
                      <p className="text-[11px] text-muted line-clamp-1 italic">{item.claim}</p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
