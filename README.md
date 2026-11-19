# Portal PM POS PINSYST & FMS - Pertamina International Timor, S.A.

Aplikasi Web Enterprise terintegrasi untuk pengawasan operasional, inspeksi pemeliharaan rutin (*Preventive Maintenance*), pusat tiket kendala forecourt, dan penerbitan Berita Acara resmi digital di seluruh jaringan SPBU Pertamina International Timor, S.A. (PITL).

---

## 🌟 Fitur Utama

- **Single Module View Architecture**: Navigasi sidebar terpadu untuk tampilan modul independen dan fokus (Ikhtisar & Status SPBU, Pusat Tiket Helpdesk, Perencanaan Jadwal PM, Arsip Berita Acara, Konfigurasi & Master Data, serta Manajemen Pengguna).
- **Formulir Inspeksi Teknis PM Komprehensif**:
  - Pemeriksaan parameter kelistrikan & voltase grounding (standar < 1.0 V).
  - Status Controller POS PINSYST, ATG (Veeder-Root, OPW, Franklin), dan Dispenser Forecourt.
  - Dokumentasi temuan kerusakan, tindakan perbaikan (*Corrective Repair*), serta rekomendasi suku cadang.
  - Tanda tangan digital (*touch/mouse canvas sign-off*) Teknisi dan Pengawas PWS.
- **Penerbitan & Pratinjau Berita Acara (BA) Resmi**:
  - Generator format Berita Acara PDF standar kop resmi Pertamina International Timor, S.A.
  - Arsip dokumen digital siap cetak dan sinkronisasi cloud Google Drive & Turso DB.
  - Filter multi-dimensi: Filter Site SPBU, Filter Periode Tanggal (Hari Ini, 7 Hari, Bulan Ini, Tahun Ini, Custom), dan Status Pengesahan.
- **Pusat Tiket Kendala Lapangan (Helpdesk)**:
  - Pelaporan dan penanganan tiket gangguan dispenser, ATG, printer, dan jaringan.
  - Filter berdasarkan SPBU, status pengerjaan, prioritas (Darurat s/d Rendah), dan rentang tanggal.
- **Perencanaan & Jadwal Pemeliharaan**:
  - Penjadwalan agenda kunjungan PM teknisi dengan status peringatan waktu (H-2).
- **Role-Based Access Control (RBAC)**:
  - **Admin IT Central**: Hak akses penuh seluruh modul, master konfigurasi data SPBU, brand hardware, produk BBM, dan manajemen user.
  - **Supervisor (Pengawas PWS)**: Pengawasan kesiapan forecourt, verifikasi kendala tiket, dan pengesahan Berita Acara digital.
  - **Teknisi Lapangan POS**: Formulir checklist inspeksi PM, pratinjau Berita Acara hasil kerja, dan pelaporan tiket.
- **Tampilan Responsif & Selaras**:
  - Desktop: Sidebar navigasi dengan logo resmi Pertamina International Timor dan header sinkron 64px (`h-16`).
  - Mobile: Mobile Top Bar berlatar putih bersih dengan navigasi bawah (*Bottom Navigation Bar*) yang ergonomis.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router & Server-Side API Handlers)
