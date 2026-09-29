import React from 'react';
import {
  Layers,
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

export const Header: React.FC = () => {
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

  const modes: { id: AccuracyMode; label: string; threshold: string; icon: React.ReactNode }[] = [
    { id: 'fast', label: 'Fast Turn', threshold: '50% conf', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'balanced', label: 'Balanced', threshold: '75% conf', icon: <Scale className="w-3.5 h-3.5" /> },
    { id: 'academic', label: 'Academic Rigor', threshold: '90% conf', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3.5 border-b border-[#252d3d] bg-[#0b0f17]/90 backdrop-blur-md">
      {/* Title & Status */}
      <div className="flex items-center gap-4">
        <h1 className="font-serif text-lg font-bold text-white tracking-tight">
          {titleMap[activeTab]}
        </h1>

        {running ? (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-pulse">
            <Radio className="w-3.5 h-3.5 animate-spin" />
            <span>Round {currentRound}: Deliberating</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#18202d] border border-[#283244] text-[#848fa5] text-[11px] font-medium">
            <span className={`w-1.5 h-1.5 rounded-full ${isBackendConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span>{isBackendConnected ? 'Engine Ready' : 'Connecting...'}</span>
          </div>
        )}
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Accuracy Mode Selector (Only on Chat tab) */}
        {activeTab === 'chat' && (
          <div className="flex items-center p-1 rounded-xl bg-[#141a26] border border-[#252d3d]">
            {modes.map((m) => {
              const active = accuracyMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setAccuracyMode(m.id)}
                  disabled={running}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'bg-gradient-to-r from-emerald-500/20 to-sky-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                      : 'text-[#848fa5] hover:text-white disabled:opacity-50'
                  }`}
                  title={`Confidence threshold: ${m.threshold}`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Technical Multi-Agent Inspector Toggle (Only on Chat tab) */}
        {activeTab === 'chat' && (
          <button
            onClick={() => setIsInspectorExpanded((prev) => !prev)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              isInspectorExpanded
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-glow'
                : 'bg-[#151c28] text-[#848fa5] border-[#263042] hover:text-white hover:bg-[#1a2333]'
            }`}
            title="Toggle Live Multi-Agent Workspace (Agent Thought Streams, Overhead Dashboard, Evidence Grid)"
          >
            {isInspectorExpanded ? (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Engine Visualizer: ON</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5" />
                <span>Inspect Agents</span>
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
};
