'use client';

import React, { useState, useEffect } from 'react';
import { UserSession, Site } from '@/lib/types';
import { SAMPLE_SITES } from '@/lib/sample-data';
import { loginApi, fetchSitesApi } from '@/lib/api-client';
import { Spinner } from '@/components/ui/Loading';
import { 
  User, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff 
} from 'lucide-react';

const LAST_USER_KEY = 'pertamina_pm_last_username';

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
  const [capsLock, setCapsLock] = useState(false);
  const [offline, setOffline] = useState(false);

  // Remember the last username on this device (password is left to the browser / password manager)
  useEffect(() => {
    try {
      const last = localStorage.getItem(LAST_USER_KEY);
      if (last) setUsername(last);
    } catch {}
    const upd = () => setOffline(!navigator.onLine);
    upd();
    window.addEventListener('online', upd);
    window.addEventListener('offline', upd);
    return () => {
      window.removeEventListener('online', upd);
      window.removeEventListener('offline', upd);
    };
  }, []);

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
        try {
          localStorage.setItem(LAST_USER_KEY, username.trim());
        } catch {}
        const assignedId = result.user.assignedSiteId || 1;
        const matchedSite = sites.find((s) => s.id === assignedId) || sites[0];
        onLoginSuccess(result.user, matchedSite);
      } else {
        setErrorMsg(result.message || 'Username atau password tidak sesuai.');
      }
    } catch (err: any) {
      setErrorMsg('Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pm-loading-bg flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div aria-hidden="true" />

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

          <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.08em] sm:tracking-[0.14em] text-slate-300 uppercase whitespace-nowrap">
            Pertamina International Timor, S.A.
          </p>
          <h1 className="text-xl font-extrabold tracking-tight text-white mt-1.5">
            Portal PM &amp; FMS
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Pemeliharaan POS PINSYST &amp; Fuel Management System SPBU
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">

          {offline && (
            <div role="status" className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Perangkat sedang offline. Sambungkan internet untuk masuk.</span>
            </div>
          )}

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
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="portal-username"
                  type="text"
                  name="username"
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  aria-invalid={!!errorMsg}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full min-h-[48px] pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none transition-colors"
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
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="portal-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  aria-invalid={!!errorMsg}
                  aria-describedby={capsLock ? 'caps-lock-hint' : undefined}
                  onKeyUp={(e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)}
                  onKeyDown={(e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full min-h-[48px] pl-9 pr-12 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="min-h-[48px] min-w-[48px] absolute right-0 top-0 flex items-center justify-center text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {capsLock && (
                <p id="caps-lock-hint" className="mt-1 text-[11px] font-semibold text-amber-700">
                  Caps Lock aktif — password membedakan huruf besar &amp; kecil.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || offline}
              className="w-full min-h-[48px] bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg mt-4 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Spinner size={18} label="Memeriksa akun" />
                  <span>Memeriksa akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Helpdesk Notice */}
          <div className="pt-3 border-t border-slate-200 text-center text-xs text-slate-500">
            <p className="text-[11px]">
              Lupa password atau akun terkunci? Hubungi Administrator IT:{' '}
              <a href="mailto:admin.it@pertamina.tl" className="font-bold text-slate-700 underline underline-offset-2">
                admin.it@pertamina.tl
              </a>
            </p>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center text-[11px] text-slate-300/80 py-3">
        Pertamina International Timor, S.A. &copy; 2026. Hak Cipta Dilindungi Undang-Undang.
      </div>

    </div>
  );
};