- **Bahasa**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Ikonografi**: [Lucide React](https://lucide.dev/)
- **Database**: [Turso Database](https://turso.tech/) (LibSQL edge database)
- **Tanda Tangan Digital**: HTML5 Canvas Signature Pad

---

## 🚀 Memulai (Getting Started)

### 1. Prasyarat
- Node.js versi 18.17 atau lebih baru
- npm atau yarn

### 2. Instalasi Dependensi
```bash
git clone https://github.com/AnfalBlank/pmpitsa.git
cd pmpitsa
npm install
```

### 3. Konfigurasi Environment
Salin file konfigurasi contoh:
```bash
cp .env.example .env.local
```
Sesuaikan `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, dan `SESSION_SECRET`. Ketiganya **wajib** diisi — aplikasi tidak lagi memiliki kredensial bawaan dan akan menolak berjalan tanpa variabel ini. Jangan pernah commit `.env.local`.

### 4. Menjalankan di Mode Development
```bash
npm run dev
```
Buka browser pada [http://localhost:3000](http://localhost:3000).

### 5. Build Produksi
```bash
npm run build
npm start
```

---

## 📁 Export PDF & Arsip Google Drive

- **Unduh PDF**: tombol *Unduh PDF* di halaman pratinjau Berita Acara membuat PDF A4 resmi di server (kop surat, tabel checklist sesuai jenis pekerjaan, tanda tangan, nomor halaman, dan lampiran foto dokumentasi).
- **Finalisasi & penguncian**: Teknisi menekan *Finalisasi* setelah semua isian wajib dan tanda tangan Teknisi + Pengawas lengkap. Berita Acara final **terkunci**: Teknisi dan Pengawas tidak dapat mengubahnya lagi (dicek juga di server). Hanya **Admin** yang dapat merevisi lewat tombol *Ubah Berita Acara (Admin)*; setiap revisi tercatat (nomor revisi, nama Admin, waktu). Bila koneksi putus saat finalisasi, BA tetap terkunci & tersimpan di perangkat lalu dikirim otomatis saat online.
- **Validasi Pengawas SPBU**: setelah BA final, Pengawas SPBU yang bersangkutan melihatnya di Ikhtisar / Arsip BA ("Menunggu Validasi Anda"). Tombol *Setujui Berita Acara* menambahkan stempel hijau **DISETUJUI** dengan nama Pengawas dan waktu pada lembar pengesahan (layar & PDF). Pengawas hanya dapat memvalidasi BA SPBU-nya sendiri. Revisi oleh Admin mereset validasi sehingga perlu disetujui ulang.
- **Arsip otomatis**: saat Teknisi memfinalisasi Berita Acara, Berita Acara disimpan ke database lalu PDF dan semua foto diunggah ke Google Drive:

```
<Folder induk>/
  <KODE SPBU - Nama SPBU>/
    <YYYY-MM-DD>/
      <Nomor BA>/                                   ← PM-20261117-K3F9QX / CM-... / QC-...
        BA_<Nomor BA>_<KODE SPBU>_<tanggal>.pdf
        BA_<Nomor BA>_<KODE SPBU>_<tanggal>_Foto-01.jpg
        BA_<Nomor BA>_<KODE SPBU>_<tanggal>_Foto-02.jpg ...
```

Nomor BA: **PM** = Preventive Maintenance, **CM** = Corrective Maintenance (perbaikan), **QC** = Pengecekan (Quick Check).

  Bila unggahan gagal (mis. koneksi), tombol *Arsipkan ke Google Drive* di pratinjau dapat dipakai ulang oleh Teknisi atau Admin; file dengan nama sama diperbarui, tidak diduplikasi.

### Konfigurasi Google Drive

**Opsi A — akun Gmail pribadi (disarankan bila tidak memakai Google Workspace)**
1. Di Google Cloud Console: buat project, aktifkan *Google Drive API*, buat *OAuth client ID* tipe **Desktop app**.
2. Jalankan sekali di komputer lokal:
   `GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/google-drive-auth.mjs`
   lalu login dengan akun Google pemilik arsip. Salin `GOOGLE_REFRESH_TOKEN` yang muncul.
3. Isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` (dan opsional `GOOGLE_DRIVE_FOLDER_ID`) di environment hosting.
   Catatan: selama OAuth consent screen berstatus *Testing*, refresh token kedaluwarsa setelah 7 hari — ubah ke *In production*.

**Opsi B — Google Workspace (Shared Drive)**
1. Buat *service account*, unduh key JSON, aktifkan *Google Drive API*.
2. Buat folder di **Shared Drive**, tambahkan email service account sebagai *Content manager*.
3. Isi `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (isi `private_key`, `\n` boleh apa adanya) dan `GOOGLE_DRIVE_FOLDER_ID`.

## 📊 Laporan Admin & Checklist Harian

- **Laporan PM / CM / Pengecekan** (Admin › *Laporan PM / CM*): filter periode (bulan ini, bulan lalu, 3 bulan, tahun ini, semua, atau tanggal bebas) dan SPBU; ringkasan status, rekap per SPBU dan rincian setiap Berita Acara final. *Export Excel* (CSV) dan *Unduh PDF* (A4 landscape).
- **Checklist Kesiapan Operasional Harian (PWS)**: Pengawas mengisi 5 item (Baik / Bermasalah + catatan), lalu *Submit*. Item bermasalah dapat langsung dibuatkan tiket. Hasilnya tampil di Ikhtisar Admin (status per SPBU per hari) dan Admin mendapat notifikasi bila ada temuan.

## 🧾 Audit Log

Setiap aktivitas dicatat permanen di tabel `audit_logs` (tidak dapat diubah/dihapus dari aplikasi): login & login gagal, logout, buat/ubah/hapus tiket dan jadwal, finalisasi / revisi (lengkap dengan isian sebelum → sesudah) / persetujuan / hapus Berita Acara, unduh PDF, arsip Google Drive, perubahan Data SPBU, konfigurasi forecourt, master data, pembuatan akun, dan reset data. Setiap entri menyimpan pengguna, peran, waktu, IP dan perangkat.

- **Admin** › menu *Audit Log*: pencarian, filter pengguna / aksi / objek / SPBU / tanggal, dan *Export CSV*.
- **Halaman Berita Acara** › panel *Riwayat Dokumen*: riwayat BA tersebut untuk semua pengguna yang berhak melihat BA (Pengawas hanya SPBU-nya). Riwayat tetap tersedia walaupun BA sudah dihapus.

## 👥 Akun Login Demo (RBAC)

> Akun di bawah hanya dibuat oleh seeding database lokal (`/api/init-db`, tanpa login hanya di mode development; di production wajib sesi ADMIN). **Jangan gunakan password ini di production** — ganti segera. Password disimpan sebagai hash scrypt; password lama berbentuk teks biasa otomatis di-hash saat login berhasil pertama kali. Login dibatasi 5 percobaan gagal per username dan 20 per IP setiap 15 menit.

| Peran (Role) | Username | Password | Penugasan Default |
| :--- | :--- | :--- | :--- |
| **Admin IT Central** | `admin` | `password123` | Kantor Pusat IT Central |
| **Supervisor SPBU Dili** | `supervisor` | `password123` | SPBU PITL-001 Dili Sentral |
| **Supervisor SPBU Baucau** | `spv_baucau` | `password123` | SPBU PITL-002 Baucau |
| **Teknisi Lapangan POS** | `teknisi` | `password123` | Teknisi Lapangan POS & FMS |
| **Teknisi Elektrikal/ATG** | `teknisi_central` | `password123` | Teknisi Forecourt Central |

---

## 📄 Lisensi & Hak Cipta
Hak Cipta © 2026 Pertamina International Timor, S.A. Seluruh hak cipta dilindungi.

