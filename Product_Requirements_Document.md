# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## APLIKASI MOBILE PREVENTIVE MAINTENANCE (PM) POS PINSYST & FUEL MANAGEMENT SYSTEM (FMS)
**PERTAMINA INTERNATIONAL**

---

## 1. PENDAHULUAN & TUJUAN PRODUK

### 1.1 Latar Belakang
Kegiatan *Preventive Maintenance* (PM) rutin pada terminal POS (Point of Sales) dan FMS (*Fuel Management System*) di SPBU/Site Pertamina International sangat krusial untuk menjaga ketersediaan sistem (*uptime*), akurasi transaksi BBM, keandalan jaringan, dan integritas pelaporan data secara *real-time*. Selama ini, proses pengisian form manual berbasis kertas memiliki kendala dalam hal kecepatan rekapitulasi, risiko hilangnya fisik dokumen, serta lambatnya pelacakan riwayat (*history tracking*) perangkat keras maupun *software*.

### 1.2 Tujuan Produk
Membangun aplikasi berbasis web *mobile* (*responsive web app*) yang memungkinkan teknisi lapangan melakukan pemeriksaan berkala secara digital, melampirkan foto dokumentasi, tanda tangan digital pengawas, dan secara otomatis menghasilkan laporan dokumen resmi berformat PDF yang tersimpan di Google Drive serta terindeks datanya di Turso database.

---

## 2. TARGET PENGGUNA (USER PERSONAS)
1. **Teknisi Lapangan (Field Technician):** Mengakses aplikasi via *smartphone/tablet* saat berada di site, mengisi *checklist* pemeriksaan, mengambil foto temuan, dan mengunggahnya.
2. **Supervisor / Manager Site SPBU:** Melakukan verifikasi data pemeriksaan dan membubuhkan tanda tangan pengesahan (*sign-off*) langsung di perangkat *mobile*.
3. **Administrator / Tim IT Pusat:** Memantau rekapitulasi data historis PM seluruh site melalui *dashboard* dan mengelola arsip digital di Google Drive.

---

## 3. TECH STACK & ARSITEKTUR SISTEM

* **Frontend & Backend Framework:** **Next.js (App Router)** - Memungkinkan pengembangan *Server Actions* yang efisien dan tampilan antarmuka yang ramah *mobile*.
* **Styling:** **Tailwind CSS** - Untuk desain UI yang responsif, bersih, dan profesional.
* **Database (Relational Metadata):** **Turso (SQLite Serverless)** - Menyimpan data terstruktur terkait informasi site, inventaris hardware, versi software, dan status *checklist*.
* **File & Document Storage:** **Google Drive API** - Menyimpan file fisik laporan PDF, foto dokumentasi, dan lampiran pendukung.
* **PDF Generator:** *Library* pembuat PDF di sisi server (misal: `pdfkit`, `puppeteer`, atau *HTML-to-PDF template renderer*) untuk menghasilkan output dokumen persis format resmi Pertamina.

---

## 4. RUANG LINGKUP FITUR UTAMA (FUNCTIONAL REQUIREMENTS)

### 4.1 Autentikasi & Manajemen Sesi
* Login teknisi berdasarkan kredensial akun lapangan.
* Pemilihan Site / SPBU berdasarkan daftar terdaftar di database Turso.

### 4.2 Pencatatan Header & Informasi Umum
* Input ID POS / Terminal ID.
* Tanggal & Waktu pengerjaan otomatis/manual.
* Nama Teknisi & Nama Supervisor Site.

### 4.3 Inventaris Versi Software & Sistem PINSYST
* Pencatatan versi aktif:
  1. Aplikasi POS PINSYST
  2. PINSYST Printer Server
  3. Modul Export
  4. Modul IMEX (Import/Export Data)
  5. Sistem Operasi (OS) / Pendukung

### 4.4 Inventaris Hardware PC / Terminal POS
* Merek & Model PC / Terminal
* Spesifikasi CPU, RAM (GB), dan Storage (SSD/HDD - Kapasitas & Free Space)
* Pemeriksaan fisik (kebersihan kipas, heatsink, sirkulasi udara) dengan status `[B / R / X]`.

### 4.5 Forecourt & FMS (Dispenser, Nozzle, Tangki, & ATG)
* Rekapitulasi jumlah unit dispenser & total nozzle/pump.
* Pendataan jenis produk BBM per nozzle (Pertalite, Pertamax, Dexlite, dll.).
* Brand ATG (Veeder-Root, Gilbarco, Franklin Fueling, dll.).
* Detail Tangki: Kapasitas tangki, status sensor ketinggian & suhu, serta *water sensor* (deteksi air).

### 4.6 Inventaris Mesin EDC & Serial Number (SN)
* Jumlah unit EDC terpasang.
* Pencatatan Merek, Tipe, **Serial Number (SN)**, status fisik, dan status koneksi ke POS/Jaringan.

### 4.7 Periferal POS & Kasir
* Layar (Display / Touchscreen)
* Receipt Printer (Thermal head, pemotongan auto-cutter)
* Barcode Scanner
* Cash Drawer (Laci Uang)

