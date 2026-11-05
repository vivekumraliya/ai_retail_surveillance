'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ConsumerJourneyRecord,
  ConsumerBuyingPattern,
  InsideMapWaypoint,
} from './types';
import {
  consumerJourneyTracker,
  ZONE_DEFINITIONS,
} from '@/lib/consumer-journey-tracker';
import {
  X,
  Download,
  MapPin,
  TrendingUp,
  ShoppingBag,
  Users,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  Database,
  Compass,
  FileSpreadsheet,
  FileCode,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Clock,
  DollarSign,
  Maximize2,
  Layers,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StoreDensityHeatmap } from './store-density-heatmap';
import { useTheme } from '@/lib/theme-context';

interface CustomerJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PATTERN_METADATA: Record<
  ConsumerBuyingPattern,
  { label: string; color: string; bg: string; border: string; desc: string }
> = {
  TARGETED_BUYER: {
    label: 'Targeted High-Value Shopper',
    color: 'text-sky-400',
    bg: 'bg-sky-950/80',
    border: 'border-sky-500/40',
    desc: 'High intent, concentrated dwell in premium tech or apparel, decisive purchase conversion.',
  },
  EXPLORATORY_BROWSER: {
    label: 'Exploratory Multi-Zone Browser',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-500/40',
    desc: 'Extensive store circulation, visits 3+ departments, steady basket accumulation.',
  },
  QUICK_GRAB_AND_GO: {
    label: 'Express Grab & Go',
    color: 'text-amber-400',
    bg: 'bg-amber-950/80',
    border: 'border-amber-500/40',
    desc: 'Rapid ingress-to-checkout in <35s, low dwell wandering, essentials-oriented.',
  },
  IMPULSE_SHOPPER: {
    label: 'Impulse Shopper',
    color: 'text-purple-400',
    bg: 'bg-purple-950/80',
    border: 'border-purple-500/40',
    desc: 'High reactivity to endcaps and promotional snack displays, unplanned basket additions.',
  },
  BARGAIN_COMPARISON: {
    label: 'Bargain / Comparison Hunter',
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/80',
    border: 'border-cyan-500/40',
    desc: 'Deliberate dwell duration, compares shelf labels and product tiers before finalizing.',
  },
  LOSS_PREVENTION_RISK: {
    label: 'Loss Prevention Alert / Shoplifter',
    color: 'text-red-400',
    bg: 'bg-red-950/80',
    border: 'border-red-500/50',
    desc: 'Anomalous trajectory, loitering near premium items, pocketing item, checkout bypass.',
  },
};

