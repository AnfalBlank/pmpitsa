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
import { ProfileMenu } from './ProfileMenu';

interface TopContextBarProps {
  /** Notification bell */
  notificationSlot?: React.ReactNode;
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
  currentSite,
  currentModule,
  currentUser,
  onLogout,
  notificationSlot,
}) => {
  const [online, setOnline] = React.useState(true);
  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
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
      <header className="hidden lg:flex items-center justify-between gap-4 px-6 h-16 min-h-16 flex-shrink-0 bg-white/95 backdrop-blur border-b border-slate-200 shadow-2xs sticky top-0 z-20">
        
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

          {/* Real connection status */}
          <span
            className={`hidden xl:inline-flex min-h-[36px] px-3 rounded-lg text-xs font-semibold items-center gap-2 border ${
              online ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}
            title={online ? 'Terhubung ke server' : 'Offline — data tersimpan di perangkat'}
          >
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {online ? 'Online' : 'Offline'}
          </span>

          {notificationSlot}

          <ProfileMenu currentUser={currentUser} assignedSite={currentSite} onLogout={onLogout} />
        </div>

      </header>

      {/* Mobile page title (desktop shows it in the header above) */}
      {!['overview', 'form', 'preview', 'landing'].includes(currentModule) && (
        <div className="lg:hidden px-4 sm:px-6 pt-5 -mb-3 max-w-7xl mx-auto w-full">
          <h1 className="text-lg font-extrabold text-[#0B2545] leading-tight flex items-center gap-2">
            {activeMeta.icon}
            <span>{activeMeta.title}</span>
          </h1>
        </div>
      )}
    </>
  );
};
