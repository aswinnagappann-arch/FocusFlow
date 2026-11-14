/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';
import { TaskModal } from './components/modals/TaskModal';
import { TopicModal } from './components/modals/TopicModal';
import { AnalyticsPage } from './components/pages/AnalyticsPage';
import { CalendarPage } from './components/pages/CalendarPage';
import { LearningTopicsPage } from './components/pages/LearningTopicsPage';
import { MyTasksPage } from './components/pages/MyTasksPage';
import { OverviewPage } from './components/pages/OverviewPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { TodaysFocusPage } from './components/pages/TodaysFocusPage';
import { FocusFlowProvider, useFocusFlow } from './context/FocusFlowContext';

const FocusFlowShell: React.FC = () => {
  const { activePage } = useFocusFlow();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <OverviewPage />;
      case 'tasks':
        return <MyTasksPage />;
      case 'topics':
        return <LearningTopicsPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'focus':
        return <TodaysFocusPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <OverviewPage />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F7F8FA] dark:bg-[#0B0D11] text-[#111827] dark:text-[#F3F4F6] transition-colors">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {renderPage()}
        </main>
      </div>

      <TaskModal />
      <TopicModal />
      <CommandPaletteModal />
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <FocusFlowProvider>
      <FocusFlowShell />
    </FocusFlowProvider>
  );
}
