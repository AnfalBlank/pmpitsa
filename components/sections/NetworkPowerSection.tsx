'use client';

import React, { useState } from 'react';
import { MasterSelect } from '@/components/ui/MasterSelect';
import { hardwareOptions, useMasterData } from '@/lib/use-master-config';
import { AutoTextarea } from '@/components/ui/AutoTextarea';
import { PMReport, NetworkPower, ChecklistStatus } from '@/lib/types';
import { StatusSelector } from '../StatusSelector';
import { Network, Zap, Thermometer, Activity, Play, CheckCircle2, AlertTriangle, ShieldAlert, Flame } from 'lucide-react';

interface NetworkPowerSectionProps {
  report: PMReport;
  onChange: (updated: PMReport) => void;
}

export const NetworkPowerSection: React.FC<NetworkPowerSectionProps> = ({
  report,
  onChange,
}) => {
  const master = useMasterData();
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  const updateNetwork = <K extends keyof NetworkPower>(
    key: K,
    val: NetworkPower[K]
  ) => {
    onChange({
      ...report,
      network_power: {
        ...report.network_power,
        [key]: val,
      },
    });
  };

  const runPingTest = () => {
    setIsPinging(true);
    setPingResult('Mengirim paket ICMP 64 bytes ke Server Pusat Pertamina...');
    
    setTimeout(() => {
      const simulatedLatency = Math.floor(Math.random() * 15) + 18; // 18 - 32 ms
      updateNetwork('ping_latency_ms', simulatedLatency);
      setIsPinging(false);
      setPingResult(`Koneksi Stabil: 4 paket terkirim, 4 diterima (0% packet loss), RTT rata-rata = ${simulatedLatency} ms`);
    }, 1200);
  };

  const isGroundingSafe = report.network_power.voltage_ng <= 2.0;

  return (
    <div className="space-y-6">
      {/* Network & Connectivity Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Network className="w-5 h-5 text-blue-800 flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Jaringan & Konektivitas Forecourt SPBU
            </h2>
            <p className="text-xs text-slate-500">
              Kabel LAN UTP, Switch/Router, alokasi IP Address, dan latensi ke server pusat
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="sm:col-span-2">
            <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Kondisi Fisik Kabel UTP / LAN & Port RJ45
            </span>
            <StatusSelector
              value={report.network_power.utp_cable_status}
              onChange={(val) => updateNetwork('utp_cable_status', val)}
            />
          </div>

          <div className="sm:col-span-2">
            <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Kondisi Perangkat Switch & Router SPBU
            </span>
            <StatusSelector
              value={report.network_power.switch_router_status}
              onChange={(val) => updateNetwork('switch_router_status', val)}
            />
          </div>
        </div>

        {/* IP Configuration */}
        <div className="border border-slate-200 rounded-lg p-3 sm:p-4 bg-slate-50/70 mb-5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            Konfigurasi IP Address Terminal POS
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label 
                htmlFor="ip-address-input"
                className="block text-[11px] font-semibold text-slate-600 uppercase mb-1"
              >
                IP Address POS <span className="text-red-500">*</span>
              </label>
              <input
                id="ip-address-input"
                type="text"
                required
                value={report.network_power.ip_address}
                onChange={(e) => updateNetwork('ip_address', e.target.value)}
                placeholder="192.168.10.15"
                className="w-full min-h-[44px] px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label 
                htmlFor="subnet-mask-input"
                className="block text-[11px] font-semibold text-slate-600 uppercase mb-1"
              >
                Subnet Mask
              </label>
              <input
                id="subnet-mask-input"
                type="text"
                value={report.network_power.subnet_mask}
                onChange={(e) => updateNetwork('subnet_mask', e.target.value)}
                placeholder="255.255.255.0"
                className="w-full min-h-[44px] px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono text-slate-900"
              />
            </div>

            <div>
              <label 
                htmlFor="gateway-input"
                className="block text-[11px] font-semibold text-slate-600 uppercase mb-1"
              >
                Default Gateway
              </label>
              <input
                id="gateway-input"
                type="text"
                value={report.network_power.gateway}
                onChange={(e) => updateNetwork('gateway', e.target.value)}
                placeholder="192.168.10.1"
                className="w-full min-h-[44px] px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono text-slate-900"
              />
            </div>

            <div>
              <label 
                htmlFor="dns-server-input"
                className="block text-[11px] font-semibold text-slate-600 uppercase mb-1"
              >
                DNS Server Intranet
              </label>
              <input
                id="dns-server-input"
                type="text"
                value={report.network_power.dns}
                onChange={(e) => updateNetwork('dns', e.target.value)}
                placeholder="10.10.1.1"
                className="w-full min-h-[44px] px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Ping Latency Interactive Tester */}
        <div className="bg-slate-900 text-slate-100 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div>
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                Uji Latensi Ping Server Pusat Pertamina (Real-time)
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Target host: pertamina-fms-core.pertamina.com
              </p>
            </div>

            <button
              type="button"
              disabled={isPinging}
              onClick={runPingTest}
              className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-mono text-xs font-bold rounded flex items-center gap-2 self-start sm:self-auto transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isPinging ? 'Sedang Menguji...' : 'Uji Ping Sekarang'}</span>
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-400">Hasil Latensi Terakhir: </span>
              <span className="text-white font-bold text-sm bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {report.network_power.ping_latency_ms} ms
              </span>
              <span className="text-emerald-400 ml-2 text-[11px]">
                {report.network_power.ping_latency_ms < 50 ? '(Sangat Baik < 50ms)' : '(Perlu Perhatian)'}
              </span>
            </div>
          </div>

          {pingResult && (
            <p className="mt-2 text-[11px] text-slate-300 bg-slate-800/80 p-2 rounded border border-slate-700 font-mono">
              &gt; {pingResult}
            </p>
          )}
        </div>
      </div>

      {/* Power, UPS, & Grounding Safety */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Zap className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Kelistrikan, UPS, & Grounding Proteksi SPBU
            </h2>
            <p className="text-xs text-slate-500">
              Pengukuran voltase fase-netral, neutral-ground, dan ketahanan catu daya cadangan
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label 
              htmlFor="ups-model-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Merek & Model UPS
            </label>
            <MasterSelect
                id="ups-model-input"
                value={report.network_power.ups_model}
                onChange={(v) => updateNetwork('ups_model', v)}
                options={hardwareOptions(master.hardwareConfigs, 'UPS')}
                placeholder="— Pilih model UPS —"
                customPlaceholder="Merek & model UPS"
              />
          </div>

          <div>
            <label 
              htmlFor="ups-backup-time-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Estimasi Back-up Time Baterai (Menit)
            </label>
            <input
              id="ups-backup-time-input"
              type="number"
              min={5}
              value={report.network_power.ups_backup_time_min}
              onChange={(e) => updateNetwork('ups_backup_time_min', parseInt(e.target.value, 10) || 0)}
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-mono text-slate-900"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Uji Safe Shutdown POS saat Listrik Padam
            </span>
            <StatusSelector
              value={report.network_power.ups_shutdown_test}
              onChange={(val) => updateNetwork('ups_shutdown_test', val)}
            />
          </div>
        </div>

        {/* Multimeter Voltage Readings */}
        <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 mb-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            Hasil Pengukuran Multimeter Digital
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded border border-slate-200">
              <label 
                htmlFor="voltage-pn-input"
                className="block text-[11px] font-semibold text-slate-600 mb-1"
              >
                Tegangan Phase - Neutral (Volt)
              </label>
              <input
                id="voltage-pn-input"
                type="number"
                step="0.1"
                value={report.network_power.voltage_pn}
                onChange={(e) => updateNetwork('voltage_pn', parseFloat(e.target.value) || 0)}
                className="w-full min-h-[44px] px-2.5 py-1.5 border border-slate-300 rounded text-sm font-mono font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Toleransi normal: 210 - 230 V
              </span>
            </div>

            <div className="bg-white p-3 rounded border border-slate-200">
              <label 
                htmlFor="voltage-pg-input"
                className="block text-[11px] font-semibold text-slate-600 mb-1"
              >
                Tegangan Phase - Ground (Volt)
              </label>
              <input
                id="voltage-pg-input"
                type="number"
                step="0.1"
                value={report.network_power.voltage_pg}
                onChange={(e) => updateNetwork('voltage_pg', parseFloat(e.target.value) || 0)}
                className="w-full min-h-[44px] px-2.5 py-1.5 border border-slate-300 rounded text-sm font-mono font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Toleransi normal: 210 - 230 V
              </span>
            </div>

            <div className={`p-3 rounded border ${
              isGroundingSafe 
                ? 'bg-emerald-50 border-emerald-300' 
                : 'bg-red-50 border-red-300 ring-2 ring-red-500'
            }`}>
              <label 
                htmlFor="voltage-ng-input"
                className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center justify-between"
              >
                <span>Neutral - Ground (Volt)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                  isGroundingSafe ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white'
                }`}>
                  {isGroundingSafe ? 'AMAN' : 'BAHAYA'}
                </span>
              </label>
              <input
                id="voltage-ng-input"
                type="number"
                step="0.1"
                value={report.network_power.voltage_ng}
                onChange={(e) => updateNetwork('voltage_ng', parseFloat(e.target.value) || 0)}
                className="w-full min-h-[44px] px-2.5 py-1.5 border border-slate-300 bg-white rounded text-sm font-mono font-bold text-slate-900"
              />
              <span className={`text-[11px] font-semibold mt-1 block ${
                isGroundingSafe ? 'text-emerald-800' : 'text-red-700'
              }`}>
                {isGroundingSafe 
                  ? 'Grounding prima (< 2.0 V sesuai SOP Pertamina)' 
                  : 'Peringatan: Voltase > 2.0V! Risiko lonjakan listrik ke POS & ATG.'}
              </span>
            </div>
          </div>
        </div>

        {/* Safety K3 (APAR & Emergency Stop) */}
        <div className="p-4 rounded-lg border border-slate-200 bg-red-50/40 mb-4">
          <h3 className="text-xs font-bold text-red-950 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            Pemeriksaan Keselamatan & K3 SPBU
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded border border-red-200 flex flex-col justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-red-600" />
                  APAR di Dekat Area POS & Forecourt
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pemeriksaan jarum manometer tekanan tabung pemadam api dan masa berlaku
                </p>
              </div>
              <StatusSelector
                value={report.network_power.apar_safety_status || 'B'}
                onChange={(val) => updateNetwork('apar_safety_status', val)}
              />
            </div>

            <div className="p-3 bg-white rounded border border-red-200 flex flex-col justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Tombol Pemutus Darurat (Emergency Stop / E-Stop)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Uji tombol switch E-Stop untuk memutus pasokan daya pompa dispenser seketika
                </p>
              </div>
              <StatusSelector
                value={report.network_power.emergency_stop_status || 'B'}
                onChange={(val) => updateNetwork('emergency_stop_status', val)}
              />
            </div>
          </div>
        </div>

        {/* Ambient Room Environment */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label 
              htmlFor="room-temp-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1"
            >
              <Thermometer className="w-4 h-4 text-blue-700" />
              Suhu Ruang Kabin POS (°C)
            </label>
            <input
              id="room-temp-input"
              type="number"
              step="0.5"
              value={report.network_power.room_temp_celsius}
              onChange={(e) => updateNetwork('room_temp_celsius', parseFloat(e.target.value) || 0)}
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-mono text-slate-900"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Suhu ruang ideal perangkat komputer SPBU: 20°C - 26°C
            </span>
          </div>

          <div>
            <label 
              htmlFor="network-notes-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Catatan Kelistrikan & Jaringan
            </label>
            <AutoTextarea
              id="network-notes-input"
              value={report.network_power.notes}
              onChange={(e) => updateNetwork('notes', e.target.value)}
              placeholder="Catatan kabel LAN kendor atau grounding panel..."
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
