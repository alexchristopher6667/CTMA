import React from 'react';
import { ShieldCheck, TrendingDown, ArrowRight, Zap, CheckCircle2, Leaf } from 'lucide-react';
import { useDiscussion } from '../../context/DiscussionContext';

export const OverheadDashboard: React.FC = () => {
  const { stats, decisions } = useDiscussion();

  return (
    <div className="rounded-2xl p-5 bg-[#121722]/95 border border-[#263143] shadow-glass space-y-4">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-[#252e3e] pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-emerald-400" />
          <h3 className="font-serif font-bold text-sm text-white tracking-tight">
            Communication Overhead & Token Efficiency Dashboard
          </h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          Selective Gating Active
        </span>
      </div>

      {/* 6 Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-[#171f2d] border border-[#273549] flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-muted tracking-wider">Overhead Reduced</span>
          <span className="font-serif text-xl font-bold text-emerald-400 mt-1">
            {stats.overhead_reduction_pct}%
          </span>
          <span className="text-[10px] text-muted-2 mt-0.5">unnecessary chatter avoided</span>
        </div>

        <div className="p-3 rounded-xl bg-[#171f2d] border border-[#273549] flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-muted tracking-wider">Consultations Gated</span>
          <span className="font-serif text-lg font-bold text-white mt-1">
            {stats.messages_sent} sent / {stats.messages_bypassed} avoided
          </span>
          <span className="text-[10px] text-muted-2 mt-0.5">filtered via confidence threshold</span>
        </div>

        <div className="p-3 rounded-xl bg-[#171f2d] border border-[#273549] flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-muted tracking-wider">Estimated Tokens Saved</span>
          <span className="font-serif text-xl font-bold text-emerald-400 font-mono mt-1">
            ~{stats.tokens_saved}
          </span>
          <span className="text-[10px] text-muted-2 mt-0.5">from bypassed round-trips</span>
        </div>

        <div className="p-3 rounded-xl bg-[#171f2d] border border-[#273549] flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-muted tracking-wider">Uncertainty Cutoff</span>
          <span className="font-serif text-lg font-bold text-sky-400 font-mono mt-1">
            {stats.uncertainty_threshold} ({Math.round(stats.uncertainty_threshold * 100)}%)
          </span>
          <span className="text-[10px] text-muted-2 mt-0.5">trigger level for peer inquiry</span>
        </div>

        <div className="p-3 rounded-xl bg-[#171f2d] border border-[#273549] flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-[10px] font-bold uppercase tracking-wider">
            <span>Energy Saved</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="font-serif text-lg font-bold text-emerald-400 font-mono mt-1">
            {stats.energy_single_wh && stats.energy_multi_wh ? Math.max(0, stats.energy_single_wh - stats.energy_multi_wh).toFixed(4) : "0.0000"} Wh
          </span>
          <span className="text-[10px] text-muted-2 mt-0.5">via efficient gating</span>
        </div>

        <div className="p-3 rounded-xl bg-[#171f2d] border border-[#273549] flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-[10px] font-bold uppercase tracking-wider">
            <span>Carbon Avoided</span>
            <Leaf className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="font-serif text-lg font-bold text-emerald-400 font-mono mt-1">
            {stats.carbon_saved_g ? stats.carbon_saved_g.toFixed(4) : "0.0000"} g
          </span>
          <span className="text-[10px] text-muted-2 mt-0.5">CO2 emissions prevented</span>
        </div>
      </div>

      {/* Decision Feed Stream */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Live Decision Audit Feed</span>
        <div className="max-h-36 overflow-y-auto rounded-xl bg-[#0f141e] border border-[#222c3d] p-2 space-y-1.5">
          {decisions.length === 0 ? (
            <p className="text-xs text-muted-2 italic py-3 text-center">
              Real-time selective gating decisions (Bypassed vs Approached) will stream here during deliberation.
            </p>
          ) : (
            decisions.map((dec) => (
              <div
                key={dec.id}
                className={`p-2 rounded-lg text-xs flex items-center justify-between gap-3 border ${
                  dec.decision === 'bypass'
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${
                      dec.decision === 'bypass'
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : 'bg-amber-500/20 text-amber-200'
                    }`}
                  >
                    {dec.decision === 'bypass' ? 'Bypassed' : 'Approached'}
                  </span>
                  <span className="truncate">{dec.reason}</span>
                </div>
                <span className="text-[10px] font-mono text-muted-2 flex-shrink-0">{dec.timestamp}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
