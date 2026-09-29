import React, { useState } from 'react';
import { SettingsProvider } from './context/SettingsContext';
import { DiscussionProvider, useDiscussion } from './context/DiscussionContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ChatThread } from './components/chat/ChatThread';
import { AnalyticsDashboard } from './components/dashboard/AnalyticsDashboard';
import { SettingsView } from './components/settings/SettingsView';
import { SettingsModal } from './components/settings/SettingsModal';

const AppContent: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { activeTab } = useDiscussion();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b0f17] text-[#e5e9f2]">
      {/* Collapsible Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Main View Area */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Tab Content */}
        <main className="flex-1 overflow-hidden flex flex-col">
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
