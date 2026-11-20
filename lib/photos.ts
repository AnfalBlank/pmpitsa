/** Documentation photo helpers shared by the BA PDF, the preview and the Drive archive. */
import type { PMAttachment, PMReport } from './types';
import { baNumber } from './work-type';
import { REQUIRED_PHOTOS } from './report-status';

/** Base of every file name of a BA: BA_<Nomor BA>_<SPBU>_<tanggal> */
export function baFileBase(report: Pick<PMReport, 'id' | 'work_type' | 'site_code' | 'execution_date'>): string {
  return ['BA', baNumber(report), report.site_code, report.execution_date]
    .filter(Boolean)
    .join('_')
    .replace(/[^A-Za-z0-9._-]+/g, '-');
}

const slug = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');

const extOf = (a: Pick<PMAttachment, 'file_url' | 'file_name'>) => {
  const m = /^data:image\/(\w+)/.exec(a.file_url || '');
  const t = (m?.[1] || a.file_name.split('.').pop() || 'jpg').toLowerCase();
  return t === 'jpeg' ? 'jpg' : t;
};

/** Drive file name of photo #index (0-based): BA_..._Foto-03_Sesudah-Pemeliharaan.jpg */
export function photoFileName(report: PMReport, index: number, a: Pick<PMAttachment, 'category' | 'file_url' | 'file_name'>, ext?: string): string {
  return `${baFileBase(report)}_Foto-${String(index + 1).padStart(2, '0')}_${slug(a.category)}.${ext || extOf(a)}`;
}

/** Number of photos shown in the BA document itself; the rest live in Google Drive. */
export const FEATURED_PHOTO_COUNT = 2;

/**
 * The photos printed in the BA: the first "before" and "after" photo for PM / PM Teknik / CM,
 * otherwise the first photos. Returns their indexes in report.attachments.
 */
export function featuredPhotoIndexes(report: Pick<PMReport, 'work_type' | 'attachments'>): number[] {
  const list = report.attachments || [];
  const picked: number[] = [];
  for (const cat of REQUIRED_PHOTOS[report.work_type] || []) {
    const i = list.findIndex((a) => a.category === cat);
    if (i >= 0 && !picked.includes(i)) picked.push(i);
  }
  for (let i = 0; i < list.length && picked.length < FEATURED_PHOTO_COUNT; i++) if (!picked.includes(i)) picked.push(i);
  return picked.slice(0, FEATURED_PHOTO_COUNT);
}
