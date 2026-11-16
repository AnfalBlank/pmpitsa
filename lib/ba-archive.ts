/**
 * Server-only: archives a Berita Acara (PDF + documentation photos) to Google Drive.
 *
 * Folder layout:
 *   <root>/<KODE SPBU - Nama SPBU>/<YYYY-MM-DD>/<Jenis Pekerjaan [No. Tiket]> - <Terminal> (<ID BA>)/
 *       BA_<...>.pdf
 *       Dokumentasi Foto/01_<Kategori>_<Keterangan>.jpg ...
 */
import type { GDriveArchiveInfo, PMReport } from '@/lib/types';
import { baFileName, WORK_TYPE_SHORT } from '@/lib/pdf/ba-document';
import { renderBaPdf } from '@/lib/pdf/render';
import { decodeDataUrl, ensureFolderPath, folderUrl, safeName, uploadFile } from '@/lib/gdrive';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };

export function baFolderSegments(r: PMReport): string[] {
  const work = [WORK_TYPE_SHORT[r.work_type] || r.work_type, r.ticket_number].filter(Boolean).join(' ');
  return [
    `${r.site_code} - ${r.site_name}`,
    r.execution_date || new Date().toISOString().slice(0, 10),
    `${work} - ${r.terminal_id || 'POS'} (${r.id})`,
  ].map(safeName);
}

export async function archiveReportToDrive(report: PMReport): Promise<GDriveArchiveInfo> {
  const segments = baFolderSegments(report);
  const folderId = await ensureFolderPath(segments);
  const photos: Record<string, string> = { ...(report.gdrive?.photos || {}) };

  const attachments = report.attachments || [];
  if (attachments.length) {
    const photoFolder = await ensureFolderPath([...segments, 'Dokumentasi Foto']);
    for (let i = 0; i < attachments.length; i++) {
      const a = attachments[i];
      if (photos[a.id]) continue; // already uploaded
      const decoded = decodeDataUrl(a.file_url);
      if (!decoded) continue;
      const ext = EXT[decoded.mime] || 'jpg';
      const name = safeName(`${String(i + 1).padStart(2, '0')}_${a.category}_${a.caption || a.file_name}`).replace(/\.[a-z0-9]{2,4}$/i, '');
      const file = await uploadFile(photoFolder, `${name}.${ext}`, decoded.mime, decoded.data);
      photos[a.id] = file.id;
    }
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
