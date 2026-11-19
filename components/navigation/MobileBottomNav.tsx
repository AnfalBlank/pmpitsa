'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Ticket, 
  Calendar, 
  FileText, 
  Wrench, 
  Building2, 
  Users,
  ClipboardCheck, History, BarChart3 } from 'lucide-react';
import { UserSession } from '@/lib/types';
import { getAllTickets } from '@/lib/storage';
import { AppModule } from './AppSidebar';

interface MobileBottomNavProps {
  currentUser: UserSession;
  currentModule: AppModule;
  onSelectModule: (module: AppModule) => void;
  onLogout: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentUser,
  currentModule,
  onSelectModule,
}) => {
  const [openTicketCount, setOpenTicketCount] = useState(0);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  useEffect(() => {
    setAdminMenuOpen(false);
  }, [currentModule]);

  useEffect(() => {
    try {
      const tickets = getAllTickets();
      const openT = tickets.filter(t => t.status !== 'Selesai (Resolved)');
      setOpenTicketCount(openT.length);
    } catch {}
  }, [currentModule]);

  // When user is filling out the form, hide this nav so BottomBar stepper takes priority with zero overlap
  if ((currentModule as string) === 'form') {
    return null;
  }

  return (
    <nav 
      aria-label="Navigasi Bawah Mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B2545] border-t border-slate-700/90 shadow-2xl px-2 pt-1.5 pb-safe-1.5"
    >
      {adminMenuOpen && currentUser.role === 'ADMIN' && (
        <>
          <button
            type="button"
            aria-label="Tutup menu admin"
            onClick={() => setAdminMenuOpen(false)}
            className="fixed inset-0 -z-10 bg-black/40 cursor-default"
          />
          <div
            role="menu"
            className="absolute bottom-full right-2 mb-2 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5"
          >
            {([
              { mod: 'config' as AppModule, label: 'Konfigurasi & Master Data', Icon: Settings },
              { mod: 'users' as AppModule, label: 'Manajemen User & Akses', Icon: Users },
              { mod: 'laporan' as AppModule, label: 'Laporan PM / CM', Icon: BarChart3 },
              { mod: 'audit' as AppModule, label: 'Audit Log', Icon: History },
            ]).map(({ mod, label, Icon }) => (
              <button
                key={mod}
                type="button"
                role="menuitem"
                onClick={() => {
                  setAdminMenuOpen(false);
                  onSelectModule(mod);
                }}
                className={`w-full min-h-[48px] px-3 rounded-lg flex items-center gap-3 text-sm font-semibold text-left transition-colors ${
                  currentModule === mod ? 'bg-red-50 text-red-700' : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className={`grid ${currentUser.role === 'SUPERVISOR' ? 'grid-cols-4' : 'grid-cols-5'} gap-1 items-center max-w-lg mx-auto`}>
        
        {/* ==================================================== */}
        {/* ADMIN MOBILE TABS */}
        {/* ==================================================== */}
        {currentUser.role === 'ADMIN' && (
          <>
            <button
              type="button"
              onClick={() => onSelectModule('overview')}
              className={`min-h-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                currentModule === 'overview'
                  ? 'bg-[#ED1C24] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-[10px] truncate">Ikhtisar</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectModule('tickets')}
              className={`min-h-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                currentModule === 'tickets'
                  ? 'bg-[#ED1C24] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Ticket className="w-4 h-4" />
              {openTicketCount > 0 && (
                <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                  {openTicketCount}
                </span>
              )}
              <span className="text-[10px] truncate">Tiket</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectModule('schedule')}
              className={`min-h-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                currentModule === 'schedule'
                  ? 'bg-[#ED1C24] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="text-[10px] truncate">Jadwal</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectModule('reports')}
              aria-current={currentModule === 'reports' ? 'page' : undefined}
              className={`min-h-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                currentModule === 'reports'
                  ? 'bg-[#ED1C24] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="text-[10px] truncate">Arsip BA</span>
            </button>

            <button
              type="button"
              onClick={() => setAdminMenuOpen((v) => !v)}
              aria-expanded={adminMenuOpen}
              aria-haspopup="menu"
              className={`min-h-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                currentModule === 'config' || currentModule === 'users' || currentModule === 'audit' || currentModule === 'laporan' || adminMenuOpen
                  ? 'bg-[#ED1C24] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-[10px] truncate">Admin</span>
            </button>
          </>
        )}

        {/* ==================================================== */}
        {/* SUPERVISOR MOBILE TABS */}
        {/* ==================================================== */}
        {currentUser.role === 'SUPERVISOR' && (
          <>
            <button
              type="button"
              onClick={() => onSelectModule('overview')}
              className={`min-h-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                currentModule === 'overview'
                  ? 'bg-[#ED1C24] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span className="text-[10px] truncate">Ikhtisar</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectModule('tickets')}
              className={`min-h-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                currentModule === 'tickets'
                  ? 'bg-[#ED1C24] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Ticket className="w-4 h-4" />
              {openTicketCount > 0 && (
                <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                  {openTicketCount}
                </span>
              )}
              <span className="text-[10px] truncate">Tiket</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectModule('schedule')}
              className={`min-h-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                currentModule === 'schedule'
                  ? 'bg-[#ED1C24] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="text-[10px] truncate">Jadwal</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectModule('reports')}
              className={`min-h-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                currentModule === 'reports'
                  ? 'bg-[#ED1C24] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="text-[10px] truncate">Arsip BA</span>
            </button>

          </>
        )}

        {/* ==================================================== */}
        {/* TECHNICIAN MOBILE TABS */}
        {/* ==================================================== */}
        {currentUser.role === 'TECHNICIAN' && (
          <>
            <button
              type="button"
              onClick={() => onSelectModule('overview')}
              className={`min-h-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                currentModule === 'overview'
                  ? 'bg-[#ED1C24] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span className="text-[10px] truncate">Agenda</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectModule('form')}
              className={`min-h-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                currentModule === 'form'
                  ? 'bg-[#ED1C24] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span className="text-[10px] truncate">Form PM</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectModule('tickets')}
              className={`min-h-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                currentModule === 'tickets'
                  ? 'bg-[#ED1C24] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Ticket className="w-4 h-4" />
              {openTicketCount > 0 && (
                <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                  {openTicketCount}
                </span>
              )}
              <span className="text-[10px] truncate">Tiket</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectModule('schedule')}
              className={`min-h-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                currentModule === 'schedule'
                  ? 'bg-[#ED1C24] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="text-[10px] truncate">Jadwal</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectModule('reports')}
              className={`min-h-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                currentModule === 'reports'
                  ? 'bg-[#ED1C24] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="text-[10px] truncate">Arsip</span>
            </button>
          </>
        )}

      </div>
    </nav>
  );
};
