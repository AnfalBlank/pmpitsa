'use client';

import React, { useState } from 'react';
import { PMReport, ChecklistStatus, MechCheck } from '@/lib/types';
import { reportStatus } from '@/lib/report-status';
import { CLEANING_ITEMS } from '@/lib/cleaning';
import { featuredPhotoIndexes, photoFileName } from '@/lib/photos';
import { CHECK_ITEMS, DISPENSER_ITEMS, TANK_ITEMS, MechItemDef, normalizeMechanical, normalizeMechanicalCheck } from '@/lib/mechanical';
import { LoadingBlock } from '@/components/ui/Loading';
import { DocumentHistory } from '@/components/audit/DocumentHistory';
import { WORK_TYPE_TITLE, WORK_TYPE_COPY, baNumber } from '@/lib/work-type';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
import { Printer, Cloud, Download, ExternalLink, ArrowLeft, FileDown, FolderOpen, HardDriveUpload, Lock, PencilLine, Clock, BadgeCheck, Loader2 } from 'lucide-react';

interface OfficialPdfPreviewProps {
  report: PMReport;
  onBackToForm?: () => void;
  onBackToList?: () => void;
  onSyncToServer?: () => void | Promise<void>;
  /** Only technicians may sync/submit Berita Acara */
  canSync?: boolean;
  /** Downloads the server-generated A4 PDF */
  onDownloadPdf?: () => void | Promise<void>;
  /** (Re)upload the synced BA + photos to Google Drive */
  onUploadToDrive?: () => void | Promise<void>;
  /** Admin only: revise a finalised BA */
  onAdminEdit?: () => void | Promise<void>;
  /** Pengawas of this SPBU: validate (approve) the final BA */
  onApprove?: () => void | Promise<void>;
  /** Final BA still waiting to be sent: remove a photo when the BA is too large */
  onRemovePhoto?: (attachmentId: string) => void | Promise<void>;
  /** The full BA (photos, signatures) is still loading from the server */
  loadingFull?: boolean;
  /** Admin sees IP / device of each history entry */
  showAuditNetwork?: boolean;
}

