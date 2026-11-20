'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, ClipboardCheck, Ticket, PencilLine, Send } from 'lucide-react';
import { DAILY_CHECK_ITEMS, DailyCheck, todayDili } from '@/lib/daily-checklist';
import { fetchDailyChecksApi, submitDailyCheckApi } from '@/lib/api-client';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
import { Spinner } from '@/components/ui/Loading';
import { AutoTextarea } from '@/components/ui/AutoTextarea';

type Answer = { ok?: boolean; note: string; ticket: boolean };

/** Pengawas: daily readiness checklist → submit, with tickets for problem items. */
export const DailyChecklistCard: React.FC<{ siteName: string; onSubmitted?: () => void }> = ({ siteName, onSubmitted }) => {
  const feedback = useFeedback();
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<DailyCheck | null>(null);
  const [editing, setEditing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(DAILY_CHECK_ITEMS.map((d) => [d.key, { note: '', ticket: true }]))
  );

  const load = async () => {
    setLoading(true);
    const res = await fetchDailyChecksApi();
    const mine = res?.checks?.[0] || null;
    setExisting(mine);
    if (mine) {
      setAnswers(Object.fromEntries(DAILY_CHECK_ITEMS.map((d) => {
        const a = mine.items.find((i) => i.key === d.key);
        return [d.key, { ok: a?.ok, note: a?.note || '', ticket: false }];
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (key: string, patch: Partial<Answer>) => setAnswers((a) => ({ ...a, [key]: { ...a[key], ...patch } }));
  const answeredAll = DAILY_CHECK_ITEMS.every((d) => typeof answers[d.key].ok === 'boolean');
  const problems = DAILY_CHECK_ITEMS.filter((d) => answers[d.key].ok === false);
  const ticketKeys = problems.filter((d) => answers[d.key].ticket).map((d) => d.key);

  const submit = async () => {
    const ok = await feedback.confirm({
      title: problems.length ? `Submit dengan ${problems.length} item bermasalah?` : 'Submit checklist: semua baik?',
      message: problems.length
        ? ticketKeys.length
          ? `${ticketKeys.length} tiket akan dibuat otomatis untuk item bermasalah. Hasil checklist langsung terlihat di Ikhtisar Admin.`
          : 'Tidak ada tiket yang dibuat. Hasil checklist langsung terlihat di Ikhtisar Admin.'
        : 'Hasil checklist langsung terlihat di Ikhtisar Admin.',
      confirmLabel: 'Submit Checklist',
    });
    if (!ok) return;
    const res = await feedback.run(
      () =>
        submitDailyCheckApi({
          items: DAILY_CHECK_ITEMS.map((d) => ({ key: d.key, ok: !!answers[d.key].ok, note: answers[d.key].note })),
          create_tickets: ticketKeys,
        }),
      {
        pending: 'Menyimpan checklist harian...',
        success: (r) => ({
          title: r.check?.status === 'ISSUE' ? 'Checklist Tersimpan dengan Temuan' : 'Checklist Tersimpan: Semua Baik',
          message: r.ticket_numbers?.length ? `Tiket dibuat: ${r.ticket_numbers.join(', ')}.` : 'Terima kasih, hasil sudah diteruskan ke Admin.',
        }),
        error: { title: 'Checklist Belum Tersimpan', message: 'Periksa koneksi lalu coba lagi.' },
      }
    );
    if (res.success && res.check) {
      setExisting(res.check);
      setEditing(false);
      onSubmitted?.();
    }
  };

  const time = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateLabel = new Date(`${todayDili()}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const showForm = !existing || editing;

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-extrabold text-[#0B2545] flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-slate-500" /> Checklist Kesiapan Operasional Harian (PWS)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {siteName} · {dateLabel}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-3">
          <Spinner size={18} /> Memuat checklist hari ini...
        </div>
      ) : !showForm && existing ? (
        <div className="space-y-3">
          <div
            className={`rounded-lg border px-3 py-2.5 text-xs flex items-start gap-2 ${
              existing.status === 'OK' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            {existing.status === 'OK' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <span>
              <strong>{existing.status === 'OK' ? 'Sudah disubmit: semua baik.' : `Sudah disubmit: ${existing.items.filter((i) => !i.ok).length} item bermasalah.`}</strong>{' '}
              Oleh {existing.submitted_by_name}, pukul {time(existing.submitted_at)}.
              {existing.ticket_numbers.length > 0 && <span className="block mt-0.5">Tiket: {existing.ticket_numbers.join(', ')}</span>}
            </span>
          </div>
          <ul className="space-y-1.5 text-xs">
            {DAILY_CHECK_ITEMS.map((d) => {
              const a = existing.items.find((i) => i.key === d.key);
              return (
                <li key={d.key} className="flex items-start gap-2">
                  {!a ? (
                    <span className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" aria-hidden />
                  ) : a.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  )}
                  <span className={a ? 'text-slate-700' : 'text-slate-400'}>
                    {d.label}
                    {!a && <span className="block text-[11px]">Belum dicek (item baru, tekan Ubah / Submit Ulang)</span>}
                    {a?.note && <span className="block text-slate-500">Catatan: {a.note}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => setEditing(true)} className="min-h-[40px] px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <PencilLine className="w-3.5 h-3.5" /> Ubah / Submit Ulang
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {DAILY_CHECK_ITEMS.map((d, i) => {
            const a = answers[d.key];
            return (
              <fieldset key={d.key} className={`rounded-lg border p-3 ${a.ok === false ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'}`}>
                <legend className="sr-only">{d.label}</legend>
                <p className="text-xs font-semibold text-slate-800">
                  {i + 1}. {d.label}
                </p>
                {d.hint && <p className="text-[11px] text-slate-500 mt-0.5">{d.hint}</p>}
                <div className="grid grid-cols-2 gap-2 mt-2" role="radiogroup" aria-label={d.label}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={a.ok === true}
                    onClick={() => set(d.key, { ok: true })}
                    className={`min-h-[44px] rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 ${
                      a.ok === true ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Baik
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={a.ok === false}
                    onClick={() => set(d.key, { ok: false, ticket: a.ok === false ? a.ticket : true })}
                    className={`min-h-[44px] rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 ${
                      a.ok === false ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" /> Bermasalah
                  </button>
                </div>
                {a.ok === false && (
                  <div className="mt-2 space-y-2">
                    <AutoTextarea
                      aria-label={`Catatan masalah: ${d.label}`}
                      value={a.note}
                      onChange={(e) => set(d.key, { note: e.target.value })}
                      placeholder="Jelaskan masalahnya (opsional)"
                      className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                    />
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 min-h-[36px]">
                      <input type="checkbox" checked={a.ticket} onChange={(e) => set(d.key, { ticket: e.target.checked })} className="w-4 h-4 rounded" />
                      <Ticket className="w-3.5 h-3.5 text-slate-500" /> Buat tiket untuk masalah ini
                    </label>
                  </div>
                )}
              </fieldset>
            );
          })}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-slate-500">
              {answeredAll
                ? problems.length
                  ? `${problems.length} bermasalah · ${ticketKeys.length} tiket akan dibuat`
                  : 'Semua item baik'
                : `${DAILY_CHECK_ITEMS.filter((d) => typeof answers[d.key].ok === 'boolean').length}/${DAILY_CHECK_ITEMS.length} item diisi`}
            </span>
            <div className="flex gap-2">
              {existing && (
                <button type="button" onClick={() => setEditing(false)} className="min-h-[44px] px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700">
                  Batal
                </button>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={!answeredAll}
                className="flex-1 sm:flex-none min-h-[44px] px-5 rounded-lg bg-[#0B2545] hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Submit Checklist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
