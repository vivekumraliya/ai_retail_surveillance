'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { SecurityAlert, SystemTelemetry } from './types';
import { useTheme } from '@/lib/theme-context';
import {
  TrendingUp,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export interface TrendDataPoint {
  time: Date;
  minuteOffset: number; // -60 to 0
  footfall: number;
  alerts: number;
  note?: string;
}

interface TrendAnalyticsChartProps {
  alerts: SecurityAlert[];
  telemetry: SystemTelemetry;
  activeCount: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const TrendAnalyticsChart: React.FC<TrendAnalyticsChartProps> = ({
  alerts,
  activeCount,
  isExpanded = false,
  onToggleExpand,
}) => {
  const { isDark } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [timeRange, setTimeRange] = useState<60 | 30 | 15>(60);
  const [showFootfall, setShowFootfall] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);

  // Generate 60-minute rolling historical data points deterministically
  const rawData = useMemo(() => {
    const points: TrendDataPoint[] = [];
    // Deterministic pseudo-random helper for pure hook execution
    const pseudoRand = (seed: number) => {
      const x = Math.sin(seed * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };

    // Fixed base anchor time per hour mark plus minute progression
    const baseHourMs = 1773532800000; // Deterministic anchor timestamp

    for (let m = 60; m >= 0; m--) {
      const timestamp = new Date(baseHourMs - m * 60 * 1000);

      // Footfall curve with realistic waves
      const wave1 = Math.sin((60 - m) / 9) * 14;
      const wave2 = Math.cos((60 - m) / 4) * 6;
      const baseFootfall = Math.max(8, Math.round(26 + wave1 + wave2 + (m === 0 ? activeCount : 0)));

      // Alert frequency: spikes when footfall is high or during shift changeover
      let alertCount = 0;
      if (m === 45) alertCount = 3; // Shift changeover anomaly
      else if (m === 28) alertCount = 4; // High congestion in electronics
      else if (m === 12) alertCount = 2; // Concealment attempt
      else if (m === 0) alertCount = alerts.filter(a => a.severity === 'critical').length;
      else if (baseFootfall > 36 && pseudoRand(m) > 0.6) alertCount = Math.floor(pseudoRand(m * 3) * 2) + 1;

      let note: string | undefined;
      if (m === 45) note = 'Shift changeover anomaly';
      if (m === 28) note = 'Electronics congestion spike';
      if (m === 12) note = 'Concealment alert flag';

      points.push({
        time: timestamp,
        minuteOffset: -m,
        footfall: baseFootfall,
        alerts: alertCount,
        note,
      });
    }

    return points;
  }, [activeCount, alerts]);

  // Filter data based on selected time range
  const chartData = useMemo(() => {
    return rawData.filter((d) => Math.abs(d.minuteOffset) <= timeRange);
  }, [rawData, timeRange]);

  // Aggregate stats
  const avgFootfall = useMemo(() => {
    const sum = chartData.reduce((acc, d) => acc + d.footfall, 0);
    return Math.round(sum / chartData.length);
  }, [chartData]);

  const totalAlertsInRange = useMemo(() => {
    return chartData.reduce((acc, d) => acc + d.alerts, 0);
  }, [chartData]);

  // Render D3 SVG Chart
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || chartData.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = Math.max(130, container.clientHeight - 40);

    const margin = { top: 15, right: 35, bottom: 25, left: 35 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    svg.attr('width', width).attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Definitions for Glowing Line Filters & Gradients
    const defs = svg.append('defs');

    // Footfall Cyan Gradient
    const footfallGrad = defs
      .append('linearGradient')
      .attr('id', 'footfall-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    footfallGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#38bdf8')
      .attr('stop-opacity', 0.35);
    footfallGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#0284c7')
      .attr('stop-opacity', 0.0);

    // Alerts Red Gradient
    const alertGrad = defs
      .append('linearGradient')
      .attr('id', 'alert-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    alertGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#ef4444')
      .attr('stop-opacity', 0.3);
    alertGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#991b1b')
      .attr('stop-opacity', 0.0);

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(chartData, (d) => d.time) as [Date, Date])
      .range([0, innerWidth]);

    const maxFootfall = Math.max(50, d3.max(chartData, (d) => d.footfall) || 50);
    const yScaleLeft = d3
      .scaleLinear()
      .domain([0, maxFootfall * 1.15])
      .range([innerHeight, 0]);

    const maxAlerts = Math.max(5, d3.max(chartData, (d) => d.alerts) || 5);
    const yScaleRight = d3
      .scaleLinear()
      .domain([0, maxAlerts * 1.25])
      .range([innerHeight, 0]);

    // Background Grid lines
    const yAxisGrid = d3
      .axisLeft(yScaleLeft)
      .ticks(4)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid-lines')
      .call(yAxisGrid)
      .selectAll('line')
      .attr('stroke', isDark ? '#1e293b' : '#e2e8f0')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-opacity', 0.8);

    g.select('.grid-lines .domain').remove();

    // X-Axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(timeRange === 60 ? 6 : timeRange === 30 ? 5 : 4)
      .tickFormat((d) => d3.timeFormat('%H:%M')(d as Date));

    const gx = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    gx.selectAll('text')
      .attr('fill', isDark ? '#94a3b8' : '#475569')
      .attr('font-size', '9.5px')
      .attr('font-family', 'monospace')
      .attr('font-weight', isDark ? 'normal' : '600');
    gx.selectAll('line').attr('stroke', isDark ? '#334155' : '#cbd5e1');
    gx.select('.domain').attr('stroke', isDark ? '#334155' : '#cbd5e1');

    // Left Y-Axis (Footfall)
    if (showFootfall) {
      const yAxisLeft = d3.axisLeft(yScaleLeft).ticks(4);
      const gyLeft = g.append('g').call(yAxisLeft);
      gyLeft.selectAll('text').attr('fill', '#38bdf8').attr('font-size', '9px').attr('font-family', 'monospace');
      gyLeft.selectAll('line').attr('stroke', '#38bdf8').attr('stroke-opacity', 0.4);
      gyLeft.select('.domain').remove();
    }

    // Right Y-Axis (Alerts)
    if (showAlerts) {
      const yAxisRight = d3.axisRight(yScaleRight).ticks(4);
      const gyRight = g.append('g').attr('transform', `translate(${innerWidth},0)`).call(yAxisRight);
      gyRight.selectAll('text').attr('fill', '#f87171').attr('font-size', '9px').attr('font-family', 'monospace');
      gyRight.selectAll('line').attr('stroke', '#ef4444').attr('stroke-opacity', 0.4);
      gyRight.select('.domain').remove();
    }

    // Area & Line Generators
    // 1. Footfall Area & Line
    if (showFootfall) {
      const areaFootfall = d3
        .area<TrendDataPoint>()
        .curve(d3.curveMonotoneX)
        .x((d) => xScale(d.time))
        .y0(innerHeight)
        .y1((d) => yScaleLeft(d.footfall));

      g.append('path')
        .datum(chartData)
        .attr('fill', 'url(#footfall-gradient)')
        .attr('d', areaFootfall);

      const lineFootfall = d3
        .line<TrendDataPoint>()
        .curve(d3.curveMonotoneX)
        .x((d) => xScale(d.time))
        .y((d) => yScaleLeft(d.footfall));

      g.append('path')
        .datum(chartData)
        .attr('fill', 'none')
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 2)
        .attr('d', lineFootfall)
        .style('filter', 'drop-shadow(0 0 6px rgba(56,189,248,0.5))');
    }

    // 2. Alerts Area & Line
    if (showAlerts) {
      const areaAlerts = d3
        .area<TrendDataPoint>()
        .curve(d3.curveMonotoneX)
        .x((d) => xScale(d.time))
        .y0(innerHeight)
        .y1((d) => yScaleRight(d.alerts));

      g.append('path')
        .datum(chartData)
        .attr('fill', 'url(#alert-gradient)')
        .attr('d', areaAlerts);

      const lineAlerts = d3
        .line<TrendDataPoint>()
        .curve(d3.curveMonotoneX)
        .x((d) => xScale(d.time))
        .y((d) => yScaleRight(d.alerts));

      g.append('path')
        .datum(chartData)
        .attr('fill', 'none')
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,2')
        .attr('d', lineAlerts)
        .style('filter', 'drop-shadow(0 0 6px rgba(239,68,68,0.6))');

      // Highlight alert spike dots
      chartData
        .filter((d) => d.alerts > 0)
        .forEach((d) => {
          g.append('circle')
            .attr('cx', xScale(d.time))
            .attr('cy', yScaleRight(d.alerts))
            .attr('r', 3.5)
            .attr('fill', '#ef4444')
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.5)
            .style('filter', 'drop-shadow(0 0 4px rgba(239,68,68,0.8))');
        });
    }

    // Interactive Hover Vertical Guideline & Tooltip
    const guideLine = g
      .append('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .style('opacity', 0);

    const hoverDotFootfall = g
      .append('circle')
      .attr('r', 4.5)
      .attr('fill', '#38bdf8')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('opacity', 0);

    const hoverDotAlerts = g
      .append('circle')
      .attr('r', 4.5)
      .attr('fill', '#ef4444')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('opacity', 0);

    // Overlay Rect for Mouse Tracking
    const bisect = d3.bisector<TrendDataPoint, Date>((d) => d.time).center;

    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const xDate = xScale.invert(mx);
        const idx = bisect(chartData, xDate);
        const d = chartData[Math.min(chartData.length - 1, Math.max(0, idx))];

        if (!d) return;

        const posX = xScale(d.time);
        guideLine.attr('x1', posX).attr('x2', posX).style('opacity', 1);

        if (showFootfall) {
          hoverDotFootfall.attr('cx', posX).attr('cy', yScaleLeft(d.footfall)).style('opacity', 1);
        }
        if (showAlerts) {
          hoverDotAlerts.attr('cx', posX).attr('cy', yScaleRight(d.alerts)).style('opacity', 1);
        }

        // Tooltip DOM Positioning
        if (tooltipRef.current) {
          const tooltip = tooltipRef.current;
          tooltip.style.opacity = '1';
          const tipLeft = Math.min(width - 170, Math.max(10, margin.left + posX - 80));
          tooltip.style.left = `${tipLeft}px`;
          tooltip.style.top = '6px';

          const timeFormatted = d3.timeFormat('%I:%M %p')(d.time);
          tooltip.innerHTML = `
            <div class="font-bold ${isDark ? 'text-sky-400 border-slate-700/80 text-slate-200' : 'text-sky-700 border-slate-200 text-slate-800'} border-b pb-1 mb-1 flex items-center justify-between">
              <span>${timeFormatted}</span>
              <span class="${isDark ? 'text-slate-400' : 'text-slate-500'} font-normal text-[9px]">${d.minuteOffset === 0 ? 'NOW' : `${d.minuteOffset}m ago`}</span>
            </div>
            <div class="flex items-center justify-between gap-3 ${isDark ? 'text-slate-200' : 'text-slate-700'}">
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-sky-500"></span>Footfall:</span>
              <strong class="font-mono ${isDark ? 'text-sky-300' : 'text-sky-700'}">${d.footfall}</strong>
            </div>
            <div class="flex items-center justify-between gap-3 ${isDark ? 'text-slate-200' : 'text-slate-700'}">
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500"></span>Alerts:</span>
              <strong class="font-mono ${d.alerts > 0 ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-slate-400' : 'text-slate-500')}">${d.alerts}</strong>
            </div>
            ${d.note ? `<div class="mt-1 pt-1 border-t ${isDark ? 'border-slate-800 text-amber-300' : 'border-slate-200 text-amber-700'} text-[9px] italic truncate">${d.note}</div>` : ''}
          `;
        }
      })
      .on('mouseleave', () => {
        guideLine.style('opacity', 0);
        hoverDotFootfall.style('opacity', 0);
        hoverDotAlerts.style('opacity', 0);
        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = '0';
        }
      });
  }, [chartData, showFootfall, showAlerts, timeRange, isDark]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col rounded-xl overflow-hidden backdrop-blur-md shadow-lg transition-all font-sans border ${
        isDark ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      } ${isExpanded ? 'h-96' : 'h-64 sm:h-72'}`}
    >
      {/* Header & Filter Controls */}
      <div
        className={`flex flex-wrap items-center justify-between px-3 py-1.5 border-b text-xs ${
          isDark ? 'bg-slate-950/80 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`p-1 rounded border ${
              isDark
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                : 'bg-sky-50 border-sky-200 text-sky-700'
            }`}
          >
            <TrendingUp size={13} />
          </div>
          <div>
            <h3 className={`font-mono font-bold text-xs flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
              <span>Customer Footfall vs. Alert Frequency</span>
              <span className={`text-[10px] font-normal hidden sm:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                (Last {timeRange}m Trend)
              </span>
            </h3>
          </div>
        </div>

        {/* Filters & Toggles */}
        <div className="flex items-center gap-2 font-mono text-[10px]">
          {/* Line Visibility Toggles */}
          <div
            className={`flex items-center gap-1 p-0.5 rounded border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/70 border-slate-300'
            }`}
          >
            <button
              onClick={() => setShowFootfall(!showFootfall)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition-all ${
                showFootfall
                  ? isDark
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold'
                    : 'bg-white text-sky-700 border border-sky-300 shadow-xs font-bold'
                  : isDark
                  ? 'text-slate-500'
                  : 'text-slate-500'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span>Footfall</span>
            </button>
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition-all ${
                showAlerts
                  ? isDark
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 font-bold'
                    : 'bg-white text-red-700 border border-red-300 shadow-xs font-bold'
                  : isDark
                  ? 'text-slate-500'
                  : 'text-slate-500'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>Alerts</span>
            </button>
          </div>

          {/* Timeframe Range Selector */}
          <div
            className={`flex items-center gap-0.5 p-0.5 rounded border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/70 border-slate-300'
            }`}
          >
            {([15, 30, 60] as const).map((mins) => (
              <button
                key={mins}
                onClick={() => setTimeRange(mins)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-all font-bold ${
                  timeRange === mins
                    ? 'bg-sky-600 text-white shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>

          {/* Quick Metrics KPI pill */}
          <div
            className={`hidden md:flex items-center gap-2 px-2 py-0.5 rounded border text-[10px] ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700 shadow-xs'
            }`}
          >
            <span>AVG: <strong className={isDark ? 'text-sky-400' : 'text-sky-700'}>{avgFootfall}/m</strong></span>
            <span>ALERTS: <strong className={isDark ? 'text-red-400' : 'text-red-600'}>{totalAlertsInRange}</strong></span>
          </div>

          {/* Expand Toggle */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              title={isExpanded ? 'Collapse Chart' : 'Expand Chart View'}
              className={`p-1 rounded cursor-pointer border ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
              }`}
            >
              {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          )}
        </div>
      </div>

      {/* SVG Visualization Canvas */}
      <div className={`relative flex-1 w-full overflow-hidden p-1 ${isDark ? 'bg-slate-950/60' : 'bg-slate-50/50'}`}>
        <svg ref={svgRef} className="w-full h-full block" />

        {/* Floating Tooltip */}
        <div
          ref={tooltipRef}
          className={`absolute pointer-events-none opacity-0 transition-opacity duration-150 p-2 rounded-lg text-[10px] shadow-2xl backdrop-blur-md z-20 min-w-36 border ${
            isDark
              ? 'bg-slate-950/95 border-sky-500/40 text-slate-200'
              : 'bg-white/95 border-slate-300 text-slate-800 shadow-md'
          }`}
        />
      </div>
    </div>
  );
};
