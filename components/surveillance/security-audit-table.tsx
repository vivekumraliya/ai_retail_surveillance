'use client';

import React, { useState, useMemo } from 'react';
import { SecurityAlert, CameraId } from './types';
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Info,
  CheckCircle,
  FileSpreadsheet,
  Download,
  Calendar,
} from 'lucide-react';
import { surveillanceAudio } from '@/lib/surveillance-audio';
import { useTheme } from '@/lib/theme-context';

interface SecurityAuditTableProps {
  alerts: SecurityAlert[];
  onSelectAlert?: (alert: SecurityAlert) => void;
  onJumpToCamera?: (camId: CameraId) => void;
  className?: string;
}

export const SecurityAuditTable: React.FC<SecurityAuditTableProps> = ({
  alerts,
  onSelectAlert,
  onJumpToCamera,
  className = '',
}) => {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'critical' | 'warning' | 'info'>('ALL');
  const [cameraFilter, setCameraFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Severity filter
      if (severityFilter !== 'ALL' && alert.severity !== severityFilter) {
        return false;
      }
      // Camera filter
      if (cameraFilter !== 'ALL' && alert.cameraId !== cameraFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesText =
          alert.title.toLowerCase().includes(q) ||
          alert.description.toLowerCase().includes(q) ||
          alert.cameraName.toLowerCase().includes(q) ||
          alert.shopperId.toLowerCase().includes(q) ||
          alert.indicators.some((ind) => ind.toLowerCase().includes(q));
        if (!matchesText) return false;
      }
      return true;
    });
  }, [alerts, severityFilter, cameraFilter, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / pageSize));
  const paginatedAlerts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAlerts.slice(start, start + pageSize);
  }, [filteredAlerts, currentPage, pageSize]);

  // Export Table as CSV
  const handleExportCsv = () => {
    surveillanceAudio.playTelemetryChirp();
    const headers = ['Alert_ID', 'Timestamp', 'Camera_ID', 'Camera_Name', 'Subject_ID', 'Severity', 'Title', 'Description', 'Indicators'];
    const rows = filteredAlerts.map((a) => [
      `"${a.id}"`,
      `"${a.timestamp}"`,
      `"${a.cameraId}"`,
      `"${a.cameraName}"`,
      `"${a.shopperId}"`,
      `"${a.severity}"`,
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.description.replace(/"/g, '""')}"`,
      `"${a.indicators.join('; ')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `security_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={`rounded-xl overflow-hidden border transition-colors duration-200 ${
        isDark
          ? 'bg-slate-900/60 border-slate-800 shadow-lg'
          : 'bg-white border-slate-200 shadow-sm'
      } ${className}`}
    >
      {/* Header Bar */}
      <div
        className={`p-4 sm:p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50/80'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg border ${
                isDark
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-red-50 border-red-200 text-red-600'
              }`}
            >
              <ShieldAlert size={16} />
            </div>
            <h2 className={`text-base sm:text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Security Incident Audit Log & Event Registry
            </h2>
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Chronological register of sensor events, optical anomaly detections, and EAS barrier trips.
          </p>
        </div>

        {/* Right action: CSV Export */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleExportCsv}
            title="Export filtered security audit log as CSV"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
            }`}
          >
            <Download size={13} className={isDark ? 'text-sky-400' : 'text-sky-600'} />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div
        className={`p-3 border-b flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/50 border-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search
              size={13}
              className={`absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                isDark ? 'text-slate-400' : 'text-slate-400'
              }`}
            />
            <input
              type="text"
              placeholder="Search incidents, cameras, subjects..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs transition focus:outline-none ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-sky-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-600 shadow-xs'
              }`}
            />
          </div>

          {/* Severity Filter */}
          <div
            className={`flex items-center gap-1 p-0.5 rounded-lg border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/70 border-slate-300'
            }`}
          >
            {(['ALL', 'critical', 'warning', 'info'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => {
                  setSeverityFilter(sev);
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition cursor-pointer ${
                  severityFilter === sev
                    ? sev === 'critical'
                      ? 'bg-red-600 text-white shadow-xs'
                      : sev === 'warning'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : sev === 'info'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : isDark
                      ? 'bg-slate-800 text-slate-100'
                      : 'bg-white text-slate-900 shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Camera Filter Dropdown */}
          <select
            value={cameraFilter}
            onChange={(e) => {
              setCameraFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 focus:border-sky-500'
                : 'bg-white border-slate-300 text-slate-800 focus:border-sky-600 shadow-xs'
            }`}
          >
            <option value="ALL" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
              All Camera Angles
            </option>
            <option value="cam1" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
              CAM-01 Ingress
            </option>
            <option value="cam2" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
              CAM-02 Electronics
            </option>
            <option value="cam3" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
              CAM-03 Checkout
            </option>
            <option value="cam4" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
              CAM-04 EAS Exit Gate
            </option>
          </select>
        </div>

        <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Showing <strong className={isDark ? 'text-white' : 'text-slate-900'}>{filteredAlerts.length}</strong> recorded incidents
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr
              className={`border-b text-[10.5px] uppercase tracking-wider ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 text-slate-400'
                  : 'bg-slate-100 border-slate-200 text-slate-600 font-semibold'
              }`}
            >
              <th className="py-2.5 px-3">Time</th>
              <th className="py-2.5 px-3">Camera / Zone</th>
              <th className="py-2.5 px-3">Subject</th>
              <th className="py-2.5 px-3">Severity</th>
              <th className="py-2.5 px-3">Incident Title & Detection Triggers</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-200'}`}>
            {paginatedAlerts.map((alert) => {
              const isCrit = alert.severity === 'critical';
              const isWarn = alert.severity === 'warning';

              return (
                <tr
                  key={alert.id}
                  onClick={() => onSelectAlert?.(alert)}
                  className={`transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Timestamp */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {alert.timestamp}
                    </div>
                    <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                      {alert.timeOffset !== undefined ? `${Math.abs(alert.timeOffset)}s ago` : 'Real-Time'}
                    </div>
                  </td>

                  {/* Camera */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className={`font-bold ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                      {alert.cameraName.split(' ')[0]}
                    </span>
                    <span
                      className={`text-[11px] block truncate max-w-[140px] ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {alert.cameraName}
                    </span>
                  </td>

                  {/* Subject ID */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold border ${
                        isDark
                          ? 'bg-slate-950 text-slate-200 border-slate-800'
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      {alert.shopperId}
                    </span>
                  </td>

                  {/* Severity Badge */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        isCrit
                          ? isDark
                            ? 'bg-red-950/80 text-red-300 border-red-500/50'
                            : 'bg-red-50 text-red-700 border-red-300'
                          : isWarn
                          ? isDark
                            ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                          : isDark
                          ? 'bg-sky-950/80 text-sky-300 border-sky-500/50'
                          : 'bg-sky-50 text-sky-700 border-sky-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCrit
                            ? 'bg-red-500 animate-ping'
                            : isWarn
                            ? 'bg-amber-500'
                            : 'bg-sky-500'
                        }`}
                      />
                      <span>{alert.severity}</span>
                    </span>
                  </td>

                  {/* Title & Triggers */}
                  <td className="py-3 px-3">
                    <div className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      {alert.title}
                    </div>
                    <div
                      className={`text-[11px] font-sans mt-0.5 max-w-lg ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      {alert.description}
                    </div>
                    {alert.indicators.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {alert.indicators.map((ind, i) => (
                          <span
                            key={i}
                            className={`text-[9.5px] px-1.5 py-0.2 rounded border ${
                              isDark
                                ? 'bg-black/50 text-slate-300 border-slate-800'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {ind}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Action Button */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onJumpToCamera?.(alert.cameraId);
                      }}
                      title={`Jump camera feed to ${alert.cameraName}`}
                      className={`px-2.5 py-1 rounded font-bold text-[10.5px] transition cursor-pointer border ${
                        isDark
                          ? 'bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-300 border-slate-700'
                          : 'bg-white hover:bg-sky-600 hover:text-white text-slate-700 border-slate-300 shadow-xs'
                      }`}
                    >
                      VIEW CAM
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredAlerts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <CheckCircle size={24} className="text-emerald-500" />
                    <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                      No Security Incidents Found
                    </span>
                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                      The floor is clear or no events match current search filter.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div
        className={`p-3 border-t flex items-center justify-between text-xs font-mono ${
          isDark
            ? 'bg-slate-950/80 border-slate-800 text-slate-400'
            : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}
      >
        <div>
          Page <strong className={isDark ? 'text-white' : 'text-slate-900'}>{currentPage}</strong> of{' '}
          <strong className={isDark ? 'text-white' : 'text-slate-900'}>{totalPages}</strong>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`p-1 rounded border transition disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`p-1 rounded border transition disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
