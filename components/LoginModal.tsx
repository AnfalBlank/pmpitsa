'use client';

import React, { useState } from 'react';
import { UserSession, Site } from '@/lib/types';
import { SAMPLE_SITES } from '@/lib/sample-data';
import { loginApi } from '@/lib/api-client';
import { 
  User, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff 
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserSession, selectedSite: Site) => void;
  currentUser: UserSession;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username dan password wajib diisi.');
      setIsLoading(false);
      return;
    }

    try {
      const result = await loginApi(username.trim(), password);

      if (result.success && result.user) {
        const assignedId = result.user.assignedSiteId || 1;
        const site = SAMPLE_SITES.find((s) => s.id === assignedId) || SAMPLE_SITES[0];
        onLoginSuccess(result.user, site);
      } else {
        setErrorMsg(result.message || 'Username atau password tidak sesuai.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal memproses login: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-300 overflow-hidden flex flex-col my-auto animate-in fade-in-50 zoom-in-95 duration-150">
        
        {/* Header with Official Pertamina International Timor Logo */}
        <div className="bg-[#0B2545] p-5 text-white text-center relative border-b border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-400 hover:text-white w-8 h-8 rounded flex items-center justify-center font-bold text-lg"
            title="Tutup dialog login"
          >
            X
          </button>

          <div className="w-16 h-16 mx-auto bg-white rounded-lg p-1.5 shadow-md border border-slate-200 mb-3 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-pertamina-timor.png"
              alt="Logo Pertamina International Timor, S.A."
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo-pertamina-timor.jpeg';
              }}
            />
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-[11px] font-black tracking-wider text-red-400 uppercase">
              PERTAMINA
            </span>
            <span className="text-[9px] bg-red-950 text-red-200 px-1.5 py-0.5 rounded font-bold border border-red-800">
              TIMOR, S.A.
            </span>
          </div>

          <h2 className="text-base font-extrabold tracking-tight text-white">
            Ganti Akun &bull; Portal Masuk PM & FMS
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Pertamina International Timor, S.A.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-300 rounded text-xs text-red-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form Inputs */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label 
                htmlFor="login-username"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Username Petugas
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  id="login-username"
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label 
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Password Akun
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full min-h-[44px] pl-9 pr-10 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-xs mt-3 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Memproses Otentikasi...</span>
              ) : (
                <>
                  <span>Masuk ke Sistem PM & FMS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Production Helpdesk Footer */}
          <div className="pt-3 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-600 font-medium">
              Pertamina International Timor, S.A. &bull; Enterprise IT Portal
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Kendala akses akun? Hubungi Helpdesk IT Support di Dili Central Office.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
