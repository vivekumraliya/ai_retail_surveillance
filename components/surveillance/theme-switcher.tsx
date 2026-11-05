'use client';

import React from 'react';
import { useTheme, ThemeMode } from '@/lib/theme-context';
import { Moon, Sun, Monitor, FileText, Sparkles } from 'lucide-react';
import { surveillanceAudio } from '@/lib/surveillance-audio';

interface ThemeSwitcherProps {
  className?: string;
  showLabels?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  className = '',
  showLabels = true,
}) => {
  const { theme, setTheme, isDark } = useTheme();

  const handleSelectTheme = (mode: ThemeMode) => {
    if (mode !== theme) {
      surveillanceAudio.playTelemetryChirp();
      setTheme(mode);
    }
  };

  return (
    <div
      className={`flex items-center p-1 rounded-xl font-mono text-xs transition-all select-none ${
        isDark
          ? 'bg-slate-900 border border-slate-800 shadow-inner'
          : 'bg-slate-100 border border-slate-300 shadow-inner'
      } ${className}`}
      role="radiogroup"
      aria-label="Display Theme"
    >
      {/* Command Center (Dark) Button */}
      <button
        type="button"
        role="radio"
        aria-checked={isDark}
        onClick={() => handleSelectTheme('command-center')}
        title="Command Center: High-contrast dark CCTV & tactical telemetry mode"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
          isDark
            ? 'bg-slate-800 text-sky-400 border border-sky-500/40 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
        }`}
      >
        <Moon size={13} className={isDark ? 'text-sky-400' : 'text-slate-500'} />
        {showLabels && (
          <span className="hidden sm:inline tracking-tight">
            Command Center
          </span>
        )}
        {showLabels && (
          <span className="sm:hidden tracking-tight">
            Dark
          </span>
        )}
      </button>

      {/* Report Mode (Light) Button */}
      <button
        type="button"
        role="radio"
        aria-checked={!isDark}
        onClick={() => handleSelectTheme('report')}
        title="Report Mode: High-contrast daytime reading and printable executive analytics"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
          !isDark
            ? 'bg-white text-slate-900 border border-slate-300 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
      >
        <Sun size={13} className={!isDark ? 'text-amber-500' : 'text-slate-400'} />
        {showLabels && (
          <span className="hidden sm:inline tracking-tight">
            Report Mode
          </span>
        )}
        {showLabels && (
          <span className="sm:hidden tracking-tight">
            Light
          </span>
        )}
        {!isDark && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />
        )}
      </button>
    </div>
  );
};
