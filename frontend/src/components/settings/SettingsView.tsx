import React, { useState } from 'react';
import {
  Palette,
  Type,
  Cpu,
  Sliders,
  ShieldCheck,
  RotateCcw,
  Check,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useDiscussion } from '../../context/DiscussionContext';
import { AccuracyMode } from '../../types';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { provider, model } = useDiscussion();
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="view-enter flex-1 overflow-y-auto px-8 pt-[104px] pb-8 space-y-8 max-w-4xl mx-auto w-full">
      {/* Settings Header */}
      <div className="flex items-center justify-between border-b border-[#252e3e] pb-5 flex-wrap gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-white tracking-tight">System Preferences</h2>
          <p className="text-xs text-muted mt-1">
            Customize interface appearance, multi-agent gating thresholds, and model parameters
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={resetSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted hover:text-white bg-[#161c28] border border-[#273245] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors shadow-sm"
          >
            {savedToast ? <Check className="w-3.5 h-3.5 text-black" /> : null}
            <span>{savedToast ? 'Saved!' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Appearance Card */}
        <div className="p-6 rounded-3xl bg-[#121723] border border-[#252f41] shadow-glass space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[#222b3b] pb-3.5">
            <Palette className="w-4 h-4 text-emerald-400" />
            <h3 className="font-serif font-bold text-sm text-white">Appearance &amp; Theme</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Theme Selector */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Color Palette
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'obsidian', label: 'Obsidian Dark', border: 'border-emerald-500/40' },
                  { id: 'midnight', label: 'Midnight Navy', border: 'border-sky-500/40' },
                  { id: 'light', label: 'Clean Light', border: 'border-neutral-400' },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => updateSettings({ theme: th.id as any })}
                    className={`p-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                      settings.theme === th.id
                        ? `${th.border} bg-emerald-500/10 text-white shadow-sm`
                        : 'border-[#273245] bg-[#161c28] text-muted hover:text-white'
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Scale */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Reading Scale
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'compact', label: 'Compact (13.5px)' },
                  { id: 'normal', label: 'Standard (15px)' },
                  { id: 'large', label: 'Presentation (17px)' },
                ].map((fs) => (
                  <button
                    key={fs.id}
                    onClick={() => updateSettings({ fontSize: fs.id as any })}
                    className={`p-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                      settings.fontSize === fs.id
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
                        : 'border-[#273245] bg-[#161c28] text-muted hover:text-white'
                    }`}
                  >
                    {fs.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Agent Gating & Accuracy Defaults */}
        <div className="p-6 rounded-3xl bg-[#121723] border border-[#252f41] shadow-glass space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[#222b3b] pb-3.5">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h3 className="font-serif font-bold text-sm text-white">Default Gating &amp; Accuracy Parameters</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Baseline Confidence Gating Threshold (θ<sub>conf</sub>)
                </label>
                <span className="text-sm font-serif font-bold text-emerald-400 font-mono">
                  {Math.round(settings.defaultThreshold * 100)}% ({settings.defaultThreshold.toFixed(2)})
                </span>
              </div>
              <input
                type="range"
                min="0.40"
                max="0.95"
                step="0.05"
                value={settings.defaultThreshold}
                onChange={(e) => updateSettings({ defaultThreshold: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 h-2 bg-[#1b2333] rounded-lg cursor-pointer"
              />
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[11px] text-muted-2 mt-1">
                <span>0.40 (Aggressive Silencing / High Token Savings)</span>
                <span>0.75 (Balanced)</span>
                <span>0.95 (High Scrutiny)</span>
              </div>
            </div>

            {/* Formula Preview Box */}
            <div className="p-3.5 rounded-xl bg-[#0f141f] border border-[#232d3e] text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Mathematical Condition:</span>
              <p className="font-mono text-[#c9d3e0] text-[11px] break-words">
                If C<sub>i</sub> ≥ {settings.defaultThreshold.toFixed(2)} → Peer consultation is bypassed (0 tokens consumed)
              </p>
              <p className="font-mono text-[#c9d3e0] text-[11px] break-words">
                If U<sub>i</sub> = (1 - C<sub>i</sub>) &gt; {(1 - settings.defaultThreshold).toFixed(2)} → Approach Verifier (Critic)
              </p>
            </div>
          </div>
        </div>

        {/* Model Provider & Evidence Grounding */}
        <div className="p-6 rounded-3xl bg-[#121723] border border-[#252f41] shadow-glass space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[#222b3b] pb-3.5">
            <Cpu className="w-4 h-4 text-purple-400" />
            <h3 className="font-serif font-bold text-sm text-white">Model Provider &amp; Evidence Grounding</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Active Provider
              </label>
              <div className="p-3 rounded-xl bg-[#161c28] border border-[#273245] space-y-1">
                <span className="text-xs font-bold text-white uppercase">{provider}</span>
                <p className="text-[11px] text-muted font-mono">{model}</p>
                <p className="text-[10px] text-emerald-400 mt-1">Configured and verified in backend environment.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Web Grounding Depth
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'standard', label: 'Standard Web' },
                  { id: 'academic', label: 'Strict Academic' },
                ].map((sd) => (
                  <button
                    key={sd.id}
                    onClick={() => updateSettings({ searchDepth: sd.id as any })}
                    className={`p-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                      settings.searchDepth === sd.id
                        ? 'border-purple-500/40 bg-purple-500/10 text-white'
                        : 'border-[#273245] bg-[#161c28] text-muted hover:text-white'
                    }`}
                  >
                    {sd.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
