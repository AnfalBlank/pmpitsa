import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi | PM POS PINSYST & FMS - PITSA',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 text-sm leading-relaxed text-slate-700">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Kebijakan Privasi</h1>
      <p className="mb-6 text-slate-500">Aplikasi Preventive Maintenance POS PINSYST &amp; FMS — Pertamina International Timor S.A.</p>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Data yang dikelola</h2>
        <p>
          Aplikasi ini digunakan oleh petugas internal untuk mencatat pemeliharaan berkala, pengecekan, dan
          perbaikan perangkat POS PINSYST dan Fuel Management System di SPBU. Data yang disimpan meliputi nama
          dan akun pengguna, data SPBU dan perangkat, hasil pemeriksaan, foto dokumentasi, serta tanda tangan
          pada Berita Acara (BA).
        </p>

        <h2 className="pt-3 text-base font-semibold text-slate-900">Penggunaan Google Drive</h2>
        <p>
          Aplikasi menggunakan Google Drive API hanya untuk menyimpan arsip Berita Acara (PDF) dan foto
          dokumentasi ke folder arsip milik pengelola aplikasi. Aplikasi tidak membaca, mengubah, atau
          membagikan file lain di Google Drive, dan tidak menjual atau memberikan data Google kepada pihak ketiga.
          Penggunaan data dari Google API mengikuti Google API Services User Data Policy, termasuk ketentuan
          Limited Use.
        </p>

        <h2 className="pt-3 text-base font-semibold text-slate-900">Penyimpanan dan keamanan</h2>
        <p>
          Data disimpan di basis data aplikasi dan Google Drive pengelola, dan hanya dapat diakses oleh pengguna
          yang memiliki akun. Akses ke Google Drive dapat dicabut kapan saja melalui pengaturan akun Google
          (myaccount.google.com/permissions).
        </p>

        <h2 className="pt-3 text-base font-semibold text-slate-900">Kontak</h2>
        <p>
          Pertanyaan tentang kebijakan ini dapat dikirim ke{' '}
          <a className="text-blue-700 underline" href="mailto:manggalautamagroup@gmail.com">
            manggalautamagroup@gmail.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
