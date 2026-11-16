'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  LayoutDashboard, 
  Settings, 
  Users, 
  Ticket, 
  Calendar, 
  FileText, 
  ClipboardCheck, 
  Wrench, 
  LogOut, 
  Clock, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { UserSession, Site } from '@/lib/types';
import { getAllTickets, getAllPlans } from '@/lib/storage';

export type AppModule = 
  | 'overview' 
  | 'tickets' 
  | 'schedule' 
  | 'reports' 
  | 'config' 
  | 'users' 
  | 'form' 
  | 'preview' 
  | 'landing';

interface AppSidebarProps {
  currentUser: UserSession;
  currentSite: Site;
  currentModule: AppModule;
  onSelectModule: (module: AppModule) => void;
  onLogout: () => void;
  onOpenLogin?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentUser,
  currentSite,
  currentModule,
  onSelectModule,
  onLogout,
  onOpenLogin,
}) => {
  const [openTicketCount, setOpenTicketCount] = useState(0);
  const [pendingPlanCount, setPendingPlanCount] = useState(0);

  useEffect(() => {
    try {
      const tickets = getAllTickets();
      const openT = tickets.filter(t => t.status !== 'Selesai (Resolved)');
      setOpenTicketCount(openT.length);

      const plans = getAllPlans();
      const upP = plans.filter(p => p.status !== 'Selesai');
      setPendingPlanCount(upP.length);
    } catch {}
  }, [currentModule]);

  const roleBadgeInfo = {
    ADMIN: {
      label: 'Admin IT Central',
      color: 'bg-slate-700/60 text-slate-200 border-slate-600',
    },
    SUPERVISOR: {
      label: 'Pengawas Site (PWS)',
      color: 'bg-slate-700/60 text-slate-200 border-slate-600',
    },
    TECHNICIAN: {
      label: 'Teknisi Lapangan POS',
      color: 'bg-slate-700/60 text-slate-200 border-slate-600',
    },
  }[currentUser.role];

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-[#0B2545] text-white border-r border-slate-700/80 fixed inset-y-0 left-0 z-30 select-none shadow-xl">
      
      {/* 1. Brand Header (Height 64px h-16, perfectly matching TopContextBar) */}
      <div className="h-16 px-4 bg-white border-b border-slate-200 flex items-center justify-center">
        <button
          type="button"
          onClick={() => onSelectModule('overview')}
          className="h-full w-full flex items-center justify-center focus:outline-hidden hover:opacity-90 transition-opacity"
          title="Beranda / Ikhtisar"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sa.jpeg"
            alt="Pertamina International Timor"
            className="max-h-12 w-auto max-w-full object-contain"
          />
        </button>
      </div>

      {/* 2. User Profile Card */}
      <div className="p-3 mx-3 mt-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-white text-[#0B2545] font-black text-xs flex items-center justify-center shadow-xs flex-shrink-0">
            {currentUser.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate leading-snug">
              {currentUser.name}
            </div>
            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border ${roleBadgeInfo.color} truncate max-w-full`}>
              {roleBadgeInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Links (Single Module Selectors with Unified Neutral/Red Hierarchy) */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 text-xs">
        
        {/* ==================================================== */}
        {/* ADMIN IT NAVIGATION (STRICT RBAC) */}
        {/* ==================================================== */}
        {currentUser.role === 'ADMIN' && (
          <>
            <div>
              <span className="block px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Pusat Kendali Operasional
              </span>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => onSelectModule('overview')}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left font-bold flex items-center justify-between transition-colors group ${
                    currentModule === 'overview'
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className={`w-4 h-4 ${currentModule === 'overview' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                    <span>Ikhtisar & Status SPBU</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectModule('tickets')}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left font-bold flex items-center justify-between transition-colors group ${
                    currentModule === 'tickets'
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Ticket className={`w-4 h-4 ${currentModule === 'tickets' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                    <span>Pusat Tiket Helpdesk</span>
                  </div>
                  {openTicketCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500 text-white">
                      {openTicketCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSelectModule('schedule')}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left font-bold flex items-center justify-between transition-colors group ${
                    currentModule === 'schedule'
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className={`w-4 h-4 ${currentModule === 'schedule' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                    <span>Perencanaan & Jadwal PM</span>
                  </div>
                  {pendingPlanCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-700 text-slate-100 border border-slate-600">
                      {pendingPlanCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSelectModule('reports')}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left font-bold flex items-center justify-between transition-colors group ${
                    currentModule === 'reports'
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className={`w-4 h-4 ${currentModule === 'reports' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                    <span>Arsip Berita Acara</span>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <span className="block px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Sistem & Master Data (Admin)
              </span>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => onSelectModule('config')}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left font-bold flex items-center justify-between transition-colors group ${
                    currentModule === 'config'
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className={`w-4 h-4 ${currentModule === 'config' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                    <span>Konfigurasi & Master Data</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectModule('users')}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left font-bold flex items-center justify-between transition-colors group ${
                    currentModule === 'users'
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className={`w-4 h-4 ${currentModule === 'users' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                    <span>Manajemen User & RBAC</span>
                  </div>
                </button>
              </div>
            </div>

          </>
        )}

        {/* ==================================================== */}
        {/* SUPERVISOR (PWS) NAVIGATION (STRICT RBAC: NO CONFIG/USERS) */}
        {/* ==================================================== */}
        {currentUser.role === 'SUPERVISOR' && (
          <>
            <div>
              <span className="block px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Pusat Pengawasan SPBU
              </span>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => onSelectModule('overview')}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left font-bold flex items-center justify-between transition-colors group ${
                    currentModule === 'overview'
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className={`w-4 h-4 ${currentModule === 'overview' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                    <span>Ikhtisar & Kesiapan SPBU</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectModule('tickets')}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left font-bold flex items-center justify-between transition-colors group ${
                    currentModule === 'tickets'
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Ticket className={`w-4 h-4 ${currentModule === 'tickets' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                    <span>Pusat Tiket Kendala</span>
                  </div>
                  {openTicketCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500 text-white">
                      {openTicketCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSelectModule('schedule')}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left font-bold flex items-center justify-between transition-colors group ${
                    currentModule === 'schedule'
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className={`w-4 h-4 ${currentModule === 'schedule' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                    <span>Perencanaan & Jadwal PM</span>
                  </div>
                  {pendingPlanCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-700 text-slate-100 border border-slate-600">
                      {pendingPlanCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSelectModule('reports')}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left font-bold flex items-center justify-between transition-colors group ${
                    currentModule === 'reports'
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className={`w-4 h-4 ${currentModule === 'reports' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                    <span>Arsip Berita Acara & Pengesahan</span>
                  </div>
                </button>
              </div>
            </div>

          </>
        )}

        {/* ==================================================== */}
        {/* TECHNICIAN NAVIGATION (STRICT RBAC: NO CONFIG/USERS) */}
        {/* ==================================================== */}
        {currentUser.role === 'TECHNICIAN' && (
          <>
            <div>
              <span className="block px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Workspace Teknisi
              </span>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => onSelectModule('overview')}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left font-bold flex items-center gap-2.5 transition-colors group ${
                    currentModule === 'overview'
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <Wrench className={`w-4 h-4 ${currentModule === 'overview' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                  <span>Workspace & Agenda Saya</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectModule('form')}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left font-bold flex items-center gap-2.5 transition-colors group ${
                    currentModule === 'form'
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <ClipboardCheck className={`w-4 h-4 ${currentModule === 'form' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                  <span>Formulir Checklist PM</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectModule('tickets')}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left font-bold flex items-center justify-between transition-colors group ${
                    currentModule === 'tickets'
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Ticket className={`w-4 h-4 ${currentModule === 'tickets' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                    <span>Tiket Kendala Saya</span>
                  </div>
                  {openTicketCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500 text-white">
                      {openTicketCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSelectModule('schedule')}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left font-bold flex items-center justify-between transition-colors group ${
                    currentModule === 'schedule'
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className={`w-4 h-4 ${currentModule === 'schedule' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                    <span>Jadwal PM Saya</span>
                  </div>
                  {pendingPlanCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-700 text-slate-100 border border-slate-600">
                      {pendingPlanCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSelectModule('reports')}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left font-bold flex items-center gap-2.5 transition-colors group ${
                    currentModule === 'reports'
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <Clock className={`w-4 h-4 ${currentModule === 'reports' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                  <span>Riwayat Laporan Saya</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectModule('preview')}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left font-bold flex items-center gap-2.5 transition-colors group ${
                    currentModule === 'preview'
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <FileText className={`w-4 h-4 ${currentModule === 'preview' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                  <span>Pratinjau Berita Acara</span>
                </button>
              </div>
            </div>
          </>
        )}

      </nav>

      {/* 4. Footer & Logout */}
      <div className="p-3 border-t border-slate-700/80 bg-[#071b33] space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-sans font-semibold">Turso Connected</span>
          </div>
          <span>v1.0</span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full min-h-[44px] px-3 py-2 bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-800 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span>Keluar dari Portal</span>
        </button>
      </div>

    </aside>
  );
};
