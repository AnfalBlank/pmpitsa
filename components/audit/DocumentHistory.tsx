'use client';

import React, { useEffect, useState } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { AuditItem, fetchAuditApi } from '@/lib/api-client';
import { AuditRow } from './AuditTimeline';
import { Spinner } from '@/components/ui/Loading';

/** Who finalised, revised, approved, downloaded, archived or deleted this BA. */
export const DocumentHistory: React.FC<{ reportId: string; showNetwork?: boolean }> = ({ reportId, showNetwork }) => {
  const [items, setItems] = useState<AuditItem[] | null>(null);
  const [error, setError] = useState(false);

  const load = async () => {
    setError(false);
    setItems(null);
    const res = await fetchAuditApi({ entity_type: 'report', entity_id: reportId, limit: 100 });
    if (res) setItems(res.items);
    else setError(true);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  return (
    <section className="no-print max-w-4xl mx-auto bg-white border border-slate-200 rounded-lg" aria-labelledby="doc-history-title">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
        <h3 id="doc-history-title" className="text-sm font-extrabold text-[#0B2545] flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" /> Riwayat Dokumen (Audit Log)
        </h3>
        <button type="button" onClick={load} className="min-h-[36px] px-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Muat ulang
        </button>
      </div>
      {items === null && !error && (
        <div className="flex items-center gap-2 px-4 py-4 text-xs text-slate-500">
          <Spinner size={18} /> Memuat riwayat...
        </div>
      )}
      {error && <p className="px-4 py-4 text-xs text-red-600">Riwayat belum dapat dimuat. Periksa koneksi lalu tekan Muat ulang.</p>}
      {items && items.length === 0 && <p className="px-4 py-4 text-xs text-slate-500">Belum ada riwayat untuk dokumen ini.</p>}
      {items && items.length > 0 && (
        <ul className="px-3">
          {items.map((i) => (
            <AuditRow key={i.id} item={i} showNetwork={showNetwork} />
          ))}
        </ul>
      )}
    </section>
  );
};
