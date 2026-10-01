import React from 'react';
import {
  MessageSquare,
  BarChart3,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Radio,
} from 'lucide-react';
import { useDiscussion } from '../../context/DiscussionContext';
import { useSettings } from '../../context/SettingsContext';
import { AppTab } from '../../types';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

function formatSessionDate(ts?: string): string {
  if (!ts) return 'Recent';
  try {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  } catch {}
  return ts.includes(',') ? ts.split(',')[0] : ts.slice(0, 10);
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const { setIsSettingsModalOpen } = useSettings();
  const {
    activeTab,
    setActiveTab,
    provider,
    model,
    isBackendConnected,
    sessions,
    loadSession,
    currentSessionId,
    newSession,
    deleteSession,
    running,
  } = useDiscussion();

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

  return (
    <aside
      className={`motion-drawer z-30 flex shrink-0 flex-col h-dvh transition-all duration-300 border-r border-[#252d3d] bg-[#111622] text-[#e5e9f2] sm:z-20 ${
        collapsed
          ? 'fixed inset-y-0 left-0 w-72 -translate-x-full sm:relative sm:inset-auto sm:w-20 sm:translate-x-0'
          : 'fixed inset-y-0 left-0 w-72 translate-x-0 shadow-2xl sm:relative sm:inset-auto sm:w-72'
      }`}
    >
      <div
        className={`border-b border-[#252d3d] transition-all duration-200 ${
          collapsed ? 'p-2 sm:p-3 flex flex-col items-center gap-3' : 'p-4 flex items-center justify-between'
        }`}
      >
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

      <div className="p-2 sm:p-3 pb-1">
        <button
          type="button"
          onClick={newSession}
          disabled={running}
          className={`w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 shadow-sm border ${
            running
              ? 'opacity-50 cursor-not-allowed bg-[#171f2c] border-[#253043] text-muted'
              : 'bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-sky-500/15 hover:from-emerald-500/30 hover:to-sky-500/25 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50 motion-press'
          }`}
          title={running ? 'Deliberation in progress...' : 'Start a fresh investigation'}
        >
          <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
          {!collapsed && <span>New Investigation</span>}
        </button>
      </div>

      <nav className="p-2 sm:p-3 pt-1 space-y-1.5">
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

      {!collapsed && (
        <div className="flex-1 px-3 py-2 overflow-y-auto border-t border-[#252d3d]/60 space-y-2">
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-muted uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-sky-400" /> Recent Sessions
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a202e] text-[#848fa5] font-mono">
              {sessions.length}
            </span>
          </div>

          <div className="space-y-1">
            {sessions.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-2 space-y-1">
                <p>No previous investigations.</p>
                <p className="text-[11px] text-[#6b778d]">Submit a prompt to start one.</p>
              </div>
            ) : (
              sessions.map((sess) => {
                const isSelected = currentSessionId === sess.id;
                const isLive = running && currentSessionId === sess.id;
                const turnCount = sess.turns?.length || 0;
                const displayTitle =
                  sess.title && sess.title.toLowerCase() !== 'untitled investigation'
                    ? sess.title
                    : (sess.turns?.[0]?.query && sess.turns[0].query.toLowerCase() !== 'research inquiry'
                        ? sess.turns[0].query
                        : `Investigation #${sess.id.slice(-4)}`);

                return (
                  <div
                    key={sess.id}
                    className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all border ${
                      isSelected
                        ? 'bg-[#182131] text-white border-emerald-500/40 shadow-sm'
                        : 'text-[#848fa5] hover:text-[#e5e9f2] hover:bg-[#151c27] border-transparent'
                    } ${running && !isSelected ? 'opacity-65' : ''}`}
                  >
                    <button
                      type="button"
                      disabled={running && !isSelected}
                      onClick={() => {
                        if (!running) {
                          loadSession(sess.id);
                        }
                      }}
                      className="flex-1 min-w-0 text-left focus:outline-none"
                      title={
                        running && !isSelected
                          ? 'Deliberation in progress...'
                          : displayTitle
                      }
                    >
                      <div className="flex items-center gap-2">
                        {isLive ? (
                          <div className="flex items-center gap-1 text-emerald-400 shrink-0">
                            <Radio className="w-3 h-3 animate-spin" />
                          </div>
                        ) : null}
                        <span
                          className={`font-medium truncate block ${
                            isSelected ? 'text-white' : 'text-[#c6cfde] group-hover:text-white'
                          }`}
                        >
                          {displayTitle}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-2 mt-1">
                        <span>{formatSessionDate(sess.timestamp)}</span>
                        <span className="text-emerald-400/90 font-mono">
                          {turnCount} turn{turnCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={running}
                      onClick={(e) => deleteSession(sess.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted hover:text-rose-300 hover:bg-rose-500/20 transition-all ml-1 shrink-0 disabled:opacity-0 focus:opacity-100"
                      title="Delete this session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <div className="p-2 sm:p-3 border-t border-[#252d3d] bg-[#0e121a]">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2.5 rounded-xl text-muted hover:text-white bg-[#161c26] hover:bg-[#1f2838] border border-[#252d3d] transition-colors flex-shrink-0"
              title="System Preferences (Theme, Accent, Font Scale)"
            >
              <SettingsIcon className="w-5 h-5 text-emerald-400" />
            </button>

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
