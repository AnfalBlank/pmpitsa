'use client';

import React, { useState } from 'react';
import { compressImageFile } from '@/lib/image-compress';
import { PMReport, PMAttachment } from '@/lib/types';
import { useFeedback } from '@/components/feedback/FeedbackProvider';

const MAX_PHOTO_MB = 25; // raw camera file; it is compressed before attaching
import { Camera, Image as ImageIcon, Plus, Trash2, Calendar, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

/** Labels & photo categories differ per work type (PM / Pengecekan / CM) */
const COPY: Record<PMReport['work_type'], {
  title: string;
  subtitle: string;
  findingsLabel: string;
  findingsPlaceholder: string;
  planLabel: string;
  planPlaceholder: string;
  planRequired: boolean;
  categories: PMAttachment['category'][];
}> = {
  PREVENTIVE_MAINTENANCE: {
    title: 'Catatan Temuan Lapangan & Rencana Tindak Lanjut (Action Plan)',
    subtitle: 'Rangkuman hasil inspeksi berkala dan rekomendasi sparepart',
    findingsLabel: 'Ringkasan Temuan Lapangan',
    findingsPlaceholder: 'Kondisi umum terminal POS, forecourt FMS, dan temuan penting saat inspeksi...',
    planLabel: 'Rencana Tindak Lanjut & Kebutuhan Sparepart (Action Plan)',
    planPlaceholder: 'Contoh: 1. Pembersihan printer thermal berkala. 2. Ganti fan pendingin bulan depan.',
    planRequired: true,
    categories: ['Kondisi Hardware', 'Dispenser & ATG', 'EDC & Periferal', 'Temuan Kerusakan', 'Lainnya'],
  },
  QUICK_CHECK: {
    title: 'Catatan Hasil Pengecekan',
    subtitle: 'Kesimpulan singkat kesiapan operasional dan tindak lanjut bila ada',
    findingsLabel: 'Catatan Hasil Pengecekan',
    findingsPlaceholder: 'Contoh: Semua sistem online, EDC 2 lambat terhubung, sudah di-restart.',
    planLabel: 'Tindak Lanjut (bila ada)',
    planPlaceholder: 'Contoh: Buat tiket perbaikan EDC 2 bila masih lambat.',
    planRequired: false,
    categories: ['Kondisi Umum', 'Temuan Kerusakan', 'Lainnya'],
  },
  CORRECTIVE_REPAIR: {
    title: 'Dokumentasi Perbaikan',
    subtitle: 'Foto sebelum, saat, dan sesudah perbaikan serta sparepart yang diganti',
    findingsLabel: 'Catatan Tambahan Perbaikan',
    findingsPlaceholder: 'Informasi lain yang perlu diketahui PWS / Admin (opsional)',
    planLabel: 'Tindak Lanjut (bila ada)',
    planPlaceholder: 'Contoh: Pesan thermal head pengganti, kunjungan ulang minggu depan.',
    planRequired: false,
    categories: ['Sebelum Perbaikan', 'Proses Perbaikan', 'Sesudah Perbaikan', 'Sparepart', 'Lainnya'],
  },
};

interface FindingsActionPlanSectionProps {
  report: PMReport;
  onChange: (updated: PMReport) => void;
}

export const FindingsActionPlanSection: React.FC<FindingsActionPlanSectionProps> = ({
  report,
  onChange,
}) => {
  const copy = COPY[report.work_type] || COPY.PREVENTIVE_MAINTENANCE;
  const categories = copy.categories;
  const [selectedCategory, setSelectedCategory] = useState<PMAttachment['category']>(categories[0]);
  const [captionInput, setCaptionInput] = useState('');
  const feedback = useFeedback();

  const updateField = <K extends keyof PMReport>(key: K, val: PMReport[K]) => {
    onChange({
      ...report,
      [key]: val,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    e.target.value = '';
    if (!file.type.startsWith('image/')) {
      feedback.notify({ variant: 'warning', title: 'Format File Tidak Didukung', message: 'Hanya file gambar (JPG, PNG, HEIC) yang dapat dilampirkan.' });
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      feedback.notify({
        variant: 'warning',
        title: 'Ukuran Foto Terlalu Besar',
        message: `Ukuran maksimum ${MAX_PHOTO_MB} MB. Foto ini ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
      });
      return;
    }
    compressImageFile(file)
      .then((dataUrl) => {
        const now = new Date();
        const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().substring(0, 5)}`;

        const newAttachment: PMAttachment = {
          id: `ATT-${Date.now().toString(36)}`,
          file_name: file.name.replace(/\.[^.]+$/, '') + '.jpg',
          file_url: dataUrl,
          category: selectedCategory,
          caption: captionInput || `Foto dokumentasi ${selectedCategory}`,
          uploaded_at: timeStr,
        };

        updateField('attachments', [...report.attachments, newAttachment]);
        setCaptionInput('');
        feedback.notify({
          variant: 'success',
          title: 'Foto Berhasil Dilampirkan',
          message: `${newAttachment.caption} (${selectedCategory}) ditambahkan ke laporan.`,
        });
      })
      .catch((err) => {
        feedback.notify({
          variant: 'error',
          title: 'Gagal Memuat Foto',
          message: 'File foto tidak dapat dibaca. Coba ambil ulang foto atau pilih file JPG/PNG.',
          detail: err?.message,
        });
      });
  };

  const removeAttachment = async (id: string) => {
    const att = report.attachments.find((a) => a.id === id);
    const ok = await feedback.confirm({
      title: 'Hapus Foto?',
      message: `Foto "${att?.caption || att?.file_name || id}" akan dihapus dari laporan ini.`,
      confirmLabel: 'Ya, Hapus',
      danger: true,
    });
    if (!ok) return;
    updateField(
      'attachments',
      report.attachments.filter((a) => a.id !== id)
    );
    feedback.notify({ variant: 'success', title: 'Foto Dihapus', message: 'Foto telah dihapus dari laporan.' });
  };


  return (
    <div className="space-y-6">
      {/* Action Plan & Findings Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <FileText className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {copy.title}
            </h2>
            <p className="text-xs text-slate-500">
              {copy.subtitle}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label 
              htmlFor="findings-summary-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              {copy.findingsLabel} {report.work_type !== 'CORRECTIVE_REPAIR' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id="findings-summary-input"
              rows={3}
              required
              value={report.findings_summary}
              onChange={(e) => updateField('findings_summary', e.target.value)}
                            placeholder={copy.findingsPlaceholder}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label 
              htmlFor="action-plan-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              {copy.planLabel} {copy.planRequired && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id="action-plan-input"
              rows={4}
              required
              value={report.action_plan}
              onChange={(e) => updateField('action_plan', e.target.value)}
                            placeholder={copy.planPlaceholder}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label 
                htmlFor="findings-next-pm-date-input"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Rekomendasi Tanggal PM Berikutnya
              </label>
              <input
                id="findings-next-pm-date-input"
                type="date"
                value={report.next_pm_recommendation_date}
                onChange={(e) => updateField('next_pm_recommendation_date', e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                Catatan ini secara otomatis dicantumkan pada bagian Berita Acara PM dan ditandatangani oleh Supervisor SPBU.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Attachment Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-800 flex-shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Dokumentasi Foto Fisik & Bukti Temuan
              </h2>
              <p className="text-xs text-slate-500">
                Ambil foto kamera ponsel atau unggah bukti fisik kondisi lapangan
              </p>
            </div>
          </div>

          <span className="text-xs bg-slate-100 px-2.5 py-1 rounded font-semibold text-slate-700 border border-slate-200 self-start sm:self-auto">
            Total Foto: {report.attachments.length} Dokumen
          </span>
        </div>

        {/* Upload Controls */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label 
                htmlFor="photo-category-select"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Kategori Foto
              </label>
              <select
                id="photo-category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as PMAttachment['category'])}
                className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-900"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label 
                htmlFor="photo-caption-input"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Keterangan Foto / Caption
              </label>
              <input
                id="photo-caption-input"
                type="text"
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                placeholder="Contoh: Kondisi sirkulasi kipas atau serial number EDC"
                className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            {/* Camera Capture Input (Mobile friendly) */}
            <label className="min-h-[44px] px-4 py-2 bg-[#0B2545] hover:bg-[#134074] text-white rounded-md text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs">
              <Camera className="w-4 h-4 text-red-400" />
              <span>Buka Kamera Ponsel</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Gallery Upload Input */}
            <label className="min-h-[44px] px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-md text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors">
              <ImageIcon className="w-4 h-4 text-slate-600" />
              <span>Pilih Dari Galeri File</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Photo Gallery Grid */}
        {report.attachments.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-lg">
            <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Belum ada foto dokumentasi
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Gunakan kamera ponsel untuk mengambil foto kondisi fisik hardware atau stiker serial number.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {report.attachments.map((att) => (
              <div
                key={att.id}
                className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs flex flex-col justify-between"
              >
                <div className="relative aspect-video sm:aspect-square bg-slate-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={att.file_url}
                    alt={att.caption}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-[#0B2545]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-xs">
                    {att.category}
                  </span>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-900 line-clamp-2">
                      {att.caption}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {att.uploaded_at}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                      {att.file_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="min-h-[40px] px-2 rounded text-red-600 hover:text-red-800 hover:bg-red-50 text-xs font-semibold flex items-center gap-1 flex-shrink-0"
                      title="Hapus foto ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

