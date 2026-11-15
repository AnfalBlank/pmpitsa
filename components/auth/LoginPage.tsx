'use client';

import React, { useState, useEffect } from 'react';
import { UserSession, Site } from '@/lib/types';
import { SAMPLE_SITES } from '@/lib/sample-data';
import { loginApi, fetchSitesApi } from '@/lib/api-client';
import { 
  User, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff 
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserSession, selectedSite: Site) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sites, setSites] = useState<Site[]>(SAMPLE_SITES);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadSites = async () => {
      try {
        const cloudSites = await fetchSitesApi();
        if (isMounted && cloudSites && cloudSites.length > 0) {
          setSites(cloudSites);
        }
      } catch (err) {
        console.warn('Gagal memuat sites dari cloud:', err);
      }
    };
    loadSites();
    return () => { isMounted = false; };
  }, []);

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
        const matchedSite = sites.find((s) => s.id === assignedId) || sites[0];
        onLoginSuccess(result.user, matchedSite);
      } else {
        setErrorMsg(result.message || 'Username atau password tidak sesuai.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal memproses otentikasi: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      
      {/* Top Bar Status */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between text-white/80 text-xs py-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-300">Sistem Produksi Aktif</span>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Turso Cloud &bull; FMS Enterprise
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in-50 zoom-in-95 duration-200">
        
        {/* Brand Header */}
        <div className="bg-[#0B2545] p-6 text-white text-center relative border-b border-slate-700">
          
          {/* Official Logo Container */}
          <div className="w-20 h-20 mx-auto bg-white rounded-xl p-2 shadow-lg border border-slate-300 mb-3 flex items-center justify-center overflow-hidden">
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
            <span className="text-xs font-black tracking-wider text-red-400 uppercase">
              PERTAMINA
            </span>
            <span className="text-[10px] bg-red-950 text-red-200 px-2 py-0.5 rounded font-bold border border-red-800">
              INTERNATIONAL TIMOR, S.A.
            </span>
          </div>

          <h1 className="text-lg font-extrabold tracking-tight text-white mt-1">
            Portal Masuk Sistem PM & FMS
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Preventive Maintenance POS PINSYST & Fuel Management System
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">

          {errorMsg && (
            <div 
              role="alert"
              className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-800 font-semibold flex items-center gap-2 animate-in fade-in-50"
            >
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label 
                htmlFor="portal-username"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Username Petugas
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  id="portal-username"
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label 
                htmlFor="portal-password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Password Akun
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  id="portal-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full min-h-[44px] pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="min-h-[44px] min-w-[44px] absolute right-0 top-0 flex items-center justify-center text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg mt-4 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Memverifikasi Akun ke Database...</span>
              ) : (
                <>
                  <span>Masuk ke Sistem PM & FMS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Helpdesk Notice */}
          <div className="pt-3 border-t border-slate-200 text-center text-xs text-slate-500">
            <p className="text-[11px]">
              Kendala akses akun atau lupa password? Hubungi Administrator IT di <strong className="text-slate-700">admin.it@pertamina.tl</strong>
            </p>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center text-[11px] text-slate-400 py-3">
        Pertamina International Timor, S.A. &copy; 2026. Hak Cipta Dilindungi Undang-Undang.
      </div>

    </div>
  );
};
