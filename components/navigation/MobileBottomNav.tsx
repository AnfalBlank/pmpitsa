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
  ClipboardCheck
} from 'lucide-react';
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
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B2545] border-t border-slate-700/90 shadow-2xl px-2 py-1.5 pb-safe"
    >
      <div className="grid grid-cols-5 gap-1 items-center max-w-lg mx-auto">
        
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
              onClick={() => onSelectModule('config')}
              className={`min-h-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                currentModule === 'config'
                  ? 'bg-[#ED1C24] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-[10px] truncate">Konfig</span>
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
              onClick={() => onSelectModule('users')}
              className={`min-h-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                currentModule === 'users'
                  ? 'bg-[#ED1C24] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="text-[10px] truncate">User</span>
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
