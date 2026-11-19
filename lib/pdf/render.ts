/** Server-only: renders a Berita Acara PMReport to a PDF Buffer with pdfmake. */
import type { PMReport } from '@/lib/types';
import { buildBaDocDefinition } from './ba-document';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const vfsModule = require('pdfmake/build/vfs_fonts.js');

let printer: any = null;

function getPrinter() {
  if (printer) return printer;
  const vfs: Record<string, string> = vfsModule.pdfMake?.vfs || vfsModule.vfs || vfsModule;
  const font = (name: string) => Buffer.from(vfs[name], 'base64');
  printer = new PdfPrinter({
    Roboto: {
      normal: font('Roboto-Regular.ttf'),
      bold: font('Roboto-Medium.ttf'),
      italics: font('Roboto-Italic.ttf'),
      bolditalics: font('Roboto-MediumItalic.ttf'),
    },
  });
  return printer;
}

export function renderBaPdf(report: PMReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = getPrinter().createPdfKitDocument(buildBaDocDefinition(report));
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/** Render any pdfmake document definition (used by the management reports). */
export function renderPdf(def: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = getPrinter().createPdfKitDocument(def);
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
