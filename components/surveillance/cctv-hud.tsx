'use client';

import React, { useEffect, useRef } from 'react';
import { CameraDefinition, ShopperAgent, VisionFilterMode } from './types';
import { ShieldAlert, Crosshair, Eye } from 'lucide-react';

interface CctvHudProps {
  camera: CameraDefinition;
  isMaximized: boolean;
  visionMode: VisionFilterMode;
  agents: ShopperAgent[];
  isAlarmActive: boolean;
  onSelectCamera?: () => void;
  ptzValues?: { pan: number; tilt: number; zoom: number };
}

export const CctvHud: React.FC<CctvHudProps> = React.memo(({
  camera,
  isMaximized,
  visionMode,
  agents,
  isAlarmActive,
  onSelectCamera,
  ptzValues = { pan: 0, tilt: 0, zoom: 1 },
}) => {
  const clockRef = useRef<HTMLSpanElement>(null);

  // High performance direct DOM clock update: 0 React re-renders!
  useEffect(() => {
    let animId: number;
    let lastSecond = -1;

    const tick = () => {
      const now = new Date();
      const currentSec = now.getSeconds();

      if (clockRef.current) {
        if (currentSec !== lastSecond) {
          lastSecond = currentSec;
          const time = now.toTimeString().split(' ')[0];
          const ms = Math.floor(now.getMilliseconds() / 10).toString().padStart(2, '0');
          clockRef.current.textContent = `${time}.${ms}`;
        }
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      onClick={onSelectCamera}
      className={`absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 font-mono text-[11px] ${
        onSelectCamera ? 'cursor-pointer hover:bg-sky-500/5' : ''
      }`}
    >
      {/* Scanline CRT overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] opacity-20 z-0" />

      {/* Subtle vignette corners */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_60px_rgba(0,0,0,0.7)] z-0" />

      {/* Top OSD Bar */}
      <div className="relative z-10 flex items-start justify-between text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-2">
          {/* Recording Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-slate-700/60 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-bold tracking-widest text-red-400">REC</span>
          </div>

          {/* Camera Tag */}
          <div className="px-2.5 py-0.5 rounded bg-slate-900/80 border border-sky-500/40 text-sky-400 font-bold backdrop-blur-sm flex items-center gap-1.5">
            <Eye size={12} className="text-sky-400" />
            <span>{camera.code}</span>
            <span className="text-slate-400 font-normal">|</span>
            <span className="text-slate-200">{camera.name}</span>
          </div>

          {/* Zone badge */}
          {isMaximized && (
            <div className="hidden sm:flex px-2 py-0.5 rounded bg-black/60 border border-slate-700 text-slate-300">
              ZONE: <span className="text-amber-400 ml-1 font-semibold">{camera.zone}</span>
            </div>
          )}
        </div>

        {/* Right Info: Vision Mode & Tech Stats */}
        <div className="flex items-center gap-2">
          {visionMode !== 'normal' && (
            <div
              className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider backdrop-blur-sm border ${
                visionMode === 'ai'
                  ? 'bg-sky-950/80 text-sky-300 border-sky-500/60'
                  : visionMode === 'thermal'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
              }`}
            >
              MODE: {visionMode}
            </div>
          )}

          <div className="px-2 py-0.5 rounded bg-black/60 border border-slate-700/60 text-slate-400 hidden sm:block">
            {camera.resolution} @ {camera.fps}fps
          </div>
        </div>
      </div>

      {/* Critical Alarm Banner across feed */}
      {isAlarmActive && (
        <div className="relative z-20 my-auto mx-auto w-fit max-w-[90%] px-4 py-2 rounded-lg bg-red-600/90 text-white font-bold text-center border-2 border-red-300 shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-pulse backdrop-blur-md">
          <div className="flex items-center justify-center gap-2 text-sm">
            <ShieldAlert size={18} className="animate-spin" />
            <span>SECURITY ALARM: THEFT DETECTION IN PROGRESS</span>
          </div>
          <p className="text-[10px] font-normal tracking-wide text-red-100 uppercase mt-0.5">
            EAS Sensor Tripped • Intercept at Exit Chokepoint
          </p>
        </div>
      )}

      {/* Center Reticle (in maximized view) */}
      {isMaximized && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-25 text-sky-400">
          <Crosshair size={36} strokeWidth={1} />
        </div>
      )}

      {/* Live AI Computer Vision Bounding Boxes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {agents.map((agent) => {
          const proj = agent.screenProjections[camera.id];
          if (!proj || !proj.visible) return null;

          const isThief = agent.isThief;
          const isHighRisk = agent.riskScore > 60;
          const isConcealed = agent.hasConcealedItem;

          const leftPercent = `${(proj.x - proj.boxWidth / 2) * 100}%`;
          const topPercent = `${(proj.y - proj.boxHeight / 2) * 100}%`;
          const widthPercent = `${proj.boxWidth * 100}%`;
          const heightPercent = `${proj.boxHeight * 100}%`;

          const borderColor = isThief
            ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
            : isHighRisk
            ? 'border-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
            : 'border-sky-400/80 shadow-[0_0_4px_rgba(56,189,248,0.3)]';

          const badgeBg = isThief
            ? 'bg-red-600 text-white'
            : isHighRisk
            ? 'bg-amber-500 text-black'
            : 'bg-sky-600/90 text-white';

          return (
            <div
              key={agent.id}
              className="absolute pointer-events-none will-change-[left,top,width,height]"
              style={{
                left: leftPercent,
                top: topPercent,
                width: widthPercent,
                height: heightPercent,
              }}
            >
              {/* Bounding Box Border */}
              <div className={`w-full h-full border-2 ${borderColor} relative`}>
                <div className="absolute -top-1 -left-1 w-1.5 h-1.5 border-t-2 border-l-2 border-white" />
                <div className="absolute -top-1 -right-1 w-1.5 h-1.5 border-t-2 border-r-2 border-white" />
                <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 border-b-2 border-l-2 border-white" />
                <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 border-b-2 border-r-2 border-white" />

                {/* Top Badge: Tracking ID & Demographics & Risk */}
                <div className="absolute -top-5 left-0 flex items-center gap-1 whitespace-nowrap text-[8.5px] font-mono font-bold tracking-tight">
                  <span className={`px-1 py-0.2 rounded-sm ${badgeBg}`}>
                    {agent.id}
                  </span>
                  {/* Demographic Estimate Tag */}
                  <span className="px-1 py-0.2 rounded-sm bg-slate-900/90 text-cyan-300 border border-cyan-800/80">
                    {agent.gender} • {agent.ageBracket || '26-35'}
                  </span>
                  <span className="px-1 py-0.2 rounded-sm bg-black/80 text-slate-200 border border-slate-700">
                    {agent.riskScore}%
                  </span>
                </div>

                {/* Bottom Badge: Action State */}
                {(isThief || isHighRisk || isMaximized) && (
                  <div className="absolute -bottom-4 left-0 whitespace-nowrap text-[8px] font-mono px-1 py-0.2 rounded-sm bg-black/85 text-slate-300 border border-slate-700/80">
                    {isConcealed ? (
                      <span className="text-red-400 font-bold">
                        CONCEALMENT
                      </span>
                    ) : isThief ? (
                      <span className="text-amber-400 font-semibold">
                        ANOMALOUS
                      </span>
                    ) : (
                      <span>{agent.state.replace('_', ' ')}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom OSD Bar */}
      <div className="relative z-10 flex items-end justify-between text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
        {/* Left: PTZ telemetry */}
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded bg-black/70 border border-slate-800 text-slate-300 flex items-center gap-2">
            <span>PAN: <strong className="text-sky-400">{ptzValues.pan > 0 ? `+${ptzValues.pan}` : ptzValues.pan}°</strong></span>
            <span>TILT: <strong className="text-sky-400">{ptzValues.tilt > 0 ? `+${ptzValues.tilt}` : ptzValues.tilt}°</strong></span>
            <span>ZOOM: <strong className="text-sky-400">{ptzValues.zoom.toFixed(1)}x</strong></span>
          </div>

          <div className="hidden md:flex px-2 py-0.5 rounded bg-black/70 border border-slate-800 text-slate-400">
            LENS: {camera.lens}
          </div>
        </div>

        {/* Right: Timestamp with direct DOM ref */}
        <div className="flex items-center gap-2 font-mono">
          <div className="px-2 py-0.5 rounded bg-black/75 border border-slate-700/70 text-sky-400 font-bold tracking-wider">
            <span ref={clockRef}>--:--:--.--</span>
          </div>
        </div>
      </div>
    </div>
  );
});

CctvHud.displayName = 'CctvHud';
