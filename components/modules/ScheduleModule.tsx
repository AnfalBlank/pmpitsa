'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  Search, 
  Plus, 
  Clock, 
  Building2, 
  UserCheck, 
  Wrench, 
  Trash2, 
  CheckCircle2,
  CalendarCheck2,
  RotateCcw
} from 'lucide-react';
import { UserSession, Site, MaintenancePlan, WorkType } from '@/lib/types';
import { SAMPLE_SITES } from '@/lib/sample-data';
import { savePlan } from '@/lib/storage';
import { createPlanApi, deletePlanApi } from '@/lib/api-client';
import { isDateInPeriod, PERIOD_OPTIONS, PeriodFilterKey } from '@/lib/date-filters';

interface ScheduleModuleProps {
  currentUser: UserSession;
  plans: MaintenancePlan[];
  sites?: Site[];
  usersList?: any[];
  onPlansUpdated: (plans: MaintenancePlan[]) => void;
  onStartExecutionFromPlan: (site: Site, workType: WorkType, terminalId: string) => void;
}

export const ScheduleModule: React.FC<ScheduleModuleProps> = ({
  currentUser,
  plans,
  sites,
  usersList,
  onPlansUpdated,
  onStartExecutionFromPlan,
}) => {
  const activeSites = sites && sites.length > 0 ? sites : SAMPLE_SITES;
  const technicians = (usersList || []).filter(u => u.role === 'TECHNICIAN');

  const [planSearch, setPlanSearch] = useState('');
  const [planSiteFilter, setPlanSiteFilter] = useState<number | 'ALL'>('ALL');
  const [planStatusFilter, setPlanStatusFilter] = useState<string>('ALL');
  const [planPeriodFilter, setPlanPeriodFilter] = useState<PeriodFilterKey>('ALL');
  const [customPlanDateFrom, setCustomPlanDateFrom] = useState('');
  const [customPlanDateTo, setCustomPlanDateTo] = useState('');

  // New Plan Modal State
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [newPlanSiteId, setNewPlanSiteId] = useState<number>(currentUser.assignedSiteId || activeSites[0].id);
  const [newPlanTerminal, setNewPlanTerminal] = useState('POS-01 & ISLANDS');
  const [newPlanType, setNewPlanType] = useState<WorkType>('PREVENTIVE_MAINTENANCE');
  const [newPlanDate, setNewPlanDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  const initialTech = technicians.length > 0 
    ? technicians[0].name 
    : (currentUser.role === 'TECHNICIAN' ? currentUser.name : 'Teknisi Standby Central');
  const initialSpv = activeSites[0]?.contact_person.split(' (')[0] || 'Pengawas Site';

  const [newPlanTech, setNewPlanTech] = useState(initialTech);
  const [newPlanSpv, setNewPlanSpv] = useState(initialSpv);
  const [newPlanNotes, setNewPlanNotes] = useState('');

  // Filtering
  const filteredPlans = plans.filter(p => {
    if (planSiteFilter !== 'ALL' && p.site_id !== planSiteFilter) return false;
    if (planStatusFilter !== 'ALL' && p.status !== planStatusFilter) return false;
    
    // Period filter on p.scheduled_date
    if (!isDateInPeriod(p.scheduled_date, planPeriodFilter, customPlanDateFrom, customPlanDateTo)) {
      return false;
    }

    if (planSearch.trim()) {
      const q = planSearch.toLowerCase();
      const matchSite = p.site_name.toLowerCase().includes(q);
      const matchTech = p.assigned_technician.toLowerCase().includes(q);
      const matchNotes = (p.notes || '').toLowerCase().includes(q);
      if (!matchSite && !matchTech && !matchNotes) return false;
    }
    return true;
  });

  const handleResetFilters = () => {
    setPlanSearch('');
    setPlanSiteFilter('ALL');
    setPlanStatusFilter('ALL');
    setPlanPeriodFilter('ALL');
    setCustomPlanDateFrom('');
    setCustomPlanDateTo('');
  };

  const isFilterActive = 
    planSearch.trim() !== '' ||
    planSiteFilter !== 'ALL' ||
    planStatusFilter !== 'ALL' ||
    planPeriodFilter !== 'ALL';

  const scheduledCount = plans.filter(p => p.status === 'Terjadwal').length;
  const upcomingCount = plans.filter(p => p.status === 'Mendekati Waktu').length;
  const completedCount = plans.filter(p => p.status === 'Selesai').length;

  // Handle submit create plan
  const handleCreatePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSite = activeSites.find(s => s.id === newPlanSiteId) || activeSites[0];

    const newPlan: MaintenancePlan = {
      id: `PLAN-${Date.now()}`,
      site_id: targetSite.id,
      site_code: targetSite.site_code,
      site_name: targetSite.site_name,
      terminal_id: newPlanTerminal,
      plan_type: newPlanType,
      scheduled_date: newPlanDate,
      assigned_technician: newPlanTech,
      supervisor_pws: newPlanSpv,
      status: 'Terjadwal',
      notes: newPlanNotes || 'Jadwal pemeliharaan berkala forecourt',
    };

    savePlan(newPlan);
    const updated = [newPlan, ...plans];
    onPlansUpdated(updated);
    setIsNewPlanModalOpen(false);
    setNewPlanNotes('');

    await createPlanApi(newPlan);
  };

  // Handle delete plan (Admin only)
  const handleDeletePlan = async (planId: string) => {
    if (window.confirm('Hapus jadwal pemeliharaan ini dari database Turso?')) {
      const updated = plans.filter(p => p.id !== planId);
      onPlansUpdated(updated);
      await deletePlanApi(planId);
    }
  };

  return (
    <div className="space-y-6">

      {/* Top Action & Subtitle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Perencanaan kunjungan teknisi ke 5 SPBU PITSA, kepatuhan siklus 14 hari, dan monitoring kesiapan forecourt.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewPlanModalOpen(true)}
          className="min-h-[44px] px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors self-start sm:self-auto flex-shrink-0"
        >
          <Plus className="w-4 h-4 text-slate-200" />
          <span>+ Jadwalkan Kunjungan PM Baru</span>
        </button>
      </div>

      {/* Stat Cards - Uniform Restrained Palette */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Agenda Terdaftar</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] mt-1">{plans.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Seluruh rencana pemeliharaan</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Terjadwal</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] mt-1">{scheduledCount}</div>
          <span className="text-[11px] text-blue-700 font-medium mt-0.5 block">Menunggu tanggal eksekusi</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Mendekati Waktu</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] mt-1">{upcomingCount}</div>
          <span className="text-[11px] text-amber-700 font-medium mt-0.5 block">Jadwal dalam 48 jam ke depan</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Selesai Dikerjakan</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] mt-1">{completedCount}</div>
          <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">Berita Acara telah terbit</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari SPBU, nama teknisi, catatan..."
              value={planSearch}
              onChange={(e) => setPlanSearch(e.target.value)}
              className="w-full min-h-[44px] pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={planSiteFilter}
              onChange={(e) => setPlanSiteFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              aria-label="Filter Site SPBU"
              className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="ALL">Semua Site SPBU</option>
              {activeSites.map(s => (
                <option key={s.id} value={s.id}>{s.site_code} - {s.site_name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={planPeriodFilter}
              onChange={(e) => setPlanPeriodFilter(e.target.value as PeriodFilterKey)}
              aria-label="Filter Periode Tanggal Jadwal"
              className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              {PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <select
              value={planStatusFilter}
              onChange={(e) => setPlanStatusFilter(e.target.value)}
              aria-label="Filter Status Jadwal"
              className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="Terjadwal">Terjadwal</option>
              <option value="Mendekati Waktu">Mendekati Waktu</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
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

        {planPeriodFilter === 'CUSTOM' && (
          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 flex flex-col sm:flex-row items-center gap-3 text-xs animate-in fade-in duration-150">
            <span className="font-bold text-blue-950 flex items-center gap-1.5 flex-shrink-0">
              <Calendar className="w-4 h-4 text-blue-700" />
              Pilih Rentang Tanggal Jadwal:
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="custom-plan-from" className="text-slate-600 font-medium">Dari:</label>
              <input
                id="custom-plan-from"
                type="date"
                value={customPlanDateFrom}
                onChange={(e) => setCustomPlanDateFrom(e.target.value)}
                className="min-h-[38px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="custom-plan-to" className="text-slate-600 font-medium">Sampai:</label>
              <input
                id="custom-plan-to"
                type="date"
                value={customPlanDateTo}
                onChange={(e) => setCustomPlanDateTo(e.target.value)}
                className="min-h-[38px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Schedule List Cards */}
      {filteredPlans.length === 0 ? (
        <div className="bg-white rounded-xl p-10 sm:p-14 text-center border border-slate-200 shadow-2xs space-y-3">
          <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto border border-slate-200">
            <CalendarCheck2 className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            {plans.length === 0 
              ? 'Belum Ada Jadwal Pemeliharaan (PM)' 
              : 'Tidak Ada Jadwal yang Cocok dengan Kriteria Filter'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {plans.length === 0
              ? 'Gunakan tombol "+ Jadwalkan Kunjungan PM Baru" di atas untuk menambahkan agenda pemeliharaan rutin SPBU.'
              : 'Silakan sesuaikan kembali kata kunci pencarian, filter SPBU, atau rentang periode tanggal jadwal di atas.'}
          </p>
          {isFilterActive && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="min-h-[40px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Tampilkan Semua Jadwal</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredPlans.map((p) => {
            const isCompleted = p.status === 'Selesai';
            const isNear = p.status === 'Mendekati Waktu';
            const targetSite = activeSites.find(s => s.id === p.site_id) || activeSites[0];

            return (
              <div 
                key={p.id}
                className={`bg-white rounded-xl p-5 border transition-all shadow-2xs ${
                  isNear 
                    ? 'border-amber-400 ring-1 ring-amber-400/20' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-700" />
                        {p.scheduled_date}
                      </span>
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded">
                        {p.plan_type === 'PREVENTIVE_MAINTENANCE' ? 'Preventive Maintenance (PM)' : p.plan_type === 'QUICK_CHECK' ? 'Pengecekan Cepat' : 'Perbaikan (Repair)'}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isCompleted 
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                          : isNear 
                          ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse' 
                          : 'bg-blue-50 text-blue-900 border-blue-200'
                      }`}>
                        {p.status}
                      </span>
                      <span className="text-xs text-slate-500">
                        Kode Site: <strong className="font-mono text-slate-800">{p.site_code}</strong>
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900">
                      {p.site_name}
                    </h3>

                    <p className="text-xs text-slate-700 font-medium">
                      {p.notes || 'Pemeriksaan rutin kelistrikan, dispenser, ATG, dan grounding forecourt.'}
                    </p>

                    <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap pt-0.5">
                      <span>Teknisi Ditugaskan: <strong className="text-slate-800">{p.assigned_technician}</strong></span>
                      <span>&bull;</span>
                      <span>Pengawas (PWS): <strong className="text-slate-800">{p.supervisor_pws}</strong></span>
                      <span>&bull;</span>
                      <span>Target Peralatan: <strong className="font-mono text-slate-800">{p.terminal_id}</strong></span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-start lg:self-center flex-wrap">
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => onStartExecutionFromPlan(targetSite, p.plan_type, p.terminal_id)}
                        className="min-h-[40px] px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Wrench className="w-3.5 h-3.5 text-blue-300" />
                        <span>Mulai Eksekusi PM</span>
                      </button>
                    )}

                    {currentUser.role === 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(p.id)}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        title="Hapus Jadwal"
                        aria-label="Hapus Jadwal"
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

      {/* MODAL: BUAT JADWAL BARU */}
      {isNewPlanModalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-300 overflow-hidden my-8 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="p-4 bg-[#0B2545] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Jadwalkan Kunjungan PM Baru</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Rencana akan tersimpan ke jadwal teknisi dan kalender sistem Turso
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPlanModalOpen(false)}
                className="w-8 h-8 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center font-bold text-lg"
              >
                X
              </button>
            </div>

            <form onSubmit={handleCreatePlanSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target SPBU</label>
                  <select
                    value={newPlanSiteId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setNewPlanSiteId(id);
                      const s = activeSites.find(site => site.id === id);
                      if (s) setNewPlanSpv(s.contact_person.split(' (')[0]);
                    }}
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    {activeSites.map(s => (
                      <option key={s.id} value={s.id}>{s.site_code} - {s.site_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tanggal Rencana</label>
                  <input
                    type="date"
                    required
                    value={newPlanDate}
                    onChange={(e) => setNewPlanDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Jenis Pekerjaan</label>
                  <select
                    value={newPlanType}
                    onChange={(e) => setNewPlanType(e.target.value as WorkType)}
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="PREVENTIVE_MAINTENANCE">Preventive Maintenance (PM)</option>
                    <option value="QUICK_CHECK">Pengecekan Cepat</option>
                    <option value="CORRECTIVE_REPAIR">Perbaikan (Repair)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Terminal / Posisi Alat</label>
                  <input
                    type="text"
                    required
                    value={newPlanTerminal}
                    onChange={(e) => setNewPlanTerminal(e.target.value)}
                    placeholder="Contoh: POS-01 & ISLANDS"
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Teknisi Ditugaskan</label>
                  {technicians.length > 0 ? (
                    <select
                      value={newPlanTech}
                      onChange={(e) => setNewPlanTech(e.target.value)}
                      className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      {technicians.map((t: any) => (
                        <option key={t.id} value={t.name}>{t.name} ({t.employeeId || 'Teknisi'})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={newPlanTech}
                      onChange={(e) => setNewPlanTech(e.target.value)}
                      placeholder="Nama Teknisi"
                      className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Pengawas (PWS) Site</label>
                  <input
                    type="text"
                    required
                    value={newPlanSpv}
                    onChange={(e) => setNewPlanSpv(e.target.value)}
                    placeholder="Nama PWS"
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Catatan Khusus Kunjungan</label>
                <textarea
                  rows={3}
                  value={newPlanNotes}
                  onChange={(e) => setNewPlanNotes(e.target.value)}
                  placeholder="Instruksi tambahan untuk teknisi (misal: uji kabel grounding tangki Pertamax)..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewPlanModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Simpan Jadwal PM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

