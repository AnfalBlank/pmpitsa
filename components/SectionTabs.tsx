'use client';

import React from 'react';
import { PMReport } from '@/lib/types';
import { 
  Building2, 
  Terminal, 
  Cpu, 
  Fuel, 
  CreditCard, 
  Printer, 
  Network, 
  CheckSquare, 
  Camera, 
  PenTool,
  Activity,
  Wrench,
  Search,
  ClipboardCheck,
  Gauge
} from 'lucide-react';

export type TabKey = 
  | 'info' 
  | 'software' 
  | 'hardware' 
  | 'forecourt' 
  | 'edc' 
  | 'peripherals' 
  | 'network' 
  | 'features' 
  | 'action' 
  | 'signoff'
  | 'quick_check'
  | 'corrective_repair' // CM step 2: laporan kerusakan & diagnosa
  | 'cm_action' // CM step 3: tindakan & sparepart
  | 'cm_test' // CM step 4: uji fungsi & hasil
  | 'mech_dispenser' // PM Teknik: per-dispenser checks
  | 'mech_tank' // PM Teknik: tangki, STP, PV vent
  | 'mech_check'; // Pengecekan Teknik checklist

type TabDef = { key: TabKey; label: string; icon: React.ElementType };

/**
 * Steps per work type. Each type has its own form:
 *  - PM (Preventive Maintenance): full 10-step routine inspection
 *  - QUICK_CHECK (Pengecekan): short operational readiness check
 *  - CORRECTIVE_REPAIR (CM): damage report -> diagnosis -> repair -> test
 */
export const WORK_TYPE_TABS: Record<PMReport['work_type'], TabDef[]> = {
  QUICK_CHECK: [
    { key: 'info', label: '1. Info & PWS', icon: Building2 },
    { key: 'quick_check', label: '2. Checklist Pengecekan', icon: Activity },
    { key: 'action', label: '3. Foto & Catatan', icon: Camera },
    { key: 'signoff', label: '4. Pengesahan', icon: PenTool },
  ],
  CORRECTIVE_REPAIR: [
    { key: 'info', label: '1. Info & Tiket', icon: Building2 },
    { key: 'corrective_repair', label: '2. Kerusakan & Diagnosa', icon: Search },
    { key: 'cm_action', label: '3. Tindakan & Sparepart', icon: Wrench },
    { key: 'cm_test', label: '4. Uji Fungsi', icon: ClipboardCheck },
    { key: 'action', label: '5. Foto Sebelum/Sesudah', icon: Camera },
    { key: 'signoff', label: '6. Pengesahan', icon: PenTool },
  ],
  MECHANICAL_PM: [
    { key: 'info', label: '1. Info & PWS', icon: Building2 },
    { key: 'mech_dispenser', label: '2. Dispenser', icon: Fuel },
    { key: 'mech_tank', label: '3. Tangki, STP & PV Vent', icon: Gauge },
    { key: 'action', label: '4. Foto & Catatan', icon: Camera },
    { key: 'signoff', label: '5. Pengesahan', icon: PenTool },
  ],
  MECHANICAL_CHECK: [
    { key: 'info', label: '1. Info & PWS', icon: Building2 },
    { key: 'mech_check', label: '2. Checklist Teknik', icon: Activity },
    { key: 'action', label: '3. Foto & Catatan', icon: Camera },
    { key: 'signoff', label: '4. Pengesahan', icon: PenTool },
  ],
  PREVENTIVE_MAINTENANCE: [
    { key: 'info', label: '1. Info & PWS', icon: Building2 },
    { key: 'software', label: '2. Versi Software', icon: Terminal },
    { key: 'hardware', label: '3. Hardware POS', icon: Cpu },
    { key: 'forecourt', label: '4. Forecourt & ATG', icon: Fuel },
    { key: 'edc', label: '5. Mesin EDC', icon: CreditCard },
    { key: 'peripherals', label: '6. Periferal Kasir', icon: Printer },
    { key: 'network', label: '7. Jaringan & Safety', icon: Network },
    { key: 'features', label: '8. Fitur PINSYST (11)', icon: CheckSquare },
    { key: 'action', label: '9. Foto & Action Plan', icon: Camera },
    { key: 'signoff', label: '10. Pengesahan', icon: PenTool },
  ],
};

