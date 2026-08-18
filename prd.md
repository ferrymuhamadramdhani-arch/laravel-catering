# PRD - CaterOS
### Product Requirements Document: Platform SaaS Management Catering End-to-End

**Versi:** 1.0
**Tanggal:** 18 Agustus 2026
**Status:** Draft untuk Development
**Owner:** Product/Engineering Team

---

## 1. Ringkasan Eksekutif

CaterOS adalah platform SaaS multi-tenant yang mendigitalisasi seluruh alur bisnis catering — dari pemesanan pelanggan, perencanaan menu, produksi dapur, manajemen stok bahan baku, pengiriman, hingga keuangan dan pelaporan. Target: menggantikan proses manual (WhatsApp, Excel, catatan kertas) yang umum dipakai bisnis catering kecil-menengah di Indonesia.

### 1.1 Masalah yang Dipecahkan
- Pemilik catering kesulitan melacak pesanan yang tersebar di WhatsApp/telepon.
- Tidak ada visibilitas stok bahan baku real-time → sering kehabisan atau overstock.
- Perhitungan HPP (harga pokok produksi) dan margin dilakukan manual dan sering salah.
- Penjadwalan dapur dan tim pengiriman tidak terkoordinasi.
- Tidak ada data historis untuk pengambilan keputusan bisnis (menu terlaris, pelanggan repeat order, dsb).

### 1.2 Tujuan Produk
1. Menyediakan satu sumber kebenaran (single source of truth) untuk seluruh operasional catering.
2. Mengotomatiskan kalkulasi biaya, stok, dan invoice.
3. Memberikan visibilitas end-to-end: dari order masuk sampai makanan sampai ke pelanggan.
4. Multi-tenant SaaS agar bisa diskalakan ke banyak bisnis catering dengan model berlangganan.

---

## 2. Target Pengguna & Persona

| Persona | Deskripsi | Kebutuhan Utama |
|---|---|---|
| **Owner/Admin Catering** | Pemilik bisnis, 1-50 karyawan | Dashboard bisnis, laporan keuangan, kontrol penuh |
| **Staff Sales/CS** | Menangani pesanan masuk | Input order cepat, tracking status, chat/reminder pelanggan |
| **Kepala Dapur (Kitchen Manager)** | Mengatur produksi | Jadwal produksi, resep, kebutuhan bahan per hari |
| **Staff Gudang/Procurement** | Kelola stok bahan baku | Stock opname, purchase order, alert stok minim |
| **Staff Pengiriman/Kurir** | Antar pesanan | Rute pengiriman, bukti terima (POD), status real-time |
| **Pelanggan (End Customer)** | Individu/perusahaan yang memesan | Booking online, tracking pesanan, pembayaran, riwayat |
| **Super Admin (Internal SaaS)** | Tim CaterOS | Kelola tenant, billing subscription, monitoring sistem |

---

## 3. Ruang Lingkup (Scope)

### 3.1 In-Scope (MVP dan lanjutan)
- Multi-tenant architecture (1 tenant = 1 bisnis catering)
- Manajemen menu & paket catering
- Manajemen pemesanan (order lifecycle penuh)
- Manajemen pelanggan (CRM ringan)
- Perencanaan & manajemen produksi dapur
- Manajemen inventaris & bahan baku (termasuk BOM/resep)
- Manajemen pengadaan (purchase order ke supplier)
- Manajemen pengiriman & logistik
- Keuangan: invoicing, pembayaran, HPP, laporan laba rugi sederhana
- Manajemen staf & penjadwalan kerja
- Notifikasi (email/WhatsApp/push)
- Dashboard analitik & laporan
- Portal pelanggan (web/mobile) untuk booking mandiri
- Billing & subscription management (SaaS admin panel)

### 3.2 Out-of-Scope (fase awal)
- Integrasi POS fisik/kasir offline
- Marketplace multi-vendor (agregator banyak catering)
- Fitur akuntansi penuh (pajak kompleks, rekonsiliasi bank otomatis) — cukup integrasi dasar
- Native mobile app (fase awal: responsive web/PWA dulu)

---

## 4. Peran & Hak Akses (Roles & Permissions)