export const CustomerJourneyModal: React.FC<CustomerJourneyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isDark } = useTheme();
  const [journeys, setJourneys] = useState<ConsumerJourneyRecord[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'individual' | 'aggregate' | 'heatmap'>('individual');
  const [searchQuery, setSearchQuery] = useState('');
  const [patternFilter, setPatternFilter] = useState<string>('ALL');
  const [hoveredWaypoint, setHoveredWaypoint] = useState<InsideMapWaypoint | null>(null);

  // Sync with tracker singleton
  useEffect(() => {
    const update = () => {
      const stored = consumerJourneyTracker.getAllStoredJourneys();
      setJourneys(stored);
      if (stored.length > 0 && !selectedJourneyId) {
        setSelectedJourneyId(stored[0].id);
      }
    };

    update();
    const unsub = consumerJourneyTracker.subscribe(update);
    return unsub;
  }, [selectedJourneyId]);

  const metrics = useMemo(() => {
    return consumerJourneyTracker.getAggregatedMetrics(journeys);
  }, [journeys]);

  const filteredJourneys = useMemo(() => {
    return journeys.filter((j) => {
      const matchSearch =
        j.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.gender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.ageBracket.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.routeCategory.toLowerCase().includes(searchQuery.toLowerCase());

      const matchPattern =
        patternFilter === 'ALL' || j.buyingPattern === patternFilter;

      return matchSearch && matchPattern;
    });
  }, [journeys, searchQuery, patternFilter]);

  const selectedJourney = useMemo(() => {
    return (
      journeys.find((j) => j.id === selectedJourneyId) ||
      filteredJourneys[0] ||
      null
    );
  }, [journeys, selectedJourneyId, filteredJourneys]);

  // Export handlers
  const handleExportJson = () => {
    const jsonStr = consumerJourneyTracker.exportAsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex_customer_journeys_trajectory_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const csvStr = consumerJourneyTracker.exportAsCsv();
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex_consumer_buying_behavior_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetSampleData = () => {
    if (confirm('Reset stored data to baseline historical shift records?')) {
      consumerJourneyTracker.resetToSampleShiftData();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={`w-full max-w-7xl h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden font-mono ${
          isDark
            ? 'bg-slate-950 border border-slate-800 text-slate-200'
            : 'bg-white border border-slate-200 text-slate-900 shadow-2xl'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl border ${
                isDark
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-cyan-50 border-cyan-200 text-cyan-600'
              }`}
            >
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className={`text-base font-bold tracking-wide ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  CONSUMER BUYING BEHAVIOR & INSIDE MAP DATA WAREHOUSE
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                    isDark
                      ? 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  Stored Data Only • Hidden From Live CCTV
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Spatial Ingress-to-Egress Waypoint Maps, Shelf Dwell Funnel & AI Archetype Pattern Identification
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              title="Download full trajectory and buying behavior database in JSON format"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                isDark
                  ? 'bg-sky-950/80 hover:bg-sky-900 text-sky-300 border-sky-600/50'
                  : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200'
              }`}
            >
              <FileCode size={14} />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handleExportCsv}
              title="Download tabular customer metrics and patterns in CSV format for Excel/Pandas"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                isDark
                  ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-600/50'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}
            >
              <FileSpreadsheet size={14} />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleResetSampleData}
              title="Reset to default shift dataset"
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
              }`}
            >
              <RotateCcw size={15} />
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ml-1 ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Global Dataset Metrics Banner */}
        <div
          className={`px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/70 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Users size={14} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Total Journeys Stored:</span>
              <strong className={`text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{metrics.totalJourneys}</strong>
            </div>

            <div className="flex items-center gap-2">
              <Clock size={14} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Avg Store Dwell:</span>
              <strong className={isDark ? 'text-emerald-300' : 'text-emerald-700'}>{metrics.avgDurationSec}s</strong>
            </div>

            <div className="flex items-center gap-2">
              <Compass size={14} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Avg Trajectory Path:</span>
              <strong className={isDark ? 'text-amber-300' : 'text-amber-700'}>{metrics.avgPathLengthM}m</strong>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className={isDark ? 'text-sky-400' : 'text-sky-600'} />
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Checkout Conversion:</span>
              <strong className={isDark ? 'text-sky-300' : 'text-sky-700'}>{metrics.conversionRate}%</strong>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign size={14} className={isDark ? 'text-purple-400' : 'text-purple-600'} />
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Avg Basket Spend:</span>
              <strong className={isDark ? 'text-purple-300' : 'text-purple-700'}>${metrics.avgBasketValue.toFixed(2)}</strong>
            </div>
          </div>

          {/* Navigation view tabs */}
          <div
            className={`flex items-center gap-1 p-0.5 rounded-lg border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/70 border-slate-300'
            }`}
          >
            <button
              onClick={() => setActiveTab('individual')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'individual'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inside Map & Customer Profiles
            </button>
            <button
              onClick={() => setActiveTab('aggregate')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'aggregate'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pattern Distribution & Matrix
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'heatmap'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame size={12} className={activeTab === 'heatmap' ? 'text-amber-200' : 'text-amber-500'} />
              <span>Density Heatmap</span>
            </button>
          </div>
        </div>

        {/* Main Body */}
        {activeTab === 'individual' ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Column: Customer Directory & Search Filters */}
            <div
              className={`w-full md:w-80 lg:w-96 border-r flex flex-col ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              {/* Search & Pattern Filter */}
              <div
                className={`p-3 border-b space-y-2 ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}
              >
                <div className="relative">
                  <Search size={14} className={`absolute left-2.5 top-2.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    placeholder="Search Customer ID, gender, route..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-cyan-500 ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  <span className={`font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Filter:</span>
                  <select
                    value={patternFilter}
                    onChange={(e) => setPatternFilter(e.target.value)}
                    className={`rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500 border ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="ALL">All Patterns ({journeys.length})</option>
                    <option value="TARGETED_BUYER">Targeted High-Value</option>
                    <option value="EXPLORATORY_BROWSER">Exploratory Browser</option>
                    <option value="QUICK_GRAB_AND_GO">Express Grab & Go</option>
                    <option value="IMPULSE_SHOPPER">Impulse Shopper</option>
                    <option value="BARGAIN_COMPARISON">Bargain Hunter</option>
                    <option value="LOSS_PREVENTION_RISK">Loss Prevention Risk</option>
                  </select>
                </div>
              </div>

              {/* Customer List */}
              <div
                className={`flex-1 overflow-y-auto divide-y p-1 ${
                  isDark ? 'divide-slate-900' : 'divide-slate-200'
                }`}
              >
                {filteredJourneys.map((j) => {
                  const isSelected = selectedJourney?.id === j.id;
                  const patternMeta = PATTERN_METADATA[j.buyingPattern] || PATTERN_METADATA.EXPLORATORY_BROWSER;

                  return (
                    <div
                      key={j.id}
                      onClick={() => setSelectedJourneyId(j.id)}
                      className={`p-3 rounded-xl transition-all cursor-pointer m-1 ${
                        isSelected
                          ? isDark
                            ? 'bg-cyan-950/40 border border-cyan-500/50 shadow-md'
                            : 'bg-cyan-50 border border-cyan-300 shadow-xs'
                          : isDark
                          ? 'hover:bg-slate-900/60 border border-transparent'
                          : 'hover:bg-slate-100/80 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <strong className={`font-bold text-xs ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                            {j.id}
                          </strong>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded border ${
                              isDark
                                ? 'bg-slate-900 text-slate-400 border-slate-800'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {j.gender} • {j.ageBracket}
                          </span>
                        </div>
                        <span
                          className={`text-[9.5px] px-2 py-0.5 rounded font-bold uppercase ${
                            j.conversionOutcome === 'PURCHASED'
                              ? isDark
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/40'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                              : j.conversionOutcome === 'THEFT'
                              ? isDark
                                ? 'bg-red-950 text-red-400 border border-red-600/40'
                                : 'bg-red-50 text-red-700 border border-red-300'
                              : isDark
                              ? 'bg-slate-900 text-slate-400 border border-slate-800'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {j.conversionOutcome}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 mb-1">
                        <span className={`text-[10.5px] font-bold ${patternMeta.color}`}>
                          {patternMeta.label}
                        </span>
                      </div>

                      <div
                        className={`flex items-center justify-between text-[10.5px] ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        <span>Time: {Math.round(j.durationSeconds)}s • Path: {j.pathLengthMeters.toFixed(1)}m</span>
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                          {j.cartItemCount > 0 ? `$${j.cartTotalValue.toFixed(2)}` : '$0.00'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredJourneys.length === 0 && (
                  <div className={`p-8 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    No customer journeys match current search or filter.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Selected Customer Journey Profile & Inside Map Visualizer */}
            {selectedJourney ? (
              <div
                className={`flex-1 flex flex-col overflow-y-auto p-4 space-y-4 ${
                  isDark ? 'bg-slate-950' : 'bg-slate-50/40'
                }`}
              >
                {/* Customer Banner & AI Pattern Verdict */}
                <div
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {selectedJourney.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold border ${
                          isDark
                            ? 'bg-slate-800 text-cyan-300 border-cyan-800/60'
                            : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                        }`}
                      >
                        Demographics: {selectedJourney.gender === 'M' ? 'Male' : 'Female'} • Age ~{selectedJourney.estimatedAge} ({selectedJourney.ageBracket})
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                          selectedJourney.conversionOutcome === 'PURCHASED'
                            ? isDark
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : selectedJourney.conversionOutcome === 'THEFT'
                            ? isDark
                              ? 'bg-red-950 text-red-400 border border-red-500/50 animate-pulse'
                              : 'bg-red-50 text-red-700 border border-red-300'
                            : isDark
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        Status: {selectedJourney.conversionOutcome}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Pattern Classification:</span>
                      <strong className={`font-bold ${PATTERN_METADATA[selectedJourney.buyingPattern].color}`}>
                        {PATTERN_METADATA[selectedJourney.buyingPattern].label} ({selectedJourney.patternConfidence}% Confidence)
                      </strong>
                    </div>

                    <p className={`text-xs italic pt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      &quot;{selectedJourney.patternReasoning}&quot;
                    </p>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="flex items-center gap-3 self-start md:self-auto text-xs font-mono">
                    <div
                      className={`px-3 py-2 rounded-lg border text-center ${
                        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400 uppercase">Total In-Store</div>
                      <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {Math.round(selectedJourney.durationSeconds)}s
                      </div>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-lg border text-center ${
                        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400 uppercase">Inside Path</div>
                      <div className={`text-sm font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                        {selectedJourney.pathLengthMeters.toFixed(1)}m
                      </div>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-lg border text-center ${
                        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400 uppercase">Waypoints</div>
                      <div className={`text-sm font-bold ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
                        {selectedJourney.waypoints.length} pts
                      </div>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-lg border text-center ${
                        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400 uppercase">Cart Spend</div>
                      <div className={`text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        ${selectedJourney.cartTotalValue.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2D Architectural Inside Map Visualizer for this Customer */}
                <div
                  className={`p-4 rounded-xl border space-y-2 ${
                    isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
                      <h3
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isDark ? 'text-slate-200' : 'text-slate-800'
                        }`}
                      >
                        Inside Store Trajectory Map (Ingress to Egress Blueprint)
                      </h3>
                    </div>
                    <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Hover waypoints for timestamp & action telemetry
                    </span>
                  </div>

                  {/* Architectural Blueprint Canvas */}
                  <div
                    className={`relative w-full h-80 rounded-lg border overflow-hidden select-none ${
                      isDark ? 'bg-[#070b12] border-slate-800' : 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    <StoreBlueprintMap
                      journey={selectedJourney}
                      onHoverWaypoint={setHoveredWaypoint}
                    />

                    {/* Hovered Waypoint Tooltip HUD */}
                    {hoveredWaypoint && (
                      <div
                        className={`absolute bottom-2 left-2 px-3 py-1.5 rounded-lg border text-xs shadow-xl backdrop-blur-md pointer-events-none space-y-0.5 ${
                          isDark
                            ? 'bg-black/90 border-cyan-500/60 text-slate-300'
                            : 'bg-white/95 border-cyan-400 text-slate-800 shadow-lg'
                        }`}
                      >
                        <div className={isDark ? 'text-cyan-400 font-bold' : 'text-cyan-700 font-bold'}>
                          Waypoint #{hoveredWaypoint.timeFormatted} • Zone: {hoveredWaypoint.zone}
                        </div>
                        <div className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          Coords: X: {hoveredWaypoint.x}m, Z: {hoveredWaypoint.z}m • Velocity: {hoveredWaypoint.speed}m/s
                        </div>
                        <div className={`text-[11px] ${isDark ? 'text-emerald-300' : 'text-emerald-700 font-semibold'}`}>
                          Action: {hoveredWaypoint.action}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Split Bottom Details: Zone Sequence & Basket Funnel */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Zone Sequence & Dwell Times */}
                  <div
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-xs font-bold uppercase flex items-center gap-1.5 ${
                          isDark ? 'text-slate-300' : 'text-slate-800'
                        }`}
                      >
                        <Layers size={14} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
                        <span>Zone Sequence & Dwell Time</span>
                      </h4>
                      <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {selectedJourney.zonesVisited.length} zones traversed
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedJourney.zonesVisited.map((zone, idx) => (
                        <div
                          key={`${zone.zoneId}-${idx}`}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                            isDark
                              ? 'bg-slate-950/70 border-slate-800/80 text-slate-200'
                              : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                                isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span className="font-semibold">{zone.zoneName}</span>
                          </div>
                          <div
                            className={`flex items-center gap-3 text-[11px] ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {zone.itemsInteracted > 0 && (
                              <span className={isDark ? 'text-amber-400 font-bold' : 'text-amber-700 font-bold'}>
                                {zone.itemsInteracted} items inspected
                              </span>
                            )}
                            <span className={isDark ? 'text-cyan-300 font-bold' : 'text-cyan-700 font-bold'}>
                              {Math.round(zone.dwellSeconds)}s dwell
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Basket Interaction & Cart Items */}
                  <div
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-xs font-bold uppercase flex items-center gap-1.5 ${
                          isDark ? 'text-slate-300' : 'text-slate-800'
                        }`}
                      >
                        <ShoppingBag size={14} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                        <span>Product Interactions & Basket</span>
                      </h4>
                      <span className={`text-[11px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        Total: ${selectedJourney.cartTotalValue.toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedJourney.basket.map((item, idx) => (
                        <div
                          key={`${item.id}-${idx}`}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                            isDark
                              ? 'bg-slate-950/70 border-slate-800/80'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                item.action === 'concealed'
                                  ? 'bg-red-500 animate-pulse'
                                  : item.action === 'added_to_cart'
                                  ? 'bg-emerald-400'
                                  : 'bg-amber-400'
                              }`}
                            />
                            <div>
                              <div className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{item.name}</div>
                              <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.category}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>${item.price.toFixed(2)}</div>
                            <span
                              className={`text-[9.5px] uppercase font-bold ${
                                item.action === 'concealed'
                                  ? isDark ? 'text-red-400' : 'text-red-700'
                                  : item.action === 'added_to_cart'
                                  ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                                  : isDark ? 'text-amber-400' : 'text-amber-700'
                              }`}
                            >
                              {item.action.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      ))}

                      {selectedJourney.basket.length === 0 && (
                        <div className={`p-6 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          No product items placed into basket during this journey.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Waypoint Raw Telemetry Table */}
                <div
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-xs font-bold uppercase flex items-center gap-1.5 ${
                        isDark ? 'text-slate-300' : 'text-slate-800'
                      }`}
                    >
                      <Compass size={14} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                      <span>Full Inside Map Waypoints Log ({selectedJourney.waypoints.length} Samples)</span>
                    </h4>
                    <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Sampled every ~0.6s / 1m displacement
                    </span>
                  </div>

                  <div className={`max-h-44 overflow-y-auto rounded-lg border ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead
                        className={`sticky top-0 border-b ${
                          isDark
                            ? 'bg-slate-900 text-slate-400 border-slate-800'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">Timestamp</th>
                          <th className="p-2">X (m)</th>
                          <th className="p-2">Z (m)</th>
                          <th className="p-2">Zone</th>
                          <th className="p-2">Velocity</th>
                          <th className="p-2">Behavior State</th>
                          <th className="p-2">Action Telemetry</th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${
                          isDark
                            ? 'divide-slate-900 bg-slate-950/60 text-slate-300'
                            : 'divide-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        {selectedJourney.waypoints.map((wp, idx) => (
                          <tr
                            key={idx}
                            className={`transition-colors ${
                              isDark ? 'hover:bg-cyan-950/20' : 'hover:bg-cyan-50/50'
                            }`}
                          >
                            <td className={`p-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{idx + 1}</td>
                            <td className={`p-2 font-mono ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>{wp.timeFormatted}</td>
                            <td className="p-2">{wp.x}</td>
                            <td className="p-2">{wp.z}</td>
                            <td className={`p-2 font-medium ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{wp.zone}</td>
                            <td className={`p-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{wp.speed} m/s</td>
                            <td className={`p-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{wp.state}</td>
                            <td className={`p-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{wp.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`flex-1 flex items-center justify-center p-8 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Select a customer from the left directory to inspect their inside map and buying pattern.
              </div>
            )}
          </div>
        ) : (
          /* Tab 2: Aggregate Pattern Intelligence & Matrix */
          <div
            className={`flex-1 overflow-y-auto p-5 space-y-6 ${
              isDark ? 'bg-slate-950' : 'bg-slate-50/50'
            }`}
          >
            {/* Pattern Distribution Cards */}
            <div>
              <h3
                className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${
                  isDark ? 'text-slate-300' : 'text-slate-800'
                }`}
              >
                <Sparkles size={16} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
                <span>Identified Buying Patterns & Archetype Breakdown</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {(Object.keys(PATTERN_METADATA) as ConsumerBuyingPattern[]).map((patternKey) => {
                  const meta = PATTERN_METADATA[patternKey];
                  const count = metrics.patternDistribution[patternKey] || 0;
                  const pct = metrics.totalJourneys > 0 ? Math.round((count / metrics.totalJourneys) * 100) : 0;

                  return (
                    <div
                      key={patternKey}
                      className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 ${
                        isDark ? `${meta.border} ${meta.bg}` : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                          <p className={`text-[11px] mt-0.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {meta.desc}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`pt-2 border-t flex items-center justify-between ${
                          isDark ? 'border-slate-800/80' : 'border-slate-100'
                        }`}
                      >
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Captured Customers:</span>
                        <div className="flex items-center gap-1.5">
                          <strong className={`text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{count}</strong>
                          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>({pct}%)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Department Dwell & Conversion Analysis */}
            <div
              className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <h3
                className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                  isDark ? 'text-slate-300' : 'text-slate-800'
                }`}
              >
                <TrendingUp size={16} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                <span>Supermarket Department Dwell & Navigation Flow</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {ZONE_DEFINITIONS.map((z) => (
                  <div
                    key={z.id}
                    className={`p-3 rounded-lg border space-y-1 ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color }} />
                      <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{z.name}</strong>
                    </div>
                    <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Bounds: X [{z.bounds.minX}, {z.bounds.maxX}] • Z [{z.bounds.minZ}, {z.bounds.maxZ}]
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Offline Data Assurance Notice */}
            <div
              className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                isDark
                  ? 'bg-cyan-950/30 border-cyan-800/40 text-slate-300'
                  : 'bg-cyan-50 border-cyan-200 text-slate-700'
              }`}
            >
              <div className={`flex items-center gap-2 font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-800'}`}>
                <CheckCircle2 size={16} />
                <span>Data Isolation & Surveillance Feed Integrity</span>
              </div>
              <p className={`text-[11.5px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                As configured, all waypoint maps and customer walking trajectories are measured and accumulated strictly in the background data repository. The live 4K CCTV camera feeds and OSD HUD maintain an uncluttered surveillance experience with zero invasive overlay lines on live footage.
              </p>
            </div>
          </div>
        )}

        {/* VIEW 3: DENSITY HEATMAP CANVAS OVERLAY (PEAK HOURS VS CURRENT TRAFFIC) */}
        {activeTab === 'heatmap' && (
          <div
            className={`flex-1 flex flex-col p-4 overflow-y-auto ${
              isDark ? 'bg-slate-950' : 'bg-slate-50/50'
            }`}
          >
            <StoreDensityHeatmap
              agents={consumerJourneyTracker.getActiveJourneys().map((j) => ({
                id: j.id,
                badgeNumber: j.badgeNumber,
                gender: j.gender,
                ageBracket: j.ageBracket,
                estimatedAge: j.estimatedAge,
                position: (j.waypoints[j.waypoints.length - 1]
                  ? [j.waypoints[j.waypoints.length - 1].x, 0, j.waypoints[j.waypoints.length - 1].z]
                  : j.entryPoint) as [number, number, number],
                targetPosition: [0, 0, 0],
                speed: 1.2,
                currentActionText: 'Monitored',
                state: 'WALKING_AISLE',
                dwellTime: j.durationSeconds,
                riskScore: j.buyingPattern === 'LOSS_PREVENTION_RISK' ? 88 : 15,
                isThief: j.buyingPattern === 'LOSS_PREVENTION_RISK',
                hasConcealedItem: false,
                itemCount: j.cartItemCount,
                pathTrail: j.waypoints.map((w) => [w.x, 0, w.z] as [number, number, number]),
                screenProjections: {},
              }))}
              defaultMode="peak"
              className="flex-1 min-h-[500px]"
            />
          </div>
        )}
      </motion.div>
    </div>
  );
};

// 2D Architectural Blueprint Map Component
interface StoreBlueprintMapProps {
  journey: ConsumerJourneyRecord;
  onHoverWaypoint: (wp: InsideMapWaypoint | null) => void;
}

const StoreBlueprintMap: React.FC<StoreBlueprintMapProps> = ({
  journey,
  onHoverWaypoint,
}) => {
  const { isDark } = useTheme();
  // Store bounds in 3D world space: X from -18 to +18, Z from -14 to +16
  // Mapping to SVG coordinates 0..1000 (width) and 0..600 (height)
  const mapX = (x: number) => ((x + 18) / 36) * 960 + 20;
  const mapZ = (z: number) => ((z + 14) / 30) * 540 + 30;

  const waypoints = journey.waypoints;
  const pathD = useMemo(() => {
    if (waypoints.length === 0) return '';
    return waypoints
      .map((wp, idx) => {
        const sx = mapX(wp.x);
        const sz = mapZ(wp.z);
        return `${idx === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sz.toFixed(1)}`;
      })
      .join(' ');
  }, [waypoints]);

  return (
    <svg className="w-full h-full" viewBox="0 0 1000 600">
      {/* Background Grid */}
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke={isDark ? '#162032' : '#e2e8f0'}
            strokeWidth="0.8"
          />
        </pattern>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
        </marker>
      </defs>

      <rect width="1000" height="600" fill={isDark ? '#070c16' : '#f8fafc'} />
      <rect width="1000" height="600" fill="url(#grid)" />

      {/* Exterior Walls */}
      <rect
        x="20"
        y="30"
        width="960"
        height="540"
        fill="none"
        stroke={isDark ? '#334155' : '#94a3b8'}
        strokeWidth="3"
        rx="6"
      />

      {/* Department Zones Layout */}
      {/* 1. Entrance Portal (South-West: X -16..-2, Z 9..16) */}
      <rect
        x={mapX(-16)}
        y={mapZ(9)}
        width={mapX(-2) - mapX(-16)}
        height={mapZ(15) - mapZ(9)}
        fill="#0284c7"
        fillOpacity="0.08"
        stroke="#0284c7"
        strokeDasharray="4 4"
        strokeWidth="1.2"
      />
      <text x={mapX(-9)} y={mapZ(13.8)} fill="#38bdf8" fontSize="12" fontWeight="bold" textAnchor="middle">
        ENTRANCE PORTAL (INGRESS)
      </text>

      {/* 2. Produce & Fresh Bakery (West: X -18..-10, Z -12..9) */}
      <rect
        x={mapX(-17.5)}
        y={mapZ(-12)}
        width={mapX(-10) - mapX(-17.5)}
        height={mapZ(8.5) - mapZ(-12)}
        fill="#10b981"
        fillOpacity="0.08"
        stroke="#10b981"
        strokeWidth="1.2"
      />
      <text x={mapX(-13.7)} y={mapZ(-2)} fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle">
        PRODUCE & BAKERY
      </text>

      {/* 3. Aisle 01 Groceries (X -7 shelf) */}
      <rect
        x={mapX(-7.8)}
        y={mapZ(-7)}
        width={mapX(-6.2) - mapX(-7.8)}
        height={mapZ(7) - mapZ(-7)}
        fill="#1e293b"
        stroke="#f59e0b"
        strokeWidth="1.5"
      />
      <text x={mapX(-7)} y={mapZ(0)} fill="#fbbf24" fontSize="11" fontWeight="bold" textAnchor="middle">
        AISLE 01: PANTRY
      </text>

      {/* 4. Aisle 02 Electronics High-Value (X -0.5 shelf) */}
      <rect
        x={mapX(-1.3)}
        y={mapZ(-7)}
        width={mapX(0.3) - mapX(-1.3)}
        height={mapZ(7) - mapZ(-7)}
        fill="#1e293b"
        stroke="#ef4444"
        strokeWidth="1.8"
      />
      <text x={mapX(-0.5)} y={mapZ(0)} fill="#f87171" fontSize="11" fontWeight="bold" textAnchor="middle">
        AISLE 02: ELECTRONICS (HIGH-VALUE)
      </text>

      {/* 5. Aisle 03 Snacks & Drinks (X 6 shelf) */}
      <rect
        x={mapX(5.2)}
        y={mapZ(-7)}
        width={mapX(6.8) - mapX(5.2)}
        height={mapZ(7) - mapZ(-7)}
        fill="#1e293b"
        stroke="#a855f7"
        strokeWidth="1.5"
      />
      <text x={mapX(6)} y={mapZ(0)} fill="#c084fc" fontSize="11" fontWeight="bold" textAnchor="middle">
        AISLE 03: SNACKS & DRINKS
      </text>

      {/* 6. POS Checkout Lanes (X 9.5..13.5, Z -4..4) */}
      <rect
        x={mapX(9.5)}
        y={mapZ(-4)}
        width={mapX(14) - mapX(9.5)}
        height={mapZ(4.5) - mapZ(-4)}
        fill="#06b6d4"
        fillOpacity="0.08"
        stroke="#06b6d4"
        strokeWidth="1.5"
      />
      <text x={mapX(11.7)} y={mapZ(0)} fill="#22d3ee" fontSize="11" fontWeight="bold" textAnchor="middle">
        POS CHECKOUT LANES
      </text>

      {/* 7. EAS Anti-Theft Exit Gate (X 6..14, Z 9..15) */}
      <rect
        x={mapX(6)}
        y={mapZ(9)}
        width={mapX(14) - mapX(6)}
        height={mapZ(15) - mapZ(9)}
        fill="#f43f5e"
        fillOpacity="0.08"
        stroke="#f43f5e"
        strokeDasharray="4 4"
        strokeWidth="1.2"
      />
      <text x={mapX(10)} y={mapZ(13.8)} fill="#fb7185" fontSize="12" fontWeight="bold" textAnchor="middle">
        EAS EXIT CHOKEPOINT
      </text>

      {/* CCTV Camera Indicators */}
      {[
        { code: 'CAM-01', x: -13, z: 11, label: 'CAM-01 Ingress' },
        { code: 'CAM-02', x: -1, z: 7.5, label: 'CAM-02 Electronics' },
        { code: 'CAM-03', x: 12.2, z: 3, label: 'CAM-03 POS' },
        { code: 'CAM-04', x: 12.8, z: 11.5, label: 'CAM-04 EAS Exit' },
      ].map((cam) => (
        <g key={cam.code} transform={`translate(${mapX(cam.x)}, ${mapZ(cam.z)})`}>
          <circle r="4" fill="#38bdf8" />
          <circle r="8" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
          <text x="10" y="3" fill="#94a3b8" fontSize="9" fontWeight="bold">
            {cam.code}
          </text>
        </g>
      ))}

      {/* CUSTOMER INSIDE TRAJECTORY PATH LINE */}
      {pathD && (
        <>
          {/* Subtle glow background path */}
          <path
            d={pathD}
            fill="none"
            stroke={journey.conversionOutcome === 'THEFT' ? '#ef4444' : '#38bdf8'}
            strokeWidth="5"
            strokeOpacity="0.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Sharp core trajectory path */}
          <path
            d={pathD}
            fill="none"
            stroke={journey.conversionOutcome === 'THEFT' ? '#f87171' : '#0ea5e9'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {/* Individual Waypoints Dots */}
      {waypoints.map((wp, idx) => {
        const cx = mapX(wp.x);
        const cz = mapZ(wp.z);
        const isStart = idx === 0;
        const isEnd = idx === waypoints.length - 1;
        const isPicking = wp.state === 'PICKING_ITEM' || wp.state === 'CONCEALMENT';

        return (
          <g
            key={idx}
            onMouseEnter={() => onHoverWaypoint(wp)}
            onMouseLeave={() => onHoverWaypoint(null)}
            className="cursor-pointer group"
          >
            {isStart ? (
              <g>
                <circle cx={cx} cy={cz} r="7" fill="#10b981" />
                <circle cx={cx} cy={cz} r="11" fill="none" stroke="#10b981" strokeWidth="1.5" className="animate-ping" />
                <text x={cx} y={cz - 10} fill="#34d399" fontSize="10" fontWeight="bold" textAnchor="middle">
                  ENTRY
                </text>
              </g>
            ) : isEnd ? (
              <g>
                <circle cx={cx} cy={cz} r="7" fill={journey.conversionOutcome === 'THEFT' ? '#ef4444' : '#06b6d4'} />
                <text x={cx} y={cz + 18} fill="#f1f5f9" fontSize="10" fontWeight="bold" textAnchor="middle">
                  {journey.conversionOutcome === 'THEFT' ? 'INTERCEPT' : 'EXIT'}
                </text>
              </g>
            ) : isPicking ? (
              <g>
                <circle cx={cx} cy={cz} r="5.5" fill="#f59e0b" />
                <circle cx={cx} cy={cz} r="9" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.7" />
              </g>
            ) : (
              <circle
                cx={cx}
                cy={cz}
                r="3.5"
                fill="#38bdf8"
                opacity="0.8"
                className="hover:opacity-100 hover:fill-white transition-opacity"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};
