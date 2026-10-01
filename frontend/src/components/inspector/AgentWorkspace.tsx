import React, { useState } from 'react';
import { X, Layers, ExternalLink, ShieldCheck, Zap, ArrowDown, MessageSquare, Activity } from 'lucide-react';
import { useDiscussion } from '../../context/DiscussionContext';
import { AgentCard } from './AgentCard';
import { OverheadDashboard } from './OverheadDashboard';
import { LiveCrossTalkViewer } from './LiveCrossTalkViewer';

// Fixed logical SVG coordinate system: 1000 x 600 viewBox
const TOP_X    = 500;  const TOP_Y    = 60;   // Research  (top-center)
const LEFT_X   = 100;  const LEFT_Y   = 500;  // Analyst   (bottom-left)
const RIGHT_X  = 900;  const RIGHT_Y  = 500;  // Critic    (bottom-right)
const CENTER_X = 500;  const CENTER_Y = 340;  // Hub center

export const AgentWorkspace: React.FC = () => {
  const { agents, evidence, setIsInspectorExpanded, stats, streamMessages, running } = useDiscussion();
  const [activeView, setActiveView] = useState<'topology' | 'crosstalk' | 'overhead'>('topology');

  const isResearchActive = ['speaking', 'thinking', 'reading'].includes(agents.research.status);
  const isAnalystActive  = ['speaking', 'thinking', 'reading'].includes(agents.analyst.status);
  const isCriticActive   = ['speaking', 'thinking', 'challenging', 'reading'].includes(agents.critic.status);

  const edgeRA = isResearchActive || isAnalystActive;
  const edgeAC = isAnalystActive  || isCriticActive;
  const edgeCR = isCriticActive   || isResearchActive;

  const mkLine = (
    x1: number, y1: number, x2: number, y2: number,
    active: boolean, gradId: string
  ) => (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={active ? `url(#${gradId})` : '#232d3f'}
      strokeWidth={active ? 3 : 1.5}
      strokeDasharray={active ? '10 6' : '5 5'}
      strokeLinecap="round"
      style={{ transition: 'stroke 0.4s, stroke-width 0.3s' }}
    />
  );

  const mkArrow = (
    cx: number, cy: number, angle: number, active: boolean, color: string
  ) => !active ? null : (
    <polygon
      points="-7,5 7,5 0,-9"
      fill={color}
      opacity={0.85}
      transform={`translate(${cx},${cy}) rotate(${angle})`}
    />
  );

  return (
    <section className="my-4 rounded-3xl bg-[#0f141f]/95 border border-[#263143] shadow-glass animate-slide-up w-full max-w-full overflow-hidden">

      <div className="flex items-center justify-between px-5 py-4 border-b border-[#252e3e] flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif font-bold text-base text-white tracking-tight flex items-center gap-2 flex-wrap">
              Multi-Agent Deliberation &amp; Cross-Talk Engine
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 whitespace-nowrap">
                {activeView === 'crosstalk' ? 'Live Dialogue' : activeView === 'overhead' ? 'Economy Telemetry' : 'Live Topology'}
              </span>
            </h2>
            <p className="text-xs text-muted truncate">
              Selective confidence gating — D&nbsp;=&nbsp;0.4U&nbsp;+&nbsp;0.4X&nbsp;+&nbsp;0.2G
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-[#141b28] p-1 rounded-xl border border-[#253244] text-xs">
            <button
              onClick={() => setActiveView('topology')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeView === 'topology'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold shadow-sm'
                  : 'text-muted hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Topology</span>
            </button>
            <button
              onClick={() => setActiveView('crosstalk')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeView === 'crosstalk'
                  ? 'bg-sky-500/20 text-sky-300 font-semibold shadow-sm'
                  : 'text-muted hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Cross-Talk ({streamMessages.length})</span>
            </button>
            <button
              onClick={() => setActiveView('overhead')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeView === 'overhead'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold shadow-sm'
                  : 'text-muted hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Overhead</span>
            </button>
          </div>

          <button
            onClick={() => setIsInspectorExpanded(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-muted hover:text-white bg-[#192130] hover:bg-[#202b3d] border border-[#2b384c] transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Minimize</span>
          </button>
        </div>
      </div>

      {activeView === 'crosstalk' && (
        <div className="p-4 lg:p-6 animate-fade-in">
          <LiveCrossTalkViewer
            messages={streamMessages}
            roundTimings={stats?.round_timings}
            totalRttSec={stats?.total_rtt_sec}
            avgResponseLatencySec={stats?.avg_response_latency_sec}
            isRunning={running}
          />
        </div>
      )}

      {activeView === 'overhead' && (
        <div className="p-4 lg:p-6 animate-fade-in">
          <OverheadDashboard />
        </div>
      )}

      {activeView === 'topology' && (
        <>
          <div className="hidden md:block w-full p-4 lg:p-6 animate-fade-in">
        <div className="relative w-full">

          <svg
            viewBox="0 0 1000 600"
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="grad-ra" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38d39f" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#5fa8ff" stopOpacity="0.9"/>
              </linearGradient>
              <linearGradient id="grad-ac" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#5fa8ff" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.9"/>
              </linearGradient>
              <linearGradient id="grad-cr" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#38d39f" stopOpacity="0.9"/>
              </linearGradient>
            </defs>

            {mkLine(TOP_X, TOP_Y, LEFT_X, LEFT_Y, edgeRA, 'grad-ra')}
            {mkLine(LEFT_X, LEFT_Y, RIGHT_X, RIGHT_Y, edgeAC, 'grad-ac')}
            {mkLine(RIGHT_X, RIGHT_Y, TOP_X, TOP_Y, edgeCR, 'grad-cr')}

            {mkArrow((TOP_X+LEFT_X)/2, (TOP_Y+LEFT_Y)/2, 225, edgeRA, '#38d39f')}
            {mkArrow((LEFT_X+RIGHT_X)/2, (LEFT_Y+RIGHT_Y)/2, 90, edgeAC, '#5fa8ff')}
            {mkArrow((RIGHT_X+TOP_X)/2, (RIGHT_Y+TOP_Y)/2, 330, edgeCR, '#f43f5e')}
          </svg>

          <div
            className="relative z-10 grid gap-y-4"
            style={{
              gridTemplateColumns: '1fr auto 1fr',
              gridTemplateRows: 'auto auto auto',
            }}
          >
            <div className="col-start-1 col-end-4 flex justify-center pb-2">
              <div className="w-full max-w-xs">
                <AgentCard agent={agents.research} />
              </div>
            </div>

            <div className="col-start-1 col-end-4 flex justify-center py-2">
              <div className="flex flex-col items-center justify-center px-4 py-2 rounded-2xl bg-[#121824]/90 border border-emerald-500/30 shadow-glass backdrop-blur-md text-center">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  <Zap className="w-3.5 h-3.5 animate-pulse" />
                  <span>Selective Gating</span>
                </div>
                <span className="font-mono text-xs font-bold text-white mt-0.5">
                  θ<sub>conf</sub> = {stats?.confidence_threshold ? `${Math.round(stats.confidence_threshold * 100)}%` : '75%'}
                </span>
                <span className="text-[9px] text-muted-2 mt-0.5">
                  D = 0.4U + 0.4X + 0.2G
                </span>
              </div>
            </div>

            <div className="col-start-1 col-end-2 flex justify-start pr-3 pt-2">
              <div className="w-full max-w-xs">
                <AgentCard agent={agents.analyst} />
              </div>
            </div>
            <div className="col-start-2 col-end-3" />
            <div className="col-start-3 col-end-4 flex justify-end pl-3 pt-2">
              <div className="w-full max-w-xs">
                <AgentCard agent={agents.critic} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="block md:hidden px-4 py-4 space-y-3">
        <AgentCard agent={agents.research} />
        <div className="flex justify-center">
          <ArrowDown className="w-4 h-4 text-emerald-400 animate-bounce" />
        </div>
        <AgentCard agent={agents.analyst} />
        <div className="flex justify-center">
          <ArrowDown className="w-4 h-4 text-amber-400 animate-bounce" />
        </div>
        <AgentCard agent={agents.critic} />

        <div className="flex items-center justify-center gap-3 mt-2 py-2 px-4 rounded-2xl bg-[#121824]/80 border border-emerald-500/25 text-center">
          <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
          <span className="text-xs font-mono text-white">
            θ<sub>conf</sub> = {stats?.confidence_threshold ? `${Math.round(stats.confidence_threshold * 100)}%` : '75%'}
          </span>
          <span className="text-[11px] text-muted">· D = 0.4U + 0.4X + 0.2G</span>
        </div>
      </div>

      <div className="px-4 pb-4 md:px-6 md:pb-6">
        <OverheadDashboard />
      </div>
      </>
      )}

      {evidence.length > 0 && (
        <div className="px-4 pb-5 md:px-6 space-y-3">
          <div className="flex items-center gap-2 border-t border-[#252e3e] pt-4">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs font-bold text-white">
              Grounded Evidence & Citations ({evidence.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {evidence.map((item, idx) => (
              <a
                key={idx}
                href={item.source_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl bg-[#141b27] border border-[#252f41] hover:border-sky-500/40 hover:bg-[#1a2333] transition-all flex flex-col justify-between gap-2 group shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        item.source_type === 'tier1'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                          : item.source_type === 'tier2'
                          ? 'bg-sky-500/15 text-sky-300 border border-sky-500/25'
                          : 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
                      }`}
                    >
                      {item.source_type || 'Web'}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted group-hover:text-sky-400 transition-colors" />
                  </div>
                  <h4 className="font-semibold text-xs text-white line-clamp-1 group-hover:text-sky-300 transition-colors">
                    {item.source_title || 'Academic Reference'}
                  </h4>
                  <p className="text-[11px] text-muted line-clamp-2 mt-1 leading-relaxed">{item.claim}</p>
                </div>
                {item.evidence && (
                  <p className="text-[10px] text-muted-2 italic border-l-2 border-white/10 pl-2 line-clamp-2 mt-1">
                    "{item.evidence}"
                  </p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