| Role | Order | Menu | Inventori | Produksi | Keuangan | Laporan | User Mgmt |
|---|---|---|---|---|---|---|---|
| Owner/Admin | Full | Full | Full | Full | Full | Full | Full |
| Sales/CS | Create/Edit | View | - | View | View | View | - |
| Kitchen Manager | View | View | View/Request | Full | - | View (produksi) | - |
| Gudang/Procurement | - | - | Full | View | View (biaya) | View (stok) | - |
| Kurir | View (assigned) | - | - | - | - | - | - |
| Customer | Create/View (milik sendiri) | View | - | - | View (invoice sendiri) | - | - |
| Super Admin (Internal) | - | - | - | - | Billing tenant | Sistem-wide | Full (tenant) |

*Catatan: Role dapat dikustomisasi oleh Admin tenant (custom role/permission matrix) sebagai fitur fase 2.*

---

## 5. Modul & Fitur Utama

### 5.1 Modul Onboarding & Multi-Tenancy
- Registrasi tenant baru (signup self-service dengan trial)
- Setup wizard: profil bisnis, jenis catering (nasi kotak, prasmanan, wedding, korporat, dll), area layanan, jam operasional
- Isolasi data per tenant (data terpisah aman antar tenant)
- Custom subdomain/branding (opsional, fase 2)

### 5.2 Modul Manajemen Menu
- CRUD menu item (nama, kategori, foto, deskripsi, harga)
- Paket menu (bundling: paket A/B/C, per porsi, per box, prasmanan per pax)
- Resep & BOM (Bill of Materials) — setiap menu terhubung ke daftar bahan baku + takaran
- Kalkulasi HPP otomatis berdasarkan harga bahan baku terkini
- Varian menu (pedas/tidak pedas, vegetarian, dll)
- Musiman/ketersediaan menu (available date range)

### 5.3 Modul Pemesanan (Order Management)
- Order dari berbagai channel: portal pelanggan, admin input manual, WhatsApp (via integrasi/manual entry)
- Detail order: tanggal & waktu pengiriman, jumlah pax/box, alamat, catatan khusus
- Status lifecycle order: `Draft → Confirmed → In Production → Ready → Delivering → Delivered → Completed → Cancelled`
- Kalender pesanan (calendar view harian/mingguan/bulanan) untuk melihat beban kerja
- Deteksi konflik kapasitas (kapasitas dapur/hari)
- Down payment (DP) & pelunasan tracking
- Perubahan/pembatalan order dengan histori (audit trail)
- Order berulang (recurring order untuk pelanggan korporat harian)

### 5.4 Modul Manajemen Pelanggan (CRM)
- Database pelanggan (individu & korporat)
- Riwayat pesanan per pelanggan
- Segmentasi pelanggan (VIP, korporat, repeat order)
- Catatan preferensi (alergi, menu favorit)
- Follow-up/reminder otomatis (event mendatang, ulang tahun kontrak)

### 5.5 Modul Produksi Dapur
- Production planning otomatis dari agregasi semua order per tanggal
- Auto-generate kebutuhan bahan baku harian (dari BOM x jumlah order)
- Jadwal produksi & penugasan tim dapur
- Checklist tahap produksi (prep, masak, packing, QC)
- Print label/nota produksi per order

### 5.6 Modul Inventaris & Bahan Baku
- Master data bahan baku (satuan, kategori, supplier utama)
- Stok real-time (in/out otomatis dari produksi & pembelian)
- Stock opname (audit fisik berkala)
- Alert stok minimum (reorder point)
- Riwayat pergerakan stok (stock ledger)
- Manajemen multi-gudang (jika ada cabang, fase 2)

### 5.7 Modul Pengadaan (Procurement)
- Manajemen data supplier
- Purchase Order (PO) — manual atau auto-suggest dari kebutuhan produksi
- Penerimaan barang (goods receipt) & pencocokan dengan PO
- Perbandingan harga antar supplier (riwayat harga)
- Approval workflow untuk PO di atas nominal tertentu

