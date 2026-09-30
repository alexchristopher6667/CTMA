import React, { useEffect, useState } from 'react';
import { SettingsProvider } from './context/SettingsContext';
import { DiscussionProvider, useDiscussion } from './context/DiscussionContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ChatThread } from './components/chat/ChatThread';
import { AnalyticsDashboard } from './components/dashboard/AnalyticsDashboard';
import { SettingsView } from './components/settings/SettingsView';
import { SettingsModal } from './components/settings/SettingsModal';

const AppContent: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    window.matchMedia('(max-width: 639px)').matches
  );
  const { activeTab } = useDiscussion();

  useEffect(() => {
    const mobileViewport = window.matchMedia('(max-width: 639px)');
    const syncSidebar = () => setSidebarCollapsed(mobileViewport.matches);
    mobileViewport.addEventListener('change', syncSidebar);
    return () => mobileViewport.removeEventListener('change', syncSidebar);
  }, []);

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-[#0b0f17] text-[#e5e9f2]">
      {/* Collapsible Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      {!sidebarCollapsed && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarCollapsed(true)}
          className="fixed inset-0 z-[25] bg-black/50 sm:hidden"
        />
      )}

      {/* Main View Area */}
      <div className="relative flex min-w-0 flex-col flex-1 h-dvh overflow-hidden">
        {/* Top Header */}
        <Header onOpenSidebar={() => setSidebarCollapsed(false)} />

        {/* Tab Content */}
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {activeTab === 'chat' && <ChatThread />}
          {activeTab === 'dashboard' && <AnalyticsDashboard />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Floating System Preferences Modal / Dropdown */}
      <SettingsModal />
    </div>
  );
};

export default function App() {
  return (
    <SettingsProvider>
      <DiscussionProvider>
        <AppContent />
      </DiscussionProvider>
    </SettingsProvider>
  );
}