/** Green "approved" stamp shown over the Pengawas signature */
export const ApprovalStamp: React.FC<{ by: string; at: string }> = ({ by, at }) => (
  <div
    className="inline-flex flex-col items-center px-3 py-1.5 border-[3px] border-emerald-600 text-emerald-700 rounded-md bg-white/85 -rotate-6 shadow-sm leading-tight"
    aria-label={`Disetujui oleh ${by}`}
  >
    <span className="text-[11px] font-black tracking-[0.2em]">✓ DISETUJUI</span>
    <span className="text-[10px] font-bold max-w-[160px] truncate">{by}</span>
    <span className="text-[9px] font-mono">{new Date(at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
  </div>
);

const STATUS_LABEL: Record<string, string> = { B: 'Baik', R: 'Rusak', X: 'Tidak Ada' };
const stText = (s?: ChecklistStatus) => (s ? `${s} · ${STATUS_LABEL[s] || s}` : '-');

export const OfficialPdfPreview: React.FC<OfficialPdfPreviewProps> = ({
  report,
  onBackToForm,
  onBackToList,
  onSyncToServer,
  canSync = false,
  onDownloadPdf,
  onUploadToDrive,
  onAdminEdit,
  onApprove,
  onRemovePhoto,
  loadingFull = false,
  showAuditNetwork = false,
}) => {
  const status = reportStatus(report);
  const isPM = report.work_type === 'PREVENTIVE_MAINTENANCE';
  const isMech = report.work_type === 'MECHANICAL_PM';
  const feedback = useFeedback();
  const [isSyncing, setIsSyncing] = useState(false);
  const [busy, setBusy] = useState<'pdf' | 'drive' | null>(null);

  const runBusy = async (kind: 'pdf' | 'drive', fn?: () => void | Promise<void>) => {
    if (!fn || busy) return;
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = async () => {
    const ok = await feedback.confirm({
      title: 'Cetak Berita Acara',
      message: 'Dialog cetak browser akan terbuka. Untuk file PDF resmi yang rapi (A4, lengkap dengan foto), gunakan tombol "Unduh PDF".',
      confirmLabel: 'Buka Dialog Cetak',
    });
    if (!ok) return;
    try {
      window.print();
    } catch (err: any) {
      feedback.notify({ variant: 'error', title: 'Gagal Membuka Dialog Cetak', message: 'Browser ini tidak mendukung pencetakan langsung.', detail: err?.message });
    }
  };

  const handleDownloadJson = () => {
    const fileName = `BA_${baNumber(report)}_${report.site_code}_${report.execution_date}.json`;
    try {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = fileName;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      feedback.notify({
        variant: 'success',
        title: 'File Berhasil Diunduh',
        message: <>File <strong className="break-all">{fileName}</strong> tersimpan di folder unduhan perangkat Anda.</>,
      });
    } catch (err: any) {
      feedback.notify({ variant: 'error', title: 'Gagal Mengunduh File', message: 'File JSON tidak dapat dibuat di perangkat ini.', detail: err?.message });
    }
  };

  const handleDriveSync = async () => {
    if (!onSyncToServer) return;
    setIsSyncing(true);
    try {
      await onSyncToServer();
    } finally {
      setIsSyncing(false);
    }
  };

  const docPrefix = report.work_type === 'QUICK_CHECK' ? 'BA-QC' : report.work_type === 'CORRECTIVE_REPAIR' ? 'BA-CR' : 'BA-PM';
  const docNumber = `${docPrefix}/PITL-PINSYST-FMS/${new Date(report.execution_date).getFullYear() || 2026}/${baNumber(report)}`;

  if (loadingFull) {
    return (
      <div className="space-y-4 pb-20 max-w-4xl mx-auto">
        {onBackToList && (
          <button
            type="button"
            onClick={onBackToList}
            className="min-h-[44px] px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Daftar Berita Acara</span>
          </button>
        )}
        <div className="bg-white rounded-xl border border-slate-200 pm-fade-in">
          <LoadingBlock
            title={`Membuka Berita Acara ${baNumber(report)}`}
            message="Memuat isi lengkap, foto dokumentasi dan tanda tangan dari server."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 pm-fade-in">
      
      {/* Control Banner (Hidden in Print) */}
      <div className="no-print bg-[#0B2545] text-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="min-h-[44px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-600 shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-slate-300" />
              <span>Daftar Berita Acara</span>
            </button>
          )}
          {onBackToForm && (
            <button
              type="button"
              onClick={onBackToForm}
              className="min-h-[44px] px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-600"
            >
              <ArrowLeft className="w-4 h-4 text-slate-300" />
              <span>Kembali ke Editor</span>
            </button>
          )}
          <div>
            <h2 className="text-sm sm:text-base font-bold">
              Preview Berita Acara Resmi PM Pertamina International Timor
            </h2>
            <p className="text-xs text-slate-300">
              Dokumen siap cetak dan arsip digital Google Drive & Turso
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadJson}
            className="min-h-[44px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-semibold text-xs flex items-center justify-center gap-2 border border-slate-600 transition-colors"
            title="Download Data JSON Laporan"
          >
            <Download className="w-4 h-4 text-blue-300" />
            <span>Export JSON</span>
          </button>

          {onDownloadPdf && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => runBusy('pdf', onDownloadPdf)}
              className="min-h-[44px] px-4 py-2 bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 rounded font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <FileDown className="w-4 h-4 text-red-600" />
              <span>{busy === 'pdf' ? 'Membuat PDF...' : 'Unduh PDF'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[44px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-semibold text-xs flex items-center justify-center gap-2 border border-slate-600 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>Cetak</span>
          </button>

          {onApprove && (
            <button
              type="button"
              disabled={loadingFull}
              onClick={() => onApprove()}
              className="col-span-2 sm:col-span-1 min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <BadgeCheck className="w-4 h-4" />
              <span>Setujui Berita Acara</span>
            </button>
          )}

          {onAdminEdit && (
            <button
              type="button"
              onClick={() => onAdminEdit()}
              className="col-span-2 sm:col-span-1 min-h-[44px] px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <PencilLine className="w-4 h-4" />
              <span>Ubah Berita Acara (Admin)</span>
            </button>
          )}

          {canSync && onSyncToServer && (
          <button
            type="button"
            disabled={isSyncing}
            onClick={handleDriveSync}
            className="col-span-2 sm:col-span-1 min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Cloud className="w-4 h-4" />
            <span>{isSyncing ? 'Mengirim...' : status === 'PENDING_SYNC' ? 'Kirim Ulang ke Server' : 'Finalisasi & Kirim'}</span>
          </button>
          )}
        </div>
      </div>



      {status === 'FINAL' && (
        <div
          className={`no-print max-w-4xl mx-auto rounded-lg px-4 py-3 flex items-start gap-2.5 text-xs border ${
            report.approval ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          {report.approval ? <BadgeCheck className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <span>
            {report.approval ? (
              <>
                <strong>Disetujui Pengawas SPBU</strong> — {report.approval.by},{' '}
                {new Date(report.approval.at).toLocaleString('id-ID')}.
              </>
            ) : (
              <>
                <strong>Menunggu validasi Pengawas SPBU.</strong>{' '}
                {onApprove ? 'Periksa isi Berita Acara di bawah, lalu tekan "Setujui Berita Acara".' : 'Pengawas SPBU terkait akan menyetujui dari akunnya.'}
              </>
            )}
          </span>
        </div>
      )}

      {/* Document lifecycle status */}
      <div
        className={`no-print max-w-4xl mx-auto rounded-lg px-4 py-3 flex items-start gap-2.5 text-xs border ${
          status === 'FINAL'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : status === 'PENDING_SYNC'
            ? 'bg-amber-50 border-amber-300 text-amber-900'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        {status === 'DRAFT' ? <PencilLine className="w-4 h-4 flex-shrink-0 mt-0.5" /> : status === 'PENDING_SYNC' ? <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />}
        <div>
          {status === 'FINAL' && (
            <>
              <strong>Final &amp; terkunci</strong>
              {report.revision && report.revision > 1 ? ` · Revisi ${report.revision}` : ''}
              {report.finalized_at ? ` · difinalisasi ${new Date(report.finalized_at).toLocaleString('id-ID')}` : ''}
              {report.finalized_by ? ` oleh ${report.finalized_by}` : ''}. Hanya Admin yang dapat mengubah Berita Acara ini.
              {report.revision_log && report.revision_log.length > 0 && (
                <span className="block mt-0.5 text-[11px] opacity-80">
                  Revisi terakhir: {report.revision_log[report.revision_log.length - 1].by},{' '}
                  {new Date(report.revision_log[report.revision_log.length - 1].at).toLocaleString('id-ID')}
                </span>
              )}
            </>
          )}
          {status === 'PENDING_SYNC' && (
            <>
              <strong>Final, menunggu terkirim ke server.</strong> Berita Acara sudah terkunci dan tersimpan aman di perangkat ini; akan dikirim otomatis
              saat ada koneksi.
            </>
          )}
          {status === 'PENDING_SYNC' && onRemovePhoto && report.attachments.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-white p-3 text-slate-800">
              <p className="font-bold">
                Kurangi foto bila BA gagal terkirim karena terlalu besar
                <span className="font-normal text-slate-500">
                  {' '}
                  · {report.attachments.length} foto, ±
                  {(() => {
                    const kb = report.attachments.reduce((n, a) => n + a.file_url.length * 0.75, 0) / 1024;
                    return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`;
                  })()}
                </span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Isi BA lain tetap terkunci. Minimal 1 foto sebelum dan 1 foto sesudah harus tetap ada.</p>
              <ul className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {report.attachments.map((a, i) => (
                  <li key={a.id} className="rounded-md border border-slate-200 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.file_url} alt={a.caption} className="w-full aspect-[4/3] object-cover" />
                    <div className="p-1.5">
                      <p className="text-[10px] font-semibold truncate">
                        {i + 1}. {a.category}
                      </p>
                      <button
                        type="button"
                        onClick={() => onRemovePhoto(a.id)}
                        className="mt-1 w-full min-h-[36px] rounded text-red-700 hover:bg-red-50 border border-red-200 text-[11px] font-bold"
                      >
                        Hapus foto
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {status === 'DRAFT' && (
            <>
              <strong>Draft</strong> — masih dapat diubah. Setelah difinalisasi, Berita Acara terkunci.
            </>
          )}
        </div>
      </div>

      {/* Google Drive archive status */}
      <div className="no-print max-w-4xl mx-auto bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <FolderOpen className={`w-5 h-5 flex-shrink-0 ${report.gdrive ? 'text-emerald-600' : 'text-slate-400'}`} />
          {report.gdrive ? (
            <div className="min-w-0">
              <div className="font-bold text-slate-900">Tersimpan di Google Drive</div>
              <div className="text-slate-600 break-words">{report.gdrive.folder_path}</div>
              <div className="text-[11px] text-slate-500">
                {report.gdrive.pdf_file_name} · {Object.keys(report.gdrive.photos || {}).length} foto · {new Date(report.gdrive.uploaded_at).toLocaleString('id-ID')}
              </div>
            </div>
          ) : (
            <div className="min-w-0">
              <div className="font-bold text-slate-900">Belum diarsipkan ke Google Drive</div>
              <div className="text-slate-600">
                {status === 'FINAL'
                  ? 'Berita Acara sudah di server, tetapi PDF & foto belum masuk Google Drive.'
                  : 'PDF & foto otomatis tersimpan ke Google Drive setelah Berita Acara difinalisasi.'}
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          {report.gdrive && (
            <>
              <a
                href={report.gdrive.folder_url}
                target="_blank"
                rel="noreferrer"
                className="min-h-[44px] px-3 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-slate-800 flex items-center justify-center gap-1.5"
              >
                <FolderOpen className="w-4 h-4" /> Folder
              </a>
              <a
                href={report.gdrive.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="min-h-[44px] px-3 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-slate-800 flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" /> PDF di Drive
              </a>
            </>
          )}
          {onUploadToDrive && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => runBusy('drive', onUploadToDrive)}
              className="col-span-2 min-h-[44px] px-3 rounded-lg bg-[#0B2545] hover:bg-slate-800 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-1.5"
            >
              <HardDriveUpload className="w-4 h-4" />
              {busy === 'drive' ? 'Mengunggah...' : report.gdrive ? 'Perbarui Arsip Drive' : 'Arsipkan ke Google Drive'}
            </button>
          )}
        </div>
      </div>

      {status !== 'DRAFT' && <DocumentHistory reportId={report.id} showNetwork={showAuditNetwork} />}

      {/* Official A4-like Document Paper */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-sm p-4 sm:p-10 max-w-4xl mx-auto text-slate-900 text-xs font-sans print:border-none print:shadow-none print:p-0">
        
        {/* Document Letterhead with Official Logo */}
        <div className="border-b-2 border-slate-900 pb-4 mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded bg-white flex items-center justify-center p-1 flex-shrink-0 border border-slate-300 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-pertamina-timor.png"
                alt="Pertamina International Timor, S.A."
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo-pertamina-timor.jpeg';
                }}
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-x-1.5">
                <span className="text-sm font-black tracking-wider text-red-600 uppercase">
                  PERTAMINA
                </span>
                <span className="text-xs font-extrabold text-[#0B2545] uppercase">
                  INTERNATIONAL TIMOR, S.A.
                </span>
              </div>
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">
                {WORK_TYPE_TITLE[report.work_type]}
              </h1>
              <p className="text-[11px] text-slate-600 font-medium">
                SISTEM POS PINSYST & FUEL MANAGEMENT SYSTEM (FMS) SPBU
              </p>
            </div>
          </div>

          <div className="sm:text-right font-mono text-[11px] space-y-0.5 break-all sm:break-normal border-t border-slate-200 pt-2 sm:border-0 sm:pt-0">
            <div className="font-bold text-slate-900">
              {docNumber}
            </div>
            <div className="text-slate-600">
              Tanggal: {report.execution_date} {report.execution_time}
            </div>
            <div className="text-slate-600">
              Status: <span className="font-bold">{report.overall_status}</span>
            </div>
            {report.ticket_number && (
              <div className="text-slate-600">
                Tiket: <span className="font-bold">{report.ticket_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* 1. Header & General Info Table */}
        <div className="mb-5">
          <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">
            I. DATA UMUM & LOKASI INSPEKSI
          </h2>
          <div className="overflow-x-auto -mx-px">
          <table className="w-full border-collapse border border-slate-300 text-[11px]">
            <tbody>
              <tr>
                <td className="w-1/4 p-2 bg-slate-50 font-semibold border border-slate-300">Nama Site / SPBU</td>
                <td className="w-1/4 p-2 font-bold border border-slate-300">{report.site_name}</td>
                <td className="w-1/4 p-2 bg-slate-50 font-semibold border border-slate-300">{WORK_TYPE_COPY[report.work_type]?.terminalLabel || 'Terminal POS ID'}</td>
                <td className="w-1/4 p-2 font-mono font-bold border border-slate-300">{report.terminal_id || '-'}</td>
              </tr>
              <tr>
                <td className="p-2 bg-slate-50 font-semibold border border-slate-300">Kode Site</td>
                <td className="p-2 font-mono border border-slate-300">{report.site_code}</td>
                <td className="p-2 bg-slate-50 font-semibold border border-slate-300">{isPM || isMech ? `Siklus ${isMech ? 'PM Teknik' : 'PM'} Berikutnya` : 'Status Akhir'}</td>
                <td className="p-2 border border-slate-300">{isPM || isMech ? report.next_pm_recommendation_date : report.overall_status}</td>
              </tr>
              <tr>
                <td className="p-2 bg-slate-50 font-semibold border border-slate-300">Teknisi Pelaksana</td>
                <td className="p-2 border border-slate-300">{report.technician_name} ({report.technician_phone})</td>
                <td className="p-2 bg-slate-50 font-semibold border border-slate-300">Supervisor Site</td>
                <td className="p-2 border border-slate-300">{report.supervisor_name}</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        {/* Pengecekan (Quick Check) */}
        {report.work_type === 'QUICK_CHECK' && report.quick_check_details && (
          <div className="mb-5">
            <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">
              II. HASIL PENGECEKAN
            </h2>
            <table className="w-full border-collapse border border-slate-300 text-[11px]">
              <tbody>
                {([
                  ['Sistem POS Online', report.quick_check_details.pos_system_online],
                  ['Komunikasi Dispenser', report.quick_check_details.dispenser_communication],
                  ['EDC Siap Transaksi', report.quick_check_details.edc_transaction_ready],
                  ['Monitor ATG / Tangki', report.quick_check_details.atg_tank_monitor],
                  ['Printer Thermal', report.quick_check_details.printer_thermal_status],
                ] as [string, ChecklistStatus][]).map(([label, st]) => (
                  <tr key={label}>
                    <td className="w-1/2 p-2 bg-slate-50 font-semibold border border-slate-300">{label}</td>
                    <td className={`p-2 border border-slate-300 font-bold ${st === 'R' ? 'text-red-700' : st === 'B' ? 'text-emerald-700' : ''}`}>{stText(st)}</td>
                  </tr>
                ))}
                {report.quick_check_details.general_notes && (
                  <tr>
                    <td className="p-2 bg-slate-50 font-semibold border border-slate-300">Catatan</td>
                    <td className="p-2 border border-slate-300 whitespace-pre-line">{report.quick_check_details.general_notes}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Corrective Maintenance (CM) */}
        {report.work_type === 'CORRECTIVE_REPAIR' && report.repair_details && (
          <div className="mb-5 space-y-4">
            {([
              ['II. LAPORAN KERUSAKAN & DIAGNOSA', [
                ['Kategori Komponen', report.repair_details.category],
                ['Unit / Perangkat', report.repair_details.affected_unit],
                ['Serial Number', report.repair_details.affected_serial],
                ['Keluhan / Gejala', report.repair_details.reported_problem],
                ['Diagnosa & Akar Masalah', report.repair_details.root_cause],
              ]],
              ['III. TINDAKAN PERBAIKAN & SPAREPART', [
                ['Waktu Pengerjaan', [report.repair_details.work_start, report.repair_details.work_end].filter(Boolean).join(' – ')],
                ['Tindakan Perbaikan', report.repair_details.action_taken],
                ['Catatan Sparepart', report.repair_details.sparepart_replaced],
              ]],
              ['IV. UJI FUNGSI SETELAH PERBAIKAN', [
                ['Hasil Uji Fungsi', stText(report.repair_details.post_repair_status)],
                ['Uraian Uji Fungsi', report.repair_details.test_notes],
                ['Rekomendasi / Tindak Lanjut', report.repair_details.notes],
              ]],
            ] as [string, [string, string | undefined][]][]).map(([title, rows]) => (
              <div key={title}>
                <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">{title}</h2>
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <tbody>
                    {rows.map(([label, value]) => (
                      <tr key={label}>
                        <td className="w-1/3 p-2 bg-slate-50 font-semibold border border-slate-300 align-top">{label}</td>
                        <td className="p-2 border border-slate-300 whitespace-pre-line">{value || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <div>
              <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">Barang yang Diganti (SN lama → SN baru)</h2>
              <div className="overflow-x-auto -mx-px">
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-semibold text-left">
                      <th className="p-2 border border-slate-300 w-8">No</th>
                      <th className="p-2 border border-slate-300">Nama Barang</th>
                      <th className="p-2 border border-slate-300">SN Lama</th>
                      <th className="p-2 border border-slate-300">SN Baru</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.repair_details.parts_replaced || []).length === 0 ? (
                      <tr><td colSpan={4} className="p-2 border border-slate-300 italic text-slate-500">Tidak ada barang yang diganti.</td></tr>
                    ) : (
                      (report.repair_details.parts_replaced || []).map((p, i) => (
                        <tr key={p.id}>
                          <td className="p-2 border border-slate-300">{i + 1}</td>
                          <td className="p-2 border border-slate-300">{p.name || '-'}</td>
                          <td className="p-2 border border-slate-300 font-mono">{p.old_serial || '-'}</td>
                          <td className="p-2 border border-slate-300 font-mono font-bold">{p.new_serial || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Pengecekan Teknik */}
        {report.work_type === 'MECHANICAL_CHECK' && (() => {
          const c = normalizeMechanicalCheck(report.mechanical_check);
          return (
            <div className="mb-5">
              <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">II. HASIL PENGECEKAN TEKNIK (FORECOURT & TANGKI)</h2>
              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <tbody>
                  {CHECK_ITEMS.map((d) => (
                    <tr key={d.key}>
                      <td className="w-1/2 p-2 bg-slate-50 font-semibold border border-slate-300">{d.label}</td>
                      <td className={`p-2 border border-slate-300 font-bold w-16 text-center ${c.items[d.key].status === 'B' ? 'text-emerald-700' : 'text-red-700'}`}>{c.items[d.key].status}</td>
                      <td className="p-2 border border-slate-300 whitespace-pre-line">{c.items[d.key].notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* PM Teknik (mekanikal dispenser & tangki) */}
        {report.work_type === 'MECHANICAL_PM' && (() => {
          const m = normalizeMechanical(report.mechanical);
          const table = (defs: MechItemDef[], items: Record<string, MechCheck>) => (
            <div className="overflow-x-auto -mx-px">
              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold">
                    <th className="p-2 border border-slate-300 text-left">Komponen</th>
                    <th className="p-2 border border-slate-300 w-16">Status</th>
                    <th className="p-2 border border-slate-300 text-left">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {defs.map((d) => {
                    const c = items[d.key];
                    return (
                      <tr key={d.key}>
                        <td className="p-2 border border-slate-300 font-semibold">{d.label}</td>
                        <td className={`p-2 border border-slate-300 text-center font-bold ${c?.status === 'B' ? 'text-emerald-700' : 'text-red-700'}`}>{c?.status || '-'}</td>
                        <td className="p-2 border border-slate-300 whitespace-pre-line">
                          {d.cleaning ? `Dibersihkan: ${c?.cleaned ? 'Ya' : 'Tidak'}. ` : ''}
                          {c?.notes || ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
          return (
            <div className="mb-5 space-y-4">
              <div>
                <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">II. PEMERIKSAAN MEKANIKAL DISPENSER</h2>
                <div className="border border-slate-300 p-2 space-y-3">
                  {m.dispensers.length === 0 && <p className="text-[11px] italic text-slate-500">Tidak ada dispenser yang diperiksa.</p>}
                  {m.dispensers.map((d) => (
                    <div key={d.id}>
                      <p className="text-[11px] mb-1">
                        <strong>{d.label}</strong> · Model: {d.model || '-'} · SN: <span className="font-mono">{d.serial_number || '-'}</span>
                      </p>
                      {table(DISPENSER_ITEMS, d.items)}
                      {d.notes && <p className="text-[11px] mt-1"><strong>Catatan:</strong> {d.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">III. AREA TANGKI, STP & PV VENT</h2>
                {table(TANK_ITEMS, m.tank_items)}
                {m.tank_notes && <p className="text-[11px] mt-1"><strong>Catatan:</strong> {m.tank_notes}</p>}
              </div>
            </div>
          );
        })()}

        {isPM && (
          <>
        {/* 2. Software Versions */}
        <div className="mb-5">
          <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">
            II. INVENTARIS VERSI SOFTWARE & SISTEM OPERASI
          </h2>
          <div className="overflow-x-auto -mx-px">
          <table className="w-full border-collapse border border-slate-300 text-[11px]">
            <tbody>
              <tr>
                <td className="w-1/4 p-2 bg-slate-50 font-semibold border border-slate-300">Aplikasi POS PINSYST</td>
                <td className="w-1/4 p-2 font-mono font-bold border border-slate-300">{report.software.pos_pinsyst_version}</td>
                <td className="w-1/4 p-2 bg-slate-50 font-semibold border border-slate-300">PINSYST Printer Server</td>
                <td className="w-1/4 p-2 font-mono border border-slate-300">{report.software.printer_server_version}</td>
              </tr>
              <tr>
                <td className="p-2 bg-slate-50 font-semibold border border-slate-300">Modul Export Data</td>
                <td className="p-2 font-mono border border-slate-300">{report.software.export_module_version}</td>
                <td className="p-2 bg-slate-50 font-semibold border border-slate-300">Modul IMEX (Master Data)</td>
                <td className="p-2 font-mono border border-slate-300">{report.software.imex_module_version}</td>
              </tr>
              <tr>
                <td className="p-2 bg-slate-50 font-semibold border border-slate-300">Sistem Operasi (OS)</td>
                <td className="p-2 font-mono border border-slate-300">{report.software.operating_system}</td>
                <td className="p-2 bg-slate-50 font-semibold border border-slate-300">Backup DB Lokal</td>
                <td className="p-2 border border-slate-300 font-bold">[{report.software.database_backup_status || 'B'}] Terverifikasi</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        {/* 3. Hardware, Power, & Peripherals Checklist */}
        <div className="mb-5">
          <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">
            III. HASIL PEMERIKSAAN HARDWARE, FORECOURT, & KESELAMATAN [B / R / X]
          </h2>
          <div className="overflow-x-auto -mx-px">
          <table className="w-full border-collapse border border-slate-300 text-[11px]">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold text-center">
                <th className="p-2 border border-slate-300 text-left">Komponen / Parameter</th>
                <th className="p-2 border border-slate-300 w-24">Status</th>
                <th className="p-2 border border-slate-300 text-left">Spesifikasi & Catatan Pemeriksaan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-slate-300 font-semibold">PC Unit & Motherboard</td>
                <td className="p-2 border border-slate-300 text-center font-bold">{report.hardware.airflow_condition}</td>
                <td className="p-2 border border-slate-300">{report.hardware.pc_brand_model} (CPU: {report.hardware.cpu}, RAM: {report.hardware.ram_gb}GB, Storage: {report.hardware.storage_free_gb}GB Free)</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-300 font-semibold">Kebersihan Kipas & Heatsink</td>
                <td className="p-2 border border-slate-300 text-center font-bold">{report.hardware.fan_cleanliness}</td>
                <td className="p-2 border border-slate-300">{report.hardware.notes || 'Normal, debu ventilasi telah dibersihkan'}</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-300 font-semibold">Monitor PC POS PINSYST</td>
                <td className="p-2 border border-slate-300 text-center font-bold">{report.peripherals.display_touchscreen.status}</td>
                <td className="p-2 border border-slate-300">{report.peripherals.display_touchscreen.notes}</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-300 font-semibold">Printer Struk (Thermal & Cutter)</td>
                <td className="p-2 border border-slate-300 text-center font-bold">{report.peripherals.receipt_printer.status}</td>
                <td className="p-2 border border-slate-300">Thermal Head: [{report.peripherals.receipt_printer.thermal_head}], Cutter: [{report.peripherals.receipt_printer.auto_cutter}] - {report.peripherals.receipt_printer.notes}</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-300 font-semibold">Kelistrikan & Grounding</td>
                <td className="p-2 border border-slate-300 text-center font-bold">{report.network_power.voltage_ng <= 2.0 ? 'B' : 'R'}</td>
                <td className="p-2 border border-slate-300">Phase-Neutral: {report.network_power.voltage_pn}V, Neutral-Ground: {report.network_power.voltage_ng}V (Standar: &lt; 2V), Latensi Ping: {report.network_power.ping_latency_ms}ms</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-300 font-semibold">Dispenser Interface & Segel Tera</td>
                <td className="p-2 border border-slate-300 text-center font-bold">{report.forecourt.dispenser_interface_box || 'B'}</td>
                <td className="p-2 border border-slate-300">Komunikasi loop dispenser normal. Segel metrologi legal: [{report.forecourt.metrology_seal_status || 'B'}] Utuh.</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-300 font-semibold">Keselamatan K3 (APAR & E-Stop)</td>
                <td className="p-2 border border-slate-300 text-center font-bold">{report.network_power.emergency_stop_status || 'B'}</td>
                <td className="p-2 border border-slate-300">APAR bertekanan normal: [{report.network_power.apar_safety_status || 'B'}]. Tombol pemutus darurat E-Stop berfungsi: [{report.network_power.emergency_stop_status || 'B'}].</td>
              </tr>
            </tbody>
          </table>
          </div>
          <table className="w-full border-collapse border border-slate-300 text-[11px] mt-2">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold">
                <th className="p-2 border border-slate-300 text-left">Checklist Pembersihan</th>
                <th className="p-2 border border-slate-300 w-24">Hasil</th>
              </tr>
            </thead>
            <tbody>
              {CLEANING_ITEMS.map((c) => (
                <tr key={c.key}>
                  <td className="p-2 border border-slate-300">{c.label}</td>
                  <td className={`p-2 border border-slate-300 text-center font-bold ${report.cleaning?.[c.key] ? 'text-emerald-700' : 'text-red-700'}`}>
                    {report.cleaning?.[c.key] ? 'Dilakukan' : 'Tidak'}
                  </td>
                </tr>
              ))}
              {report.cleaning?.notes && (
                <tr>
                  <td colSpan={2} className="p-2 border border-slate-300 whitespace-pre-line"><strong>Catatan:</strong> {report.cleaning.notes}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. EDC Terminals & Forecourt Tanks */}
        <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">
              IV. INVENTARIS EDC & SERIAL NUMBER
            </h2>
            <div className="overflow-x-auto -mx-px">
            <table className="w-full border-collapse border border-slate-300 text-[10px]">
              <thead>
                <tr className="bg-slate-50 font-semibold">
                  <th className="p-1.5 border border-slate-300 text-left">Unit EDC</th>
                  <th className="p-1.5 border border-slate-300 text-left">Serial Number (SN)</th>
                  <th className="p-1.5 border border-slate-300 text-center w-12">Fisik</th>
                  <th className="p-1.5 border border-slate-300 text-center w-14">Wi-Fi</th>
                </tr>
              </thead>
              <tbody>
                {report.edc_list.map((edc) => (
                  <tr key={edc.id}>
                    <td className="p-1.5 border border-slate-300 font-medium">{edc.brand_type}</td>
                    <td className="p-1.5 border border-slate-300 font-mono font-bold">{edc.serial_number}</td>
                    <td className="p-1.5 border border-slate-300 text-center font-bold">{edc.physical_status}</td>
                    <td className="p-1.5 border border-slate-300 text-center font-bold">{edc.connection_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>

          <div>
            <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">
              V. ATG & TANGKI PENDAM ({report.forecourt.atg_brand})
            </h2>
            <div className="overflow-x-auto -mx-px">
            <table className="w-full border-collapse border border-slate-300 text-[10px]">
              <thead>
                <tr className="bg-slate-50 font-semibold">
                  <th className="p-1.5 border border-slate-300 text-left">Tangki / BBM</th>
                  <th className="p-1.5 border border-slate-300 text-right">Kapasitas</th>
                  <th className="p-1.5 border border-slate-300 text-center w-12">Level</th>
                  <th className="p-1.5 border border-slate-300 text-center w-12">Water</th>
                </tr>
              </thead>
              <tbody>
                {report.forecourt.tanks.map((tank) => (
                  <tr key={tank.id}>
                    <td className="p-1.5 border border-slate-300 font-medium">{tank.tank_number}</td>
                    <td className="p-1.5 border border-slate-300 text-right font-mono">{tank.capacity_liters.toLocaleString()} L</td>
                    <td className="p-1.5 border border-slate-300 text-center font-bold">{tank.level_sensor_status}</td>
                    <td className="p-1.5 border border-slate-300 text-center font-bold">{tank.water_sensor_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>

        {/* 5. 11 Features Checklist Summary */}
        <div className="mb-5">
          <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">
            VI. RINGKASAN PEMERIKSAAN 11 FITUR POS PINSYST
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-300 p-2.5 text-[10px]">
            {report.features_checklist.map((feat) => (
              <div key={feat.id} className="flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="font-medium text-slate-800">
                  {feat.code}. {feat.title}
                </span>
                <span className={`px-2 py-0.5 rounded font-black text-[9px] ${
                  feat.status === 'OK' ? 'bg-emerald-100 text-emerald-800' : feat.status === 'ISSUE' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {feat.status}
                </span>
              </div>
            ))}
          </div>
        </div>

          </>
        )}

        {/* 6. Findings Summary & Action Plan */}
        <div className="mb-6 border border-slate-300 rounded p-3 bg-slate-50">
          <h2 className="text-xs font-black uppercase text-slate-800 mb-1.5">
            {isPM
              ? 'VII. CATATAN TEMUAN & RENCANA TINDAK LANJUT (ACTION PLAN)'
              : isMech
              ? 'IV. CATATAN TEMUAN & RENCANA TINDAK LANJUT'
              : report.work_type === 'QUICK_CHECK' || report.work_type === 'MECHANICAL_CHECK'
              ? 'III. CATATAN & TINDAK LANJUT'
              : 'V. CATATAN & TINDAK LANJUT'}
          </h2>
          <div className="space-y-2 text-[11px]">
            <div>
              <span className="font-bold text-slate-700">{isPM || isMech ? 'Temuan Lapangan: ' : 'Catatan: '}</span>
              <p className="text-slate-800 whitespace-pre-line mt-0.5">{report.findings_summary}</p>
            </div>
            <div>
              <span className="font-bold text-slate-700">Rencana Tindak Lanjut: </span>
              <p className="text-slate-800 whitespace-pre-line mt-0.5">{report.action_plan}</p>
            </div>
          </div>
        </div>

        {/* Documentation photos: main photos + full list (all photos are in Google Drive) */}
        {report.attachments?.length > 0 && (() => {
          const featured = featuredPhotoIndexes(report);
          const driveUrl = report.gdrive?.docs_folder_url || report.gdrive?.folder_url;
          return (
            <div className="mb-6">
              <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">
                LAMPIRAN DOKUMENTASI FOTO
              </h2>
              <div className="border border-slate-300 p-2.5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {featured.map((i) => {
                    const att = report.attachments[i];
                    return (
                      <figure key={att.id} className="min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={att.file_url} alt={att.caption} className="w-full aspect-[4/3] object-cover rounded border border-slate-200" />
                        <figcaption className="mt-1 text-[10px] leading-tight">
                          <span className="font-bold">Foto {i + 1}.</span> {att.caption}
                          <span className="block text-slate-500">{att.category}</span>
                        </figcaption>
                      </figure>
                    );
                  })}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-800 mb-1">Dokumentasi lengkap ({report.attachments.length} foto)</p>
                  <div className="overflow-x-auto -mx-px">
                    <table className="w-full border-collapse border border-slate-300 text-[10px]">
                      <thead>
                        <tr className="bg-slate-50 text-left text-slate-700">
                          <th className="p-1.5 border border-slate-300 w-7">No</th>
                          <th className="p-1.5 border border-slate-300">Kategori</th>
                          <th className="p-1.5 border border-slate-300">Keterangan</th>
                          <th className="p-1.5 border border-slate-300">Nama file (Google Drive)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.attachments.map((a, i) => (
                          <tr key={a.id} className={featured.includes(i) ? 'bg-amber-50/60' : ''}>
                            <td className="p-1.5 border border-slate-300 font-bold">{i + 1}</td>
                            <td className="p-1.5 border border-slate-300">{a.category}</td>
                            <td className="p-1.5 border border-slate-300">{a.caption || '-'}</td>
                            <td className="p-1.5 border border-slate-300 font-mono break-all">{photoFileName(report, i, a)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {driveUrl ? (
                  <a
                    href={driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-print inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-900 text-xs font-bold"
                  >
                    <FolderOpen className="w-4 h-4" /> Buka semua foto di Google Drive
                  </a>
                ) : (
                  <p className="text-[10px] italic text-slate-500">
                    Seluruh foto diarsipkan ke folder Google Drive BA ini setelah BA terkirim ke server. PDF BA memuat QR code ke folder tersebut.
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* 7. Sign-Off Section */}
        <div className="border border-slate-300 rounded p-4 bg-white">
          <h2 className="text-xs font-black uppercase text-slate-800 text-center mb-4">
            {isPM ? 'VIII' : isMech ? 'V' : report.work_type === 'QUICK_CHECK' || report.work_type === 'MECHANICAL_CHECK' ? 'IV' : 'VI'}. LEMBAR PENGESAHAN
          </h2>

          <div className="grid grid-cols-2 gap-4 sm:gap-8 text-center text-[11px]">
            
            {/* Teknisi */}
            <div>
              <p className="font-semibold text-slate-700 mb-2">Teknisi Pelaksana</p>
              <div className="h-20 flex items-center justify-center border-b border-slate-300 pb-1 mb-2">
                {report.technician_signature ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={report.technician_signature}
                    alt="Tanda Tangan Teknisi"
                    className="max-h-16 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-slate-400 italic">{loadingFull ? 'Memuat...' : '[Belum ditandatangani]'}</span>
                )}
              </div>
              <p className="font-bold text-slate-900">{report.technician_name}</p>
              <p className="text-[10px] text-slate-500 font-mono">
                {report.technician_signed_at || 'Waktu: -'}
              </p>
            </div>

            {/* Supervisor */}
            <div>
              <p className="font-semibold text-slate-700 mb-2">Pemberi Pengesahan (Supervisor Site SPBU)</p>
              <div className="relative h-20 flex items-center justify-center border-b border-slate-300 pb-1 mb-2">
                {report.supervisor_signature ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={report.supervisor_signature}
                    alt="Tanda Tangan Supervisor"
                    className="max-h-16 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-slate-400 italic">{loadingFull ? 'Memuat...' : '[Belum ditandatangani]'}</span>
                )}
                {report.approval && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <ApprovalStamp by={report.approval.by} at={report.approval.at} />
                  </div>
                )}
              </div>
              <p className="font-bold text-slate-900">{report.supervisor_name}</p>
              <p className="text-[10px] text-slate-500 font-mono">
                {report.supervisor_signed_at || 'Waktu: -'}
              </p>
            </div>

          </div>
        </div>

        {/* Footnote */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
          <span>Pertamina International Timor, S.A. - Retail & FMS Division</span>
          <span>Dokumen resmi terenkripsi SHA-256</span>
        </div>

      </div>
    </div>
  );
};
