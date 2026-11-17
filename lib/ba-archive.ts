/**
 * Server-only: archives a Berita Acara (PDF + documentation photos) to Google Drive.
 *
 * Folder layout (created automatically):
 *   <root>/<KODE SPBU - Nama SPBU>/<YYYY-MM-DD>/<Nomor BA: PM-/CM-/QC-...>/
 *       BA_<Nomor BA>_<KODE SPBU>_<tanggal>.pdf
 *       BA_<Nomor BA>_<KODE SPBU>_<tanggal>_Foto-01.jpg ...   (same name as the BA file)
 */
import type { GDriveArchiveInfo, PMReport } from '@/lib/types';
import { baFileBase, baFileName } from '@/lib/pdf/ba-document';
import { baNumber } from '@/lib/work-type';
import { renderBaPdf } from '@/lib/pdf/render';
import { decodeDataUrl, ensureFolderPath, folderUrl, safeName, uploadFile } from '@/lib/gdrive';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };

export function baFolderSegments(r: PMReport): string[] {
  return [
    `${r.site_code} - ${r.site_name}`,
    r.execution_date || new Date().toISOString().slice(0, 10),
    baNumber(r),
  ].map(safeName);
}

export async function archiveReportToDrive(report: PMReport): Promise<GDriveArchiveInfo> {
  const segments = baFolderSegments(report);
  const folderId = await ensureFolderPath(segments);
  const photos: Record<string, string> = { ...(report.gdrive?.photos || {}) };
  const base = baFileBase(report);

  const attachments = report.attachments || [];
  for (let i = 0; i < attachments.length; i++) {
    const a = attachments[i];
    if (photos[a.id]) continue; // already uploaded
    const decoded = decodeDataUrl(a.file_url);
    if (!decoded) continue;
    const ext = EXT[decoded.mime] || 'jpg';
    const file = await uploadFile(folderId, `${base}_Foto-${String(i + 1).padStart(2, '0')}.${ext}`, decoded.mime, decoded.data);
    photos[a.id] = file.id;
  }

  const pdf = await renderBaPdf(report);
  const pdfName = baFileName(report);
  const pdfFile = await uploadFile(folderId, pdfName, 'application/pdf', pdf);

  return {
    folder_id: folderId,
    folder_url: folderUrl(folderId),
    folder_path: segments.join(' / '),
    pdf_file_id: pdfFile.id,
    pdf_url: pdfFile.webViewLink || `https://drive.google.com/file/d/${pdfFile.id}/view`,
    pdf_file_name: pdfName,
    photos,
    uploaded_at: new Date().toISOString(),
  };
}
