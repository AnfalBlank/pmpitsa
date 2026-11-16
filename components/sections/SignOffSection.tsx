'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { PMReport } from '@/lib/types';
import { PenTool, RotateCcw, CheckCircle2, ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react';

interface SignOffSectionProps {
  report: PMReport;
  onChange: (updated: PMReport) => void;
}

export const SignOffSection: React.FC<SignOffSectionProps> = ({
  report,
  onChange,
}) => {
  const stamp = () => {
    const now = new Date();
    return `${now.toISOString().split('T')[0]} ${now.toTimeString().substring(0, 5)}`;
  };

  const saveTechSignature = (dataUrl: string) =>
    onChange({ ...report, technician_signature: dataUrl, technician_signed_at: stamp() });
  const clearTechSignature = () =>
    onChange({ ...report, technician_signature: undefined, technician_signed_at: undefined });
  const saveSpvSignature = (dataUrl: string) =>
    onChange({ ...report, supervisor_signature: dataUrl, supervisor_signed_at: stamp() });
  const clearSpvSignature = () =>
    onChange({ ...report, supervisor_signature: undefined, supervisor_signed_at: undefined });

  const hasBothSignatures = !!report.technician_signature && !!report.supervisor_signature;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <PenTool className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Pengesahan Digital (Digital Sign-Off)
            </h2>
            <p className="text-xs text-slate-500">
              Tanda tangan langsung pada layar ponsel oleh Teknisi dan Supervisor Site
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Teknisi Pelaksana Pad */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-bold text-[#0B2545] uppercase tracking-wider block">
                    1. Teknisi Pelaksana
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {report.technician_name}
                  </p>
                </div>

                {report.technician_signature ? (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Terverifikasi
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Wajib Ditandatangani
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 mb-2">
                Torehkan tanda tangan Anda dengan jari atau stylus di dalam kotak di bawah:
              </p>

              {/* Canvas Box */}
              <SignaturePad
                value={report.technician_signature}
                color="#0B2545"
                onSave={saveTechSignature}
              />
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {report.technician_signed_at ? `Ditandatangani: ${report.technician_signed_at}` : 'Belum ditandatangani'}
              </span>

              <button
                type="button"
                onClick={clearTechSignature}
                className="min-h-[44px] px-3 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Ulangi</span>
              </button>
            </div>
          </div>

          {/* Supervisor Site Pad */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-bold text-red-700 uppercase tracking-wider block">
                    2. Supervisor / Pengawas Site SPBU
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {report.supervisor_name}
                  </p>
                </div>

                {report.supervisor_signature ? (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Terverifikasi
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Wajib Ditandatangani
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 mb-2">
                Pengawas SPBU membubuhkan tanda tangan setelah memeriksa hasil checklist:
              </p>

              {/* Canvas Box */}
              <SignaturePad
                value={report.supervisor_signature}
                color="#ED1C24"
                onSave={saveSpvSignature}
              />
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {report.supervisor_signed_at ? `Ditandatangani: ${report.supervisor_signed_at}` : 'Belum ditandatangani'}
              </span>

              <button
                type="button"
                onClick={clearSpvSignature}
                className="min-h-[44px] px-3 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Ulangi</span>
              </button>
            </div>
          </div>

        </div>

        {/* Verification Status */}
        <div className={`mt-5 p-4 rounded-lg border flex items-start gap-3 ${
          hasBothSignatures 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
            : 'bg-amber-50 border-amber-300 text-amber-950'
        }`}>
          {hasBothSignatures ? (
            <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          )}

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">
              {hasBothSignatures 
                ? 'Seluruh Pihak Telah Membubuhkan Tanda Tangan Pengesahan' 
                : 'Menunggu Kelengkapan Tanda Tangan Pengesahan'}
            </h4>
            <p className="text-xs mt-0.5">
              {hasBothSignatures
                ? 'Laporan PM telah lengkap dan siap difinalisasi menjadi Berita Acara resmi format PDF Pertamina International.'
                : 'Pastikan teknisi dan supervisor telah membubuhkan tanda tangan digital sebelum menekan tombol Finalisasi Laporan.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


interface SignaturePadProps {
  value?: string;
  color: string;
  onSave: (dataUrl: string) => void;
}

/**
 * Touch-friendly signature pad.
 * - Uses Pointer Events (finger, stylus, mouse) with pointer capture.
 * - Backing store is scaled to the rendered size x devicePixelRatio so strokes
 *   follow the finger exactly and stay sharp on high-DPI phones.
 * - Re-draws a previously saved signature (value) and after resize/rotation.
 */
const SignaturePad: React.FC<SignaturePadProps> = ({ value, color, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);
  const lastValueRef = useRef<string | undefined>(undefined);

  const paint = useCallback((dataUrl?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    if (dataUrl) {
      const img = new Image();
      img.onload = () => {
        // Fit saved image into the current box, preserving aspect ratio
        const scale = Math.min(rect.width / img.width, rect.height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (rect.width - w) / 2, (rect.height - h) / 2, w, h);
      };
      img.src = dataUrl;
    }
  }, [color]);

  // Initial paint + repaint when value changes externally (e.g. "Ulangi" clears it)
  useEffect(() => {
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;
    paint(value);
  }, [value, paint]);

  // Repaint on resize / orientation change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    let prevWidth = canvas.getBoundingClientRect().width;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (Math.abs(w - prevWidth) < 1) return;
      prevWidth = w;
      paint(lastValueRef.current);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [paint]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Draw a dot for single taps
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    drawingRef.current = true;
    hasStrokeRef.current = true;
  };

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    e.preventDefault();
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!hasStrokeRef.current) return;
    const dataUrl = e.currentTarget.toDataURL('image/png');
    lastValueRef.current = dataUrl;
    onSave(dataUrl);
  };

  return (
    <div className="relative border-2 border-dashed border-slate-300 rounded bg-white overflow-hidden touch-none select-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        className="w-full h-[180px] sm:h-[150px] cursor-crosshair block touch-none"
        aria-label="Area tanda tangan digital"
        role="img"
      />
      <div className="absolute bottom-6 left-6 right-6 border-b border-slate-200 pointer-events-none" />
      <span className="absolute bottom-1 right-2 text-[10px] text-slate-400 pointer-events-none">
        Area Tanda Tangan
      </span>
    </div>
  );
};
