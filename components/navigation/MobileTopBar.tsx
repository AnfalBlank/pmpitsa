'use client';

import React from 'react';
import { UserSession, Site } from '@/lib/types';
import { AppModule } from './AppSidebar';
import { ProfileMenu } from './ProfileMenu';

interface MobileTopBarProps {
  currentUser: UserSession;
  currentSite?: Site;
  onSelectModule?: (module: AppModule) => void;
  onLogout: () => void;
  onOpenLogin?: () => void;
  /** Notification bell (rendered next to the profile) */
  notificationSlot?: React.ReactNode;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  currentUser,
  currentSite,
  onSelectModule,
  onLogout,
  notificationSlot,
}) => {
  return (
    <header className="lg:hidden sticky top-0 z-30 h-16 min-h-16 flex-shrink-0 bg-white/95 backdrop-blur border-b border-slate-200 shadow-2xs px-3 sm:px-4 flex items-center justify-between gap-3 select-none">
      
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
            className="h-9 sm:h-10 w-auto max-w-[150px] sm:max-w-[200px] object-contain"
          />
        </button>
      </div>

      {/* User Profile & Logout Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {notificationSlot}
        <ProfileMenu currentUser={currentUser} assignedSite={currentSite} onLogout={onLogout} compact />


      </div>

    </header>
  );
};
