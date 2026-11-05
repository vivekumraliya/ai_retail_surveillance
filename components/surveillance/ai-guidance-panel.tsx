'use client';

import React, { useState } from 'react';
import { SecurityAlert, ShopperAgent, CameraId } from './types';
import {
  AlertTriangle,
  ShieldAlert,
  Users,
  Activity,
  Zap,
  Sparkles,
  ChevronRight,
  Eye,
  Radio,
  Clock,
  CheckCircle,
  FileText,
  UserCheck,
  Download,
  Database,
  MapPin,
  Compass,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { surveillanceAudio } from '@/lib/surveillance-audio';
import { consumerJourneyTracker } from '@/lib/consumer-journey-tracker';
import { useTheme } from '@/lib/theme-context';

interface AiGuidancePanelProps {
  alerts: SecurityAlert[];
  agents: ShopperAgent[];
  onTriggerTheft: () => void;
  onSelectCamera: (camId: CameraId) => void;
  selectedCameraId: CameraId;
  isAlarmActive: boolean;
  onDismissAlarm: () => void;
  onExportPdf?: () => void;
  onOpenJourneyModal?: () => void;
  onOpenHeatmap?: () => void;
}

export const AiGuidancePanel: React.FC<AiGuidancePanelProps> = ({
  alerts,
  agents,
  onTriggerTheft,
  onSelectCamera,
  selectedCameraId,
  isAlarmActive,
  onDismissAlarm,
  onExportPdf,
  onOpenJourneyModal,
  onOpenHeatmap,
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'guidance' | 'tracked' | 'logs' | 'journeys'>('guidance');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Derive dynamic AI suggestions based on live shoppers state
  const highRiskAgents = agents.filter((a) => a.riskScore > 50 || a.isThief);
  const loiteringAgents = agents.filter((a) => a.dwellTimeNearElectronics > 4);
  const checkoutQueued = agents.filter((a) => a.state === 'CHECKOUT_PAYING');

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <div
      className={`flex flex-col h-full rounded-xl overflow-hidden backdrop-blur-md transition-colors duration-200 border ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {/* Panel Header */}
      <div
        className={`p-3.5 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg border ${
              isDark
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                : 'bg-sky-50 border-sky-200 text-sky-700'
            }`}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <h3
              className={`text-xs font-bold tracking-wide uppercase font-mono ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              AI Vision Sentinel Core
            </h3>
            <p className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Real-Time Behavioral Analytics Engine
            </p>
          </div>
        </div>

        {/* Live Engine Pulse */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono ${
            isDark
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>NEURAL ONLINE</span>
        </div>
      </div>

      {/* Manual Shoplifting Simulation Trigger Banner */}
      <div
        className={`p-3 border-b flex items-center justify-between gap-2 ${
          isDark
            ? 'bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border-red-900/30'
            : 'bg-gradient-to-r from-red-50 via-slate-50 to-slate-50 border-red-200'
        }`}
      >
        <div>
          <div
            className={`flex items-center gap-1 text-[11px] font-mono font-bold ${
              isDark ? 'text-red-400' : 'text-red-700'
            }`}
          >
            <Zap size={13} className={isDark ? 'text-red-400' : 'text-red-600'} />
            <span>SCENARIO INJECTOR</span>
          </div>
          <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Trigger test shoplifting evasion protocol
          </p>
        </div>

        {isAlarmActive ? (
          <button
            onClick={onDismissAlarm}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all cursor-pointer animate-pulse"
          >
            DISARM SIREN
          </button>
        ) : (
          <button
            onClick={() => {
              surveillanceAudio.playTelemetryChirp();
              onTriggerTheft();
            }}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isDark
                ? 'bg-red-600/20 hover:bg-red-600/30 border-red-500/50 text-red-300'
                : 'bg-red-50 hover:bg-red-100 border-red-300 text-red-700 shadow-xs'
            }`}
          >
            <ShieldAlert size={13} />
            <span>SIMULATE THEFT</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        className={`flex border-b text-[11px] font-mono font-semibold ${
          isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-100/70'
        }`}
      >
        <button
          onClick={() => setActiveTab('guidance')}
          className={`flex-1 py-2 px-3 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'guidance'
              ? isDark
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-sky-600 text-sky-700 bg-white shadow-xs font-bold'
              : isDark
              ? 'border-transparent text-slate-400 hover:text-slate-200'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles size={12} />
          <span>SUGGESTIONS</span>
        </button>
        <button
          onClick={() => setActiveTab('tracked')}
          className={`flex-1 py-2 px-3 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'tracked'
              ? isDark
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-sky-600 text-sky-700 bg-white shadow-xs font-bold'
              : isDark
              ? 'border-transparent text-slate-400 hover:text-slate-200'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users size={12} />
          <span>TRACKED ({agents.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-2 px-2 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] ${
            activeTab === 'logs'
              ? isDark
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-sky-600 text-sky-700 bg-white shadow-xs font-bold'
              : isDark
              ? 'border-transparent text-slate-400 hover:text-slate-200'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText size={12} />
          <span>ALERTS ({alerts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('journeys')}
          className={`flex-1 py-2 px-2 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] ${
            activeTab === 'journeys'
              ? isDark
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-cyan-600 text-cyan-700 bg-white shadow-xs font-bold'
              : isDark
              ? 'border-transparent text-slate-400 hover:text-slate-200'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database size={12} />
          <span>JOURNEYS</span>
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans">
        {/* ========================================================= */}
        {/* TAB 1: SMART AI GUIDANCE & LIVE INSIGHTS                  */}
        {/* ========================================================= */}
        {activeTab === 'guidance' && (
          <div className="space-y-3">
            {/* Live Guidance Broadcast Cards */}
            <div className="space-y-2">
              <div className={`text-[10px] font-mono uppercase tracking-wider flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>Active Behavioral Predictions</span>
                <span className={`font-bold ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>LIVE STREAM</span>
              </div>

              {/* Dynamic Suggestions based on store state */}
              {highRiskAgents.length > 0 ? (
                highRiskAgents.map((agent) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      isDark
                        ? 'border-red-500/40 bg-red-950/20 text-slate-300'
                        : 'border-red-300 bg-red-50 text-slate-800 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono font-bold text-[11px]">
                      <span className={`flex items-center gap-1 ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                        <AlertTriangle size={13} className={isDark ? 'text-red-400' : 'text-red-600'} />
                        CRITICAL RISK: {agent.id}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          isDark ? 'bg-red-500/30 text-red-200' : 'bg-red-200 text-red-900'
                        }`}
                      >
                        {agent.riskScore}% PROBABILITY
                      </span>
                    </div>

                    <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {agent.hasConcealedItem
                        ? `Customer ${agent.id} concealed item into coat; currently sprinting towards Exit Gate without POS transaction!`
                        : agent.isThief
                        ? `Customer ${agent.id} showing suspicious shelf dwell time & surveillance gaze avoidance near Electronics.`
                        : `Subject exhibited abnormal dwell pattern near high-value goods.`}
                    </p>

                    <div
                      className={`flex items-center justify-between pt-1 border-t text-[10px] font-mono ${
                        isDark ? 'border-red-900/40 text-slate-400' : 'border-red-200 text-slate-600'
                      }`}
                    >
                      <span>RECOMMENDED ACTION:</span>
                      <button
                        onClick={() => onSelectCamera('cam4')}
                        className={`underline font-semibold cursor-pointer ${
                          isDark ? 'text-sky-400 hover:text-sky-300' : 'text-sky-700 hover:text-sky-800'
                        }`}
                      >
                        Intervene at Exit Zone →
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div
                  className={`p-3 rounded-lg border text-xs space-y-1 ${
                    isDark
                      ? 'border-slate-800 bg-slate-950/60 text-slate-300'
                      : 'border-slate-200 bg-slate-50 text-slate-700 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-emerald-500 font-mono font-bold text-[11px]">
                    <CheckCircle size={13} />
                    <span>STORE PERIMETER SECURE</span>
                  </div>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    No high-velocity theft anomalies detected. Neural tracking scanning all {agents.length} occupants continuously.
                  </p>
                </div>
              )}

              {/* Congestion & Shelf Insights */}
              <div
                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  isDark
                    ? 'border-sky-900/40 bg-sky-950/20 text-slate-300'
                    : 'border-sky-200 bg-sky-50 text-slate-800 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between font-mono font-semibold text-[11px]">
                  <span className={`flex items-center gap-1 ${isDark ? 'text-sky-300' : 'text-sky-800'}`}>
                    <Radio size={12} className={isDark ? 'text-sky-400' : 'text-sky-600'} />
                    ZONE TRAFFIC DENSITY
                  </span>
                  <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    CAM-02 AISLE
                  </span>
                </div>
                <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {loiteringAgents.length > 0
                    ? `Elevated customer density identified around Aisle 02 Electronics. High dwell threshold exceeded.`
                    : `Normal flow observed across Grocery and Organic corridors. Average shopping dwell: 3.4 seconds.`}
                </p>
              </div>

              {/* Billing Counter Flow Guidance */}
              <div
                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  isDark
                    ? 'border-slate-800 bg-slate-950/40 text-slate-300'
                    : 'border-slate-200 bg-slate-50 text-slate-800 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between font-mono font-semibold text-[11px]">
                  <span className={`flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    <Activity size={12} className="text-emerald-500" />
                    POS CHECKOUT STATUS
                  </span>
                  <span className="text-[10px] text-emerald-500 font-mono">LANES 1 & 2 ACTIVE</span>
                </div>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {checkoutQueued.length > 0
                    ? `${checkoutQueued.length} shopper(s) actively processing barcode payments at cashier terminals.`
                    : `No checkout queue congestion. Cashier latency nominal.`}
                </p>
              </div>
            </div>

            {/* Behavioral Indicators Checklist */}
            <div
              className={`p-3 rounded-lg border space-y-2 ${
                isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50 shadow-xs'
              }`}
            >
              <div
                className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Behavioral Indicators Monitored
              </div>
              <div className="grid grid-cols-1 gap-1 text-[11px] font-mono">
                {[
                  { name: 'Loitering near high-value shelf', status: loiteringAgents.length > 0 ? 'ALERT' : 'NORMAL' },
                  { name: 'Concealment gesture (hand-to-pocket)', status: highRiskAgents.some((a) => a.hasConcealedItem) ? 'TRIGGERED' : 'CLEAR' },
                  { name: 'Skipping billing counter zone', status: highRiskAgents.some((a) => a.isThief) ? 'SUSPECT' : 'CLEAR' },
                  { name: 'Sudden sprint toward exit portal', status: highRiskAgents.some((a) => a.state === 'SPRINT_THEFT') ? 'ACTIVE' : 'CLEAR' },
                  { name: 'Crowd formation or distraction', status: agents.length > 8 ? 'MONITORING' : 'OPTIMAL' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between py-1 px-2 rounded border ${
                      isDark
                        ? 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <span className="text-[10.5px] truncate pr-2">{item.name}</span>
                    <span
                      className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                        item.status === 'TRIGGERED' || item.status === 'ACTIVE'
                          ? isDark
                            ? 'bg-red-500/30 text-red-300 border border-red-500/40'
                            : 'bg-red-100 text-red-800 border border-red-300'
                          : item.status === 'ALERT' || item.status === 'SUSPECT'
                          ? isDark
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                          : isDark
                          ? 'bg-emerald-950 text-emerald-400'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: LIVE TRACKED SHOPPERS (AUDIENCE TELEMETRY)         */}
        {/* ========================================================= */}
        {activeTab === 'tracked' && (
          <div className="space-y-2">
            <div className={`text-[10px] font-mono uppercase flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Customer Identification Roster</span>
              <span>{agents.length} Active Persons</span>
            </div>

            <div className="space-y-1.5">
              {agents.map((agent) => {
                const isSelected = selectedAgentId === agent.id;
                const isThief = agent.isThief;
                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgentId(isSelected ? null : agent.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isThief
                        ? isDark
                          ? 'border-red-500/50 bg-red-950/20 hover:bg-red-950/30'
                          : 'border-red-300 bg-red-50 hover:bg-red-100/60 shadow-xs'
                        : isSelected
                        ? isDark
                          ? 'border-sky-500 bg-sky-950/20'
                          : 'border-sky-500 bg-sky-50 ring-1 ring-sky-400'
                        : isDark
                        ? 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                        : 'border-slate-200 bg-white hover:bg-slate-50 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isThief ? 'bg-red-500 animate-ping' : 'bg-sky-500'
                          }`}
                        />
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{agent.id}</span>
                        <span
                          className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                            isDark ? 'bg-slate-800 text-cyan-300' : 'bg-slate-100 text-cyan-800'
                          }`}
                        >
                          {agent.gender === 'M' ? 'MALE' : 'FEMALE'} • {agent.ageBracket || '26-35'} (~{agent.estimatedAge || 28}y)
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          isThief
                            ? isDark ? 'bg-red-500/30 text-red-300' : 'bg-red-100 text-red-800'
                            : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        RISK: {agent.riskScore}%
                      </span>
                    </div>

                    <p className={`text-[11px] mt-1 truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {agent.currentActionText}
                    </p>

                    {/* Expanded Detail drawer */}
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`mt-2 pt-2 border-t grid grid-cols-2 gap-1.5 text-[10px] font-mono ${
                          isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <div>
                          SPEED: <strong className={isDark ? 'text-slate-200' : 'text-slate-900'}>{agent.speed.toFixed(1)} m/s</strong>
                        </div>
                        <div>
                          BASKET: <strong className={isDark ? 'text-slate-200' : 'text-slate-900'}>{agent.itemCount} items</strong>
                        </div>
                        <div>
                          DWELL: <strong className={isDark ? 'text-slate-200' : 'text-slate-900'}>{agent.dwellTimeNearElectronics.toFixed(1)}s</strong>
                        </div>
                        <div>
                          CONCEALED: <strong className={agent.hasConcealedItem ? 'text-red-500 font-bold' : (isDark ? 'text-slate-200' : 'text-slate-900')}>
                            {agent.hasConcealedItem ? 'YES' : 'NO'}
                          </strong>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SYSTEM SECURITY LOGS                               */}
        {/* ========================================================= */}
        {activeTab === 'logs' && (
          <div className="space-y-3">
            <div
              className={`p-2.5 rounded-lg border flex items-center justify-between ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <div className={`text-[10px] font-mono uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Incident Audit Trail</div>
                <div className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{alerts.length} Detection Records</div>
              </div>

              {onExportPdf && (
                <button
                  onClick={() => {
                    surveillanceAudio.playTelemetryChirp();
                    onExportPdf();
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-mono font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(2,132,199,0.4)] border border-sky-400"
                >
                  <Download size={13} />
                  <span>EXPORT PDF</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {alerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-2.5 rounded-lg border text-xs ${
                      alert.severity === 'critical'
                        ? isDark
                          ? 'border-red-500/40 bg-red-950/20 text-red-200'
                          : 'border-red-300 bg-red-50 text-red-800'
                        : alert.severity === 'warning'
                        ? isDark
                          ? 'border-amber-500/40 bg-amber-950/20 text-amber-200'
                          : 'border-amber-300 bg-amber-50 text-amber-800'
                        : isDark
                        ? 'border-slate-800 bg-slate-950/40 text-slate-300'
                        : 'border-slate-200 bg-white text-slate-800 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {alert.timestamp}
                      </span>
                      <span className={`font-semibold ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>{alert.cameraName}</span>
                    </div>

                    <div className="font-semibold text-[11px] mb-0.5">{alert.title}</div>
                    <p className="text-[10.5px] opacity-80">{alert.description}</p>

                    {alert.indicators.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {alert.indicators.map((ind, i) => (
                          <span
                            key={i}
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                              isDark
                                ? 'bg-black/40 border-slate-700/60 text-slate-300'
                                : 'bg-slate-100 border-slate-300 text-slate-700'
                            }`}
                          >
                            {ind}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {alerts.length === 0 && (
                <div className="text-center py-8 text-xs font-mono text-slate-500">
                  No security incidents logged. Floor clean.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: CONSUMER BUYING BEHAVIOR & INSIDE MAPS (OFFLINE)   */}
        {/* ========================================================= */}
        {activeTab === 'journeys' && (
          <div className="space-y-3 font-mono">
            {/* Offline Data Notice Banner */}
            <div
              className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                isDark ? 'bg-cyan-950/40 border-cyan-800/60' : 'bg-cyan-50 border-cyan-200'
              }`}
            >
              <div className={`flex items-center justify-between font-bold ${isDark ? 'text-cyan-300' : 'text-cyan-800'}`}>
                <span className="flex items-center gap-1.5">
                  <Database size={14} className={isDark ? 'text-cyan-400' : 'text-cyan-700'} />
                  <span>OFFLINE JOURNEY DATA REPOSITORY</span>
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${
                    isDark
                      ? 'bg-amber-950 text-amber-300 border-amber-700/60'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  STORED ONLY
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed font-sans ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Customer ingress paths, shelf dwell intervals, basket events, and inside maps are recorded continuously in the background and stored for offline pattern analysis.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div
                className={`p-2.5 rounded-lg border text-center ${
                  isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className={`text-[10px] uppercase ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Stored Journeys</div>
                <div className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {consumerJourneyTracker.getAllStoredJourneys().length}
                </div>
              </div>
              <div
                className={`p-2.5 rounded-lg border text-center ${
                  isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className={`text-[10px] uppercase ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Active Trajectories</div>
                <div className="text-base font-bold text-emerald-500">
                  {consumerJourneyTracker.getActiveJourneys().length}
                </div>
              </div>
            </div>

            {/* Big Launch Archive Button */}
            {onOpenJourneyModal && (
              <button
                onClick={() => {
                  surveillanceAudio.playTelemetryChirp();
                  onOpenJourneyModal();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all cursor-pointer"
              >
                <Compass size={15} />
                <span>OPEN INSIDE MAPS & PATTERN ARCHIVE</span>
                <ChevronRight size={14} />
              </button>
            )}

            {/* Inspect Store Density Heatmap Canvas Overlay Button */}
            {onOpenHeatmap && (
              <button
                onClick={() => {
                  surveillanceAudio.playTelemetryChirp();
                  onOpenHeatmap();
                }}
                className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                  isDark
                    ? 'bg-amber-950/60 hover:bg-amber-900/60 border-amber-600/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800 shadow-xs'
                }`}
              >
                <Flame size={14} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                <span>STORE DENSITY HEATMAP (CANVAS)</span>
                <ChevronRight size={14} />
              </button>
            )}

            {/* Active In-Store Shopper Journey Preview */}
            <div className="space-y-2 pt-1">
              <div className={`text-[10px] font-mono uppercase tracking-wider flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>Active Ingress Telemetry (Live Tracking)</span>
                <span className="text-emerald-500 font-bold">ACCUMULATING</span>
              </div>

              {consumerJourneyTracker.getActiveJourneys().map((j) => (
                <div
                  key={j.id}
                  className={`p-2.5 rounded-lg border space-y-1 text-xs ${
                    isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{j.id}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded border ${
                        isDark ? 'bg-slate-900 text-cyan-300 border-slate-800' : 'bg-slate-100 text-cyan-800 border-slate-200'
                      }`}
                    >
                      {j.gender} • {j.ageBracket}
                    </span>
                  </div>
                  <div className={`flex items-center justify-between text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span>Zone: <strong className={isDark ? 'text-slate-300' : 'text-slate-800'}>{j.currentZone}</strong></span>
                    <span>Waypoints: <strong className={isDark ? 'text-cyan-400' : 'text-cyan-700'}>{j.waypoints.length}</strong></span>
                  </div>
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className={`${isDark ? 'text-amber-400' : 'text-amber-700'} font-bold`}>{j.buyingPattern.replace(/_/g, ' ')}</span>
                    <span className="text-emerald-500 font-bold">
                      {j.cartItemCount > 0 ? `$${j.cartTotalValue.toFixed(2)} (${j.cartItemCount} items)` : 'Basket empty'}
                    </span>
                  </div>
                </div>
              ))}

              {consumerJourneyTracker.getActiveJourneys().length === 0 && (
                <div className="text-center py-4 text-xs text-slate-500">
                  No active customers inside store currently.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
