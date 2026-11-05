'use client';

import React from 'react';
import {
  Users,
  Activity,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Info,
} from 'lucide-react';
import { SystemTelemetry, ShopperAgent, SecurityAlert } from './types';
import { useTheme } from '@/lib/theme-context';

interface KpiMetricsGridProps {
  telemetry: SystemTelemetry;
  agents: ShopperAgent[];
  alerts: SecurityAlert[];
  className?: string;
}

interface KpiCardData {
  id: string;
  name: string;
  value: string | number;
  unit: string;
  comparisonText: string;
  changeType: 'positive' | 'negative' | 'neutral' | 'warning';
  explanation: string;
  icon: React.ReactNode;
  accentColor: string;
  badgeBg: string;
}

export const KpiMetricsGrid: React.FC<KpiMetricsGridProps> = ({
  telemetry,
  agents,
  alerts,
  className = '',
}) => {
  const { isDark } = useTheme();

  const totalFootfall = telemetry.footfallTotal + agents.length;
  const activeCount = agents.length;
  const highRiskCount = agents.filter((a) => a.riskScore > 50 || a.isThief).length;
  const criticalAlertsCount = alerts.filter((a) => a.severity === 'critical').length;
  const maxCapacity = 50;
  const occupancyPct = Math.min(100, Math.round((activeCount / maxCapacity) * 100));

  const kpis: KpiCardData[] = [
    {
      id: 'footfall',
      name: 'Total Store Footfall',
      value: totalFootfall.toLocaleString(),
      unit: 'shoppers today',
      comparisonText: '+14.2% vs previous hour',
      changeType: 'positive',
      explanation: 'Cumulative store entries verified through South Ingress turnstiles.',
      icon: <Users size={18} className={isDark ? 'text-sky-400' : 'text-sky-600'} />,
      accentColor: isDark ? 'text-sky-400' : 'text-slate-900',
      badgeBg: isDark
        ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
        : 'bg-sky-50 text-sky-700 border-sky-200',
    },
    {
      id: 'occupancy',
      name: 'Real-Time Floor Occupancy',
      value: activeCount,
      unit: 'shoppers active',
      comparisonText: `${occupancyPct}% of safe floor capacity`,
      changeType: occupancyPct > 80 ? 'warning' : 'neutral',
      explanation: 'Simultaneous customers tracked in 3D WebGL multi-camera viewports.',
      icon: <Activity size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />,
      accentColor: isDark ? 'text-emerald-400' : 'text-slate-900',
      badgeBg: occupancyPct > 80
        ? isDark
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          : 'bg-amber-50 text-amber-700 border-amber-200'
        : isDark
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'risk_anomalies',
      name: 'Security Risk Anomalies',
      value: highRiskCount,
      unit: 'flagged profiles',
      comparisonText:
        highRiskCount > 0 ? `${criticalAlertsCount} critical alarm trips` : 'Zero critical threats on floor',
      changeType: highRiskCount > 0 ? 'warning' : 'positive',
      explanation: 'AI behavioral scoring evaluating shelf concealment and loitering.',
      icon: <AlertTriangle size={18} className={isDark ? 'text-amber-400' : 'text-amber-600'} />,
      accentColor: highRiskCount > 0
        ? (isDark ? 'text-amber-400' : 'text-amber-600')
        : (isDark ? 'text-slate-100' : 'text-slate-900'),
      badgeBg: highRiskCount > 0
        ? isDark
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          : 'bg-amber-50 text-amber-700 border-amber-200'
        : isDark
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'thefts_prevented',
      name: 'Thefts Intercepted',
      value: telemetry.theftsPrevented,
      unit: 'apprehensions',
      comparisonText: '$349.50 secured inventory',
      changeType: 'positive',
      explanation: 'Automated RF EAS exit gate interdictions avoiding merchandise loss.',
      icon: <ShieldCheck size={18} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />,
      accentColor: isDark ? 'text-cyan-400' : 'text-slate-900',
      badgeBg: isDark
        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
        : 'bg-cyan-50 text-cyan-700 border-cyan-200',
    },
    {
      id: 'conversion_velocity',
      name: 'Checkout Conversion Rate',
      value: '78.5%',
      unit: 'transaction rate',
      comparisonText: '+4.2% vs target shift baseline',
      changeType: 'positive',
      explanation: 'Proportion of entrants successfully completing POS cashier checkout.',
      icon: <TrendingUp size={18} className={isDark ? 'text-purple-400' : 'text-purple-600'} />,
      accentColor: isDark ? 'text-purple-400' : 'text-slate-900',
      badgeBg: isDark
        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
        : 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      id: 'avg_dwell',
      name: 'Avg In-Store Dwell',
      value: '54s',
      unit: 'average duration',
      comparisonText: 'Within optimal 45s-90s window',
      changeType: 'neutral',
      explanation: 'Mean transit duration from ingress portal to POS checkout egress.',
      icon: <Clock size={18} className={isDark ? 'text-slate-300' : 'text-slate-600'} />,
      accentColor: isDark ? 'text-slate-200' : 'text-slate-900',
      badgeBg: isDark
        ? 'bg-slate-800 text-slate-300 border-slate-700'
        : 'bg-slate-100 text-slate-700 border-slate-200',
    },
  ];

  return (
    <section className={`space-y-2 ${className}`}>
      {/* Visual Subtitle / Heading */}
      <div className="flex items-center justify-between px-1">
        <div className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider ${
          isDark ? 'text-slate-400' : 'text-slate-600'
        }`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold">Operational Key Performance Indicators (KPIs)</span>
        </div>
        <span className={`text-[11px] font-mono hidden sm:inline ${
          isDark ? 'text-slate-500' : 'text-slate-500'
        }`}>
          Live Facility Telemetry • Updated Continuous
        </span>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className={`group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border transition-all duration-200 ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-sm'
            }`}
            style={{ minHeight: '136px' }}
          >
            {/* Top row: Metric Name & Icon */}
            <div className="flex items-start justify-between gap-2">
              <span className={`text-xs font-medium leading-tight ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {kpi.name}
              </span>
              <div className={`flex-none p-1.5 rounded-lg border transition-colors ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800/80 group-hover:border-slate-700'
                  : 'bg-slate-50 border-slate-200 group-hover:border-slate-300'
              }`}>
                {kpi.icon}
              </div>
            </div>

            {/* Middle row: Primary Value & Unit */}
            <div className="my-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight tabular-nums ${kpi.accentColor}`}>
                  {kpi.value}
                </span>
                <span className={`text-[11px] font-mono truncate ${
                  isDark ? 'text-slate-500' : 'text-slate-500'
                }`}>
                  {kpi.unit}
                </span>
              </div>
            </div>

            {/* Bottom row: Comparison Badge & Short Description */}
            <div className={`pt-2 border-t flex items-center justify-between text-[10.5px] font-mono ${
              isDark ? 'border-slate-800/60' : 'border-slate-100'
            }`}>
              <span
                className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold flex items-center gap-1 ${kpi.badgeBg}`}
              >
                {kpi.changeType === 'positive' ? (
                  <ArrowUpRight size={11} />
                ) : kpi.changeType === 'warning' ? (
                  <AlertTriangle size={11} />
                ) : kpi.changeType === 'negative' ? (
                  <ArrowDownRight size={11} />
                ) : (
                  <Minus size={11} />
                )}
                <span className="truncate max-w-[140px]">{kpi.comparisonText}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
