'use client';

import React, { useState } from 'react';
import { 
  Building2,
  Wifi, 
  WifiOff, 
  User, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  Server,
  LayoutDashboard,
  Ticket,
  Calendar,
  FileText,
  Settings,
  Users,
  ClipboardCheck
} from 'lucide-react';
import { Site, UserSession } from '@/lib/types';
import { AppModule } from './AppSidebar';

interface TopContextBarProps {
  currentSite?: Site;
  terminalId?: string;
  onSelectSite?: (site: Site) => void;
  currentModule: AppModule;
  lastSavedText?: string;
  currentUser: UserSession;
  onOpenLogin?: () => void;
  onLogout: () => void;
}

export const TopContextBar: React.FC<TopContextBarProps> = ({
  currentModule,
  currentUser,
  onLogout,
}) => {
  // Dynamic Module Meta
  const moduleMeta: Record<AppModule, { title: string; icon: React.ReactNode }> = {
    overview: {
      title: currentUser.role === 'ADMIN' 
        ? 'Ikhtisar & Status SPBU' 
        : currentUser.role === 'SUPERVISOR' 
        ? `Kesiapan Operasional SPBU` 
        : 'Workspace & Agenda Teknisi',
      icon: <LayoutDashboard className="w-4 h-4 text-slate-600" />
    },
    tickets: {
      title: 'Pusat Tiket Helpdesk & Gangguan',
      icon: <Ticket className="w-4 h-4 text-slate-600" />
    },
    schedule: {
      title: 'Perencanaan & Jadwal Pemeliharaan (PM)',
      icon: <Calendar className="w-4 h-4 text-slate-600" />
    },
    reports: {
      title: 'Arsip Dokumen Berita Acara Resmi',
      icon: <FileText className="w-4 h-4 text-slate-600" />
    },
    config: {
      title: 'Konfigurasi & Master Data SPBU',
      icon: <Settings className="w-4 h-4 text-slate-600" />
    },
    users: {
      title: 'Manajemen Pengguna & Hak Akses (RBAC)',
      icon: <Users className="w-4 h-4 text-slate-600" />
    },
    form: {
      title: 'Formulir Pemeriksaan Teknis PM',
      icon: <ClipboardCheck className="w-4 h-4 text-slate-600" />
    },
    preview: {
      title: 'Pratinjau Berita Acara PDF Resmi',
      icon: <FileText className="w-4 h-4 text-slate-600" />
    },
    landing: {
      title: 'Pemilihan Kegiatan Lapangan',
      icon: <Building2 className="w-4 h-4 text-slate-600" />
    },
  };

  const activeMeta = moduleMeta[currentModule] || moduleMeta.overview;

  const roleLabel = {
    ADMIN: 'Admin IT Central',
    SUPERVISOR: 'Pengawas (PWS)',
    TECHNICIAN: 'Teknisi POS',
  }[currentUser.role];

  return (
    <>
      <header className="hidden lg:flex items-center justify-between px-6 h-16 bg-white border-b border-slate-200 shadow-2xs sticky top-0 z-20">
        
        {/* Left: Breadcrumbs & Current Page Title (Unified with Sidebar Header) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="font-extrabold text-[#ED1C24] tracking-wider uppercase text-[11px]">
              PERTAMINA
            </span>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
              PORTAL
            </span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

          <div className="flex items-center gap-2">
            {activeMeta.icon}
            <h1 className="font-extrabold text-[#0B2545] text-sm tracking-tight">
              {activeMeta.title}
            </h1>
          </div>
        </div>

        {/* Right: Turso Status & User Profile */}
        <div className="flex items-center gap-3">

          {/* Turso Cloud Database Live Indicator */}
          <div
            className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border bg-slate-50 text-slate-700 border-slate-200"
            title="Database Turso Cloud Aktif"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-800">Turso Cloud</span>
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 bg-slate-100 pl-2.5 pr-1.5 py-1 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-900">{currentUser.name.split(' ')[0]}</span>
              <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                {roleLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-slate-200 transition-colors"
              title="Keluar dari Akun"
              aria-label="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </header>
    </>
  );
};
