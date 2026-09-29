import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppSettings, ThemeMode, AccentColor, FontSize } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: 'emerald',
  fontSize: 'normal',
  defaultMode: 'balanced',
  defaultThreshold: 0.75,
  preferredProvider: 'groq',
  searchDepth: 'standard',
};

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('ctmars_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('ctmars_settings', JSON.stringify(settings));
    } catch {
      // ignore
    }

    const root = document.documentElement;

    // 1. Resolve & Apply Theme (dark, light, system)
    const applyTheme = (isDark: boolean) => {
      root.classList.remove('dark', 'light');
      root.classList.add(isDark ? 'dark' : 'light');
      root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    };

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      applyTheme(settings.theme === 'dark');
    }

    // 2. Apply Accent Color
    root.setAttribute('data-accent', settings.accentColor || 'emerald');

    // 3. Apply Font Size Scaling
    root.setAttribute('data-font-size', settings.fontSize || 'normal');
  }, [settings]);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
