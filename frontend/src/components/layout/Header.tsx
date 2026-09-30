import React from 'react';
import {
  Layers,
  Menu,
  Zap,
  Scale,
  GraduationCap,
  Eye,
  EyeOff,
  Radio,
  CheckCircle2,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useDiscussion } from '../../context/DiscussionContext';
import { useSettings } from '../../context/SettingsContext';
import { AccuracyMode } from '../../types';

export const Header: React.FC<{ onOpenSidebar: () => void }> = ({ onOpenSidebar }) => {
  const { setIsSettingsModalOpen } = useSettings();
  const {
    activeTab,
    accuracyMode,
    setAccuracyMode,
    isInspectorExpanded,
    setIsInspectorExpanded,
    running,
    currentRound,
    isBackendConnected,
    provider,
    model,
  } = useDiscussion();

  const titleMap = {
    chat: 'Collaborative Research Chat',
    dashboard: 'System Analytics & Token Economy',
    settings: 'System Preferences & Model Parameters',
  };
  const shortTitleMap = {
    chat: 'Research Chat',
    dashboard: 'Analytics',
    settings: 'Preferences',
  };

  const modes: { id: AccuracyMode; label: string; threshold: string; icon: React.ReactNode }[] = [
    { id: 'fast', label: 'Fast Turn', threshold: '50% conf', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'balanced', label: 'Balanced', threshold: '75% conf', icon: <Scale className="w-3.5 h-3.5" /> },
    { id: 'academic', label: 'Academic Rigor', threshold: '90% conf', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex h-[72px] min-h-[72px] shrink-0 items-center justify-between gap-2 px-3 border-b border-white/15 bg-[#111622]/45 shadow-lg shadow-black/10 backdrop-blur-2xl backdrop-saturate-150 sm:gap-4 sm:px-6">
      {/* Title & Status */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
          className="motion-press flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted hover:bg-white/10 hover:text-white sm:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <h1 className="max-w-[100px] truncate font-serif text-sm font-bold text-white sm:max-w-none sm:text-lg">
          <span className="sm:hidden">{shortTitleMap[activeTab]}</span>
          <span className="hidden sm:inline">{titleMap[activeTab]}</span>
        </h1>

        {running ? (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-pulse">
            <Radio className="w-3.5 h-3.5 animate-spin" />
            <span>Round {currentRound}: Deliberating</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-[#18202d] border border-[#283244] text-[#848fa5] text-[11px] font-medium sm:px-2.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isBackendConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span className="hidden sm:inline">{isBackendConnected ? 'Engine Ready' : 'Connecting...'}</span>
          </div>
        )}
      </div>

      {/* Header Actions */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        {/* Accuracy Mode Selector (Only on Chat tab) */}
        {activeTab === 'chat' && (
          <div className="flex items-center p-0.5 rounded-xl bg-[#141a26] border border-[#252d3d] sm:p-1">
            {modes.map((m) => {
              const active = accuracyMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setAccuracyMode(m.id)}
                  disabled={running}
                  aria-label={`${m.label} accuracy mode`}
                  className={`motion-press flex items-center justify-center gap-1.5 px-1.5 py-1.5 rounded-lg text-xs font-medium transition-all border sm:px-3 ${
                    active
                      ? 'bg-gradient-to-r from-emerald-500/20 to-sky-500/15 text-emerald-300 border-emerald-500/30 shadow-sm'
                      : 'text-[#848fa5] hover:text-white disabled:opacity-50 border-transparent'
                  }`}
                  title={`Confidence threshold: ${m.threshold}`}
                >
                  {m.icon}
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Technical Multi-Agent Inspector Toggle (Only on Chat tab) */}
        {activeTab === 'chat' && (
          <button
            onClick={() => setIsInspectorExpanded((prev) => !prev)}
            aria-label={isInspectorExpanded ? 'Close agent inspector' : 'Open agent inspector'}
            className={`motion-press flex items-center justify-center gap-2 px-2 py-1.5 rounded-xl text-xs font-semibold transition-all border sm:px-3.5 ${
              isInspectorExpanded
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-glow'
                : 'bg-[#151c28] text-[#848fa5] border-[#263042] hover:text-white hover:bg-[#1a2333]'
            }`}
            title="Toggle Live Multi-Agent Workspace (Agent Thought Streams, Overhead Dashboard, Evidence Grid)"
          >
            {isInspectorExpanded ? (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Engine Visualizer: ON</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Inspect Agents</span>
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
};
