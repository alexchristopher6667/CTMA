import React from 'react';
import {
  X,
  Sun,
  Moon,
  Monitor,
  Check,
  Type,
  Palette,
  Cpu,
  Zap,
  Scale,
  GraduationCap,
  RotateCcw,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useDiscussion } from '../../context/DiscussionContext';
import { ThemeMode, AccentColor, FontSize, AccuracyMode } from '../../types';

export const SettingsModal: React.FC = () => {
  const { settings, updateSettings, resetSettings, isSettingsModalOpen, setIsSettingsModalOpen } = useSettings();
  const { provider, model, isBackendConnected } = useDiscussion();

  if (!isSettingsModalOpen) return null;

  const themes: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { id: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
    { id: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
  ];

  const accents: { id: AccentColor; label: string; bg: string; border: string }[] = [
    { id: 'emerald', label: 'Emerald', bg: 'bg-[#10b981]', border: 'border-emerald-400' },
    { id: 'cyan', label: 'Cyan', bg: 'bg-[#06b6d4]', border: 'border-cyan-400' },
    { id: 'violet', label: 'Violet', bg: 'bg-[#8b5cf6]', border: 'border-violet-400' },
    { id: 'amber', label: 'Amber', bg: 'bg-[#f59e0b]', border: 'border-amber-400' },
    { id: 'rose', label: 'Rose', bg: 'bg-[#f43f5e]', border: 'border-rose-400' },
  ];

  const fontSizes: { id: FontSize; label: string; desc: string }[] = [
    { id: 'compact', label: 'Compact', desc: '13.5px' },
    { id: 'normal', label: 'Normal', desc: '15px' },
    { id: 'large', label: 'Large', desc: '16.5px' },
  ];

  const accuracyModes: { id: AccuracyMode; label: string; threshold: string; icon: React.ReactNode }[] = [
    { id: 'fast', label: 'Fast Turn', threshold: '50% Threshold', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'balanced', label: 'Balanced', threshold: '75% Threshold', icon: <Scale className="w-3.5 h-3.5" /> },
    { id: 'academic', label: 'Academic Rigor', threshold: '90% Threshold', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={() => setIsSettingsModalOpen(false)} />

      {/* Floating Dialog Box */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl bg-[#121722] border border-[#2a3447] shadow-2xl p-6 space-y-6 text-[#e5e9f2] animate-scale-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#252f41] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-white tracking-tight">System Preferences</h2>
              <p className="text-xs text-muted">Customize appearance, theme, and agent parameters</p>
            </div>
          </div>

          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-[#1a2230] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Theme Selection */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-emerald-400" /> Theme Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {themes.map((th) => {
              const active = settings.theme === th.id;
              return (
                <button
                  key={th.id}
                  onClick={() => updateSettings({ theme: th.id })}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-[#161c28] text-muted hover:text-white border-[#242e40] hover:bg-[#1c2433]'
                  }`}
                >
                  {th.icon}
                  <span>{th.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Accent Color Swatches */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-emerald-400" /> Accent Color
          </label>
          <div className="flex items-center gap-3">
            {accents.map((acc) => {
              const active = settings.accentColor === acc.id;
              return (
                <button
                  key={acc.id}
                  onClick={() => updateSettings({ accentColor: acc.id })}
                  className={`flex items-center justify-center w-9 h-9 rounded-full ${acc.bg} transition-all relative ${
                    active ? `ring-2 ring-white ring-offset-2 ring-offset-[#121722] scale-110 shadow-lg` : 'opacity-80 hover:opacity-100'
                  }`}
                  title={acc.label}
                >
                  {active && <Check className="w-4 h-4 text-white drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Text Size */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-emerald-400" /> Text Size Scale
          </label>
          <div className="grid grid-cols-3 gap-2">
            {fontSizes.map((f) => {
              const active = settings.fontSize === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => updateSettings({ fontSize: f.id })}
                  className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl border transition-all ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-[#161c28] text-muted hover:text-white border-[#242e40] hover:bg-[#1c2433]'
                  }`}
                >
                  <span className="text-xs font-bold">{f.label}</span>
                  <span className="text-[10px] text-muted-2">{f.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Default Accuracy Mode */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-emerald-400" /> Default Gating &amp; Rigor
          </label>
          <div className="grid grid-cols-3 gap-2">
            {accuracyModes.map((m) => {
              const active = settings.defaultMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() =>
                    updateSettings({
                      defaultMode: m.id,
                      defaultThreshold: m.id === 'fast' ? 0.50 : m.id === 'academic' ? 0.90 : 0.75,
                    })
                  }
                  className={`flex flex-col items-center justify-center py-2 px-2.5 rounded-xl border text-center transition-all ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-[#161c28] text-muted hover:text-white border-[#242e40] hover:bg-[#1c2433]'
                  }`}
                >
                  <div className="flex items-center gap-1 text-xs font-bold">
                    {m.icon}
                    <span>{m.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-2 mt-0.5">{m.threshold}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Engine Provider Info */}
        <div className="p-3.5 rounded-2xl bg-[#0f141f] border border-[#232d3f] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <div>
              <span className="font-bold text-white uppercase">{provider}</span>
              <span className="text-muted text-[11px] block font-mono">{model}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-muted">{isBackendConnected ? 'Ready' : 'Connecting'}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#252f41]">
          <button
            onClick={resetSettings}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors shadow-sm"
          >
            Apply &amp; Done
          </button>
        </div>
      </div>
    </div>
  );
};