### 4.8 Jaringan & Konektivitas (Network)
* Kondisi kabel fisik UTP/LAN & port RJ45.
* Perangkat jaringan (Switch/Router).
* Pengujian Ping Latensi ke Server Pusat / Back Office & konfigurasi IP Address.

### 4.9 Pemeriksaan Fitur POS & PINSYST (Checklist Khusus)
1. **Fitur Transaksi BBM:** Pengujian alur transaksi penjualan reguler.
2. **Transaksi menggunakan RFID:** Pembacaan kartu/tag RFID pada sistem.
3. **Safedrop Fitur:** Pengujian setoran kasir ke brankas/utama via POS.
4. **Fitur Pump Test:** Pengontrolan pompa untuk kalibrasi / uji takar.
5. **Report:** Rekapitulasi Sales Report, House Delivery Report, dan Settlement Report.
6. **Tank Delivery:** Pencatatan bongkar BBM dari mobil tangki ke tangki pendam.
7. **Printer POS Berfungsi:** Uji cetak, thermal head, dan auto-cutter.
8. **Login & Hak Akses:** Otentikasi level kasir, supervisor, dan manager.
9. **Fitur Khusus (Void & Retur):** Pembatalan transaksi dan retur barang.
10. **Sinkronisasi Data:** Pengiriman data transaksi *real-time* atau terjadwal.
11. **Master Data Update (IMEX/Export):** Pembaruan katalog dan harga produk.

### 4.10 Daya & Lingkungan (Power & Environment)
* Pengujian UPS (*back-up time* dan *safe shutdown*).
* Kelistrikan, kestabilan tegangan, dan *grounding*.
* Kebersihan dan suhu ruangan sekitar POS.

### 4.11 Dokumentasi Foto & Catatan Action Plan
* **Photo Attachment:** Pengambilan foto langsung lewat kamera HP atau unggah file gambar untuk bukti temuan/kerusakan.
* **Catatan Temuan & Action Plan:** Rencana tindakan korektif segera, penggantian *sparepart*, dan catatan jadwal PM berikutnya.
* **Digital Sign-Off:** Kolom tanda tangan digital untuk teknisi pelaksana dan supervisor site.

---

## 5. SKEMA DATABASE TURSO (SQL SCHEMA DRAFT)

```sql
-- Tabel Site / SPBU
CREATE TABLE sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_name TEXT NOT NULL,
  location TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Sesi Preventive Maintenance (Header)
CREATE TABLE pm_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER,
  terminal_id TEXT NOT NULL,
  technician_name TEXT NOT NULL,
  supervisor_name TEXT NOT NULL,
  execution_date TEXT NOT NULL,
  software_versions TEXT, -- JSON string menyimpan versi pinsyst, printer server, imex, dll
  hardware_specs TEXT,    -- JSON string spesifikasi CPU, RAM, Storage
  network_params TEXT,    -- JSON string latensi, IP address
  status_summary TEXT,
  action_plan TEXT,
  gdrive_pdf_id TEXT,     -- ID file PDF di Google Drive
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

-- Tabel Detail Inventaris EDC per Sesi PM
CREATE TABLE pm_edc_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pm_report_id INTEGER,
  brand_type TEXT,
  serial_number TEXT,
  physical_status TEXT,
  connection_status TEXT,
  FOREIGN KEY (pm_report_id) REFERENCES pm_reports(id)
);

-- Tabel Detail Tangki & ATG per Sesi PM
CREATE TABLE pm_tanks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pm_report_id INTEGER,
  tank_number TEXT,
  product_name TEXT,
  capacity_liters INTEGER,
  sensor_status TEXT,
  water_sensor_status TEXT,
  FOREIGN KEY (pm_report_id) REFERENCES pm_reports(id)
);

-- Tabel Lampiran Foto / File
CREATE TABLE pm_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pm_report_id INTEGER,
  file_name TEXT NOT NULL,
  google_drive_id TEXT NOT NULL,
  mime_type TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pm_report_id) REFERENCES pm_reports(id)
);
```

---

## 6. NON-FUNCTIONAL REQUIREMENTS (NFR)
* **Responsif & Mobile-First:** Antarmuka dirancang optimal untuk layar *smartphone* (portrait mode) agar mudah dioperasikan teknisi di lapangan dengan satu tangan.
* **Offline-Friendly (Opsional/Pengembangan Lanjutan):** Menggunakan *local storage caching* jika koneksi internet di area forecourt SPBU tidak stabil, lalu melakukan sinkronisasi (*sync*) saat sinyal kembali normal.
* **Keamanan Data:** Enkripsi akses API menggunakan *Bearer Token* dan pembatasan izin (*scope*) pada Google Service Account.

---

## 7. RENCANA PENGEMBANGAN (PHASED ROLLOUT)
* **Phase 1:** Pembuatan kerangka UI Mobile Web dengan Next.js, koneksi Turso, dan form input dasar.
* **Phase 2:** Integrasi modul *checklist* lengkap (hardware, forecourt, ATG, EDC, fitur POS PINSYST).
* **Phase 3:** Integrasi Google Drive API untuk *file upload* foto dan fitur *Auto-PDF Generation*.
* **Phase 4:** Uji coba lapangan (*pilot project*) bersama tim teknisi Pertamina International.