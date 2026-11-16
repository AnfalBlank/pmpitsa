'use client';

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Building2, 
  UserCheck, 
  Wrench, 
  Trash2, 
  MessageSquare,
  AlertCircle,
  Filter,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { UserSession, Site, SPBUTicket, TicketPriority, TicketCategory, TicketStatus } from '@/lib/types';
import { SAMPLE_SITES } from '@/lib/sample-data';
import { saveTicket, updateTicketStatus } from '@/lib/storage';
import { createTicketApi, updateTicketApi, deleteTicketApi } from '@/lib/api-client';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
import { can, siteScope } from '@/lib/rbac';
import { isDateInPeriod, PERIOD_OPTIONS, PeriodFilterKey } from '@/lib/date-filters';

interface TicketsModuleProps {
  currentUser: UserSession;
  tickets: SPBUTicket[];
  sites?: Site[];
  usersList?: any[];
  onTicketsUpdated: (tickets: SPBUTicket[]) => void;
  onStartRepairFromTicket?: (ticket: SPBUTicket) => void;
}

export const TicketsModule: React.FC<TicketsModuleProps> = ({
  currentUser,
  tickets,
  sites,
  usersList,
  onTicketsUpdated,
  onStartRepairFromTicket,
}) => {
  const scope = siteScope(currentUser);
  const allSites = sites && sites.length > 0 ? sites : SAMPLE_SITES;
  // Supervisor: only own SPBU is selectable anywhere in this module
  const activeSites = scope === null ? allSites : allSites.filter(s => s.id === scope);
  const canCreate = can(currentUser.role, 'ticket.create');
  const canUpdate = can(currentUser.role, 'ticket.update');
  const canDelete = can(currentUser.role, 'ticket.delete');
  const canRepair = can(currentUser.role, 'pm.perform');
  const feedback = useFeedback();
  const technicians = (usersList || []).filter(u => u.role === 'TECHNICIAN');

  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('ALL');
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState<string>('ALL');
  const [ticketSiteFilter, setTicketSiteFilter] = useState<number | 'ALL'>('ALL');
  const [ticketPeriodFilter, setTicketPeriodFilter] = useState<PeriodFilterKey>('ALL');
  const [customTicketDateFrom, setCustomTicketDateFrom] = useState('');
  const [customTicketDateTo, setCustomTicketDateTo] = useState('');

  // New Ticket Modal
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [newTicketSiteId, setNewTicketSiteId] = useState<number>(scope ?? (currentUser.assignedSiteId || activeSites[0]?.id));
  const [newTicketTerminal, setNewTicketTerminal] = useState('POS-01');
  const [newTicketCategory, setNewTicketCategory] = useState<TicketCategory>('Dispenser & Forecourt');
  const [newTicketPriority, setNewTicketPriority] = useState<TicketPriority>('Tinggi');
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketDesc, setNewTicketDesc] = useState('');
  const [newTicketReporter, setNewTicketReporter] = useState(currentUser.name);

  // Update Status Modal
  const [selectedTicketForUpdate, setSelectedTicketForUpdate] = useState<SPBUTicket | null>(null);
  const [updateStatus, setUpdateStatus] = useState<TicketStatus>('Sedang Ditangani');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateAssigned, setUpdateAssigned] = useState('');

  // Filtering logic
  const filteredTickets = tickets.filter(t => {
    if (ticketSiteFilter !== 'ALL' && t.site_id !== ticketSiteFilter) return false;
    if (ticketStatusFilter !== 'ALL' && t.status !== ticketStatusFilter) return false;
    if (ticketPriorityFilter !== 'ALL' && t.priority !== ticketPriorityFilter) return false;
    
    // Period filter on t.reported_at
    if (!isDateInPeriod(t.reported_at, ticketPeriodFilter, customTicketDateFrom, customTicketDateTo)) {
      return false;
    }

    if (ticketSearch.trim()) {
      const q = ticketSearch.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchNum = t.ticket_number.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchReporter = t.reported_by.toLowerCase().includes(q);
      if (!matchTitle && !matchNum && !matchDesc && !matchReporter) return false;
    }
    return true;
  });

  const handleResetFilters = () => {
    setTicketSearch('');
    setTicketSiteFilter('ALL');
    setTicketStatusFilter('ALL');
    setTicketPriorityFilter('ALL');
    setTicketPeriodFilter('ALL');
    setCustomTicketDateFrom('');
    setCustomTicketDateTo('');
  };

  const isFilterActive = 
    ticketSearch.trim() !== '' ||
    ticketSiteFilter !== 'ALL' ||
    ticketStatusFilter !== 'ALL' ||
    ticketPriorityFilter !== 'ALL' ||
    ticketPeriodFilter !== 'ALL';

  const openCount = tickets.filter(t => t.status === 'Open (Menunggu)').length;
  const inProgressCount = tickets.filter(t => t.status === 'Sedang Ditangani').length;
  const resolvedCount = tickets.filter(t => t.status === 'Selesai (Resolved)').length;

  // Handle submit new ticket
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim() || !newTicketDesc.trim()) {
      feedback.notify({ variant: 'warning', title: 'Data Belum Lengkap', message: 'Judul dan deskripsi kendala wajib diisi.' });
      return;
    }

    const targetSite = activeSites.find(s => s.id === newTicketSiteId) || activeSites[0];
    if (!targetSite || (scope !== null && targetSite.id !== scope)) {
      feedback.notify({ variant: 'forbidden', title: 'Akses Ditolak', message: 'Anda hanya dapat membuat tiket untuk SPBU yang ditugaskan kepada Anda.' });
      return;
    }
    const ticketNum = `TIK-PITL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const defaultTechName = technicians.length > 0 
      ? `${technicians[0].name} (Teknisi)` 
      : 'Belum Ditugaskan';

    const newTicket: SPBUTicket = {
      id: `TIK-${Date.now()}`,
      ticket_number: ticketNum,
      site_id: targetSite.id,
      site_code: targetSite.site_code,
      site_name: targetSite.site_name,
      terminal_id: newTicketTerminal,
      category: newTicketCategory,
      priority: newTicketPriority,
      status: 'Open (Menunggu)',
      title: newTicketTitle,
      description: newTicketDesc,
      reported_by: newTicketReporter || currentUser.name,
      reported_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
      assigned_to: defaultTechName,
    };

    const result = await feedback.run(() => createTicketApi(newTicket), {
      pending: 'Mengirim tiket ke server...',
      success: {
        title: 'Tiket Berhasil Dibuat',
        message: <>Tiket <strong>{ticketNum}</strong> untuk {targetSite.site_name} telah tercatat dan diteruskan ke teknisi.</>,
      },
      error: { title: 'Gagal Membuat Tiket', message: 'Tiket belum tersimpan. Periksa koneksi lalu coba lagi.' },
    });
    if (!result.success) return;

    saveTicket(newTicket);
    onTicketsUpdated([newTicket, ...tickets]);
    setIsNewTicketModalOpen(false);
    setNewTicketTitle('');
    setNewTicketDesc('');
  };

  // Handle update status submit
  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketForUpdate) return;

    const result = await feedback.run(
      () => updateTicketApi(selectedTicketForUpdate.id, updateStatus, updateNotes, updateAssigned),
      {
        pending: 'Menyimpan perubahan status...',
        success: {
          title: 'Status Tiket Diperbarui',
          message: <>Tiket <strong>{selectedTicketForUpdate.ticket_number}</strong> sekarang berstatus <strong>{updateStatus}</strong>.</>,
        },
        error: { title: 'Gagal Memperbarui Tiket', message: 'Perubahan status belum tersimpan.' },
      }
    );
    if (!result.success) return;

    updateTicketStatus(
      selectedTicketForUpdate.id,
      updateStatus,
      updateNotes,
      updateAssigned || selectedTicketForUpdate.assigned_to
    );

    const ticketId = selectedTicketForUpdate.id;
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: updateStatus,
          resolution_notes: updateNotes,
          assigned_to: updateAssigned || t.assigned_to,
        };
      }
      return t;
    });

    onTicketsUpdated(updated);
    setSelectedTicketForUpdate(null);
  };

  // Handle delete ticket (Admin only)
  const handleDeleteTicket = async (ticketId: string) => {
    const target = tickets.find(t => t.id === ticketId);
    const ok = await feedback.confirm({
      title: 'Hapus Tiket?',
      message: <>Tiket <strong>{target?.ticket_number || ticketId}</strong> akan dihapus permanen dari database dan tidak dapat dikembalikan.</>,
      confirmLabel: 'Ya, Hapus',
      danger: true,
    });
    if (!ok) return;
    const result = await feedback.run(() => deleteTicketApi(ticketId), {
      pending: 'Menghapus tiket...',
      success: { title: 'Tiket Dihapus', message: 'Tiket telah dihapus dari database.' },
      error: { title: 'Gagal Menghapus Tiket', message: 'Tiket masih tersimpan di server.' },
    });
    if (result.success) onTicketsUpdated(tickets.filter(t => t.id !== ticketId));
  };

  return (
    <div className="space-y-6">

      {/* Top Action & Subtitle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Pencatatan dan eskalasi gangguan pompa dispenser, konsol ATG, POS PINSYST, mesin EDC, dan kelistrikan SPBU.
          </p>
        </div>

        {canCreate && (
        <button
          type="button"
          onClick={() => setIsNewTicketModalOpen(true)}
          className="min-h-[44px] px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors self-start sm:self-auto flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Tiket Kendala Baru</span>
        </button>
        )}
      </div>

      {/* Stat Cards - Uniform Restrained Palette */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Tiket Masuk</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] mt-1">{tickets.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Seluruh riwayat laporan</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Menunggu (Open)</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] mt-1">{openCount}</div>
          <span className="text-[11px] text-red-600 font-medium mt-0.5 block">Belum ditangani teknisi</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Sedang Ditangani</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] mt-1">{inProgressCount}</div>
          <span className="text-[11px] text-amber-700 font-medium mt-0.5 block">Teknisi aktif di lapangan</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Selesai (Resolved)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] mt-1">{resolvedCount}</div>
          <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">Telah diuji & normal</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nomor tiket, judul, pelapor..."
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              className="w-full min-h-[44px] pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={ticketSiteFilter}
              onChange={(e) => setTicketSiteFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              aria-label="Filter Site SPBU"
              className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="ALL">Semua Site SPBU</option>
              {activeSites.map(s => (
                <option key={s.id} value={s.id}>{s.site_code} - {s.site_name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={ticketPeriodFilter}
              onChange={(e) => setTicketPeriodFilter(e.target.value as PeriodFilterKey)}
              aria-label="Filter Periode Tanggal Tiket"
              className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              {PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <select
              value={ticketStatusFilter}
              onChange={(e) => setTicketStatusFilter(e.target.value)}
              aria-label="Filter Status Tiket"
              className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="Open (Menunggu)">Open (Menunggu)</option>
              <option value="Sedang Ditangani">Sedang Ditangani</option>
              <option value="Selesai (Resolved)">Selesai (Resolved)</option>
            </select>
          </div>

          <div>
            <select
              value={ticketPriorityFilter}
              onChange={(e) => setTicketPriorityFilter(e.target.value)}
              aria-label="Filter Prioritas"
              className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="ALL">Semua Tingkat Prioritas</option>
              <option value="Darurat">Darurat (Pompa Mati)</option>
              <option value="Tinggi">Tinggi</option>
              <option value="Sedang">Sedang</option>
              <option value="Rendah">Rendah</option>
            </select>
          </div>

          <div className="col-span-2 sm:col-span-1 flex items-center gap-2 empty:hidden">
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="min-h-[44px] w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-300 shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>

        {ticketPeriodFilter === 'CUSTOM' && (
          <div className="p-3 bg-red-50/60 rounded-lg border border-red-200 flex flex-col sm:flex-row items-center gap-3 text-xs animate-in fade-in duration-150">
            <span className="font-bold text-red-950 flex items-center gap-1.5 flex-shrink-0">
              <Calendar className="w-4 h-4 text-red-700" />
              Pilih Rentang Tanggal Tiket:
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="custom-ticket-from" className="text-slate-600 font-medium">Dari:</label>
              <input
                id="custom-ticket-from"
                type="date"
                value={customTicketDateFrom}
                onChange={(e) => setCustomTicketDateFrom(e.target.value)}
                className="min-h-[38px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="custom-ticket-to" className="text-slate-600 font-medium">Sampai:</label>
              <input
                id="custom-ticket-to"
                type="date"
                value={customTicketDateTo}
                onChange={(e) => setCustomTicketDateTo(e.target.value)}
                className="min-h-[38px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Ticket List Cards */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white rounded-xl p-10 sm:p-14 text-center border border-slate-200 shadow-2xs space-y-3">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            {tickets.length === 0 
              ? 'Tidak Ada Tiket Gangguan Aktif (Forecourt Normal)' 
              : 'Tidak Ada Tiket yang Cocok dengan Kriteria Filter'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {tickets.length === 0
              ? 'Seluruh dispenser, sistem POS, dan peralatan forecourt di SPBU berjalan normal. Jika terjadi kendala operasional, laporkan melalui tombol "Buat Tiket Baru".'
              : 'Silakan sesuaikan kembali kata kunci pencarian, filter SPBU, atau rentang tanggal tiket di atas.'}
          </p>
          {isFilterActive && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="min-h-[40px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Tampilkan Semua Tiket</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredTickets.map((t) => {
            const isEmergency = t.priority === 'Darurat';
            const isResolved = t.status === 'Selesai (Resolved)';

            return (
              <div 
                key={t.id}
                className={`bg-white rounded-xl p-5 border transition-all shadow-2xs ${
                  isEmergency && !isResolved
                    ? 'border-red-500 ring-1 ring-red-500/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  
                  {/* Left Content */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-900 px-2.5 py-0.5 rounded border border-slate-300">
                        {t.ticket_number}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        t.priority === 'Darurat' 
                          ? 'bg-red-100 text-red-900 border-red-300 animate-pulse' 
                          : t.priority === 'Tinggi'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        Prioritas: {t.priority}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        t.status === 'Selesai (Resolved)'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : t.status === 'Sedang Ditangani'
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}>
                        Status: {t.status}
                      </span>
                      <span className="text-xs text-slate-500">
                        Kategori: <strong className="text-slate-800">{t.category}</strong>
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900">
                      {t.title}
                    </h3>

                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                      {t.description}
                    </p>

                    <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap pt-1">
                      <span>Site: <strong className="text-slate-800">{t.site_name}</strong></span>
                      <span>&bull;</span>
                      <span>Posisi Alat: <strong className="font-mono text-slate-800">{t.terminal_id}</strong></span>
                      <span>&bull;</span>
                      <span>Pelapor: <strong className="text-slate-800">{t.reported_by}</strong> ({t.reported_at})</span>
                      <span>&bull;</span>
                      <span>Teknisi Ditugaskan: <strong className="text-blue-900">{t.assigned_to || 'Belum ditugaskan'}</strong></span>
                    </div>

                    {t.resolution_notes && (
                      <div className="mt-2 p-3 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200 text-xs">
                        <strong>Catatan Solusi Perbaikan:</strong> {t.resolution_notes}
                      </div>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-start lg:self-center flex-wrap">
                    {canRepair && onStartRepairFromTicket && !isResolved && (
                      <button
                        type="button"
                        onClick={() => onStartRepairFromTicket(t)}
                        className="min-h-[40px] px-3.5 py-1.5 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Eksekusi Servis</span>
                      </button>
                    )}

                    {canUpdate && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTicketForUpdate(t);
                        setUpdateStatus(t.status);
                        setUpdateNotes(t.resolution_notes || '');
                        setUpdateAssigned(t.assigned_to || 'Rizky Ramadhan (Teknisi)');
                      }}
                      className="min-h-[40px] px-3.5 py-1.5 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-300" />
                      <span>Update Status</span>
                    </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTicket(t.id)}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        title="Hapus Tiket"
                        aria-label="Hapus Tiket"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: BUAT TIKET BARU */}
      {isNewTicketModalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-start sm:items-center justify-center p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-300 overflow-hidden my-8 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="p-4 bg-[#0B2545] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Buat Tiket Kendala SPBU Baru</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Laporan akan langsung terkirim ke sistem teknisi dan database Turso
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTicketModalOpen(false)}
                className="w-8 h-8 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center font-bold text-lg"
              >
                X
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Site SPBU</label>
                  <select
                    value={newTicketSiteId}
                    onChange={(e) => setNewTicketSiteId(Number(e.target.value))}
                    disabled={scope !== null}
                    className="w-full disabled:opacity-80 disabled:cursor-not-allowed min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    {activeSites.map(s => (
                      <option key={s.id} value={s.id}>{s.site_code} - {s.site_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Terminal / Posisi Alat</label>
                  <input
                    type="text"
                    required
                    value={newTicketTerminal}
                    onChange={(e) => setNewTicketTerminal(e.target.value)}
                    placeholder="Contoh: POS-01, Nozzle 2"
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kategori Kerusakan</label>
                  <select
                    value={newTicketCategory}
                    onChange={(e) => setNewTicketCategory(e.target.value as TicketCategory)}
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="Dispenser & Forecourt">Dispenser / Pompa BBM</option>
                    <option value="ATG & Tangki Pendam">ATG & Tangki Pendam</option>
                    <option value="POS Terminal & Software">POS Terminal PINSYST</option>
                    <option value="Printer Struk & Periferal">Printer Struk Thermal</option>
                    <option value="EDC & Jaringan">Mesin EDC & Jaringan LAN</option>
                    <option value="Kelistrikan & Power">Kelistrikan & Power UPS</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tingkat Prioritas</label>
                  <select
                    value={newTicketPriority}
                    onChange={(e) => setNewTicketPriority(e.target.value as TicketPriority)}
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="Darurat">Darurat (Pompa Mati Total)</option>
                    <option value="Tinggi">Tinggi (Mengganggu Kasir)</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Judul Ringkasan Kendala</label>
                <input
                  type="text"
                  required
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  placeholder="Contoh: Nozzle Pertamax selang bocor / Printer POS macet"
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Deskripsi Detail Gangguan</label>
                <textarea
                  rows={3}
                  required
                  value={newTicketDesc}
                  onChange={(e) => setNewTicketDesc(e.target.value)}
                  placeholder="Jelaskan kronologi kejadian dan dampak pada transaksi penjualan SPBU..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTicketModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Kirim Tiket ke Sistem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE STATUS TIKET */}
      {selectedTicketForUpdate && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-start sm:items-center justify-center p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-300 overflow-hidden my-8 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="p-4 bg-[#0B2545] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Update Tindak Lanjut Tiket</h3>
                <p className="text-xs text-slate-300 mt-0.5 font-mono">
                  {selectedTicketForUpdate.ticket_number} &bull; {selectedTicketForUpdate.site_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicketForUpdate(null)}
                className="w-8 h-8 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center font-bold text-lg"
              >
                X
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status Penanganan</label>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value as TicketStatus)}
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Open (Menunggu)">Open (Menunggu)</option>
                    <option value="Sedang Ditangani">Sedang Ditangani</option>
                    <option value="Selesai (Resolved)">Selesai (Resolved)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Teknisi Bertugas</label>
                  <input
                    type="text"
                    value={updateAssigned}
                    onChange={(e) => setUpdateAssigned(e.target.value)}
                    placeholder="Nama Teknisi"
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Catatan Tindakan / Solusi Perbaikan</label>
                <textarea
                  rows={3}
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="Jelaskan tindakan yang telah dilakukan teknisi dan sparepart yang diganti..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicketForUpdate(null)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

