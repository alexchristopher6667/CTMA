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
  Leaf,
  Timer,
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
    }
  };

  const formattedHtml = formatContent(synthesis);

  return (
    <div className="w-full min-w-0 animate-fade-in overflow-hidden">
      <div className="flex gap-3 md:gap-4 items-start w-full min-w-0">
        <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 text-emerald-400 shadow-sm mt-1">
          <Sparkles className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0 max-w-full rounded-2xl bg-[#121722]/95 border border-[#263143] p-5 md:p-6 shadow-glass space-y-5 overflow-hidden">
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

          <div
            className="synthesis-content text-sm leading-relaxed text-[#c9d1d9]"
            dangerouslySetInnerHTML={{ __html: formattedHtml }}
          />

          {stats && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#171f2c] border border-[#263447] text-xs flex-wrap gap-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <TrendingDown className="w-4 h-4" />
                  <span className="font-semibold">{stats.overhead_reduction_pct}% Overhead Reduced</span>
                  <span className="text-muted text-[11px]">({stats.messages_bypassed} unneeded turns avoided vs normal full mesh)</span>
                </div>

                <div className="flex items-center gap-4 text-muted text-[11px]">
                  <span>
                    Tokens Saved: <strong className="text-emerald-400 font-mono">~{stats.tokens_saved}</strong>
                  </span>
                  <span>
                    Threshold: <strong className="text-white font-mono">{stats.confidence_threshold * 100}%</strong>
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-3 border-b border-emerald-500/15 pb-2.5">
                  <div className="flex items-center gap-4 text-emerald-300">
                    <div className="flex items-center gap-1.5" title="Total energy consumed (Wh)">
                      <Leaf className="w-4 h-4 text-emerald-400" />
                      <span>
                        Adaptive Energy: <strong className="text-emerald-400 font-mono">{(stats.energy_multi_wh || 0).toFixed(4)} Wh</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Carbon footprint (gCO2eq)">
                      <span>
                        Carbon: <strong className="font-mono text-white">{(stats.carbon_multi_g || 0).toFixed(4)} g</strong>
                      </span>
                    </div>
                    {stats.carbon_saved_g !== undefined && stats.carbon_saved_g > 0 && (
                      <div className="flex items-center gap-1.5 text-emerald-400/90 text-[11px] border-l border-emerald-500/30 pl-3" title="Carbon avoided due to selective gating">
                        CO₂ Avoided: <strong className="font-mono text-emerald-300 font-bold">{(stats.carbon_saved_g || 0).toFixed(4)} g</strong>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-muted font-mono">
                    Normal Multi Carbon: <span className="text-rose-300 font-semibold">{((stats.carbon_normal_multi_g || ((stats.carbon_multi_g || 0) + (stats.carbon_saved_g || 0)))).toFixed(4)} g</span>
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3 pt-0.5 text-[11px]">
                  <div className="flex items-center gap-3 text-muted">
                    <div className="flex items-center gap-1.5" title="3. Total Round-Trip Time (RTT)">
                      <Timer className="w-3.5 h-3.5 text-sky-400" />
                      <span>
                        <strong className="text-white font-mono">{(stats.total_rtt_sec || stats.latency_multi_sec || 0).toFixed(1)}s RTT</strong>
                        <span className="text-muted-2"> (vs {(stats.latency_normal_multi_sec || ((stats.latency_multi_sec || 5) * 1.8)).toFixed(1)}s normal multi · {(stats.latency_single_sec || 0).toFixed(1)}s single)</span>
                      </span>
                    </div>
                  </div>

                  {stats.round_timings && (
                    <div className="flex items-center gap-2 font-mono text-[10.5px] text-muted-2 bg-[#121824] px-2.5 py-1 rounded-lg border border-[#232f42]">
                      <span className="text-muted">Round Durations:</span>
                      <span className="text-sky-300">R1: {(stats.round_timings.round_1_sec || 2.4).toFixed(1)}s</span>
                      <span>·</span>
                      <span className="text-amber-300">R2: {(stats.round_timings.round_2_sec || 4.1).toFixed(1)}s</span>
                      <span>·</span>
                      <span className="text-purple-300">R3: {(stats.round_timings.round_3_sec || 1.8).toFixed(1)}s</span>
                      <span>·</span>
                      <span className="text-emerald-300">Synth: {(stats.round_timings.synthesis_sec || 1.5).toFixed(1)}s</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
