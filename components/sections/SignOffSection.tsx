'use client';

import React, { useRef, useState, useEffect } from 'react';
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
  const techCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spvCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isDrawingTech, setIsDrawingTech] = useState(false);
  const [isDrawingSpv, setIsDrawingSpv] = useState(false);

  // Helper to init canvas
  const setupCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0B2545';
  };

  useEffect(() => {
    setupCanvas(techCanvasRef.current);
    setupCanvas(spvCanvasRef.current);
  }, []);

  const getCanvasCoordinates = (
    canvas: HTMLCanvasElement,
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  // Technician drawing handlers
  const startTechDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = techCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(canvas, e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawingTech(true);
  };

  const drawTech = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingTech) return;
    const canvas = techCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(canvas, e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endTechDrawing = () => {
    if (!isDrawingTech) return;
    setIsDrawingTech(false);
    const canvas = techCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().substring(0, 5)}`;

    onChange({
      ...report,
      technician_signature: dataUrl,
      technician_signed_at: timeStr,
    });
  };

  const clearTechSignature = () => {
    const canvas = techCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    onChange({
      ...report,
      technician_signature: undefined,
      technician_signed_at: undefined,
    });
  };

  // Supervisor drawing handlers
  const startSpvDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = spvCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#ED1C24';
    const { x, y } = getCanvasCoordinates(canvas, e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawingSpv(true);
  };

  const drawSpv = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingSpv) return;
    const canvas = spvCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(canvas, e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endSpvDrawing = () => {
    if (!isDrawingSpv) return;
    setIsDrawingSpv(false);
    const canvas = spvCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().substring(0, 5)}`;

    onChange({
      ...report,
      supervisor_signature: dataUrl,
      supervisor_signed_at: timeStr,
    });
  };

  const clearSpvSignature = () => {
    const canvas = spvCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    onChange({
      ...report,
      supervisor_signature: undefined,
      supervisor_signed_at: undefined,
    });
  };

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
              <div className="relative border-2 border-dashed border-slate-300 rounded bg-white overflow-hidden touch-none">
                <canvas
                  ref={techCanvasRef}
                  width={340}
                  height={150}
                  onMouseDown={startTechDrawing}
                  onMouseMove={drawTech}
                  onMouseUp={endTechDrawing}
                  onMouseLeave={endTechDrawing}
                  onTouchStart={startTechDrawing}
                  onTouchMove={drawTech}
                  onTouchEnd={endTechDrawing}
                  className="w-full h-[150px] cursor-crosshair block"
                />
                
                {/* Baseline Guide */}
                <div className="absolute bottom-6 left-6 right-6 border-b border-slate-200 pointer-events-none" />
                <span className="absolute bottom-1 right-2 text-[10px] text-slate-400 pointer-events-none">
                  Area Tanda Tangan
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {report.technician_signed_at ? `Ditandatangani: ${report.technician_signed_at}` : 'Belum ditandatangani'}
              </span>

              <button
                type="button"
                onClick={clearTechSignature}
                className="min-h-[36px] px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
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
              <div className="relative border-2 border-dashed border-slate-300 rounded bg-white overflow-hidden touch-none">
                <canvas
                  ref={spvCanvasRef}
                  width={340}
                  height={150}
                  onMouseDown={startSpvDrawing}
                  onMouseMove={drawSpv}
                  onMouseUp={endSpvDrawing}
                  onMouseLeave={endSpvDrawing}
                  onTouchStart={startSpvDrawing}
                  onTouchMove={drawSpv}
                  onTouchEnd={endSpvDrawing}
                  className="w-full h-[150px] cursor-crosshair block"
                />
                
                {/* Baseline Guide */}
                <div className="absolute bottom-6 left-6 right-6 border-b border-slate-200 pointer-events-none" />
                <span className="absolute bottom-1 right-2 text-[10px] text-slate-400 pointer-events-none">
                  Area Tanda Tangan
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {report.supervisor_signed_at ? `Ditandatangani: ${report.supervisor_signed_at}` : 'Belum ditandatangani'}
              </span>

              <button
                type="button"
                onClick={clearSpvSignature}
                className="min-h-[36px] px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
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

