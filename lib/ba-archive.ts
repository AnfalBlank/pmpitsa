/**
 * Server-only: archives a Berita Acara (PDF + documentation photos) to Google Drive.
 *
 * Folder layout (created automatically):
 *   <root>/<KODE SPBU - Nama SPBU>/<YYYY-MM-DD>/<Nomor BA: PM-/CM-/QC-...>/
 *       BA_<Nomor BA>_<KODE SPBU>_<tanggal>.pdf
 *       Dokumentasi/
 *           BA_<Nomor BA>_<KODE SPBU>_<tanggal>_Foto-01_<Kategori>.jpg ...
 * The PDF prints only the main photos plus a list + QR link to this folder.
 */
import type { GDriveArchiveInfo, PMReport } from '@/lib/types';
import { baFileName } from '@/lib/pdf/ba-document';
import { photoFileName } from '@/lib/photos';
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
  const docsId = await ensureFolderPath([...segments, 'Dokumentasi']);
  const photos: Record<string, string> = { ...(report.gdrive?.photos || {}) };

  const attachments = report.attachments || [];
  for (let i = 0; i < attachments.length; i++) {
    const a = attachments[i];
    if (photos[a.id]) continue; // already uploaded
    const decoded = decodeDataUrl(a.file_url);
    if (!decoded) continue;
    const ext = EXT[decoded.mime] || 'jpg';
    const file = await uploadFile(docsId, photoFileName(report, i, a, ext), decoded.mime, decoded.data);
    photos[a.id] = file.id;
  }

  const info = {
    folder_id: folderId,
    folder_url: folderUrl(folderId),
    folder_path: segments.join(' / '),
    docs_folder_url: folderUrl(docsId),
  };
  // The PDF links (and QR-codes) the Drive folder that holds every photo
  const pdf = await renderBaPdf({ ...report, gdrive: { ...(report.gdrive || {}), ...info, photos } as GDriveArchiveInfo });
  const pdfName = baFileName(report);
  const pdfFile = await uploadFile(folderId, pdfName, 'application/pdf', pdf);

  return {
    ...info,
    pdf_file_id: pdfFile.id,
    pdf_url: pdfFile.webViewLink || `https://drive.google.com/file/d/${pdfFile.id}/view`,
    pdf_file_name: pdfName,
    photos,
    uploaded_at: new Date().toISOString(),
  };
}
