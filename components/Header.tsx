'use client';

import React, { useState } from 'react';
import { Site, UserSession } from '@/lib/types';
import { SAMPLE_SITES } from '@/lib/sample-data';
import { 
  Building2, 
  Server, 
  Wifi, 
  WifiOff, 
  History, 
  FileText, 
  CheckCircle2, 
  User, 
  Menu, 
  X, 
  ChevronRight,
  Home,
  ShieldCheck,
  LogOut,
  Settings
} from 'lucide-react';

interface HeaderProps {
  currentSite: Site;
  terminalId: string;
  onSelectSite: (site: Site) => void;
  activeView: 'landing' | 'form' | 'history' | 'preview' | 'admin';
  onSwitchView: (view: 'landing' | 'form' | 'history' | 'preview' | 'admin') => void;
  lastSavedText: string;
  currentUser: UserSession;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenConfig?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSite,
  terminalId,
  onSelectSite,
  activeView,
  onSwitchView,
  lastSavedText,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenConfig,
}) => {
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const roleDashboardLabel = 
    currentUser.role === 'TECHNICIAN'
      ? 'Workspace Teknisi'
      : currentUser.role === 'SUPERVISOR'
      ? 'Portal Pengawas (PWS)'
      : 'Master Admin IT';

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#0B2545] text-white border-b border-slate-700/80 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          {/* Main Clean Top Bar */}
          <div className="h-16 flex items-center justify-between gap-4">
            
            {/* Left: Brand Logo & Title */}
            <button
              type="button"
              onClick={() => onSwitchView('landing')}
              className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-lg p-1 -ml-1 transition-opacity hover:opacity-95"
            >
              {/* Official Logo Container */}
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center p-1 flex-shrink-0 shadow-sm border border-slate-300 overflow-hidden">
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
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black tracking-wider text-red-400 uppercase">
                    PERTAMINA
                  </span>
                  <span className="text-[9px] bg-red-950 text-red-200 px-1.5 py-0.5 rounded font-bold border border-red-800">
                    TIMOR, S.A.
                  </span>
                </div>
                <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight leading-none mt-0.5">
                  PM POS PINSYST & FMS
                </h1>
              </div>
            </button>

            {/* Desktop Actions (Hidden on Mobile < 768px to prevent cramped overlap) */}
            <div className="hidden md:flex items-center gap-3">
              
              {/* Online/Offline Simulator */}
              <button
                type="button"
                onClick={() => setIsOnline(!isOnline)}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                  isOnline 
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900' 
                    : 'bg-amber-950/70 text-amber-300 border-amber-700/80 hover:bg-amber-900'
                }`}
                title={isOnline ? "Mode Online (Tersinkronisasi)" : "Mode Offline"}
              >
                {isOnline ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Online Sync</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Offline Cache</span>
                  </>
                )}
              </button>

              {/* View Switchers */}
              <button
                type="button"
                onClick={() => onSwitchView(activeView === 'preview' ? 'form' : 'preview')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors border ${
                  activeView === 'preview'
                    ? 'bg-red-600 text-white border-red-500 shadow-sm'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-red-300" />
                <span>{activeView === 'preview' ? 'Kembali ke Form' : 'Berita Acara'}</span>
              </button>

              <button
                type="button"
                onClick={() => onSwitchView(activeView === 'history' ? 'landing' : 'history')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors border ${
                  activeView === 'history'
                    ? 'bg-red-600 text-white border-red-500 shadow-sm'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <History className="w-3.5 h-3.5 text-blue-300" />
                <span>Riwayat PM</span>
              </button>

              {/* Role-Specific Dashboard Switcher */}
              <button
                type="button"
                onClick={() => onSwitchView(activeView === 'admin' ? 'landing' : 'admin')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors border ${
                  activeView === 'admin'
                    ? 'bg-red-600 text-white border-red-500 shadow-sm'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
                title={`Buka ${roleDashboardLabel}`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>{roleDashboardLabel}</span>
              </button>

              {/* Master Configuration direct shortcut for ADMIN */}
              {currentUser.role === 'ADMIN' && onOpenConfig && (
                <button
                  type="button"
                  onClick={onOpenConfig}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors border bg-slate-800 text-slate-100 border-amber-500/80 hover:bg-slate-700 shadow-2xs"
                  title="Buka Menu Konfigurasi Master Data SPBU"
                >
                  <Settings className="w-3.5 h-3.5 text-amber-400" />
                  <span>Konfigurasi</span>
                </button>
              )}

              {/* User Profile Pill */}
              <button
                type="button"
                onClick={onOpenLogin}
                className="min-h-[40px] pl-2 pr-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 bg-[#134074] hover:bg-[#1a4f8d] text-white border border-blue-500/80 transition-colors shadow-2xs"
                title={`Profil aktif: ${currentUser.name}`}
              >
                <div className="w-6 h-6 rounded-full bg-white text-[#0B2545] flex items-center justify-center font-black text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left">
                  <div className="font-bold leading-tight">{currentUser.name.split(' ')[0]}</div>
                  <div className="text-[10px] text-blue-200 leading-none">{currentUser.role}</div>
                </div>
              </button>

              {/* Logout Button */}
              <button
                type="button"
                onClick={onLogout}
                className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-800 transition-colors"
                title="Keluar dari Akun (Logout)"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden lg:inline">Keluar</span>
              </button>
            </div>

            {/* Mobile Actions: Clean Avatar + Hamburger Menu */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={onOpenLogin}
                className="w-9 h-9 rounded-full bg-white text-[#0B2545] font-black text-xs flex items-center justify-center shadow-xs border border-slate-300"
                title={`Profil: ${currentUser.name}`}
              >
                {currentUser.name.charAt(0)}
              </button>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700 border border-slate-700 transition-colors"
                aria-label="Buka Menu Navigasi"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Slide-Down Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-3 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
            
            {/* Active User Summary */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/80 border border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white text-[#0B2545] flex items-center justify-center font-black text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{currentUser.name}</div>
                  <div className="text-[10px] text-blue-300">{currentUser.roleTitle}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold bg-[#134074] hover:bg-blue-700 text-white rounded border border-blue-500"
                >
                  Ganti Akun
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold bg-red-900 hover:bg-red-800 text-white rounded border border-red-700 flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onSwitchView('landing');
                }}
                className="min-h-[44px] p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 border border-slate-700"
              >
                <Home className="w-4 h-4 text-slate-300" />
                <span>Halaman Depan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onSwitchView('preview');
                }}
                className="min-h-[44px] p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 border border-slate-700"
              >
                <FileText className="w-4 h-4 text-red-400" />
                <span>Berita Acara</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onSwitchView('history');
                }}
                className="min-h-[44px] p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 border border-slate-700"
              >
                <History className="w-4 h-4 text-blue-400" />
                <span>Riwayat PM</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onSwitchView('admin');
                }}
                className={`min-h-[44px] p-2.5 rounded-lg text-white text-xs font-semibold flex items-center gap-2 border ${
                  activeView === 'admin'
                    ? 'bg-red-600 border-red-500'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>{roleDashboardLabel}</span>
              </button>

              {currentUser.role === 'ADMIN' && onOpenConfig && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenConfig();
                  }}
                  className="min-h-[44px] p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 border border-amber-500/80 col-span-2"
                >
                  <Settings className="w-4 h-4 text-amber-400" />
                  <span>Konfigurasi & Master Data SPBU</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOnline(!isOnline)}
                className={`min-h-[44px] p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
                  isOnline 
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700' 
                    : 'bg-amber-950/80 text-amber-300 border-amber-700'
                }`}
              >
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    <span>Mode Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-amber-400" />
                    <span>Mode Offline</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Site Switcher in Drawer */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsSiteModalOpen(true);
                }}
                className="w-full min-h-[44px] px-3 py-2 bg-slate-800/90 text-left rounded-lg text-xs flex items-center justify-between border border-slate-700"
              >
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 uppercase block">Site SPBU Aktif:</span>
                  <span className="font-bold text-slate-200">{currentSite.site_name}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>
            </div>

          </div>
        )}
      </header>

      {/* Modal Pemilihan Site / SPBU */}
      {isSiteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-300 overflow-hidden">
            <div className="p-4 bg-[#0B2545] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Pilih Site / SPBU Pertamina</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Daftar SPBU Pertamina International Timor, S.A.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSiteModalOpen(false)}
                className="w-8 h-8 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center font-bold text-lg"
              >
                X
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 divide-y divide-slate-100 flex-1">
              {SAMPLE_SITES.map((site) => {
                const isSelected = site.id === currentSite.id;
                return (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => {
                      onSelectSite(site);
                      setIsSiteModalOpen(false);
                    }}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all pt-3 flex flex-col gap-1 min-h-[50px] ${
                      isSelected
                        ? 'border-red-500 bg-red-50/70 ring-2 ring-red-500/30'
                        : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                        {site.site_code}
                      </span>
                      <span className="text-[11px] font-semibold text-blue-900">
                        {site.regional}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      {site.site_name}
                    </span>
                    <span className="text-xs text-slate-600">
                      {site.location}
                    </span>
                    <span className="text-[11px] text-slate-500 italic mt-0.5">
                      Pengawas: {site.contact_person}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSiteModalOpen(false)}
                className="min-h-[44px] px-5 py-2 bg-slate-800 text-white rounded-lg font-medium text-xs hover:bg-slate-900"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
