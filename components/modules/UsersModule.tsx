'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  ShieldCheck, 
  Building2, 
  UserCheck, 
  Wrench, 
  Phone,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { UserSession, Site } from '@/lib/types';
import { SAMPLE_SITES } from '@/lib/sample-data';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
import { createUserApi, fetchUsersApi } from '@/lib/api-client';

interface UsersModuleProps {
  currentUser: UserSession;
  usersList: any[];
  sites?: Site[];
  onUsersUpdated: (users: any[]) => void;
}

export const UsersModule: React.FC<UsersModuleProps> = ({
  currentUser,
  usersList,
  sites,
  onUsersUpdated,
}) => {
  const activeSites = sites && sites.length > 0 ? sites : SAMPLE_SITES;
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // New User Modal State
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'TECHNICIAN' | 'SUPERVISOR' | 'ADMIN'>('TECHNICIAN');
  const [newUserSiteId, setNewUserSiteId] = useState<number>(activeSites[0]?.id || 1);
  const [newUserPhone, setNewUserPhone] = useState('');

  // Filtering
  const filteredUsers = usersList.filter(u => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchUsername = (u.username || '').toLowerCase().includes(q);
      const matchNik = (u.employeeId || '').toLowerCase().includes(q);
      if (!matchName && !matchUsername && !matchNik) return false;
    }
    return true;
  });

  const adminCount = usersList.filter(u => u.role === 'ADMIN').length;
  const spvCount = usersList.filter(u => u.role === 'SUPERVISOR').length;
  const techCount = usersList.filter(u => u.role === 'TECHNICIAN').length;

  const feedback = useFeedback();

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim() || !newPassword) {
      feedback.notify({ variant: 'warning', title: 'Data Belum Lengkap', message: 'Username, nama lengkap, dan password wajib diisi.' });
      return;
    }

    const payload = {
          username: newUsername.trim(),
          password: newPassword,
          name: newFullName.trim(),
          role: newUserRole,
          role_title: newUserRole === 'ADMIN' ? 'Administrator IT & Forecourt Central' : newUserRole === 'SUPERVISOR' ? 'Pengawas (PWS) Site SPBU' : 'Teknisi Lapangan POS & FMS',
          employee_id: `USR-${Date.now().toString().slice(-4)}`,
          phone: newUserPhone.trim() || '-',
          assigned_site_id: newUserRole === 'SUPERVISOR' ? newUserSiteId : 1,
        };
    const result = await feedback.run(() => createUserApi(payload), {
      pending: 'Membuat akun pengguna...',
      success: {
        title: 'Akun Berhasil Dibuat',
        message: <>Akun <strong>{payload.name}</strong> ({payload.username}) dapat langsung digunakan untuk login.</>,
      },
      error: { title: 'Gagal Membuat Akun', message: 'Akun belum tersimpan. Periksa data lalu coba lagi.' },
    });
    if (!result.success) return;

    setIsNewUserModalOpen(false);
    setNewUsername('');
    setNewFullName('');
    setNewUserPhone('');
    const users = await fetchUsersApi();
    if (users) onUsersUpdated(users);
  };

  return (
    <div className="space-y-6">

      {/* Top Action & Subtitle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Manajemen akun petugas, penugasan hak akses RBAC (Admin IT Central, Pengawas PWS, Teknisi Lapangan).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewUserModalOpen(true)}
          className="min-h-[44px] px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors self-start sm:self-auto flex-shrink-0"
        >
          <Plus className="w-4 h-4 text-slate-200" />
          <span>Tambah Akun Petugas Baru</span>
        </button>
      </div>

      {/* Stat Cards - Uniform Restrained Palette */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Pengguna Aktif</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] mt-1">{usersList.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Akun terdaftar di database Turso</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Administrator IT</span>
            <span className="w-2 h-2 rounded-full bg-slate-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] mt-1">{adminCount}</div>
          <span className="text-[11px] text-slate-600 font-medium mt-0.5 block">Akses penuh seluruh modul</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Pengawas (PWS)</span>
            <span className="w-2 h-2 rounded-full bg-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] mt-1">{spvCount}</div>
          <span className="text-[11px] text-blue-700 font-medium mt-0.5 block">Penugasan khusus per SPBU</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Teknisi Lapangan</span>
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] mt-1">{techCount}</div>
          <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">Mobile lintas seluruh site</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama petugas, username, atau NIK..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full min-h-[44px] pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter Peran Petugas"
              className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="ALL">Semua Peran (Role)</option>
              <option value="ADMIN">Administrator IT Central</option>
              <option value="SUPERVISOR">Pengawas (PWS) Site</option>
              <option value="TECHNICIAN">Teknisi Lapangan POS & FMS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                <th className="p-4">Nama Petugas & NIK</th>
                <th className="p-4">Username Akun</th>
                <th className="p-4">Peran (Role)</th>
                <th className="p-4">Lingkup / Site Penugasan</th>
                <th className="p-4">Kontak / Telepon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const assignedSite = activeSites.find(s => s.id === u.assignedSiteId);

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4">
                      <div className="font-extrabold text-slate-900 text-sm">{u.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{u.employeeId}</div>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-800">
                      {u.username}
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        u.role === 'ADMIN'
                          ? 'bg-slate-100 text-[#0B2545] border-slate-300'
                          : u.role === 'SUPERVISOR'
                          ? 'bg-blue-50 text-blue-900 border-blue-200'
                          : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      }`}>
                        {u.roleTitle || u.role}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">
                      {u.role === 'SUPERVISOR' ? (
                        <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                          <Building2 className="w-3.5 h-3.5 text-blue-700" />
                          <span>{assignedSite ? `${assignedSite.site_code} (${assignedSite.site_name.replace('SPBU Pertamina ', '')})` : `Site #${u.assignedSiteId}`}</span>
                        </div>
                      ) : u.role === 'TECHNICIAN' ? (
                        <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                          <Wrench className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Lintas Seluruh Site (Mobile)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[#0B2545] font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                          <span>Pusat (Seluruh SPBU)</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-mono text-slate-600">
                      {u.phone || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: TAMBAH USER BARU */}
      {isNewUserModalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-start sm:items-center justify-center p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-300 overflow-hidden my-8 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="p-4 bg-[#0B2545] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Tambah Akun Petugas Baru</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Akun akan langsung tersimpan dan aktif pada autentikasi portal Turso
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewUserModalOpen(false)}
                className="w-8 h-8 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center font-bold text-lg"
              >
                X
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Contoh: spv.dili"
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Contoh: Armando Da Costa"
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Peran Akses (Role)</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="TECHNICIAN">Teknisi Lapangan POS & FMS</option>
                    <option value="SUPERVISOR">Pengawas (PWS) Site</option>
                    <option value="ADMIN">Administrator IT Central</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {newUserRole === 'SUPERVISOR' ? 'Site Penugasan (PWS)' : 'Lingkup Penugasan'}
                  </label>
                  {newUserRole === 'SUPERVISOR' ? (
                    <select
                      value={newUserSiteId}
                      onChange={(e) => setNewUserSiteId(Number(e.target.value))}
                      className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      {activeSites.map(s => (
                        <option key={s.id} value={s.id}>{s.site_code} - {s.site_name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="min-h-[44px] px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 flex items-center">
                      {newUserRole === 'TECHNICIAN' ? 'Lintas Seluruh Site (Mobile)' : 'Pusat (Seluruh SPBU)'}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="+670 7700 0000"
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Simpan Akun Petugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