### 5.8 Modul Pengiriman & Logistik
- Penjadwalan rute pengiriman
- Assign kurir/tim pengiriman per order
- Tracking status pengiriman real-time (opsional: live location, fase 2)
- Bukti pengiriman (foto/tanda tangan digital - POD)
- Manajemen armada/kendaraan (opsional)
- Optimasi rute sederhana (grouping berdasarkan area, fase 2)

### 5.9 Modul Keuangan
- Invoice otomatis dari order (generate PDF, kirim ke pelanggan)
- Pencatatan pembayaran (transfer manual, payment gateway - QRIS/VA)
- Tracking piutang (AR) — terutama untuk korporat dengan termin pembayaran
- Laporan HPP vs harga jual → margin per order/menu
- Laporan laba rugi sederhana (revenue, cost of goods, expense operasional)
- Pengeluaran operasional (gaji, sewa, utilitas) — pencatatan manual
- Export laporan keuangan (Excel/PDF)
- Integrasi payment gateway (Midtrans/Xendit) untuk pembayaran online

### 5.10 Modul Manajemen Staf & HR
- Data karyawan & role
- Jadwal kerja/shift (dapur, kurir, sales)
- Absensi sederhana (opsional, fase 2)
- Perhitungan komisi sales (opsional)

### 5.11 Modul Notifikasi
- Notifikasi in-app & email untuk semua role (order baru, status berubah, stok menipis, invoice jatuh tempo)
- Integrasi WhatsApp Business API (notifikasi ke pelanggan: konfirmasi order, reminder pembayaran, update pengiriman)
- Notifikasi push (jika ada PWA/mobile app)

### 5.12 Modul Dashboard & Analitik
- Dashboard owner: revenue harian/mingguan/bulanan, jumlah order, order pending
- Analitik menu terlaris
- Analitik pelanggan (retention, repeat order rate)
- Analitik efisiensi bahan baku (waste, variance HPP)
- Forecast permintaan sederhana berdasarkan histori (fase 2/3)

### 5.13 Portal Pelanggan (Customer-Facing)
- Katalog menu online dengan foto & harga
- Booking/order online dengan pilihan tanggal, jumlah pax, catatan
- Cek status pesanan real-time
- Riwayat pesanan & invoice
- Pembayaran online

### 5.14 Admin Panel SaaS (Internal - Super Admin)
- Manajemen tenant (aktif/nonaktif, trial, upgrade/downgrade plan)
- Manajemen paket berlangganan (Free/Basic/Pro/Enterprise) & fitur per paket
- Billing & invoicing tenant (recurring subscription)
- Monitoring penggunaan sistem (usage metrics per tenant)
- Support/ticketing dasar

---

## 6. User Flow Kunci

### 6.1 Flow Pemesanan (Customer → Delivered)
1. Pelanggan browsing menu di portal → pilih paket & tanggal → submit order
2. Sistem cek kapasitas dapur pada tanggal tsb → konfirmasi/tolak
3. Admin/CS review order → konfirmasi → invoice DP terbit
4. Pelanggan bayar DP → status order jadi "Confirmed"
5. H-1: sistem generate kebutuhan produksi & bahan baku
6. Tim dapur eksekusi produksi sesuai checklist
7. Order selesai diproduksi → status "Ready" → assign kurir
8. Kurir antar → update status "Delivering" → POD saat sampai → "Delivered"
9. Sistem generate invoice pelunasan (jika ada sisa pembayaran)
10. Order "Completed" → data masuk ke laporan & histori pelanggan

### 6.2 Flow Pengadaan Bahan Baku
1. Sistem agregasi kebutuhan bahan dari semua order H+1/H+2
2. Bandingkan dengan stok tersedia → hitung selisih (shortage)
3. Auto-suggest PO ke supplier utama per bahan
4. Admin/gudang review & approve PO
5. Barang diterima → stok terupdate otomatis
6. Bahan dipakai saat produksi → stok berkurang otomatis (deduct by BOM)

---

## 7. Kebutuhan Non-Fungsional

