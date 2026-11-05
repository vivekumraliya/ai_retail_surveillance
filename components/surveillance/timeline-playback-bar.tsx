'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PlaybackState, SecurityAlert } from './types';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Radio,
  Clock,
  AlertTriangle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { surveillanceAudio } from '@/lib/surveillance-audio';
import { useTheme } from '@/lib/theme-context';

interface TimelinePlaybackBarProps {
  playback: PlaybackState;
  onUpdatePlayback: (partial: Partial<PlaybackState>) => void;
  alerts: SecurityAlert[];
  currentTimestampStr?: string;
  onJumpToAlert?: (alert: SecurityAlert) => void;
}

export const TimelinePlaybackBar: React.FC<TimelinePlaybackBarProps> = ({
  playback,
  onUpdatePlayback,
  alerts,
  currentTimestampStr,
  onJumpToAlert,
}) => {
  const { isDark } = useTheme();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverOffset, setHoverOffset] = useState<number | null>(null);

  const maxDuration = playback.maxHistoryDuration || 90; // 90 seconds window

  // Calculate percentage of playhead position:
  // currentTimeOffset goes from -maxDuration (0%) to 0 (100% = Live)
  const playheadPercent = Math.min(
    100,
    Math.max(0, ((playback.currentTimeOffset + maxDuration) / maxDuration) * 100)
  );

  // Compute offset from click/drag event
  const computeOffsetFromEvent = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const ratio = clickX / rect.width; // 0 to 1
      const offset = (ratio - 1) * maxDuration; // -maxDuration to 0
      return Math.min(0, Math.max(-maxDuration, Math.round(offset * 10) / 10));
    },
    [maxDuration]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsScrubbing(true);
    const newOffset = computeOffsetFromEvent(e.clientX);
    surveillanceAudio.playTelemetryChirp();
    onUpdatePlayback({
      currentTimeOffset: newOffset,
      isLive: Math.abs(newOffset) < 1.0,
      isPlaying: false, // pause while scrubbing for precise frame inspection
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScrubbing) return;
      const newOffset = computeOffsetFromEvent(e.clientX);
      onUpdatePlayback({
        currentTimeOffset: newOffset,
        isLive: Math.abs(newOffset) < 1.0,
      });
    };

    const handleMouseUp = () => {
      if (isScrubbing) {
        setIsScrubbing(false);
      }
    };

    if (isScrubbing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, computeOffsetFromEvent, onUpdatePlayback]);

  // Track hover preview
  const handleTrackMouseMove = (e: React.MouseEvent) => {
    const offset = computeOffsetFromEvent(e.clientX);
    setHoverOffset(offset);
  };

  const handleTrackMouseLeave = () => {
    setHoverOffset(null);
  };

  // Play/Pause toggle
  const togglePlayPause = () => {
    surveillanceAudio.playTelemetryChirp();
    const nextPlaying = !playback.isPlaying;
    onUpdatePlayback({ isPlaying: nextPlaying });
  };

  // Step 5 seconds forward / backward
  const stepOffset = (seconds: number) => {
    surveillanceAudio.playTelemetryChirp();
    const newOffset = Math.min(0, Math.max(-maxDuration, playback.currentTimeOffset + seconds));
    onUpdatePlayback({
      currentTimeOffset: newOffset,
      isLive: Math.abs(newOffset) < 1.0,
    });
  };

  // Go Live snap
  const goLive = () => {
    surveillanceAudio.playCameraSwitch();
    onUpdatePlayback({
      isLive: true,
      isPlaying: true,
      currentTimeOffset: 0,
      playbackSpeed: 1.0,
    });
  };

  // Speed selection
  const speeds = [0.5, 1.0, 2.0, 4.0, 8.0];

  return (
    <div
      className={`flex flex-col p-2.5 select-none font-mono text-xs backdrop-blur-md z-30 transition-colors duration-200 border-t ${
        isDark ? 'bg-slate-900/95 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
      }`}
    >
      {/* ========================================================= */}
      {/* 1. TOP TIMELINE SCRUBBER RULER & INCIDENT EVENT MARKERS   */}
      {/* ========================================================= */}
      <div className="relative mb-2 px-1">
        {/* Track Time Labels */}
        <div className={`flex justify-between text-[9px] mb-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <span>-90s</span>
          <span>-75s</span>
          <span>-60s</span>
          <span>-45s</span>
          <span>-30s</span>
          <span>-15s</span>
          <span className="text-emerald-500 font-bold">LIVE (0s)</span>
        </div>

        {/* The Interactive Scrubber Track Bar */}
        <div
          ref={trackRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleTrackMouseMove}
          onMouseLeave={handleTrackMouseLeave}
          className={`relative h-6 rounded-lg border cursor-pointer overflow-hidden group shadow-inner ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200/80 border-slate-300'
          }`}
        >
          {/* Continuous Recording Density Ribbon (Green Band) */}
          <div
            className={`absolute inset-y-1 left-1 right-1 rounded pointer-events-none border ${
              isDark
                ? 'bg-emerald-950/40 border-emerald-500/20'
                : 'bg-emerald-100/60 border-emerald-400/40'
            }`}
          />

          {/* Regular Tick Marks */}
          <div className="absolute inset-0 flex justify-between px-2 items-center pointer-events-none opacity-40">
            {Array.from({ length: 19 }).map((_, i) => (
              <div
                key={i}
                className={`w-px ${
                  i % 3 === 0
                    ? isDark ? 'h-3 bg-sky-400' : 'h-3 bg-sky-600'
                    : isDark ? 'h-1.5 bg-slate-500' : 'h-1.5 bg-slate-400'
                }`}
              />
            ))}
          </div>

          {/* Incident / Event Pins on Timeline */}
          {alerts.map((alert, idx) => {
            // Map alert timeOffset (default to estimated offset within 90s)
            const alertOffset = alert.timeOffset ?? -(idx * 14 + 10);
            if (alertOffset < -maxDuration || alertOffset > 0) return null;
            const alertPct = ((alertOffset + maxDuration) / maxDuration) * 100;

            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';

            return (
              <div
                key={alert.id}
                onClick={(e) => {
                  e.stopPropagation();
                  surveillanceAudio.playCameraSwitch();
                  onUpdatePlayback({
                    currentTimeOffset: alertOffset,
                    isLive: false,
                    isPlaying: false,
                  });
                  if (onJumpToAlert) onJumpToAlert(alert);
                }}
                title={`Jump to ${alert.severity.toUpperCase()}: ${alert.title}`}
                className={`absolute top-0 bottom-0 w-2.5 -ml-1.5 flex flex-col items-center justify-center cursor-pointer z-10 transition-transform hover:scale-125`}
                style={{ left: `${alertPct}%` }}
              >
                <div
                  className={`w-2 h-2 rotate-45 rounded-xs shadow-sm ${
                    isCritical
                      ? 'bg-red-500 border border-white animate-pulse'
                      : isWarning
                      ? 'bg-amber-400 border border-black'
                      : 'bg-sky-400'
                  }`}
                />
              </div>
            );
          })}

          {/* Elapsed / Historical Progress Bar */}
          <div
            className={`absolute top-0 bottom-0 left-0 border-r-2 pointer-events-none transition-[width] duration-75 ${
              isDark
                ? 'bg-sky-500/20 border-sky-400'
                : 'bg-sky-500/30 border-sky-600'
            }`}
            style={{ width: `${playheadPercent}%` }}
          />

          {/* Playhead Needle (Scrubber Cursor) */}
          <div
            className={`absolute top-0 bottom-0 w-0.5 z-20 pointer-events-none shadow-[0_0_8px_rgba(56,189,248,0.8)] ${
              isDark ? 'bg-sky-300' : 'bg-sky-600'
            }`}
            style={{ left: `${playheadPercent}%` }}
          >
            <div
              className={`absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rotate-45 border shadow-md rounded-xs ${
                isDark ? 'bg-sky-400 border-white' : 'bg-sky-600 border-white'
              }`}
            />
          </div>

          {/* Hover Tooltip Offset */}
          {hoverOffset !== null && !isScrubbing && (
            <div
              className={`absolute top-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded pointer-events-none z-30 border ${
                isDark
                  ? 'bg-slate-900 border-sky-400/60 text-sky-300'
                  : 'bg-white border-sky-600 text-sky-800 shadow-md'
              }`}
              style={{
                left: `${Math.min(88, Math.max(2, ((hoverOffset + maxDuration) / maxDuration) * 100))}%`,
              }}
            >
              {hoverOffset.toFixed(1)}s
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. PLAYBACK CONTROLS & SPEED BAR                          */}
      {/* ========================================================= */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 pt-1 border-t ${
          isDark ? 'border-slate-800/80' : 'border-slate-200'
        }`}
      >
        {/* Left: Play/Pause, Rewind, Step, Live Status */}
        <div className="flex items-center gap-1.5">
          {/* Live vs Playback Mode Badge */}
          {playback.isLive ? (
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold text-[10px] border ${
                isDark
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE FEED</span>
            </div>
          ) : (
            <button
              onClick={goLive}
              title="Return to real-time live surveillance stream"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-bold text-[10px] cursor-pointer animate-pulse transition-all border ${
                isDark
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/60 text-amber-300'
                  : 'bg-amber-100 hover:bg-amber-200 border-amber-400 text-amber-800 shadow-xs'
              }`}
            >
              <Radio size={12} className="text-amber-500" />
              <span>GO LIVE</span>
            </button>
          )}

          {/* Play / Pause Button */}
          <button
            onClick={togglePlayPause}
            title={playback.isPlaying ? 'Pause Footage' : 'Play Footage'}
            className="p-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            {playback.isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>

          {/* Step -5s */}
          <button
            onClick={() => stepOffset(-5)}
            title="Step back 5 seconds"
            className={`p-1.5 rounded cursor-pointer border ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
            }`}
          >
            <Rewind size={13} />
          </button>

          {/* Step +5s */}
          <button
            onClick={() => stepOffset(5)}
            title="Step forward 5 seconds"
            className={`p-1.5 rounded cursor-pointer border ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
            }`}
          >
            <FastForward size={13} />
          </button>

          {/* Current Offset Badge */}
          <div
            className={`px-2 py-1 rounded border text-[11px] ${
              isDark
                ? 'bg-black/60 border-slate-800 text-slate-200'
                : 'bg-white border-slate-200 text-slate-800 shadow-xs'
            }`}
          >
            {playback.isLive ? (
              <span className="text-emerald-500 font-bold">REAL-TIME</span>
            ) : (
              <span>
                OFFSET: <strong className={isDark ? 'text-amber-400' : 'text-amber-700'}>{playback.currentTimeOffset.toFixed(1)}s</strong>
              </span>
            )}
          </div>
        </div>

        {/* Center: Real-time Timecode Display */}
        <div
          className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded border text-[11px] ${
            isDark
              ? 'bg-slate-950/80 border-slate-800 text-slate-300'
              : 'bg-white border-slate-200 text-slate-700 shadow-xs'
          }`}
        >
          <Clock size={12} className={isDark ? 'text-sky-400' : 'text-sky-600'} />
          <span>PLAYHEAD:</span>
          <strong className={`tracking-wider ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
            {currentTimestampStr || new Date().toLocaleTimeString()}
          </strong>
        </div>

        {/* Right: Fast Forward Speed Multipliers */}
        <div
          className={`flex items-center gap-1 p-0.5 rounded border ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-200/70 border-slate-300'
          }`}
        >
          <span className={`text-[9px] px-1 uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            SPEED:
          </span>
          {speeds.map((spd) => {
            const isSelected = playback.playbackSpeed === spd;
            return (
              <button
                key={spd}
                onClick={() => {
                  surveillanceAudio.playTelemetryChirp();
                  onUpdatePlayback({ playbackSpeed: spd, isPlaying: true });
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-sm'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {spd}x
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
