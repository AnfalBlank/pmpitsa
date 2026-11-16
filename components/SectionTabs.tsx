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
  Wrench
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
  | 'corrective_repair';

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
  const issueCounts: Partial<Record<TabKey, number>> = {
    info: 0,
    software: 0,
    hardware: [
      report.hardware.fan_cleanliness,
      report.hardware.heatsink_condition,
      report.hardware.airflow_condition,
    ].filter((s) => s === 'R').length,
    forecourt: [
      report.forecourt.atg_controller_status === 'R' ? 1 : 0,
      report.forecourt.dispenser_interface_box === 'R' ? 1 : 0,
      report.forecourt.metrology_seal_status === 'R' ? 1 : 0,
      report.forecourt.tanks.filter((t) => t.level_sensor_status === 'R' || t.water_sensor_status === 'R' || t.temp_sensor_status === 'R').length,
      report.forecourt.nozzles.filter((n) => n.status === 'R').length,
    ].reduce((a, b) => a + b, 0),
    edc: report.edc_list.filter((e) => e.physical_status === 'R' || e.connection_status === 'R').length,
    peripherals: [
      report.peripherals.display_touchscreen.status,
      report.peripherals.receipt_printer.status,
      report.peripherals.receipt_printer.thermal_head,
      report.peripherals.receipt_printer.auto_cutter,
      report.peripherals.barcode_scanner.status,
      report.peripherals.cash_drawer.status,
    ].filter((s) => s === 'R').length,
    network: [
      report.network_power.utp_cable_status,
      report.network_power.switch_router_status,
      report.network_power.ups_shutdown_test,
      report.network_power.apar_safety_status,
      report.network_power.emergency_stop_status,
    ].filter((s) => s === 'R').length + (report.network_power.voltage_ng > 2.0 ? 1 : 0),
    features: report.features_checklist.filter((f) => f.status === 'ISSUE').length,
    action: 0,
    signoff: (!report.technician_signature || !report.supervisor_signature) ? 1 : 0,
    quick_check: 0,
    corrective_repair: report.repair_details?.post_repair_status === 'R' ? 1 : 0,
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

  // Dynamic tabs configuration based on work_type
  let tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [];

  if (report.work_type === 'QUICK_CHECK') {
    tabs = [
      { key: 'info', label: '1. Info & PWS', icon: Building2 },
      { key: 'quick_check', label: '2. Pengecekan Cepat', icon: Activity },
      { key: 'action', label: '3. Foto & Catatan', icon: Camera },
      { key: 'signoff', label: '4. Sign-Off Pengesahan', icon: PenTool },
    ];
  } else if (report.work_type === 'CORRECTIVE_REPAIR') {
    tabs = [
      { key: 'info', label: '1. Info & PWS', icon: Building2 },
      { key: 'corrective_repair', label: '2. Tindakan Perbaikan', icon: Wrench },
      { key: 'hardware', label: '3. Komponen Hardware', icon: Cpu },
      { key: 'forecourt', label: '4. Forecourt / ATG', icon: Fuel },
      { key: 'action', label: '5. Foto Bukti Servis', icon: Camera },
      { key: 'signoff', label: '6. Sign-Off Pengesahan', icon: PenTool },
    ];
  } else {
    // PREVENTIVE_MAINTENANCE (Full 10 tabs)
    tabs = [
      { key: 'info', label: '1. Info & PWS', icon: Building2 },
      { key: 'software', label: '2. Versi Software', icon: Terminal },
      { key: 'hardware', label: '3. Hardware POS', icon: Cpu },
      { key: 'forecourt', label: '4. Forecourt & ATG', icon: Fuel },
      { key: 'edc', label: '5. Mesin EDC', icon: CreditCard },
      { key: 'peripherals', label: '6. Periferal Kasir', icon: Printer },
      { key: 'network', label: '7. Jaringan & Safety', icon: Network },
      { key: 'features', label: '8. Fitur PINSYST (11)', icon: CheckSquare },
      { key: 'action', label: '9. Foto & Action Plan', icon: Camera },
      { key: 'signoff', label: '10. Sign-Off Pengesahan', icon: PenTool },
    ];
  }

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