export const tabOrderFor = (workType: PMReport['work_type']): TabKey[] =>
  (WORK_TYPE_TABS[workType] || WORK_TYPE_TABS.PREVENTIVE_MAINTENANCE).map((t) => t.key);

/** First technical step after "info" for a work type */
export const firstStepFor = (workType: PMReport['work_type']): TabKey => tabOrderFor(workType)[1];

interface SectionTabsProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  report: PMReport;
}

export const SectionTabs: React.FC<SectionTabsProps> = ({
  activeTab,
  onSelectTab,
  report,
}) => {
  // Count issues per tab to show helpful badge indicator
  const r = report;
  const hw = r.hardware || ({} as PMReport['hardware']);
  const fc = r.forecourt || ({} as PMReport['forecourt']);
  const pp = r.peripherals || ({} as PMReport['peripherals']);
  const np = r.network_power || ({} as PMReport['network_power']);
  const bad = (...xs: (string | undefined)[]) => xs.filter((x) => x === 'R').length;
  const issueCounts: Partial<Record<TabKey, number>> = {
    hardware: bad(hw.fan_cleanliness, hw.heatsink_condition, hw.airflow_condition),
    forecourt:
      bad(fc.atg_controller_status, fc.dispenser_interface_box, fc.metrology_seal_status) +
      (fc.tanks || []).filter((t) => t.level_sensor_status === 'R' || t.water_sensor_status === 'R' || t.temp_sensor_status === 'R').length +
      (fc.nozzles || []).filter((n) => n.status === 'R').length,
    edc: (r.edc_list || []).filter((e) => e.physical_status === 'R' || e.connection_status === 'R').length,
    peripherals: bad(
      pp.display_touchscreen?.status,
      pp.receipt_printer?.status,
      pp.receipt_printer?.thermal_head,
      pp.receipt_printer?.auto_cutter,
      pp.barcode_scanner?.status,
      pp.cash_drawer?.status
    ),
    network:
      bad(np.utp_cable_status, np.switch_router_status, np.ups_shutdown_test, np.apar_safety_status, np.emergency_stop_status) +
      (Number(np.voltage_ng) > 2.0 ? 1 : 0),
    features: (r.features_checklist || []).filter((f) => f.status === 'ISSUE').length,
    signoff: !r.technician_signature || !r.supervisor_signature ? 1 : 0,
    cm_test: r.repair_details?.post_repair_status === 'R' ? 1 : 0,
  };


  // Keep the active step visible in the horizontal scroller (mobile)
  const navRef = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    const nav = navRef.current;
    const el = nav?.querySelector<HTMLElement>('[data-active]');
    if (!nav || !el) return;
    const left = el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [activeTab]);

  const tabs = WORK_TYPE_TABS[report.work_type] || WORK_TYPE_TABS.PREVENTIVE_MAINTENANCE;

  return (
    <nav 
      ref={navRef}
      aria-label="Tahapan Pemeriksaan"
      className="bg-slate-100/80 border-b border-slate-200 shadow-2xs overflow-x-auto no-scrollbar scroll-smooth"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center gap-2 py-2 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const issues = issueCounts[tab.key] || 0;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              type="button"
              data-active={isActive || undefined}
              aria-current={isActive ? 'step' : undefined}
              onClick={() => onSelectTab(tab.key)}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all relative whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                isActive
                  ? 'bg-[#0B2545] text-white border border-[#0B2545] shadow-xs'
                  : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/90 shadow-2xs'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-red-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {issues > 0 && (
                <span
                  title={`${issues} item perlu perhatian / perbaikan`}
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 border border-red-300'
                  }`}
                >
                  {issues}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
