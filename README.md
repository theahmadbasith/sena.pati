# SENAPATI
### Sentral Navigasi Pengelolaan Agenda dan Tata Informasi Bupati Ponorogo

SENAPATI adalah aplikasi manajemen agenda dan persuratan digital yang dirancang khusus untuk mendukung kegiatan Bupati Ponorogo. Sistem ini mengintegrasikan Google Sheets sebagai database, Google Drive sebagai penyimpanan dokumen, dan dapat diinstal sebagai PWA (Progressive Web App) di perangkat apapun.

---

## Fitur Utama

### 📅 Agenda Kegiatan
- Kelola jadwal kegiatan harian Bupati dengan tampilan timeline per tanggal
- Status kehadiran: **Hadir**, **Tidak Hadir**, **Disposisi**
- Upload file **Sambutan**, **Sapaan**, dan **Lampiran** (PDF/DOCX/Gambar) per agenda
- Koordinat lokasi dengan integrasi peta interaktif (Leaflet/OpenStreetMap)
- Kontak Person (CP) lengkap dengan nama dan nomor WhatsApp
- Kirim agenda harian via WhatsApp ke nomor akun aktif atau nomor lain
- Input waktu menggunakan jam analog 24 jam (kompatibel semua perangkat)

### 📊 Dashboard & Kalender
- Kalender mini interaktif dengan navigasi bulan
- Tanggal berisi agenda ditandai dot berwarna sesuai status
- Klik tanggal → popup detail agenda lengkap dengan tombol file viewer
- Statistik ringkasan: total agenda, agenda hari ini, besok, disposisi, dan arsip
- Aksi cepat: Agenda Baru, Arsip Digital, Lihat Peta, Disposisi, Panduan

### 📨 Surat Masuk
- Manajemen arsip surat masuk dengan lampiran digital
- Kategori: Umum, Penting, Rahasia, Undangan, Lainnya
- Upload lampiran softcopy (PDF/gambar) per surat
- Edit, hapus, dan preview lampiran inline dengan tombol **Lihat**

### 📋 Sistem Disposisi
- Disposisi otomatis saat status agenda diset ke Disposisi
- Data agenda (nama kegiatan, waktu, lokasi, pakaian, CP) ikut tersalin ke disposisi
- Status disposisi: **Diproses** dan **Selesai**
- Kirim notifikasi WA ke ajudan yang dipilih (bisa lebih dari satu)
- Tandai selesai dengan upload foto bukti kehadiran/pelaksanaan
- Informasi disposisi (kepada siapa) tampil di halaman Protokol

### 👥 Data Ajudan
- Kelola daftar ajudan Bupati (nama + nomor WA)
- Ajudan muncul sebagai pilihan checkbox saat kirim WA disposisi

### 📁 Arsip Digital
- Upload dokumen ke Google Drive dengan kategori terorganisir
- Kategori: Keputusan Bupati, Instruksi Bupati, Peraturan Bupati, Surat Edaran, Nota Dinas, Surat Tugas, Surat Perintah, Disposisi/Memo, dan Lainnya
- Preview dokumen inline (PDF, DOCX, Gambar) tanpa keluar halaman
- Tombol **Lihat** pada setiap lampiran

### 📄 Template Surat & Generator
- Upload template `.docx` dengan variabel `{{nama_variabel}}`
- Deteksi variabel otomatis dari seluruh bagian dokumen (header, footer, body)
- Wizard 3 langkah: Pilih Template → Isi Data → Preview & Unduh
- Preview visual dokumen hasil generate langsung di browser
- Unduh hasil sebagai `.docx`
- Variabel khusus: `date_`, `datetime_`, `select_Label_Opsi1_Opsi2`, textarea otomatis

### 🗺️ Peta Agenda Interaktif
- Visualisasi lokasi agenda di peta OpenStreetMap dengan marker berwarna sesuai status
- Default menampilkan agenda **hari ini**
- Filter rentang waktu: **1 Minggu**, **1 Bulan**, **Semua**, atau tanggal spesifik
- 6 pilihan layer peta: OSM, Satelit Esri, Google Sat, Google Hybrid, CartoDB, Topo
- Gambar rute (polyline) dan area (polygon) dengan nama, keterangan, dan warna
- Mode layar penuh — topbar disembunyikan, peta mengisi seluruh layar