| Kategori | Requirement |
|---|---|
| **Multi-tenancy** | Isolasi data ketat antar tenant (schema-per-tenant atau row-level security dengan tenant_id) |
| **Skalabilitas** | Mendukung pertumbuhan dari puluhan hingga ribuan tenant tanpa redesign arsitektur |
| **Keamanan** | Enkripsi data at-rest & in-transit (TLS), RBAC, audit log untuk aksi kritikal, proteksi terhadap OWASP Top 10 |
| **Ketersediaan** | Target uptime 99.5%+ untuk fase produksi |
| **Performa** | Response time API < 500ms untuk operasi umum; dashboard load < 2 detik |
| **Kepatuhan Data** | Kepatuhan terhadap UU PDP (Perlindungan Data Pribadi) Indonesia |
| **Backup & Recovery** | Backup otomatis harian, RPO ≤ 24 jam, RTO ≤ 4 jam |
| **Localization** | Bahasa Indonesia sebagai default, mendukung format Rupiah, zona waktu WIB/WITA/WIT |
| **Aksesibilitas** | Responsive design (mobile-first untuk portal pelanggan & kurir) |
| **Auditability** | Log perubahan data penting (order, harga, stok) untuk kebutuhan audit |

---

## 8. Arsitektur Teknis

### Stack Teknologi yang Digunakan

| Layer | Teknologi | Keterangan |
|---|---|---|
| **Frontend** | React.js (Vite) | SPA untuk web admin & portal pelanggan (PWA-ready) |
| **Backend** | Laravel (PHP) | REST API — framework utama untuk seluruh business logic |
| **Database** | PostgreSQL | Relational DB, multi-tenant dengan row-level security (tenant_id) |
| **Cache / Queue** | Redis | Cache session, job queue (notifikasi, generate invoice, broadcast event) |
| **File Storage** | S3-compatible (AWS S3 / MinIO) | Foto menu, bukti pengiriman (POD), dokumen PDF |
| **Payment Gateway** | Midtrans / Xendit | Pembayaran online QRIS, Virtual Account, Transfer |
| **Notifikasi** | WhatsApp Business API (Official) | Konfirmasi order, reminder pembayaran, update pengiriman ke pelanggan |
| **Email** | SendGrid / Amazon SES | Notifikasi email sistem & invoice |
| **Deployment** | Docker + CI/CD pipeline | Containerized, siap di-deploy ke cloud (AWS/GCP/DO) |
| **Monitoring** | Sentry + Grafana/Prometheus | Error tracking & infra monitoring |

### Detail Arsitektur

- **Backend Laravel**: Menggunakan Laravel sebagai full-featured backend framework — Eloquent ORM untuk database, Laravel Queue untuk async job (kirim notifikasi, generate PDF invoice), Laravel Sanctum/Passport untuk API authentication (SPA token), dan Laravel Policies untuk RBAC.
- **Frontend React.js**: SPA dibangun dengan React.js + Vite. State management menggunakan Zustand/Redux Toolkit. Komunikasi ke backend via REST API (Axios). React Router untuk client-side routing. Desain komponen menggunakan shadcn/ui atau Ant Design.
- **Multi-tenancy**: Implementasi dengan `tenant_id` di setiap tabel (row-level tenancy). Middleware Laravel secara otomatis mem-filter query berdasarkan tenant aktif dari token/session.
- **Offline Support (Kurir)**: Service Worker di frontend React untuk caching status pengiriman dan antrian sync saat koneksi kembali tersedia.

---

## 9. Model Data Inti (Entitas Utama)

```
Tenant
 ├── User (Role: Owner, Sales, Kitchen, Warehouse, Courier)
 ├── Customer
 ├── MenuItem ── BOM (Recipe) ── RawMaterial
 ├── MenuPackage (bundling MenuItem)
 ├── Order ── OrderItem ── linked to MenuPackage/MenuItem
 │     └── OrderStatusHistory
 ├── Invoice ── Payment
 ├── ProductionPlan ── ProductionTask
 ├── RawMaterial ── StockLedger ── Supplier
 ├── PurchaseOrder ── PurchaseOrderItem
 ├── Delivery ── DeliveryProof (POD)
 └── Subscription (billing plan tenant - level Super Admin)
```

---

## 10. Metrik Keberhasilan (Success Metrics / KPI)

