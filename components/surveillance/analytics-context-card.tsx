'use client';

import React, { useState } from 'react';
import { useTheme } from '@/lib/theme-context';
import {
  HelpCircle,
  ShieldCheck,
  Cpu,
  Lock,
  ChevronDown,
  Info,
  Server,
  Layers,
  Database,
} from 'lucide-react';

export const AnalyticsContextCard: React.FC = () => {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const definitions = [
    {
      term: 'Footfall Total',
      desc: 'Cumulative number of verified unique ingress events traversing the South Ingress Portal turnstiles during the active monitoring cycle.',
    },
    {
      term: 'Risk Anomaly Score (0-100%)',
      desc: 'Algorithmic composite of dwell time in high-shrinkage departments (electronics, luxury goods), erratic trajectory vectors, concealment motion signatures, and checkout bypass trajectories.',
    },
    {
      term: 'Kernel Density Estimation (KDE)',
      desc: 'Non-parametric density estimation smoothing individual 3D coordinate waypoints into continuous spatial heat contours, distinguishing ambient dwell from rapid transit corridors.',
    },
    {
      term: 'EAS Chokepoint Interception',
      desc: 'Electronic Article Surveillance acoustic/RF gate sensor tripped at the primary exit threshold, triggering automated door locking and CCTV freeze-frame evidence archiving.',
    },
    {
      term: 'Automated Demographic Inference',
      desc: 'Statistical classification based on bodily proportions and gait estimation. Aggregated strictly for store operations and category allocation without storing private biometric IDs.',
    },
  ];

  return (
    <div
      className={`rounded-xl overflow-hidden border transition-colors duration-200 font-sans ${
        isDark
          ? 'bg-slate-900/60 border-slate-800 shadow-lg'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-colors select-none ${
          isDark ? 'hover:bg-slate-900/90' : 'hover:bg-slate-50/80'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-1.5 rounded-lg border ${
              isDark
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                : 'bg-sky-50 border-sky-200 text-sky-700'
            }`}
          >
            <HelpCircle size={16} />
          </div>
          <div>
            <h3
              className={`text-sm sm:text-base font-bold flex items-center gap-2 ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              <span>Metric Definitions, Surveillance Specifications & Data Context</span>
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Standard operating definitions, ethical privacy compliance, and edge AI architecture specifications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono hidden sm:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isExpanded ? 'Collapse Reference' : 'Expand Details'}
          </span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            } ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isExpanded && (
        <div
          className={`p-4 sm:p-5 pt-0 border-t space-y-4 font-mono text-xs animate-in fade-in-50 duration-200 ${
            isDark ? 'border-slate-800/80' : 'border-slate-200'
          }`}
        >
          {/* Term Definitions Grid */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {definitions.map((def) => (
              <div
                key={def.term}
                className={`p-3 rounded-lg border space-y-1 ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-slate-50 border-slate-200 shadow-xs'
                }`}
              >
                <div className={`font-bold text-xs ${isDark ? 'text-sky-300' : 'text-sky-800'}`}>
                  {def.term}
                </div>
                <p className={`text-[11px] font-sans leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {def.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Privacy & Hardware Standards Notice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div
              className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                isDark
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-emerald-50 border-emerald-200 shadow-xs'
              }`}
            >
              <ShieldCheck
                size={16}
                className={`flex-none mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
              />
              <div>
                <strong
                  className={`block text-xs font-semibold ${
                    isDark ? 'text-emerald-300' : 'text-emerald-900'
                  }`}
                >
                  Privacy & Data Isolation Protocol
                </strong>
                <p
                  className={`text-[11px] font-sans mt-0.5 leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  All customer walking trajectories and waypoint maps are processed locally on the edge and aggregated into anonymized datasets. No facial photos or personal biometric identifiers are retained or transmitted.
                </p>
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800'
                  : 'bg-slate-50 border-slate-200 shadow-xs'
              }`}
            >
              <Cpu
                size={16}
                className={`flex-none mt-0.5 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}
              />
              <div>
                <strong
                  className={`block text-xs font-semibold ${
                    isDark ? 'text-sky-300' : 'text-slate-900'
                  }`}
                >
                  Hardware & Vision Pipeline Specifications
                </strong>
                <p
                  className={`text-[11px] font-sans mt-0.5 leading-relaxed ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  4× Synchronized 4K Ultra-HD IP Cameras (2.8mm to 4.0mm low-distortion optics) delivering 60 FPS real-time pose projection, 18.4 MBPS bandwidth throughput, and sub-15ms inference latency.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
