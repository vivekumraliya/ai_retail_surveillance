'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'command-center' | 'report';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  isLight: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'apex_surveillance_theme_mode_v1';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'command-center',
  isDark: true,
  isLight: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('command-center');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (stored === 'command-center' || stored === 'report') {
        setThemeState(stored);
      }
    } catch {
      // Storage unavailable or blocked
    }
    setMounted(true);
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Storage quota or blocked
    }

    // Update document element class and color scheme
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (mode === 'report') {
        root.classList.add('theme-report');
        root.classList.remove('theme-command');
        root.style.colorScheme = 'light';
      } else {
        root.classList.add('theme-command');
        root.classList.remove('theme-report');
        root.style.colorScheme = 'dark';
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'command-center' ? 'report' : 'command-center');
  };

  useEffect(() => {
    if (mounted && typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'report') {
        root.classList.add('theme-report');
        root.classList.remove('theme-command');
        root.style.colorScheme = 'light';
      } else {
        root.classList.add('theme-command');
        root.classList.remove('theme-report');
        root.style.colorScheme = 'dark';
      }
    }
  }, [theme, mounted]);

  const isDark = theme === 'command-center';
  const isLight = theme === 'report';

  return (
    <ThemeContext.Provider value={{ theme, isDark, isLight, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
