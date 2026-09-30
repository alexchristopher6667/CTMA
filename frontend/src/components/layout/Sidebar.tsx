import React from 'react';
import {
  MessageSquare,
  BarChart3,
  Settings as SettingsIcon,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useDiscussion } from '../../context/DiscussionContext';
import { useSettings } from '../../context/SettingsContext';
import { AppTab } from '../../types';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const { setIsSettingsModalOpen } = useSettings();
  const { activeTab, setActiveTab, provider, model, isBackendConnected, sessions, loadSession, currentSessionId, newSession, turns } = useDiscussion();

  const navItems: { tab: AppTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      tab: 'chat',
      label: 'Research Chat',
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      tab: 'dashboard',
      label: 'Analytics & Overhead',
      icon: <BarChart3 className="w-5 h-5" />,
      badge: 'Metrics',
    },
  ];

  // Show new session button only when we have turns in current session
  const canNewSession = turns && turns.length > 0;

  return (
    <aside
      className={`motion-drawer z-30 flex shrink-0 flex-col h-dvh transition-all duration-300 border-r border-[#252d3d] bg-[#111622] text-[#e5e9f2] sm:z-20 ${
        collapsed
          ? 'fixed inset-y-0 left-0 w-72 -translate-x-full sm:relative sm:inset-auto sm:w-20 sm:translate-x-0'
          : 'fixed inset-y-0 left-0 w-72 translate-x-0 shadow-2xl sm:relative sm:inset-auto sm:w-72'
      }`}
    >
      {/* Brand Header */}
      <div className={`border-b border-[#252d3d] transition-all duration-200 ${
        collapsed ? 'p-2 sm:p-3 flex flex-col items-center gap-3' : 'p-4 flex items-center justify-between'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 via-sky-500/20 to-purple-500/20 border border-emerald-500/30 text-emerald-400 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-serif text-lg font-bold tracking-tight text-white truncate">CTMARS</span>
              <span className="text-[10.5px] font-semibold text-emerald-400 tracking-wider uppercase truncate">
                Adaptive Multi-Agent
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg text-muted hover:text-white hover:bg-[#1c222e] transition-colors flex-shrink-0 ${
            collapsed ? 'mt-1 w-8 h-8 flex items-center justify-center' : ''
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Navigation Tabs */}
      <nav className="p-2 sm:p-3 space-y-1.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => {
                if (item.tab === 'settings') {
                  setIsSettingsModalOpen(true);
                } else {
                  setActiveTab(item.tab);
                }
              }}
              className={`motion-press w-full flex items-center gap-3.5 px-2 sm:px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 border ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/15 to-sky-500/10 text-emerald-400 border-emerald-500/30 shadow-sm'
                  : 'text-[#848fa5] hover:text-[#e5e9f2] hover:bg-[#1a202e] border-transparent'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <div className={isActive ? 'text-emerald-400' : 'text-[#848fa5]'}>{item.icon}</div>
              {!collapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Recent Sessions List (Only if expanded) */}
      {!collapsed && (
        <div className="flex-1 px-3 py-2 overflow-y-auto border-t border-[#252d3d]/60">
          <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Recent Sessions
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a202e] text-[#848fa5]">
              {sessions.length}
            </span>
          </div>

          {/* New session button */}
          {canNewSession && (
            <button
              onClick={newSession}
              className="w-full flex items-center gap-2 px-3 py-2 mb-2 rounded-lg text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              New Session
            </button>
          )}

          <div className="mt-1 space-y-1">
            {sessions.length === 0 ? (
              <p className="px-3 py-4 text-xs italic text-muted-2 text-center">No previous investigations.</p>
            ) : (
              sessions.slice(0, 10).map((sess) => {
                const isSelected = currentSessionId === sess.id;
                const lastTurn = sess.turns?.[sess.turns.length - 1];
                return (
                  <button
                    key={sess.id}
                    onClick={() => loadSession(sess.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-[#1c222e] text-white border-l-2 border-emerald-400'
                        : 'text-[#848fa5] hover:text-white hover:bg-[#161c28]'
                    }`}
                  >
                    <span className="font-medium truncate">{sess.title}</span>
                    <div className="flex items-center justify-between text-[10px] text-muted-2">
                      <span>{sess.timestamp.split(',')[0]}</span>
                      <span className="text-emerald-400/90 font-mono">
                        {sess.turns?.length || 0} turn{(sess.turns?.length || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Bottom Section: Settings Icon Button at bottom-left + Provider Info */}
      <div className="p-2 sm:p-3 border-t border-[#252d3d] bg-[#0e121a]">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            {/* Settings button with icon only at bottom-left */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2.5 rounded-xl text-muted hover:text-white bg-[#161c26] hover:bg-[#1f2838] border border-[#252d3d] transition-colors flex-shrink-0"
              title="System Preferences (Theme, Accent, Font Scale)"
            >
              <SettingsIcon className="w-5 h-5 text-emerald-400" />
            </button>

            {/* Provider info */}
            <div className="flex-1 p-2 rounded-xl bg-[#161c26] border border-[#252d3d] min-w-0">
              <div className="flex items-center justify-between text-[10px] text-muted uppercase font-semibold mb-0.5">
                <span className="truncate">Provider</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isBackendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                  title={isBackendConnected ? 'Backend Connected' : 'Disconnected'}
                />
              </div>
              <div className="flex items-center justify-between gap-1 text-xs">
                <span className="font-bold text-white uppercase text-[11px] truncate">{provider}</span>
                <span className="text-[9px] font-mono text-sky-300 truncate max-w-[90px]">{model}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {/* Collapsed: Settings icon button only */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 rounded-xl text-muted hover:text-white bg-[#161c26] hover:bg-[#1f2838] border border-[#252d3d] transition-colors"
              title="System Preferences"
            >
              <SettingsIcon className="w-5 h-5 text-emerald-400" />
            </button>
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendConnected ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
              title={isBackendConnected ? 'Connected' : 'Disconnected'}
            />
          </div>
        )}
      </div>
    </aside>
  );
};