| Metrik | Target Indikatif |
|---|---|
| Waktu input order manual → digital | Berkurang 70% |
| Akurasi kalkulasi HPP | 95%+ akurat vs manual |
| Kesalahan/kekurangan stok saat produksi | Berkurang 80% |
| Waktu pembuatan invoice | Dari manual (menit-jam) → otomatis (<1 menit) |
| Tenant retention (SaaS) | Churn bulanan < 5% |
| Adoption rate fitur inti (order, produksi, stok) | > 80% tenant aktif menggunakan dalam 30 hari |

---

## 11. Roadmap Fase Pengembangan

### Fase 1 — MVP (Fokus Operasional Inti)
- Auth & multi-tenant setup
- Manajemen menu & BOM dasar
- Manajemen order (manual input oleh admin/CS)
- Invoice sederhana & pencatatan pembayaran manual
- Manajemen stok bahan baku dasar (in/out manual)
- Dashboard dasar

### Fase 2 — Digitalisasi Penuh
- Portal pelanggan self-service (booking online)
- Payment gateway online
- Modul produksi dapur otomatis (auto-generate dari order)
- Modul pengadaan & PO otomatis
- Modul pengiriman & tracking kurir
- Notifikasi WhatsApp otomatis

### Fase 3 — Optimasi & Skalabilitas
- Analitik lanjutan & forecasting demand
- Custom role/permission
- Multi-gudang/multi-cabang
- Optimasi rute pengiriman
- Admin panel SaaS penuh (billing, plan management)
- Native mobile app (kurir & dapur)

---

## 12. Asumsi & Risiko

| Item | Detail |
|---|---|
| **Asumsi** | Target awal pasar Indonesia (UMKM catering), integrasi WhatsApp memakai provider pihak ketiga |
| **Risiko Teknis** | Kompleksitas isolasi data multi-tenant jika tidak didesain sejak awal |
| **Risiko Bisnis** | Resistensi user (owner catering) yang terbiasa manual — perlu onboarding & training yang mudah |
| **Risiko Operasional** | Ketergantungan pada akurasi input BOM/resep — jika salah, kalkulasi stok & HPP ikut salah |
| **Mitigasi** | MVP fokus ke fitur yang paling terasa dampaknya (order + stok + invoice) sebelum fitur kompleks |

---

## 13. Keputusan Teknis & Bisnis (Confirmed Decisions)

Berikut adalah keputusan-keputusan yang telah dikonfirmasi dan **wajib dijadikan acuan requirement development**:

| # | Topik | Keputusan | Implikasi Teknis |
|---|---|---|---|
| 1 | **Dukungan Multi-Cabang/Multi-Dapur** | **Single Location per Tenant** (fase awal) | Setiap tenant hanya memiliki 1 lokasi dapur & gudang. Tidak perlu implementasi multi-warehouse atau multi-kitchen routing di MVP & Fase 2. Fitur multi-cabang masuk backlog Fase 3. |
| 2 | **Model Pricing SaaS** | **Tiered berdasarkan Fitur** | Buat paket subscription (misal: Starter / Growth / Pro) dengan batasan fitur per paket — bukan per jumlah order atau flat fee. Admin panel SaaS harus dapat mendefinisikan fitur apa saja yang aktif per plan. |
| 3 | **Integrasi WhatsApp** | **WhatsApp Business API Official** | Wajib menggunakan WhatsApp Business API resmi (melalui BSP/Business Solution Provider yang telah terverifikasi Meta, misal: Twilio, Wablas, atau Zenziva). Proses verifikasi bisnis tenant harus diakomodasi dalam onboarding. |
| 4 | **Mode Offline untuk Kurir** | **Ya — dibutuhkan** | Aplikasi web kurir (React PWA) harus mendukung mode offline: update status pengiriman & upload foto POD bisa dilakukan offline, lalu disinkronkan otomatis saat koneksi kembali tersedia. Implementasi menggunakan Service Worker + IndexedDB + background sync. |

---

*Dokumen ini adalah working draft. Disarankan divalidasi dengan minimal 2-3 pemilik bisnis catering nyata sebelum finalisasi scope MVP.*