### 📱 Kirim Agenda via WhatsApp
- Format pesan otomatis lengkap dengan detail agenda, link file, dan info CP
- Nomor penerima default: nomor WA akun yang sedang login
- Bisa kirim ke nomor lain dengan input manual
- Pilih ajudan untuk disposisi (bisa lebih dari satu)

### 🔐 Keamanan & Akses Multi-Role
- Autentikasi berbasis Role: **ADMIN**, **USER**
- Password terenkripsi SHA-256
- Sesi berlaku 1 jam, persist saat refresh/reload
- **ADMIN** — akses penuh ke semua fitur
- **USER** — diarahkan ke halaman Protokol (read-only: agenda + peta)

### 📱 Halaman Protokol (Role USER)
- Halaman khusus di `/protokol` untuk staf protokol
- Menu Agenda: lihat agenda hari ini, besok, kalender interaktif, search & filter
- Agenda berstatus Disposisi menampilkan info **disposisi kepada siapa**
- Menu Peta: default hari ini, filter 1 minggu atau tanggal spesifik (read-only)
- Loading screen dengan animasi logo yang smooth

### 📱 PWA Ready
- Dapat diinstal di Android, iOS, dan Desktop seperti aplikasi native
- Ikon dan manifest lengkap

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Vanilla JS SPA, Bootstrap Icons, Font Awesome, Leaflet.js |
| Backend | Next.js 14 API Routes (Vercel Serverless) |
| Database | Google Sheets (via Sheets API v4) |
| Storage | Google Drive (via Drive API v3) |
| Auth | Google Service Account + SHA-256 |
| DOCX | PizZip + Docxtemplater + docx-preview |
| Maps | Leaflet.js + OpenStreetMap |
| Time Picker | Custom Analog Clock (built-in, zero dependency) |
| Deploy | Vercel |

---

## Database (Google Sheets)

| Sheet | Keterangan |
|---|---|
| `Users` | Data akun pengguna (username, password hash, nama, role, no WA) |
| `Agenda` | Jadwal kegiatan Bupati |
| `Disposisi` | Alur disposisi kegiatan |
| `Surat Masuk` | Arsip surat masuk |
| `Arsip` | Arsip dokumen digital |
| `Template Surat` | Koleksi template .docx |
| `Layer Peta` | Layer marker peta interaktif |
| `Peta Drawings` | Gambar/anotasi peta (polyline & polygon) |
| `Ajudan` | Data ajudan Bupati (nama + nomor WA) |

> Total: **9 sheet**. Dibuat otomatis melalui menu Pengaturan → Database → Inisialisasi Database.

---

## Panduan Instalasi

### 1. Persiapan Google Cloud

