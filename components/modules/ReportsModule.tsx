'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  UserCheck, 
  Trash2, 
  Download,
  ExternalLink,
  Printer,
  RotateCcw,
  Clock,
  ChevronRight,
  Filter
} from 'lucide-react';
import { UserSession, Site, PMReport } from '@/lib/types';
import { SAMPLE_SITES } from '@/lib/sample-data';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
import { can } from '@/lib/rbac';
import { deleteReportApi } from '@/lib/api-client';
import { isDateInPeriod, PERIOD_OPTIONS, PeriodFilterKey } from '@/lib/date-filters';

interface ReportsModuleProps {
  currentUser: UserSession;
  reports: PMReport[];
  sites?: Site[];
  onReportsUpdated: (reports: PMReport[]) => void;
  onOpenReportPdf: (report: PMReport) => void;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  currentUser,
  reports,
  sites,
  onReportsUpdated,
  onOpenReportPdf,
}) => {
  const activeSites = sites && sites.length > 0 ? sites : SAMPLE_SITES;
  const [reportSearch, setReportSearch] = useState('');
  const [reportSiteFilter, setReportSiteFilter] = useState<number | 'ALL'>('ALL');
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('ALL');
  const [reportPeriodFilter, setReportPeriodFilter] = useState<PeriodFilterKey>('ALL');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [reportSignFilter, setReportSignFilter] = useState<'ALL' | 'SIGNED' | 'PENDING'>('ALL');

  // Filtering
  const filteredReports = reports.filter(r => {
    if (reportSiteFilter !== 'ALL' && r.site_id !== reportSiteFilter) return false;
    if (reportTypeFilter !== 'ALL' && r.work_type !== reportTypeFilter) return false;
    
    // Period Filter
    if (!isDateInPeriod(r.execution_date, reportPeriodFilter, customDateFrom, customDateTo)) {
      return false;
    }

    // Sign Status Filter
    const isSigned = !!r.technician_signature && !!r.supervisor_signature;
    if (reportSignFilter === 'SIGNED' && !isSigned) return false;
    if (reportSignFilter === 'PENDING' && isSigned) return false;

    if (reportSearch.trim()) {
      const q = reportSearch.toLowerCase();
      const matchId = r.id.toLowerCase().includes(q);
      const matchSite = r.site_name.toLowerCase().includes(q);
      const matchTech = r.technician_name.toLowerCase().includes(q);
      const matchSpv = r.supervisor_name.toLowerCase().includes(q);
      const matchSummary = (r.findings_summary || '').toLowerCase().includes(q);
      if (!matchId && !matchSite && !matchTech && !matchSpv && !matchSummary) return false;
    }
    return true;
  });

  const handleResetFilters = () => {
    setReportSearch('');
    setReportSiteFilter('ALL');
    setReportTypeFilter('ALL');
    setReportPeriodFilter('ALL');
    setCustomDateFrom('');
    setCustomDateTo('');
    setReportSignFilter('ALL');
  };

  const isFilterActive = 
    reportSearch.trim() !== '' ||
    reportSiteFilter !== 'ALL' ||
    reportTypeFilter !== 'ALL' ||
    reportPeriodFilter !== 'ALL' ||
    reportSignFilter !== 'ALL';

  // Pending signoff for supervisor
  const pendingSignOffReports = reports.filter(r => !r.supervisor_signature);

  const pmCount = reports.filter(r => r.work_type === 'PREVENTIVE_MAINTENANCE').length;
  const quickCount = reports.filter(r => r.work_type === 'QUICK_CHECK').length;
  const repairCount = reports.filter(r => r.work_type === 'CORRECTIVE_REPAIR').length;

  const feedback = useFeedback();
  const canDeleteReport = can(currentUser.role, 'report.delete');

  const handleDeleteReport = async (reportId: string) => {
    const ok = await feedback.confirm({
      title: 'Hapus Berita Acara?',
      message: <>Berita Acara <strong>#{reportId}</strong> akan dihapus permanen dari database dan arsip.</>,
      confirmLabel: 'Ya, Hapus',
      danger: true,
    });
    if (!ok) return;
    const result = await feedback.run(() => deleteReportApi(reportId), {
      pending: 'Menghapus Berita Acara...',
      success: { title: 'Berita Acara Dihapus', message: `Dokumen #${reportId} telah dihapus dari arsip.` },
      error: { title: 'Gagal Menghapus Berita Acara', message: 'Dokumen masih tersimpan di server.' },
    });
    if (result.success) onReportsUpdated(reports.filter(r => r.id !== reportId));
  };

  return (
    <div className="space-y-6">

      {/* Top Action & Subtitle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Pusat penyimpanan digital Berita Acara resmi PM, audit cepat, dan servis yang telah ditandatangani.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-700 border border-slate-200 text-xs font-bold shadow-2xs">
            <FileText className="w-4 h-4 text-slate-500" />
            <span>{reports.length} Dokumen Tersimpan</span>
          </span>
        </div>
      </div>

      {/* Pending Sign-Off Card for Supervisor */}
      {currentUser.role === 'SUPERVISOR' && pendingSignOffReports.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-5 border border-amber-300 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-amber-700 flex-shrink-0" />
            <div>
              <h2 className="text-base font-extrabold text-amber-950">
                Berita Acara Belum Ditandatangani Pengawas ({pendingSignOffReports.length})
              </h2>
              <p className="text-xs text-amber-800">
                Tanda tangan pengawas dibubuhkan langsung pada perangkat teknisi saat serah terima. Tinjau hasil checklist di bawah.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {pendingSignOffReports.map((r) => (
              <div 
                key={r.id}
                className="bg-white p-4 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">#{r.id}</span>
                    <span className="font-semibold text-slate-600">{r.execution_date}</span>
                    <span className="font-bold text-slate-900">Teknisi: {r.technician_name}</span>
                    <span className="font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{r.site_name}</span>
                  </div>
                  <p className="text-slate-600 line-clamp-1">{r.findings_summary || 'Pemeriksaan normal.'}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenReportPdf(r)}
                  className="min-h-[44px] px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors flex-shrink-0"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Tinjau Berita Acara</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat Cards - Uniform Restrained Palette */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Arsip Berita Acara</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] mt-1">{reports.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Dokumen resmi tervalidasi</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">PM Rutin Lengkap</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] mt-1">{pmCount}</div>
          <span className="text-[11px] text-blue-700 font-medium mt-0.5 block">10 Modul PINSYST & FMS</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Pengecekan Cepat</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] mt-1">{quickCount}</div>
          <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">Audit operasional 5 menit</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tindakan Perbaikan</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] mt-1">{repairCount}</div>
          <span className="text-[11px] text-amber-700 font-medium mt-0.5 block">Servis & sparepart hardware</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID laporan, teknisi, PWS, temuan..."
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
              className="w-full min-h-[44px] pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* SPBU Site Filter */}
          <div>
            <select
              value={reportSiteFilter}
              onChange={(e) => setReportSiteFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              aria-label="Filter Site SPBU"
              className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="ALL">Semua Site SPBU</option>
              {activeSites.map(s => (
                <option key={s.id} value={s.id}>{s.site_code} - {s.site_name}</option>
              ))}
            </select>
          </div>

          {/* Period Filter */}
          <div>
            <select
              value={reportPeriodFilter}
              onChange={(e) => setReportPeriodFilter(e.target.value as PeriodFilterKey)}
              aria-label="Filter Periode Tanggal"
              className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              {PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Secondary Filter Row: Work Type, Sign Status, & Reset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          <div>
            <select
              value={reportTypeFilter}
              onChange={(e) => setReportTypeFilter(e.target.value)}
              aria-label="Filter Jenis Kegiatan"
              className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="ALL">Semua Jenis Pekerjaan</option>
              <option value="PREVENTIVE_MAINTENANCE">Preventive Maintenance (PM)</option>
              <option value="QUICK_CHECK">Pengecekan Cepat</option>
              <option value="CORRECTIVE_REPAIR">Perbaikan (Repair)</option>
            </select>
          </div>

          <div>
            <select
              value={reportSignFilter}
              onChange={(e) => setReportSignFilter(e.target.value as any)}
              aria-label="Filter Status Pengesahan"
              className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="ALL">Semua Status Pengesahan</option>
              <option value="SIGNED">Disahkan Lengkap (Teknisi & PWS)</option>
              <option value="PENDING">Menunggu Pengesahan PWS</option>
            </select>
          </div>

          <div className="col-span-2 sm:col-span-1 flex items-center gap-2 empty:hidden">
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="min-h-[44px] w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-300 shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Picker when CUSTOM is selected */}
        {reportPeriodFilter === 'CUSTOM' && (
          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 flex flex-col sm:flex-row items-center gap-3 text-xs animate-in fade-in duration-150">
            <span className="font-bold text-blue-950 flex items-center gap-1.5 flex-shrink-0">
              <Calendar className="w-4 h-4 text-blue-700" />
              Pilih Rentang Tanggal:
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="custom-ba-from" className="text-slate-600 font-medium">Dari:</label>
              <input
                id="custom-ba-from"
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="min-h-[38px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="custom-ba-to" className="text-slate-600 font-medium">Sampai:</label>
              <input
                id="custom-ba-to"
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="min-h-[38px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-xl p-10 sm:p-14 text-center border border-slate-200 shadow-2xs space-y-3">
          <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto border border-slate-200">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            {reports.length === 0 
              ? 'Belum Ada Dokumen Berita Acara Tersimpan' 
              : 'Tidak Ada Berita Acara yang Sesuai dengan Filter'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {reports.length === 0 
              ? 'Seluruh hasil pemeriksaan (Preventive Maintenance, Quick Check, atau Perbaikan) yang diselesaikan dan disahkan teknisi akan otomatis tercatat di sini dan siap ditinjau secara digital.'
              : 'Silakan sesuaikan kembali kata kunci pencarian, filter SPBU, atau rentang periode tanggal di atas.'}
          </p>
          {isFilterActive && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="min-h-[40px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Tampilkan Semua Dokumen</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredReports.map((r) => {
            const hasBothSignatures = !!r.technician_signature && !!r.supervisor_signature;

            return (
              <div 
                key={r.id}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                        #{r.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {r.execution_date}
                      </span>
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded">
                        {r.work_type === 'PREVENTIVE_MAINTENANCE' ? 'Preventive Maintenance' : r.work_type === 'QUICK_CHECK' ? 'Pengecekan Cepat' : 'Perbaikan (Repair)'}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        r.overall_status === 'Selesai (Normal)'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {r.overall_status}
                      </span>
                      {hasBothSignatures ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-blue-700" />
                          <span>Disahkan Lengkap</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>Menunggu TTD PWS</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span>{r.site_name}</span>
                      <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {r.terminal_id}
                      </span>
                    </h3>

                    <p className="text-xs text-slate-700 line-clamp-2">
                      {r.findings_summary || 'Pemeriksaan forecourt, sistem POS, dan kelistrikan normal tanpa temuan kerusakan kritis.'}
                    </p>

                    <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap pt-0.5">
                      <span>Kode Site: <strong className="font-mono text-slate-800">{r.site_code}</strong></span>
                      <span>&bull;</span>
                      <span>Teknisi: <strong className="text-slate-800">{r.technician_name}</strong></span>
                      <span>&bull;</span>
                      <span>PWS: <strong className="text-slate-800">{r.supervisor_name}</strong></span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-start lg:self-center flex-wrap">
                    <button
                      type="button"
                      onClick={() => onOpenReportPdf(r)}
                      className="min-h-[40px] px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs"
                      title="Buka Lembar Berita Acara PDF Resmi"
                    >
                      <FileText className="w-4 h-4 text-red-300" />
                      <span>Tinjau Berita Acara</span>
                    </button>

                    {canDeleteReport && (
                      <button
                        type="button"
                        onClick={() => handleDeleteReport(r.id)}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        title="Hapus Berita Acara"
                        aria-label="Hapus Berita Acara"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
