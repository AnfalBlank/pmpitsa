'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import { UserSession, Site } from '@/lib/types';
import { AppModule } from './AppSidebar';
import { ProfileMenu } from './ProfileMenu';

interface MobileTopBarProps {
  currentUser: UserSession;
  currentSite?: Site;
  onSelectModule?: (module: AppModule) => void;
  onLogout: () => void;
  onOpenLogin?: () => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  currentUser,
  currentSite,
  onSelectModule,
  onLogout,
}) => {
  return (
    <header className="lg:hidden sticky top-0 z-30 h-16 bg-white border-b border-slate-200 shadow-2xs px-3 sm:px-4 flex items-center justify-between select-none">
      
      {/* Brand Logo: Clean /sa.jpeg */}
      <div className="flex items-center min-w-0">
        <button
          type="button"
          onClick={() => {
            if (onSelectModule) {
              onSelectModule('overview');
            } else if (typeof window !== 'undefined') {
              window.location.href = '/dashboard';
            }
          }}
          className="flex items-center focus:outline-hidden hover:opacity-90 transition-opacity"
          title="Beranda / Ikhtisar SPBU"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sa.jpeg"
            alt="Pertamina International Timor"
            className="h-10 sm:h-11 w-auto max-w-[170px] sm:max-w-[220px] object-contain"
          />
        </button>
      </div>

      {/* User Profile & Logout Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ProfileMenu currentUser={currentUser} assignedSite={currentSite} onLogout={onLogout} compact />

        <button
          type="button"
          onClick={onLogout}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors shadow-2xs"
          title="Keluar dari Akun"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4 text-red-600" />
        </button>
      </div>

    </header>
  );
};
