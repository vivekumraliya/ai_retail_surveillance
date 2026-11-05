'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  CameraId,
  ViewLayoutMode,
  VisionFilterMode,
  ShopperAgent,
  SecurityAlert,
  SystemTelemetry,
  PlaybackState,
} from './types';
import { CameraViewport, CAMERA_CONFIGS } from './camera-viewport';
import { AiGuidancePanel } from './ai-guidance-panel';
import { TimelinePlaybackBar } from './timeline-playback-bar';
import { TrendAnalyticsChart } from './trend-analytics-chart';
import { DemographicBreakdownDisplay, DemographicsSection } from './demographic-breakdown-display';
import { KpiMetricsGrid } from './kpi-metrics-grid';
import { StoreDensityHeatmap } from './store-density-heatmap';
import { SecurityAuditTable } from './security-audit-table';
import { AnalyticsContextCard } from './analytics-context-card';
import { CustomerJourneyModal } from './customer-journey-modal';
import { AudienceManager } from './audience-manager';
import { consumerJourneyTracker } from '@/lib/consumer-journey-tracker';
import {
  ShieldAlert,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  Eye,
  Video,
  Radio,
  Cpu,
  Lock,
  Layers,
  Terminal,
  Volume2,
  VolumeX,
  Download,
  TrendingUp,
  Database,
  MapPin,
  Flame,
  Building2,
  Clock,
  Filter,
  RefreshCw,
  Bell,
  Sparkles,
  Compass,
  FileText,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { surveillanceAudio } from '@/lib/surveillance-audio';
import { generateSurveillancePdfReport } from '@/lib/generate-pdf-report';
import { useTheme } from '@/lib/theme-context';
import { ThemeSwitcher } from './theme-switcher';

export default function SurveillanceDashboard() {
  const { isDark } = useTheme();
  const [selectedCameraId, setSelectedCameraId] = useState<CameraId>('cam1');
  const [layoutMode, setLayoutMode] = useState<ViewLayoutMode>('quad');
  const [visionMode, setVisionMode] = useState<VisionFilterMode>('normal');
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Global Filter State
  const [selectedFacility, setSelectedFacility] = useState('Store #104 - Metro Flagship Supermarket');
  const [selectedShift, setSelectedShift] = useState('Current Shift (Live)');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('ALL');

  // Security Alerts Log
  const [alerts, setAlerts] = useState<SecurityAlert[]>([
    {
      id: 'alt-initial-1',
      timestamp: '11:13:20',
      timeOffset: -40,
      cameraId: 'cam4',
      cameraName: 'CAM-04 EAS Exit Gate',
      shopperId: 'CUST-098',
      severity: 'critical',
      title: 'EAS Acoustic RF Sensor Tripped',
      description: 'Customer breached outer exit barrier carrying un-deactivated high-value smart watch sensor.',
      indicators: ['EAS Pedestal 1 Tripped', 'Concealment in jacket', 'High-speed transit'],
    },
    {
      id: 'alt-initial-2',
      timestamp: '11:12:45',
      timeOffset: -75,
      cameraId: 'cam2',
      cameraName: 'Aisle 02 Electronics',
      shopperId: 'CUST-098',
      severity: 'warning',
      title: 'Suspicious Shelf Dwell & Concealment',
      description: 'Extended 32s dwell overlooking premium electronics shelf followed by swift jacket reach gesture.',
      indicators: ['Extended dwell >30s', 'High-shrink shelf', 'Rapid hand motion'],
    },
    {
      id: 'alt-initial-3',
      timestamp: '11:05:00',
      timeOffset: -90,
      cameraId: 'cam1',
      cameraName: 'Entrance Foyer Wide',
      shopperId: 'SYSTEM',
      severity: 'info',
      title: 'Shift Video Telemetry Calibrated',
      description: '4K CCTV stream synchronized across 4 zonal surveillance angles with automated pose estimation.',
      indicators: ['60 FPS real-time', 'Bounding box tracking', 'EAS gate link'],
    },
  ]);

  const [agents, setAgents] = useState<ShopperAgent[]>([]);

  // Timeline Scrubber & Playback DVR State
  const [playback, setPlayback] = useState<PlaybackState>({
    isPlaying: true,
    isLive: true,
    playbackSpeed: 1.0,
    currentTimeOffset: 0,
    maxHistoryDuration: 90,
  });
  const [currentTimestampStr, setCurrentTimestampStr] = useState<string>('');
  const [analyticsTab, setAnalyticsTab] = useState<'trends' | 'heatmap' | 'cameras'>('trends');
  const [isChartExpanded, setIsChartExpanded] = useState<boolean>(false);
  const [isJourneyModalOpen, setIsJourneyModalOpen] = useState<boolean>(false);
  const [storedJourneysCount, setStoredJourneysCount] = useState<number>(0);

  // Synchronize stored customer journeys count from background offline store
  useEffect(() => {
    const updateCount = () => {
      setStoredJourneysCount(consumerJourneyTracker.getAllStoredJourneys().length);
    };
    updateCount();
    return consumerJourneyTracker.subscribe(updateCount);
  }, []);

  const handleUpdatePlayback = useCallback((partial: Partial<PlaybackState>) => {
    setPlayback((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleCurrentTimestampUpdate = useCallback((timeStr: string) => {
    setCurrentTimestampStr(timeStr);
  }, []);

  const handleJumpToAlert = useCallback((alert: SecurityAlert) => {
    if (alert.cameraId) {
      surveillanceAudio.playCameraSwitch();
      setSelectedCameraId(alert.cameraId);
      setLayoutMode('single');
      // Scroll to camera viewport smoothly
      const consoleEl = document.getElementById('surveillance-console');
      if (consoleEl) {
        consoleEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, []);

  // Telemetry Counters
  const [telemetry, setTelemetry] = useState<SystemTelemetry>({
    footfallTotal: 142,
    activeShoppers: 6,
    highRiskSuspects: 1,
    theftsPrevented: 3,
    bandwidthMbps: 18.4,
    serverFps: 60.0,
    systemHealth: 'OPTIMAL',
    securityGateAlarming: false,
  });

  const audienceManagerRef = useRef<AudienceManager | null>(null);

  // New alert receiver callback
  const handleNewAlert = useCallback((alert: SecurityAlert) => {
    setAlerts((prev) => [alert, ...prev.slice(0, 29)]);
    if (alert.severity === 'critical') {
      setIsAlarmActive(true);
      if (!isMuted) {
        surveillanceAudio.startAlarm();
      }
      setSelectedCameraId('cam4');
      setLayoutMode('single');
      setTelemetry((prev) => ({
        ...prev,
        theftsPrevented: prev.theftsPrevented + 1,
      }));
    } else if (alert.severity === 'warning') {
      if (!isMuted) {
        surveillanceAudio.playTelemetryChirp();
      }
      setTelemetry((prev) => ({
        ...prev,
        highRiskSuspects: prev.highRiskSuspects + 1,
      }));
    }
  }, [isMuted]);

  // Update agents from 3D scene loop
  const handleAgentsUpdate = useCallback((liveAgents: ShopperAgent[]) => {
    setAgents(liveAgents);
    setTelemetry((prev) => ({
      ...prev,
      activeShoppers: liveAgents.length,
      highRiskSuspects: liveAgents.filter((a) => a.isThief || a.riskScore > 60).length,
    }));
  }, []);

  // Trigger manual theft run
  const triggerTheft = () => {
    if (audienceManagerRef.current) {
      audienceManagerRef.current.triggerTheftScenario();
    }
  };

  const dismissAlarm = () => {
    setIsAlarmActive(false);
    surveillanceAudio.stopAlarm();
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      surveillanceAudio.stopAlarm();
    }
  };

  // Generate and download summarized surveillance PDF report
  const handleExportPdf = useCallback(() => {
    surveillanceAudio.playTelemetryChirp();
    generateSurveillancePdfReport(alerts, telemetry, agents.length, agents);
  }, [alerts, telemetry, agents]);

  return (
    <div
      className={`min-h-screen w-full font-sans flex flex-col antialiased transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* ========================================================= */}
      {/* 1. TOP STICKY NAVIGATION BAR                              */}
      {/* ========================================================= */}
      <header
        className={`sticky top-0 z-40 w-full px-4 sm:px-6 py-2.5 backdrop-blur-md border-b flex items-center justify-between transition-colors duration-200 ${
          isDark
            ? 'bg-slate-950/95 border-slate-800 shadow-md text-slate-100'
            : 'bg-white/95 border-slate-200 shadow-sm text-slate-900'
        }`}
      >
        {/* Brand / Center Title */}
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl transition-all ${
              isAlarmActive
                ? 'bg-red-500/20 text-red-400 border border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse'
                : isDark
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'bg-sky-50 text-sky-600 border border-sky-200'
            }`}
          >
            <ShieldAlert size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-sm sm:text-base font-bold tracking-tight font-mono ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                APEX SENTINEL AI
              </span>
              <span className={`hidden md:inline font-mono text-xs ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                |
              </span>
              <span
                className={`hidden md:inline text-xs font-mono font-medium ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                SURVEILLANCE & RETAIL INTELLIGENCE
              </span>
              {isAlarmActive && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-600 text-white animate-pulse">
                  ALARM ACTIVE
                </span>
              )}
            </div>
            <div
              className={`text-[10.5px] font-mono flex items-center gap-2 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-emerald-500 font-bold">LIVE CCTV STREAM</span>
              </span>
              <span>•</span>
              <span className="hidden sm:inline">Facility: {selectedFacility.split('-')[0].trim()}</span>
            </div>
          </div>
        </div>

        {/* Center / Right Quick Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 font-mono text-xs">
          {/* Theme Mode Switcher: Command Center (Dark) vs. Report (Light) */}
          <ThemeSwitcher />

          {/* Header Demographics Compact Badge (Zero hover flicker, fixed size, smooth tooltip) */}
          <div className="hidden xl:block">
            <DemographicBreakdownDisplay
              agents={agents}
              totalFootfall={telemetry.footfallTotal + agents.length}
            />
          </div>

          {/* Diagnostics badges */}
          <div
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
            }`}
          >
            <Cpu size={12} className={isDark ? 'text-sky-400' : 'text-sky-600'} />
            <span>60.0 FPS</span>
          </div>

          <div
            className={`hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
            }`}
          >
            <Radio size={12} className="text-emerald-500 animate-pulse" />
            <span>18.4 MBPS</span>
          </div>

          {/* Audio Mute Toggle */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute Security Siren SFX' : 'Mute Security Audio'}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isMuted
                ? isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-500'
                  : 'bg-slate-100 border-slate-200 text-slate-400'
                : isDark
                ? 'bg-slate-900 border-slate-800 text-sky-400 hover:text-white hover:border-slate-700'
                : 'bg-slate-50 border-slate-200 text-sky-600 hover:text-sky-700 hover:bg-slate-100 shadow-xs'
            }`}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          {/* Export PDF Report */}
          <button
            onClick={handleExportPdf}
            title="Download summarized PDF audit report of incidents and footfall"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition cursor-pointer shadow-[0_0_12px_rgba(2,132,199,0.3)] border border-sky-400 text-xs"
          >
            <Download size={13} />
            <span className="hidden sm:inline">REPORT</span>
            <span>PDF</span>
          </button>

          {/* Offline Customer Journey Warehouse Modal */}
          <button
            onClick={() => {
              surveillanceAudio.playTelemetryChirp();
              setIsJourneyModalOpen(true);
            }}
            title="Open stored consumer buying behavior and waypoint trajectories repository"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer border text-xs shadow-xs ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border-cyan-500/40'
                : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300'
            }`}
          >
            <Database size={13} className={isDark ? 'text-cyan-400' : 'text-cyan-700'} />
            <span className="hidden sm:inline">JOURNEYS</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] border ${
                isDark
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                  : 'bg-white text-cyan-800 border-cyan-200 shadow-xs'
              }`}
            >
              {storedJourneysCount}
            </span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. MAIN STRUCTURED DASHBOARD CONTENT CONTAINER            */}
      {/* ========================================================= */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 space-y-6 sm:space-y-8">
        {/* ======================================================= */}
        {/* SECTION 1 & 2: CONTEXTUAL HEADER & GLOBAL CONTROLS      */}
        {/* ======================================================= */}
        <section
          className={`rounded-2xl p-4 sm:p-5 border transition-colors duration-200 space-y-4 ${
            isDark
              ? 'bg-slate-900/60 border-slate-800 shadow-lg'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    isDark
                      ? 'bg-sky-950/80 text-sky-400 border-sky-800/60'
                      : 'bg-sky-50 text-sky-700 border-sky-200'
                  }`}
                >
                  Facility Surveillance Console
                </span>
                <span
                  className={`text-xs font-mono hidden sm:inline ${
                    isDark ? 'text-slate-500' : 'text-slate-500'
                  }`}
                >
                  • System Active 24/7
                </span>
              </div>
              <h1
                className={`text-lg sm:text-2xl font-bold tracking-tight mt-1 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Live Retail Surveillance & AI Threat Intelligence
              </h1>
              <p
                className={`text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Continuous 3D multi-camera surveillance, automated shoplifting detection, demographic estimation,
                and high-fidelity customer trajectory analytics for store security and operational excellence.
              </p>
            </div>

            {/* Simulated Alarm Trigger & Clear Buttons */}
            <div className="flex items-center gap-2 self-start md:self-auto font-mono text-xs">
              <button
                onClick={triggerTheft}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold border border-red-400 shadow-sm transition cursor-pointer active:scale-95"
                title="Simulate shoplifting concealment and EAS exit breach scenario"
              >
                <AlertTriangle size={13} className="text-white" />
                <span>TEST THEFT EVENT</span>
              </button>

              {isAlarmActive && (
                <button
                  onClick={dismissAlarm}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold border transition cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-xs'
                  }`}
                >
                  <CheckCircle size={13} className="text-emerald-500" />
                  <span>DISMISS ALARM</span>
                </button>
              )}
            </div>
          </div>

          {/* Global Filter Bar */}
          <div
            className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${
              isDark ? 'border-slate-800/80' : 'border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Facility Selector */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-800 shadow-xs'
                }`}
              >
                <Building2 size={13} className={isDark ? 'text-sky-400' : 'text-sky-600'} />
                <span className={isDark ? 'text-slate-400 hidden sm:inline' : 'text-slate-500 hidden sm:inline'}>
                  Facility:
                </span>
                <select
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  className={`bg-transparent font-medium focus:outline-none cursor-pointer ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  <option value="Store #104 - Metro Flagship Supermarket" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                    Store #104 - Metro Flagship Supermarket
                  </option>
                  <option value="Store #105 - West End Grocery" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                    Store #105 - West End Grocery
                  </option>
                  <option value="Store #108 - Downtown Express" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                    Store #108 - Downtown Express
                  </option>
                </select>
              </div>

              {/* Time Range / Shift Filter */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-800 shadow-xs'
                }`}
              >
                <Clock size={13} className="text-emerald-500" />
                <span className={isDark ? 'text-slate-400 hidden sm:inline' : 'text-slate-500 hidden sm:inline'}>
                  Shift:
                </span>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className={`bg-transparent font-medium focus:outline-none cursor-pointer ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  <option value="Current Shift (Live)" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                    Current Shift (Live 60m)
                  </option>
                  <option value="Morning Shift (06:00 - 14:00)" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                    Morning Shift (06:00 - 14:00)
                  </option>
                  <option value="Peak Evening Rush (17:00 - 21:00)" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                    Peak Evening Rush (17:00 - 21:00)
                  </option>
                  <option value="Full 24-Hour Historical" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                    Full 24-Hour Historical
                  </option>
                </select>
              </div>

              {/* Department Zone Filter */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-800 shadow-xs'
                }`}
              >
                <Filter size={13} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                <span className={isDark ? 'text-slate-400 hidden sm:inline' : 'text-slate-500 hidden sm:inline'}>
                  Zone:
                </span>
                <select
                  value={selectedZoneFilter}
                  onChange={(e) => setSelectedZoneFilter(e.target.value)}
                  className={`bg-transparent font-medium focus:outline-none cursor-pointer ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  <option value="ALL" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>All Facility Departments</option>
                  <option value="ENTRANCE_PORTAL" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>South Ingress Portal</option>
                  <option value="PRODUCE_FRESH" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Produce & Bakery</option>
                  <option value="AISLE_GROCERY_01" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Aisle 01 Pantry</option>
                  <option value="AISLE_ELECTRONICS_02" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Aisle 02 Electronics (High-Value)</option>
                  <option value="AISLE_SNACKS_03" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Aisle 03 Snacks & Beverages</option>
                  <option value="POS_CHECKOUT" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>POS Checkout Lanes</option>
                  <option value="EAS_EXIT_PORTAL" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>EAS Security Exit Gate</option>
                </select>
              </div>
            </div>

            {/* Quick Section Navigation Jump Links */}
            <div className={`hidden lg:flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className="text-[10.5px]">Jump to:</span>
              <a href="#kpi-section" className="hover:text-sky-500 font-medium transition">KPIs</a>
              <span>•</span>
              <a href="#surveillance-console" className="hover:text-sky-500 font-medium transition">3D CCTV</a>
              <span>•</span>
              <a href="#analytics-section" className="hover:text-sky-500 font-medium transition">Analytics</a>
              <span>•</span>
              <a href="#demographics-section" className="hover:text-sky-500 font-medium transition">Demographics</a>
              <span>•</span>
              <a href="#audit-section" className="hover:text-sky-500 font-medium transition">Audit Table</a>
            </div>
          </div>
        </section>

        {/* ======================================================= */}
        {/* SECTION 3: KEY PERFORMANCE INDICATORS (KPIS) GRID       */}
        {/* ======================================================= */}
        <div id="kpi-section">
          <KpiMetricsGrid
            telemetry={telemetry}
            agents={agents}
            alerts={alerts}
          />
        </div>

        {/* ======================================================= */}
        {/* SECTION 4: LIVE 3D MULTI-CAMERA SURVEILLANCE CONSOLE     */}
        {/* ======================================================= */}
        <section id="surveillance-console" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className={`p-1 rounded border ${
                    isDark
                      ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                      : 'bg-sky-50 border-sky-200 text-sky-700'
                  }`}
                >
                  <Video size={15} />
                </div>
                <h2
                  className={`text-base sm:text-lg font-bold ${
                    isDark ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  Live 3D Multi-Camera Surveillance Stream
                </h2>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                4K Ultra-HD zonal feeds with computer vision bounding boxes, automated theft detection, and DVR replay.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={isDark ? 'text-slate-400 hidden sm:inline' : 'text-slate-500 hidden sm:inline'}>
                Active Angle:
              </span>
              <span
                className={`px-2 py-0.5 rounded font-bold border ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-sky-300'
                    : 'bg-white border-slate-200 text-sky-700 shadow-xs'
                }`}
              >
                {CAMERA_CONFIGS.find((c) => c.id === selectedCameraId)?.name || 'Multi-Cam Quad'}
              </span>
            </div>
          </div>

          {/* 3D WebGL Multi-Viewport Console Viewport */}
          <div
            className={`w-full rounded-2xl overflow-hidden border shadow-2xl flex flex-col ${
              isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-300 bg-slate-950'
            }`}
          >
            <div className="w-full h-[400px] sm:h-[480px] lg:h-[540px] relative">
              <CameraViewport
                selectedCameraId={selectedCameraId}
                onSelectCamera={(id) => setSelectedCameraId(id)}
                layoutMode={layoutMode}
                onChangeLayout={(mode) => setLayoutMode(mode)}
                visionMode={visionMode}
                onChangeVisionMode={(mode) => setVisionMode(mode)}
                isAlarmActive={isAlarmActive}
                onAgentsUpdate={handleAgentsUpdate}
                audienceManagerRef={audienceManagerRef}
                playback={playback}
                onUpdatePlayback={handleUpdatePlayback}
                onCurrentTimestampUpdate={handleCurrentTimestampUpdate}
                onOpenHeatmap={() => {
                  setAnalyticsTab('heatmap');
                  const el = document.getElementById('analytics-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                onNewAlert={handleNewAlert}
              />
            </div>

            {/* DVR Scrubber Bar Attached to Console Bottom */}
            <div className={`border-t ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-300 bg-slate-900'}`}>
              <TimelinePlaybackBar
                playback={playback}
                onUpdatePlayback={handleUpdatePlayback}
                alerts={alerts}
                currentTimestampStr={currentTimestampStr}
                onJumpToAlert={handleJumpToAlert}
              />
            </div>
          </div>
        </section>

        {/* ======================================================= */}
        {/* SECTION 5: ADVANCED ANALYTICAL VISUALIZATIONS SECTION   */}
        {/* ======================================================= */}
        <section id="analytics-section" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className={`p-1 rounded border ${
                    isDark
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}
                >
                  <TrendingUp size={15} />
                </div>
                <h2
                  className={`text-base sm:text-lg font-bold ${
                    isDark ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  Spatial Dynamics & Longitudinal Trend Analytics
                </h2>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Longitudinal footfall-to-alert comparisons, density heatmap canvas overlays, and camera optics diagnostics.
              </p>
            </div>

            {/* Analytics Tab Selector */}
            <div
              className={`flex items-center gap-1 p-1 rounded-lg border text-xs font-mono ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/70 border-slate-300'
              }`}
            >
              <button
                onClick={() => {
                  surveillanceAudio.playTelemetryChirp();
                  setAnalyticsTab('trends');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                  analyticsTab === 'trends'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp size={13} />
                <span>60-MIN TREND (D3.js)</span>
              </button>

              <button
                onClick={() => {
                  surveillanceAudio.playTelemetryChirp();
                  setAnalyticsTab('heatmap');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                  analyticsTab === 'heatmap'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Flame size={13} className={analyticsTab === 'heatmap' ? 'text-white' : 'text-amber-500'} />
                <span>STORE DENSITY HEATMAP</span>
              </button>

              <button
                onClick={() => {
                  surveillanceAudio.playTelemetryChirp();
                  setAnalyticsTab('cameras');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                  analyticsTab === 'cameras'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Video size={13} />
                <span>CAMERA STATUS (4)</span>
              </button>
            </div>
          </div>

          {/* Active Analytics Tab Content */}
          <div>
            {analyticsTab === 'trends' ? (
              <TrendAnalyticsChart
                alerts={alerts}
                telemetry={telemetry}
                activeCount={agents.length}
                isExpanded={isChartExpanded}
                onToggleExpand={() => setIsChartExpanded(!isChartExpanded)}
              />
            ) : analyticsTab === 'heatmap' ? (
              <StoreDensityHeatmap
                agents={agents}
                isExpanded={isChartExpanded}
                onToggleExpand={() => setIsChartExpanded(!isChartExpanded)}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {CAMERA_CONFIGS.slice(0, 4).map((cam) => {
                  const isSelected = selectedCameraId === cam.id && layoutMode === 'single';
                  return (
                    <div
                      key={cam.id}
                      onClick={() => {
                        surveillanceAudio.playCameraSwitch();
                        setSelectedCameraId(cam.id);
                        setLayoutMode('single');
                        const el = document.getElementById('surveillance-console');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? isDark
                            ? 'bg-sky-950/40 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                            : 'bg-sky-50 border-sky-500 shadow-md ring-2 ring-sky-400/40'
                          : isDark
                          ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className={`text-xs font-bold ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                          {cam.code}
                        </span>
                        <span
                          className={`text-[9.5px] px-2 py-0.5 rounded font-bold uppercase ${
                            cam.riskRating === 'CRITICAL'
                              ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                              : cam.riskRating === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-600 border border-amber-500/30'
                              : isDark
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {cam.riskRating}
                        </span>
                      </div>

                      <div>
                        <div className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                          {cam.name}
                        </div>
                        <div className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {cam.zone}
                        </div>
                      </div>

                      <div
                        className={`pt-2 border-t font-mono text-[10.5px] space-y-0.5 ${
                          isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className="flex justify-between">
                          <span>Lens:</span>
                          <span className={isDark ? 'text-slate-200' : 'text-slate-800 font-medium'}>
                            {cam.lens}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Resolution:</span>
                          <span className={isDark ? 'text-slate-200' : 'text-slate-800 font-medium'}>
                            {cam.resolution}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>FPS:</span>
                          <span className="text-emerald-500 font-bold">{cam.fps} FPS</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ======================================================= */}
        {/* SECTION 6: DEMOGRAPHICS & AUDIENCE ANALYSIS             */}
        {/* ======================================================= */}
        <div id="demographics-section">
          <DemographicsSection
            agents={agents}
            totalFootfall={telemetry.footfallTotal + agents.length}
          />
        </div>

        {/* ======================================================= */}
        {/* SECTION 7: DETAILED AUDIT TABLE & AI THREAT GUIDANCE    */}
        {/* ======================================================= */}
        <section id="audit-section" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Security Incident Audit Table (8 cols on lg) */}
            <div className="lg:col-span-8">
              <SecurityAuditTable
                alerts={alerts}
                onSelectAlert={handleJumpToAlert}
                onJumpToCamera={(camId) => {
                  setSelectedCameraId(camId);
                  setLayoutMode('single');
                  const el = document.getElementById('surveillance-console');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            </div>

            {/* Right Column: AI Guidance & Active Threat Panel (4 cols on lg) */}
            <div
              className={`lg:col-span-4 h-[620px] rounded-xl overflow-hidden border shadow-xl ${
                isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white shadow-sm'
              }`}
            >
              <AiGuidancePanel
                alerts={alerts}
                agents={agents}
                onTriggerTheft={triggerTheft}
                onSelectCamera={(camId) => {
                  setSelectedCameraId(camId);
                  setLayoutMode('single');
                  const el = document.getElementById('surveillance-console');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                selectedCameraId={selectedCameraId}
                isAlarmActive={isAlarmActive}
                onDismissAlarm={dismissAlarm}
                onExportPdf={handleExportPdf}
                onOpenJourneyModal={() => setIsJourneyModalOpen(true)}
                onOpenHeatmap={() => {
                  setAnalyticsTab('heatmap');
                  const el = document.getElementById('analytics-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            </div>
          </div>
        </section>

        {/* ======================================================= */}
        {/* SECTION 8: EXPLANATIONS, DEFINITIONS & SPECIFICATIONS   */}
        {/* ======================================================= */}
        <div id="definitions">
          <AnalyticsContextCard />
        </div>
      </main>

      {/* ========================================================= */}
      {/* 9. GLOBAL SYSTEM FOOTER                                   */}
      {/* ========================================================= */}
      <footer
        className={`w-full border-t py-4 px-4 sm:px-6 lg:px-8 text-xs font-mono flex flex-col sm:flex-row items-center justify-between gap-2 mt-8 transition-colors duration-200 ${
          isDark
            ? 'border-slate-800 bg-slate-950 text-slate-500'
            : 'border-slate-200 bg-white text-slate-600 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className={isDark ? 'text-slate-400' : 'text-slate-800 font-semibold'}>
            APEX SENTINEL AI • ENTERPRISE RETAIL LOSS PREVENTION
          </span>
        </div>
        <div className={`flex items-center gap-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          <span>Version: 3.4.2-PROD</span>
          <span>•</span>
          <span>Edge Model: Vision-KDE v2</span>
          <span>•</span>
          <span className="text-emerald-500 font-bold">Status: Verified Clean</span>
        </div>
      </footer>

      {/* Offline Consumer Buying Behavior & Inside Map Trajectory Data Warehouse Modal */}
      <CustomerJourneyModal
        isOpen={isJourneyModalOpen}
        onClose={() => setIsJourneyModalOpen(false)}
      />
    </div>
  );
}
