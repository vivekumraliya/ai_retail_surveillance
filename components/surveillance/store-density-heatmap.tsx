'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ShopperAgent } from './types';
import { consumerJourneyTracker, ZONE_DEFINITIONS } from '@/lib/consumer-journey-tracker';
import {
  HeatmapTrafficMode,
  extractCurrentTrafficPoints,
  extractPeakHoursTrafficPoints,
  calculateZoneDensityMetrics,
  renderDensityHeatmapOnCanvas,
  HeatmapPoint,
  ZoneDensityMetric,
} from '@/lib/density-heatmap-engine';
import {
  Flame,
  Activity,
  Layers,
  Eye,
  Sliders,
  Maximize2,
  Minimize2,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { surveillanceAudio } from '@/lib/surveillance-audio';
import { useTheme } from '@/lib/theme-context';

interface StoreDensityHeatmapProps {
  agents: ShopperAgent[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
  defaultMode?: HeatmapTrafficMode;
}

export const StoreDensityHeatmap: React.FC<StoreDensityHeatmapProps> = ({
  agents,
  isExpanded = false,
  onToggleExpand,
  className = '',
  defaultMode = 'peak',
}) => {
  const { isDark } = useTheme();
  const [trafficMode, setTrafficMode] = useState<HeatmapTrafficMode>(defaultMode);
  const [opacity, setOpacity] = useState<number>(0.85);
  const [radius, setRadius] = useState<number>(44);
  const [showCameras, setShowCameras] = useState<boolean>(true);
  const [showZones, setShowZones] = useState<boolean>(true);
  const [showAgents, setShowAgents] = useState<boolean>(true);
  const [hoveredZone, setHoveredZone] = useState<ZoneDensityMetric | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stored journeys state for live reactivity
  const [storedJourneys, setStoredJourneys] = useState(() =>
    consumerJourneyTracker.getAllStoredJourneys()
  );

  useEffect(() => {
    return consumerJourneyTracker.subscribe(() => {
      setStoredJourneys(consumerJourneyTracker.getAllStoredJourneys());
    });
  }, []);

  // Compute points based on current mode
  const currentPoints = useMemo(() => {
    return extractCurrentTrafficPoints(agents, storedJourneys);
  }, [agents, storedJourneys]);

  const peakPoints = useMemo(() => {
    return extractPeakHoursTrafficPoints(storedJourneys);
  }, [storedJourneys]);

  const activePoints = trafficMode === 'current' ? currentPoints : peakPoints;

  // Zone density metrics
  const zoneMetrics = useMemo(() => {
    return calculateZoneDensityMetrics(currentPoints, peakPoints);
  }, [currentPoints, peakPoints]);

  // Overall store summary
  const summary = useMemo(() => {
    const totalShoppers = trafficMode === 'current' ? agents.length : 142;
    const maxCapacity = 50;
    const capacityPct = trafficMode === 'current' ? Math.round((agents.length / maxCapacity) * 100) : 94;

    // Highest traffic zone
    const sortedZones = [...zoneMetrics].sort((a, b) =>
      trafficMode === 'current' ? b.currentDensity - a.currentDensity : b.peakDensity - a.peakDensity
    );
    const topZone = sortedZones[0] || zoneMetrics[0];

    return {
      totalShoppers,
      capacityPct,
      topZone,
    };
  }, [trafficMode, agents.length, zoneMetrics]);

  // Draw Heatmap onto Canvas Overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Match canvas pixel buffer to rendered width
    const rect = container.getBoundingClientRect();
    const w = Math.floor(rect.width) || 960;
    const h = Math.floor(rect.height) || 540;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    renderDensityHeatmapOnCanvas(canvas, activePoints, {
      radius,
      opacity,
      intensityMultiplier: trafficMode === 'peak' ? 1.15 : 1.35,
    });
  }, [activePoints, radius, opacity, trafficMode]);

  // Coordinate mapping for SVG & Canvas
  const mapX = (x: number, w: number = 960) => ((x + 18) / 36) * (w - 40) + 20;
  const mapZ = (z: number, h: number = 540) => ((z + 14) / 30) * (h - 60) + 30;

  // Camera positions and view cones for overlay
  const cameraOverlays = [
    { code: 'CAM-01', name: 'South Ingress', x: -13, z: 11, angle: -45, span: 65, color: '#38bdf8' },
    { code: 'CAM-02', name: 'Electronics 02', x: -1, z: 7.5, angle: -90, span: 60, color: '#ef4444' },
    { code: 'CAM-03', name: 'POS Checkout', x: 12.2, z: 3, angle: -140, span: 58, color: '#06b6d4' },
    { code: 'CAM-04', name: 'EAS Exit Choke', x: 12.8, z: 11.5, angle: -120, span: 62, color: '#f43f5e' },
  ];

  const handleModeToggle = (mode: HeatmapTrafficMode) => {
    surveillanceAudio.playTelemetryChirp();
    setTrafficMode(mode);
  };

  return (
    <div
      className={`flex flex-col rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
        isDark
          ? 'bg-slate-950 border border-slate-800'
          : 'bg-white border border-slate-200 shadow-sm'
      } ${
        isExpanded
          ? isDark
            ? 'fixed inset-4 z-50 p-4 bg-slate-950/98 backdrop-blur-xl'
            : 'fixed inset-4 z-50 p-4 bg-white/98 backdrop-blur-xl shadow-2xl'
          : className
      }`}
    >
      {/* 1. TOP HEADER & INTERACTIVE MODE TOGGLE BAR */}
      <div
        className={`flex-none flex flex-wrap items-center justify-between gap-2 p-3 border-b font-mono ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`p-1.5 rounded-lg border ${
              isDark
                ? 'bg-red-950/80 border-red-500/50 text-red-400'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}
          >
            <Flame size={17} className="animate-pulse text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3
                className={`text-xs font-bold tracking-wide uppercase ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Store Layout Density Heatmap
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  isDark
                    ? 'bg-slate-800 text-sky-300 border-slate-700'
                    : 'bg-sky-50 text-sky-700 border-sky-200 font-semibold'
                }`}
              >
                CANVAS OVERLAY (KDE)
              </span>
            </div>
            <div
              className={`text-[10.5px] flex items-center gap-2 mt-0.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              <span>Resolution: 36m × 30m Grid</span>
              <span>•</span>
              <span className={isDark ? 'text-emerald-400' : 'text-emerald-700 font-semibold'}>
                {trafficMode === 'current'
                  ? `Live Tracking: ${agents.length} active shoppers`
                  : `Historical Peak Hours: 1,480 aggregated sample points`}
              </span>
            </div>
          </div>
        </div>

        {/* PRIMARY TOGGLE: 'Peak Hours' vs 'Current Traffic' */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center p-1 rounded-lg border text-xs ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200/70 border-slate-300'
            }`}
          >
            {/* Current Traffic Button */}
            <button
              onClick={() => handleModeToggle('current')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                trafficMode === 'current'
                  ? 'bg-sky-600 text-white shadow-[0_0_12px_rgba(2,132,199,0.5)] border border-sky-400'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Activity size={13} className={trafficMode === 'current' ? 'animate-pulse text-cyan-200' : ''} />
              <span>Current Traffic</span>
              {trafficMode === 'current' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-0.5" />
              )}
            </button>

            {/* Peak Hours Button */}
            <button
              onClick={() => handleModeToggle('peak')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                trafficMode === 'peak'
                  ? 'bg-gradient-to-r from-amber-600 to-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)] border border-amber-400'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Flame size={13} className={trafficMode === 'peak' ? 'text-amber-200 animate-bounce' : ''} />
              <span>Peak Hours</span>
              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-black/40 text-amber-200 font-mono ml-0.5">
                HISTORICAL
              </span>
            </button>
          </div>

          {/* Quick Visibility Controls */}
          <div
            className={`hidden sm:flex items-center gap-1.5 p-1 rounded-lg border text-[11px] ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-slate-300'
                : 'bg-white border-slate-200 text-slate-600 shadow-xs'
            }`}
          >
            <button
              onClick={() => setShowCameras(!showCameras)}
              title="Toggle CCTV Camera Cones"
              className={`p-1.5 rounded transition cursor-pointer ${
                showCameras
                  ? isDark
                    ? 'text-sky-400 bg-slate-900'
                    : 'text-sky-700 bg-sky-50'
                  : isDark
                  ? 'text-slate-500 hover:bg-slate-800'
                  : 'text-slate-400 hover:bg-slate-100'
              }`}
            >
              <Eye size={13} />
            </button>

            <button
              onClick={() => setShowZones(!showZones)}
              title="Toggle Department Zone Boundaries"
              className={`p-1.5 rounded transition cursor-pointer ${
                showZones
                  ? isDark
                    ? 'text-emerald-400 bg-slate-900'
                    : 'text-emerald-700 bg-emerald-50'
                  : isDark
                  ? 'text-slate-500 hover:bg-slate-800'
                  : 'text-slate-400 hover:bg-slate-100'
              }`}
            >
              <Layers size={13} />
            </button>

            {trafficMode === 'current' && (
              <button
                onClick={() => setShowAgents(!showAgents)}
                title="Toggle Active Shopper Dots"
                className={`p-1.5 rounded transition cursor-pointer ${
                  showAgents
                    ? isDark
                      ? 'text-cyan-400 bg-slate-900'
                      : 'text-cyan-700 bg-cyan-50'
                    : isDark
                    ? 'text-slate-500 hover:bg-slate-800'
                    : 'text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Users size={13} />
              </button>
            )}

            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                title={isExpanded ? 'Collapse' : 'Fullscreen'}
                className={`p-1.5 rounded transition cursor-pointer ml-1 ${
                  isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. STATS & ANALYTICS BANNER */}
      <div
        className={`flex-none grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 border-b text-xs font-mono ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-100/60 border-slate-200'
        }`}
      >
        {/* Metric 1: Traffic State */}
        <div
          className={`p-2 rounded-lg border ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div
            className={`text-[10px] flex items-center justify-between ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span>TRAFFIC MODE</span>
            <span
              className={`w-2 h-2 rounded-full ${
                trafficMode === 'peak' ? 'bg-amber-400 animate-ping' : 'bg-sky-400 animate-pulse'
              }`}
            />
          </div>
          <div
            className={`text-sm font-bold mt-0.5 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {trafficMode === 'peak' ? 'Peak Hours Rush' : 'Current Real-Time'}
          </div>
          <div
            className={`text-[10px] truncate ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {trafficMode === 'peak' ? 'Aggregated Friday & Saturday' : `${agents.length} customers monitored`}
          </div>
        </div>

        {/* Metric 2: Primary Bottleneck / Hotspot */}
        <div
          className={`p-2 rounded-lg border ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div
            className={`text-[10px] flex items-center justify-between ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span>HOTSPOT CHOKEPOINT</span>
            <AlertTriangle size={12} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
          </div>
          <div
            className={`text-sm font-bold mt-0.5 truncate ${
              isDark ? 'text-amber-300' : 'text-amber-700'
            }`}
          >
            {summary.topZone.zoneName.split(' ')[0]} {summary.topZone.zoneName.split(' ')[1] || ''}
          </div>
          <div
            className={`text-[10px] ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {trafficMode === 'peak'
              ? `${summary.topZone.peakDensity}% Peak Congestion`
              : `${summary.topZone.currentDensity}% Local Density`}
          </div>
        </div>

        {/* Metric 3: Store Occupancy / Footfall */}
        <div
          className={`p-2 rounded-lg border ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div
            className={`text-[10px] flex items-center justify-between ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span>OCCUPANCY LOAD</span>
            <Users size={12} className={isDark ? 'text-sky-400' : 'text-sky-600'} />
          </div>
          <div
            className={`text-sm font-bold mt-0.5 ${
              isDark ? 'text-sky-400' : 'text-sky-700'
            }`}
          >
            {summary.capacityPct}% Capacity
          </div>
          <div
            className={`text-[10px] ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {summary.totalShoppers} shoppers recorded
          </div>
        </div>

        {/* Metric 4: Average Hot Zone Dwell */}
        <div
          className={`p-2 rounded-lg border ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div
            className={`text-[10px] flex items-center justify-between ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span>HOT ZONE DWELL</span>
            <Clock size={12} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
          </div>
          <div
            className={`text-sm font-bold mt-0.5 ${
              isDark ? 'text-emerald-400' : 'text-emerald-700'
            }`}
          >
            {summary.topZone.avgDwellSeconds}s avg dwell
          </div>
          <div
            className={`text-[10px] ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Checkout queues & electronics
          </div>
        </div>
      </div>

      {/* 3. STORE BLUEPRINT & CANVAS OVERLAY CONTAINER */}
      <div
        ref={containerRef}
        className={`relative w-full h-[380px] sm:h-[440px] lg:h-[480px] overflow-hidden select-none ${
          isDark ? 'bg-[#070b14]' : 'bg-slate-100'
        }`}
      >
        {/* Layer A: Architectural Store Layout Blueprint (SVG) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 960 540"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="storeBlueprintGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path
                d="M 30 0 L 0 0 0 30"
                fill="none"
                stroke={isDark ? '#121d2f' : '#e2e8f0'}
                strokeWidth="0.8"
              />
            </pattern>

            {/* Camera Cones Gradients */}
            <radialGradient id="camConeGrad" cx="0%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </radialGradient>
          </defs>

          {/* Blueprint Dark/Light Base */}
          <rect width="960" height="540" fill={isDark ? '#060a12' : '#f8fafc'} />
          <rect width="960" height="540" fill="url(#storeBlueprintGrid)" />

          {/* Outer Perimeter Building Walls */}
          <rect
            x="20"
            y="25"
            width="920"
            height="490"
            fill="none"
            stroke={isDark ? '#1e293b' : '#94a3b8'}
            strokeWidth="3.5"
            rx="8"
          />

          {/* Coordinate Axis Reference Marks */}
          <line
            x1="20"
            y1="270"
            x2="940"
            y2="270"
            stroke={isDark ? '#1e293b' : '#cbd5e1'}
            strokeWidth="0.6"
            strokeDasharray="3 3"
          />
          <line
            x1="480"
            y1="25"
            x2="480"
            y2="515"
            stroke={isDark ? '#1e293b' : '#cbd5e1'}
            strokeWidth="0.6"
            strokeDasharray="3 3"
          />

          {/* DEPARTMENT ZONES & FIXTURES */}
          {/* 1. Entrance Portal (South-West: X -16..-2, Z 9..16) */}
          <rect
            x={mapX(-16)}
            y={mapZ(9)}
            width={mapX(-2) - mapX(-16)}
            height={mapZ(15.5) - mapZ(9)}
            fill="#0284c7"
            fillOpacity="0.05"
            stroke="#0284c7"
            strokeDasharray="4 4"
            strokeWidth={showZones ? 1.5 : 0}
          />
          <text x={mapX(-9)} y={mapZ(14.5)} fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
            ENTRANCE INGRESS PORTAL
          </text>
          {/* Turnstiles glyphs */}
          <rect x={mapX(-9) - 20} y={mapZ(11)} width="40" height="6" fill="#334155" rx="2" />

          {/* 2. Produce & Fresh Bakery (West: X -17.5..-10, Z -12..9) */}
          <rect
            x={mapX(-17.5)}
            y={mapZ(-12)}
            width={mapX(-10) - mapX(-17.5)}
            height={mapZ(8.5) - mapZ(-12)}
            fill="#10b981"
            fillOpacity="0.05"
            stroke="#10b981"
            strokeWidth={showZones ? 1.5 : 0}
          />
          <text x={mapX(-13.8)} y={mapZ(-10.5)} fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle">
            PRODUCE & BAKERY
          </text>
          {/* Produce Table Islands */}
          <rect x={mapX(-16)} y={mapZ(-7)} width={mapX(-11.5) - mapX(-16)} height="36" fill="#132a24" stroke="#059669" strokeWidth="1" rx="4" />
          <rect x={mapX(-16)} y={mapZ(-1)} width={mapX(-11.5) - mapX(-16)} height="36" fill="#132a24" stroke="#059669" strokeWidth="1" rx="4" />
          <rect x={mapX(-16)} y={mapZ(5)} width={mapX(-11.5) - mapX(-16)} height="36" fill="#132a24" stroke="#059669" strokeWidth="1" rx="4" />

          {/* 3. Aisle 01 Pantry & Dry Goods (X -7.8..-6.2, Z -7..7) */}
          <rect
            x={mapX(-7.8)}
            y={mapZ(-7)}
            width={mapX(-6.2) - mapX(-7.8)}
            height={mapZ(7) - mapZ(-7)}
            fill="#1e293b"
            stroke="#f59e0b"
            strokeWidth="1.8"
            rx="3"
          />
          <text x={mapX(-7)} y={mapZ(-8.5)} fill="#fbbf24" fontSize="10.5" fontWeight="bold" textAnchor="middle">
            AISLE 01: PANTRY
          </text>

          {/* 4. Aisle 02 Electronics High-Value (X -1.3..0.3, Z -7..7) */}
          <rect
            x={mapX(-1.3)}
            y={mapZ(-7)}
            width={mapX(0.3) - mapX(-1.3)}
            height={mapZ(7) - mapZ(-7)}
            fill="#2a1215"
            stroke="#ef4444"
            strokeWidth="2.2"
            rx="3"
          />
          <text x={mapX(-0.5)} y={mapZ(-8.5)} fill="#f87171" fontSize="10.5" fontWeight="bold" textAnchor="middle">
            AISLE 02: ELECTRONICS (HIGH-VALUE)
          </text>

          {/* 5. Aisle 03 Snacks & Beverages (X 5.2..6.8, Z -7..7) */}
          <rect
            x={mapX(5.2)}
            y={mapZ(-7)}
            width={mapX(6.8) - mapX(5.2)}
            height={mapZ(7) - mapZ(-7)}
            fill="#1e293b"
            stroke="#a855f7"
            strokeWidth="1.8"
            rx="3"
          />
          <text x={mapX(6)} y={mapZ(-8.5)} fill="#c084fc" fontSize="10.5" fontWeight="bold" textAnchor="middle">
            AISLE 03: SNACKS & DRINKS
          </text>

          {/* 6. POS Checkout Lanes (X 9.5..14, Z -4..4.5) */}
          <rect
            x={mapX(9.5)}
            y={mapZ(-4.5)}
            width={mapX(14) - mapX(9.5)}
            height={mapZ(5) - mapZ(-4.5)}
            fill="#06b6d4"
            fillOpacity="0.05"
            stroke="#06b6d4"
            strokeWidth={showZones ? 1.5 : 0}
          />
          <text x={mapX(11.8)} y={mapZ(-5.5)} fill="#22d3ee" fontSize="11" fontWeight="bold" textAnchor="middle">
            POS CHECKOUT LANES
          </text>
          {/* 3 Checkout conveyor register counters */}
          {[-3, 0, 3].map((cz) => (
            <g key={cz}>
              <rect x={mapX(10.2)} y={mapZ(cz) - 10} width={mapX(13.2) - mapX(10.2)} height="20" fill="#0e2a38" stroke="#0891b2" strokeWidth="1" rx="2" />
              <rect x={mapX(12.6)} y={mapZ(cz) - 8} width="14" height="16" fill="#38bdf8" rx="2" />
            </g>
          ))}

          {/* 7. EAS Anti-Theft Exit Gate (X 6..14, Z 9..15) */}
          <rect
            x={mapX(6)}
            y={mapZ(9)}
            width={mapX(14) - mapX(6)}
            height={mapZ(15.5) - mapZ(9)}
            fill="#f43f5e"
            fillOpacity="0.05"
            stroke="#f43f5e"
            strokeDasharray="4 4"
            strokeWidth={showZones ? 1.5 : 0}
          />
          <text x={mapX(10)} y={mapZ(14.5)} fill="#fb7185" fontSize="11" fontWeight="bold" textAnchor="middle">
            EAS SECURITY EXIT CHOKEPOINT
          </text>
          {/* Dual EAS pedestals */}
          <rect x={mapX(8.2)} y={mapZ(12)} width="8" height="24" fill="#e11d48" rx="2" />
          <rect x={mapX(11.8)} y={mapZ(12)} width="8" height="24" fill="#e11d48" rx="2" />

          {/* CAMERA MARKERS & FIELD OF VIEW CONES */}
          {showCameras &&
            cameraOverlays.map((cam) => {
              const cx = mapX(cam.x);
              const cz = mapZ(cam.z);
              return (
                <g key={cam.code}>
                  {/* FOV Triangular Cone Arc approximation */}
                  <circle cx={cx} cy={cz} r="75" fill="url(#camConeGrad)" opacity="0.4" />
                  {/* Camera icon dot */}
                  <circle cx={cx} cy={cz} r="5" fill="#38bdf8" />
                  <circle cx={cx} cy={cz} r="9" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 2" />
                  <text x={cx + 12} y={cz + 3} fill="#94a3b8" fontSize="9.5" fontWeight="bold">
                    {cam.code}
                  </text>
                </g>
              );
            })}

          {/* LIVE AGENT DOTS (In Current Traffic Mode) */}
          {trafficMode === 'current' &&
            showAgents &&
            agents.map((agent) => {
              const ax = mapX(agent.position[0]);
              const az = mapZ(agent.position[2]);
              const isThief = agent.isThief;
              const isRisk = agent.riskScore > 60;
              const color = isThief ? '#ef4444' : isRisk ? '#f59e0b' : '#38bdf8';

              return (
                <g key={agent.id} className="transition-all duration-200">
                  <circle cx={ax} cy={az} r="4.5" fill={color} />
                  <circle cx={ax} cy={az} r="8" fill="none" stroke={color} strokeWidth="1" opacity="0.6" />
                </g>
              );
            })}
        </svg>

        {/* Layer B: HTML5 CANVAS DENSITY HEATMAP OVERLAY */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300 ${
            isDark ? 'mix-blend-screen' : 'mix-blend-multiply'
          }`}
          style={{ opacity }}
        />

        {/* Layer C: Interactive Zone Hover Hotspots (Detect mouse hover) */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-auto">
          {zoneMetrics.map((zone) => {
            const def = ZONE_DEFINITIONS.find((d) => d.id === zone.zoneId);
            if (!def) return null;

            // Compute relative box
            const leftPct = `${((def.bounds.minX + 18) / 36) * 100}%`;
            const widthPct = `${((def.bounds.maxX - def.bounds.minX) / 36) * 100}%`;
            const topPct = `${((def.bounds.minZ + 14) / 30) * 100}%`;
            const heightPct = `${((def.bounds.maxZ - def.bounds.minZ) / 30) * 100}%`;

            const isCurrentHigh = zone.currentDensity > 60;
            const isPeakHigh = zone.peakDensity > 60;

            return (
              <div
                key={zone.zoneId}
                onMouseEnter={() => setHoveredZone(zone)}
                onMouseLeave={() => setHoveredZone(null)}
                className="absolute cursor-crosshair group transition-colors"
                style={{
                  left: leftPct,
                  width: widthPct,
                  top: topPct,
                  height: heightPct,
                }}
              >
                {/* Zone Density Tag Badge in corner */}
                <div className="absolute top-1.5 left-1.5 opacity-80 group-hover:opacity-100 transition">
                  <span
                    className={`text-[9.5px] px-1.5 py-0.5 rounded font-mono font-bold border backdrop-blur-sm shadow-md ${
                      trafficMode === 'peak'
                        ? isPeakHigh
                          ? isDark
                            ? 'bg-red-950/90 text-red-300 border-red-500/70'
                            : 'bg-red-100 text-red-700 border-red-300'
                          : isDark
                          ? 'bg-slate-900/90 text-slate-300 border-slate-700'
                          : 'bg-white/90 text-slate-700 border-slate-300'
                        : isCurrentHigh
                        ? isDark
                          ? 'bg-sky-950/90 text-sky-300 border-sky-500/70'
                          : 'bg-sky-100 text-sky-700 border-sky-300'
                        : isDark
                        ? 'bg-slate-900/90 text-slate-300 border-slate-700'
                        : 'bg-white/90 text-slate-700 border-slate-300'
                    }`}
                  >
                    {trafficMode === 'peak' ? `${zone.peakDensity}% Peak` : `${zone.currentDensity}% Live`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Layer D: Active Tooltip Popover when hovering a department */}
        {hoveredZone && (
          <div
            className={`absolute bottom-3 left-3 p-3 rounded-xl shadow-2xl backdrop-blur-md pointer-events-none font-mono text-xs max-w-sm space-y-1.5 animate-in fade-in-50 duration-150 z-30 ${
              isDark
                ? 'bg-slate-950/95 border border-sky-500/60 text-slate-200'
                : 'bg-white/95 border border-sky-400 text-slate-800 shadow-xl'
            }`}
          >
            <div
              className={`flex items-center justify-between gap-3 pb-1.5 border-b ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredZone.color }} />
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {hoveredZone.zoneName}
                </span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  hoveredZone.congestionStatus === 'CRITICAL'
                    ? isDark
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : 'bg-red-100 text-red-700 border border-red-300'
                    : hoveredZone.congestionStatus === 'HIGH'
                    ? isDark
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-amber-100 text-amber-700 border border-amber-300'
                    : isDark
                    ? 'bg-slate-800 text-slate-300'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {hoveredZone.congestionStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
              <div>
                <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  CURRENT TRAFFIC
                </span>
                <strong className={isDark ? 'text-sky-300' : 'text-sky-700'}>
                  {hoveredZone.currentDensity}% density
                </strong>
                <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {hoveredZone.currentShoppers} shoppers present
                </span>
              </div>

              <div>
                <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  HISTORICAL PEAK
                </span>
                <strong className={isDark ? 'text-amber-400' : 'text-amber-700'}>
                  {hoveredZone.peakDensity}% density
                </strong>
                <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  ~{hoveredZone.peakShoppersPerHour} shoppers / hr
                </span>
              </div>
            </div>

            <div
              className={`flex items-center justify-between text-[10.5px] pt-1 border-t ${
                isDark ? 'text-slate-300 border-slate-800/80' : 'text-slate-600 border-slate-200'
              }`}
            >
              <span>Avg Dwell Time:</span>
              <strong className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>
                {hoveredZone.avgDwellSeconds} seconds
              </strong>
            </div>
          </div>
        )}

        {/* Layer E: Bottom Right Heatmap Legend */}
        <div
          className={`absolute bottom-3 right-3 p-2 rounded-lg border shadow-xl backdrop-blur-sm font-mono text-[10px] pointer-events-none flex flex-col gap-1 z-20 ${
            isDark
              ? 'bg-slate-950/90 border-slate-800 text-slate-300'
              : 'bg-white/95 border-slate-200 text-slate-800 shadow-md'
          }`}
        >
          <div className="flex items-center justify-between font-bold mb-0.5">
            <span>DENSITY INTENSITY</span>
            <span className={isDark ? 'text-amber-400' : 'text-amber-600'}>
              {trafficMode === 'peak' ? 'PEAK' : 'LIVE'}
            </span>
          </div>
          <div className="w-36 h-2.5 rounded-sm bg-gradient-to-r from-blue-600 via-emerald-400 via-amber-400 to-red-600 border border-slate-700/50" />
          <div className={`flex justify-between text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Low (0%)</span>
            <span>Medium (50%)</span>
            <span>Hotspot (100%)</span>
          </div>
        </div>
      </div>

      {/* 4. FOOTER CONTROLS & OPACITY ADJUSTER */}
      <div
        className={`flex-none flex flex-wrap items-center justify-between gap-3 p-2.5 border-t text-xs font-mono ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-300'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Opacity Slider */}
          <div className="flex items-center gap-2">
            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Heatmap Opacity:
            </span>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-20 accent-sky-500 cursor-pointer"
            />
            <span className={`w-8 text-right font-bold ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
              {Math.round(opacity * 100)}%
            </span>
          </div>

          {/* Radius Spread Slider */}
          <div className="hidden md:flex items-center gap-2">
            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Radius:
            </span>
            <input
              type="range"
              min="24"
              max="64"
              step="4"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value, 10))}
              className="w-20 accent-amber-500 cursor-pointer"
            />
            <span className={`w-6 text-right font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              {radius}px
            </span>
          </div>
        </div>

        {/* Mode explanation */}
        <div className={`text-[11px] flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <Info size={13} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
          {trafficMode === 'peak' ? (
            <span>Aggregating historical customer movement from high-volume shopping shifts.</span>
          ) : (
            <span>Real-time kernel density estimation from active CCTV tracking agents.</span>
          )}
        </div>
      </div>
    </div>
  );
};