1. Buka [Google Cloud Console](https://console.cloud.google.com/) dan buat project baru.
2. Aktifkan **Google Sheets API** dan **Google Drive API**.
3. Buat Service Account di `IAM & Admin` → `Service Accounts` → `Create Service Account`.
4. Buka tab `Keys` → `Add Key` → `Create New Key` (format **JSON**). Simpan file JSON tersebut.
5. Catat alamat email Service Account (contoh: `senapati@project.iam.gserviceaccount.com`).

### 2. Persiapan Google Sheets (Database)

1. Buat Google Spreadsheet baru.
2. Ambil **Sheet ID** dari URL (teks di antara `/d/` dan `/edit`).
3. Bagikan spreadsheet ke email Service Account dengan akses **Editor**.
4. Sheet dibuat otomatis saat menjalankan **Inisialisasi Database** dari menu Pengaturan.

### 3. Persiapan Google Drive (Storage)

**Opsi A — Drive Bersama (Shared Drive)** *(Direkomendasikan)*
- Di Google Drive, buka **Drive Bersama** → buat folder baru.
- Salin **Folder ID** dari URL.
- Tambahkan email Service Account sebagai **Pengelola** atau **Kontributor**.

**Opsi B — Akun Gmail Pribadi** *(Alternatif)*
- Buat folder di Google Drive akun `@gmail.com`.
- Salin Folder ID dari URL.
- Share folder ke email Service Account dengan akses **Editor**.

### 4. Deploy ke Vercel

1. Push repositori ke GitHub.
2. Hubungkan ke [Vercel](https://vercel.com/) dan buat project baru.
3. Tambahkan **Environment Variables**:

   | Variabel | Nilai |
   |---|---|
   | `GOOGLE_SERVICE_ACCOUNT_KEY` | Seluruh isi file JSON Service Account |
   | `GOOGLE_SHEET_ID` | ID Google Spreadsheet |
   | `GOOGLE_DRIVE_FOLDER_ID` | ID Folder Google Drive |

4. Klik **Deploy**.
5. Setelah deploy berhasil, buka aplikasi → login → masuk ke **Pengaturan** → **Database** → klik **Inisialisasi Database**.

> **Akun default setelah inisialisasi:**
> - Username: `admin`
> - Password: `admin123`
>
> **Segera ganti password setelah login pertama.**

---

## Pengembangan Lokal

```bash
# 1. Clone repositori
git clone <url-repo>
cd senapati

# 2. Install dependensi
npm install

# 3. Buat file environment
cp .env.example .env.local
# Isi GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_SHEET_ID, GOOGLE_DRIVE_FOLDER_ID

# 4. Jalankan server development
npm run dev

# 5. Buka di browser
# http://localhost:3000/app        (halaman admin)
# http://localhost:3000/protokol   (halaman protokol/user)
```

---

## Struktur Folder

```
senapati/
├── pages/
│   ├── api/
│   │   └── [action].js      # Backend API Routes (Next.js Serverless)
│   ├── app.js               # Next.js page → serve /app
│   ├── index.js             # Next.js page → redirect ke /app
│   └── protokol.js          # Next.js page → serve /protokol
├── public/
│   ├── app/
│   │   ├── index.html       # Frontend SPA utama (Admin)
│   │   ├── app.js           # Logika frontend utama (vanilla JS)
│   │   ├── peta-agenda.js   # Modul peta interaktif (dengan fitur gambar)
│   │   └── style.css        # Stylesheet halaman utama
│   ├── protokol/
│   │   ├── index.html       # Halaman Protokol (Role USER)
│   │   ├── protokol.js      # Logika halaman protokol
│   │   ├── peta-protokol.js # Modul peta protokol (read-only)
│   │   └── protokol.css     # Stylesheet halaman protokol
│   ├── assets/              # Ikon dan gambar
│   └── manifest.json        # Konfigurasi PWA
├── next.config.js
├── package.json
└── vercel.json
```

---

## Panduan Penggunaan Singkat

### Template Surat
Buat file `.docx` di Microsoft Word dengan variabel menggunakan format `{{nama_variabel}}`. Contoh:

```
Kepada Yth. {{nama_penerima}}
Di {{kota_tujuan}}

Hari/Tanggal : {{date_tanggal}}
Tempat       : {{lokasi}}
Perihal      : {{select_Perihal_Rapat_Kunjungan_Acara}}
Keterangan   : {{keterangan_tambahan}}
```

Variabel khusus:
- Awali dengan `date_` → date picker (format otomatis bahasa Indonesia)
- Awali dengan `datetime_` → datetime picker
- Awali dengan `select_Label_Opsi1_Opsi2` → dropdown pilihan
- Nama mengandung `keterangan` atau `uraian` → textarea

### Kirim Agenda ke WhatsApp
1. Buka halaman **Agenda** → klik tombol **Kirim ke WA**
2. Pilih tanggal agenda
3. Preview pesan otomatis terbentuk lengkap dengan link file
4. Nomor penerima default adalah nomor WA akun yang sedang login
5. Bisa juga kirim ke nomor lain dengan mengisi input manual

### Halaman Protokol (Role USER)
- Login dengan akun role USER → otomatis diarahkan ke `/protokol`
- Menu **Agenda**: lihat agenda hari ini, besok, kalender, search & filter
- Agenda berstatus Disposisi menampilkan info disposisi kepada siapa
- Menu **Peta**: default hari ini, filter 1 minggu atau tanggal spesifik (read-only)
- Klik logo SENAPATI di topbar → info sistem dan developer
- Klik avatar/nama di topbar → info akun (nama, role, nomor WA)

---

## Pengembang

| Nama | Peran |
|---|---|
| Ahmad Abdul Basith, S.Tr.I.P | Developer |

---

## Lisensi

Aplikasi ini dikembangkan untuk penggunaan internal **Pemerintah Kabupaten Ponorogo**.

© 2026 SENAPATI — Pemerintah Kabupaten Ponorogo
