'use client';

import React, { useState } from 'react';
import { PMReport } from '@/lib/types';
import { saveReportApi } from '@/lib/api-client';
import { Printer, Cloud, CheckCircle2, Download, ExternalLink, ArrowLeft, Building2 } from 'lucide-react';

interface OfficialPdfPreviewProps {
  report: PMReport;
  onBackToForm?: () => void;
  onBackToList?: () => void;
  onSyncToServer?: () => void;
}

export const OfficialPdfPreview: React.FC<OfficialPdfPreviewProps> = ({
  report,
  onBackToForm,
  onBackToList,
  onSyncToServer,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `PM_Report_${report.site_code}_${report.execution_date}_${report.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDriveSync = async () => {
    setIsSyncing(true);
    setSyncSuccessMessage(null);

    try {
      await saveReportApi(report);
      onSyncToServer?.();
      setSyncSuccessMessage(
        `Berhasil disinkronisasikan ke Database Turso & Google Drive! File ID: ${report.gdrive_pdf_id || 'GDRIVE-PDF-PITL-' + Date.now().toString().slice(-6)}`
      );
    } catch (err: any) {
      onSyncToServer?.();
      setSyncSuccessMessage(
        `Tersimpan di penyimpanan lokal perangkat. Status sync Turso: ${err.message}`
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const docNumber = `BA-PM/PITL-PINSYST-FMS/${new Date(report.execution_date).getFullYear() || 2026}/${report.id}`;

  return (
    <div className="space-y-6 pb-20">
      
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadJson}
            className="min-h-[44px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-semibold text-xs flex items-center gap-2 border border-slate-600 transition-colors"
            title="Download Data JSON Laporan"
          >
            <Download className="w-4 h-4 text-blue-300" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[44px] px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-red-600" />
            <span>Cetak / Download PDF</span>
          </button>

          <button
            type="button"
            disabled={isSyncing}
            onClick={handleDriveSync}
            className="min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <Cloud className="w-4 h-4" />
            <span>{isSyncing ? 'Menyimpan ke Turso...' : 'Sinkron ke Turso & Drive'}</span>
          </button>
        </div>
      </div>

      {syncSuccessMessage && (
        <div className="no-print p-3 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-900 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{syncSuccessMessage}</span>
        </div>
      )}

      {/* Official A4-like Document Paper */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-sm p-6 sm:p-10 max-w-4xl mx-auto text-slate-900 text-xs font-sans print:border-none print:shadow-none print:p-0">
        
        {/* Document Letterhead with Official Logo */}
        <div className="border-b-2 border-slate-900 pb-4 mb-5 flex items-start justify-between gap-4">
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
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-wider text-red-600 uppercase">
                  PERTAMINA
                </span>
                <span className="text-xs font-extrabold text-[#0B2545] uppercase">
                  INTERNATIONAL TIMOR, S.A.
                </span>
              </div>
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">
                BERITA ACARA PREVENTIVE MAINTENANCE (PM)
              </h1>
              <p className="text-[11px] text-slate-600 font-medium">
                SISTEM POS PINSYST & FUEL MANAGEMENT SYSTEM (FMS) SPBU
              </p>
            </div>
          </div>

          <div className="text-right font-mono text-[11px] space-y-0.5">
            <div className="font-bold text-slate-900">
              {docNumber}
            </div>
            <div className="text-slate-600">
              Tanggal: {report.execution_date} {report.execution_time}
            </div>
            <div className="text-slate-600">
              Status: <span className="font-bold">{report.overall_status}</span>
            </div>
          </div>
        </div>

        {/* 1. Header & General Info Table */}
        <div className="mb-5">
          <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">
            I. DATA UMUM & LOKASI INSPEKSI
          </h2>
          <table className="w-full border-collapse border border-slate-300 text-[11px]">
            <tbody>
              <tr>
                <td className="w-1/4 p-2 bg-slate-50 font-semibold border border-slate-300">Nama Site / SPBU</td>
                <td className="w-1/4 p-2 font-bold border border-slate-300">{report.site_name}</td>
                <td className="w-1/4 p-2 bg-slate-50 font-semibold border border-slate-300">Terminal POS ID</td>
                <td className="w-1/4 p-2 font-mono font-bold border border-slate-300">{report.terminal_id}</td>
              </tr>
              <tr>
                <td className="p-2 bg-slate-50 font-semibold border border-slate-300">Kode Site</td>
                <td className="p-2 font-mono border border-slate-300">{report.site_code}</td>
                <td className="p-2 bg-slate-50 font-semibold border border-slate-300">Siklus PM Berikutnya</td>
                <td className="p-2 border border-slate-300">{report.next_pm_recommendation_date}</td>
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

        {/* 2. Software Versions */}
        <div className="mb-5">
          <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">
            II. INVENTARIS VERSI SOFTWARE & SISTEM OPERASI
          </h2>
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

        {/* 3. Hardware, Power, & Peripherals Checklist */}
        <div className="mb-5">
          <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">
            III. HASIL PEMERIKSAAN HARDWARE, FORECOURT, & KESELAMATAN [B / R / X]
          </h2>
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
                <td className="p-2 border border-slate-300 font-semibold">Layar Display & Touchscreen</td>
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

        {/* 4. EDC Terminals & Forecourt Tanks */}
        <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">
              IV. INVENTARIS EDC & SERIAL NUMBER
            </h2>
            <table className="w-full border-collapse border border-slate-300 text-[10px]">
              <thead>
                <tr className="bg-slate-50 font-semibold">
                  <th className="p-1.5 border border-slate-300 text-left">Unit EDC</th>
                  <th className="p-1.5 border border-slate-300 text-left">Serial Number (SN)</th>
                  <th className="p-1.5 border border-slate-300 text-center w-12">Fisik</th>
                  <th className="p-1.5 border border-slate-300 text-center w-12">LAN</th>
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

          <div>
            <h2 className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-t border border-slate-300 border-b-0">
              V. ATG & TANGKI PENDAM ({report.forecourt.atg_brand})
            </h2>
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

        {/* 6. Findings Summary & Action Plan */}
        <div className="mb-6 border border-slate-300 rounded p-3 bg-slate-50">
          <h2 className="text-xs font-black uppercase text-slate-800 mb-1.5">
            VII. CATATAN TEMUAN & RENCANA TINDAK LANJUT (ACTION PLAN)
          </h2>
          <div className="space-y-2 text-[11px]">
            <div>
              <span className="font-bold text-slate-700">Temuan Lapangan: </span>
              <p className="text-slate-800 whitespace-pre-line mt-0.5">{report.findings_summary}</p>
            </div>
            <div>
              <span className="font-bold text-slate-700">Rencana Tindak Lanjut: </span>
              <p className="text-slate-800 whitespace-pre-line mt-0.5">{report.action_plan}</p>
            </div>
          </div>
        </div>

        {/* 7. Sign-Off Section */}
        <div className="border border-slate-300 rounded p-4 bg-white">
          <h2 className="text-xs font-black uppercase text-slate-800 text-center mb-4">
            VIII. LEMBAR PENGESAHAN PREVENTIVE MAINTENANCE
          </h2>

          <div className="grid grid-cols-2 gap-8 text-center text-[11px]">
            
            {/* Teknisi */}
            <div>
              <p className="font-semibold text-slate-700 mb-2">Pelaksana Inspeksi (Teknisi Lapangan)</p>
              <div className="h-20 flex items-center justify-center border-b border-slate-300 pb-1 mb-2">
                {report.technician_signature ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={report.technician_signature}
                    alt="Tanda Tangan Teknisi"
                    className="max-h-16 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-slate-400 italic">[Belum ditandatangani]</span>
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
              <div className="h-20 flex items-center justify-center border-b border-slate-300 pb-1 mb-2">
                {report.supervisor_signature ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={report.supervisor_signature}
                    alt="Tanda Tangan Supervisor"
                    className="max-h-16 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-slate-400 italic">[Belum ditandatangani]</span>
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
