'use client';

import React, { useState, useEffect } from 'react';
import { PMReport, PMOverallStatus } from '@/lib/types';
import { getAllReports } from '@/lib/storage';
import { fetchReportsApi } from '@/lib/api-client';
import { Search, Filter, Calendar, Building2, Server, Eye, FileText, CheckCircle2, AlertTriangle, XCircle, ArrowLeft } from 'lucide-react';

interface HistoryDashboardProps {
  onSelectReport: (report: PMReport) => void;
  onBackToCurrent: () => void;
}

export const HistoryDashboard: React.FC<HistoryDashboardProps> = ({
  onSelectReport,
  onBackToCurrent,
}) => {
  const [reports, setReports] = useState<PMReport[]>(() => getAllReports());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    let isMounted = true;
    const loadFromTurso = async () => {
      try {
        const cloudReports = await fetchReportsApi();
        if (isMounted && cloudReports && cloudReports.length > 0) {
          setReports(cloudReports);
        }
      } catch (err) {
        console.warn('Gagal load history dari Turso:', err);
      }
    };
    loadFromTurso();
    return () => { isMounted = false; };
  }, []);

  const filtered = reports.filter((r) => {
    const query = searchQuery.toLowerCase();
    const matchQuery =
      r.site_name.toLowerCase().includes(query) ||
      r.site_code.toLowerCase().includes(query) ||
      r.terminal_id.toLowerCase().includes(query) ||
      r.technician_name.toLowerCase().includes(query) ||
      r.id.toLowerCase().includes(query);

    const matchStatus = statusFilter === 'ALL' || r.overall_status === statusFilter;
    return matchQuery && matchStatus;
  });

  const totalReports = reports.length;
  const normalCount = reports.filter((r) => r.overall_status === 'Selesai (Normal)').length;
  const issueCount = reports.filter((r) => r.overall_status === 'Perlu Tindak Lanjut').length;
  const criticalCount = reports.filter((r) => r.overall_status === 'Kritis (Perbaikan Segera)').length;

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToCurrent}
            className="min-h-[44px] px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Form PM Aktif</span>
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Riwayat & Rekapitulasi Preventive Maintenance
            </h2>
            <p className="text-xs text-slate-500">
              Database arsip pemeriksaan berkala seluruh site SPBU Pertamina International
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold bg-blue-50 text-blue-900 px-3 py-1.5 rounded-full border border-blue-200 self-start sm:self-auto">
          Total Rekap: {totalReports} Dokumen
        </span>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              PM Normal / Prima
            </p>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {normalCount} <span className="text-xs font-normal text-slate-400">Site/POS</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Perlu Tindak Lanjut
            </p>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {issueCount} <span className="text-xs font-normal text-slate-400">Site/POS</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-700" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Kritis / Perbaikan Segera
            </p>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {criticalCount} <span className="text-xs font-normal text-slate-400">Site/POS</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Site, Kode SPBU, Terminal ID, atau Nama Teknisi..."
              className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
            >
              <option value="ALL">Semua Status Hasil PM</option>
              <option value="Selesai (Normal)">Selesai (Normal)</option>
              <option value="Perlu Tindak Lanjut">Perlu Tindak Lanjut</option>
              <option value="Kritis (Perbaikan Segera)">Kritis (Perbaikan Segera)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Reports List: Mobile Cards / Desktop Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">
              Tidak ditemukan data PM yang cocok
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Coba sesuaikan kata kunci pencarian atau ubah filter status di atas.
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                    <th className="p-3">No. PM / Tanggal</th>
                    <th className="p-3">Site SPBU</th>
                    <th className="p-3">Terminal ID</th>
                    <th className="p-3">Teknisi & Pengawas</th>
                    <th className="p-3 text-center">Status Hasil</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-800">
                        <div>{item.id}</div>
                        <div className="text-[11px] font-normal text-slate-500">{item.execution_date}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-900">{item.site_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{item.site_code}</div>
                      </td>

                      <td className="p-3 font-mono font-bold text-blue-900">
                        {item.terminal_id}
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-slate-800">{item.technician_name}</div>
                        <div className="text-[11px] text-slate-500">Spv: {item.supervisor_name}</div>
                      </td>

                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.overall_status === 'Selesai (Normal)'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : item.overall_status === 'Perlu Tindak Lanjut'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          {item.overall_status}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectReport(item)}
                          className="min-h-[36px] px-3 py-1.5 bg-[#0B2545] hover:bg-slate-800 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Buka Laporan</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View (< 768px, Layoutmobile R-03 compliant) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map((item) => (
                <div key={item.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                      {item.id}
                    </span>
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.execution_date}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {item.site_name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {item.site_code} : {item.terminal_id}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                      item.overall_status === 'Selesai (Normal)'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.overall_status === 'Perlu Tindak Lanjut'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.overall_status}
                    </span>

                    <button
                      type="button"
                      onClick={() => onSelectReport(item)}
                      className="min-h-[44px] px-3.5 py-2 bg-[#0B2545] text-white rounded text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Buka Form</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

