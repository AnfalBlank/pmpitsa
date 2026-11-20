/**
 * Shrinks a camera photo in the browser before it is attached to a report:
 * max 1280px on the long side, re-encoded as JPEG (~120-250 KB). Keeps the
 * report small enough to sync and to embed in the BA PDF, and converts
 * formats the PDF can't embed (HEIC/WebP) to JPEG.
 */
export async function compressImageFile(file: File, maxSide = 1280, quality = 0.75): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Format foto tidak dapat dibaca oleh browser ini.'));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas tidak tersedia.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Re-encodes an attached photo (data URL) smaller. Returns the input when it can't be decoded. */
export async function recompressDataUrl(dataUrl: string, maxSide: number, quality: number): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) return dataUrl;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode'));
      el.src = dataUrl;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const out = canvas.toDataURL('image/jpeg', quality);
    return out.length < dataUrl.length ? out : dataUrl;
  } catch {
    return dataUrl;
  }
}

/**
 * Hosting rejects request bodies above ~4.5 MB. A BA is sent with all its photos,
 * so shrink the photos step by step until the whole BA fits (default 3.8 MB).
 * Returns the (possibly) smaller report and whether it now fits.
 */
export async function fitReportForUpload<T extends { attachments?: { file_url: string }[] }>(
  report: T,
  maxBytes = 3_800_000
): Promise<{ report: T; fits: boolean; bytes: number }> {
  const size = (r: T) => new Blob([JSON.stringify(r)]).size;
  let current = report;
  let bytes = size(current);
  if (bytes <= maxBytes || typeof document === 'undefined') return { report: current, fits: bytes <= maxBytes, bytes };
  for (const [side, q] of [
    [1280, 0.7],
    [1024, 0.62],
    [900, 0.55],
    [760, 0.5],
  ] as const) {
    const attachments = await Promise.all(
      (current.attachments || []).map(async (a) => ({ ...a, file_url: await recompressDataUrl(a.file_url, side, q) }))
    );
    current = { ...current, attachments };
    bytes = size(current);
    if (bytes <= maxBytes) return { report: current, fits: true, bytes };
  }
  return { report: current, fits: false, bytes };
}
