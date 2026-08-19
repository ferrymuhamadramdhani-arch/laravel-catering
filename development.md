# Development Checklist - CaterOS

Dokumen ini berisi panduan dan checklist teknis pengerjaan bertahap (*phase-by-phase development*) untuk platform SaaS **CaterOS**.

---

## 🛠 Tech Stack Overview

- **Backend:** Laravel 11+ (REST API, Eloquent, Laravel Sanctum, Laravel Queue/Job, Laravel Policies)
- **Frontend:** React.js 18+ (Vite, React Router, Zustand / TanStack Query, Tailwind CSS / shadcn/ui)
- **Database:** PostgreSQL (Multi-tenant via `tenant_id` + Row-Level Security / Global Scope)
- **Cache & Queue:** Redis
- **Storage:** S3-Compatible (AWS S3 / MinIO)
- **Payment Gateway:** Doku
- **Notifikasi:** WhatsApp Business API Official + SendGrid/SES

---

## 📑 Ringkasan Fase

```
┌────────────────────────────────────────────────────────┐
│ Fase 0: Setup Fondasi & Arsitektur                     │
└─────────────────────────┬──────────────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────┐
│ Fase 1: MVP - Operasional Inti (Manual Input + Stok)   │
└─────────────────────────┬──────────────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────┐
│ Fase 2: Digitalisasi Penuh (Portal, Gateway, WA, Kurir)│
└─────────────────────────┬──────────────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────┐
│ Fase 3: Optimasi, Multi-Cabang & Skalabilitas SaaS     │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Fase 0: Setup Fondasi & Arsitektur Dasar

Tujuan: Menyiapkan infrastruktur dasar, struktur repository, database multi-tenancy, dan design system frontend.

### 0.1 Inisialisasi Project & Environment
- [x] Setup Git repository (Monorepo: `backend` & `frontend`)
- [x] Setup Docker Compose untuk local development (PHP-FPM, Nginx, PostgreSQL, Redis, Mailpit)
- [x] Konfigurasi ESLint, Prettier, dan TypeScript
- [x] Setup CI/CD pipeline dasar (GitHub Actions CI untuk backend test & frontend build)

### 0.2 Backend (Laravel) Foundation
- [x] Inisialisasi project Laravel dengan clean architecture & REST API structure
- [x] Setup PostgreSQL connection & migration base (`tenants`, `users`, `tenant_users`, `personal_access_tokens`)
- [x] Setup Tenant Identification Middleware (`IdentifyTenant` via Subdomain / Header `X-Tenant-ID` / Token Claim)
- [x] Implementasi Eloquent Trait `BelongsToTenant` & `TenantScope` (otomatis filter `tenant_id`)
- [x] Setup Laravel Sanctum untuk SPA/API Token Authentication
- [x] Setup Role & Model architecture (`Tenant`, `User`, `TenantUser`)
- [x] Setup Redis config untuk Queue worker dan Caching
- [x] Konfigurasi Standard API Response Wrapper (`ApiResponse`: `successResponse`, `errorResponse`, `paginatedResponse`)
- [x] Setup Exception Handler JSON response & CORS config

### 0.3 Frontend (React + Vite) Foundation
- [x] Inisialisasi React project dengan Vite & TypeScript
- [x] Setup CSS & UI Component Library (Tailwind CSS, theme tokens, Button, Input, Card, Badge)
- [x] Setup Layout Admin (Sidebar responsif, Header, Tenant badge, User Profile menu)
- [x] Setup Axios Client Interceptor (Handling Bearer Token, `X-Tenant-ID` header, dan Auto-logout on 401)
- [x] Setup State Management (Zustand: `useAuthStore`) & Server State (TanStack Query)
- [x] Setup Client-Side Routing dengan Protected Route (React Router v6)
- [x] Setup Halaman Auth (Login, Registrasi Tenant Baru) & Dashboard Starter
- [x] Setup Navigation & Layout system

---

## 📦 Fase 1: MVP (Fokus Operasional Inti)

Tujuan: Tenant dapat mendaftar, mengelola menu & BOM, menginput order secara manual, memantau stok bahan baku, dan menerbitkan invoice sederhana.

### 1.1 Modul Onboarding & Multi-Tenant (MVP)
- [x] **Backend:**
  - [x] Migration tabel: `tenants`, `users`, `tenant_users` & field wizard onboarding
  - [x] API Register Tenant baru (self-service signup)
  - [x] API Setup Wizard profil bisnis (nama catering, alamat, no. telp, logo, business_type, service_areas, operating_hours)
  - [x] API CRUD Manajemen User Staff per Tenant (Owner, Sales/CS, Kitchen, Warehouse, Courier)
  - [x] Dokumentasi Swagger / OpenAPI 3.0 di `/api/documentation`
- [x] **Frontend:**
  - [x] Halaman Landing & Registrasi Tenant
  - [x] Wizard Setup Profil Tenant 4 Langkah interaktif (`/onboarding`)
  - [x] Halaman Manajemen Pengguna & Staf Tenant (`/users`) dengan filter role & modal CRUD

### 1.2 Modul Manajemen Menu & BOM (MVP)
- [x] **Backend:**
  - [x] Migration tabel: `raw_materials`, `menu_categories`, `menu_items`, `menu_recipes_bom`, `menu_packages`, `menu_package_items`
  - [x] API CRUD Master Bahan Baku (`raw_materials`) + satuan (`unit`) & harga beli default
  - [x] API CRUD Kategori Menu (`menu_categories`)
  - [x] API CRUD Item Menu (`menu_items`) + upload foto ke Storage
  - [x] API CRUD Resep/BOM (`menu_recipes_bom`): asosiasi menu item ke bahan baku + takaran
  - [x] Logika kalkulasi otomatis HPP per menu & per paket berdasarkan harga bahan baku terkini (`HppCalculatorService`)
  - [x] API CRUD Paket Menu (`menu_packages`): bundling menu item
  - [x] Dokumentasi Swagger / OpenAPI 3.0 di `/api/documentation`
- [x] **Frontend:**
  - [x] Restrukturisasi Group Menu Sidebar **Master Data** (Bahan Baku, Kategori, Menu & BOM, Paket)
  - [x] Halaman Master Bahan Baku (`/master-data/materials`) (List, Filter, Modal Tambah/Edit)
  - [x] Halaman Kategori Menu (`/master-data/categories`) (List, Modal Tambah/Edit)
  - [x] Halaman Master Menu & BOM Builder (`/master-data/menus`) (Grid/Table view, Dynamic BOM builder form + kalkulator HPP otomatis & profit margin)
  - [x] Halaman Manajemen Paket Menu (`/master-data/packages`) (Bundling item, kalkulasi total modal HPP paket)
  - [x] Halaman Master Pelanggan (`/master-data/customers`) (List, Filter tipe individu/korporat, Modal CRUD lengkap + catatan preferensi)
  - [x] Halaman Master Supplier (`/master-data/suppliers`) (List, Search, Modal CRUD + chip termin pembayaran)
  - [x] Halaman Area Layanan Pengiriman (`/master-data/delivery-areas`) (Grid card, Modal CRUD + ongkir, min. order, estimasi waktu)

> **Master Data Tambahan (Prioritas Tinggi & Sedang):**
> - [x] **Backend:** Migration + Model + Controller + Swagger API untuk `customers` (individu & korporat)
> - [x] **Backend:** Migration + Model + Controller + Swagger API untuk `suppliers` (pemasok bahan baku, relasi ke `raw_materials.supplier_id`)
> - [x] **Backend:** Migration + Model + Controller + Swagger API untuk `delivery_areas` (zona pengiriman + ongkir + min. order)


### 1.3 Modul Pemesanan / Order Management (MVP - Manual Input)
- [x] **Backend:**
  - [x] Migration tabel: `customers`, `orders`, `order_items`, `order_status_histories`
  - [x] API CRUD Database Pelanggan sederhana (Nama, HP, Email, Alamat)
  - [x] API Buat Pesanan Manual oleh Sales/CS (pilih customer, paket/item, tanggal kirim, porsi, alamat, catatan)
  - [x] Logika State Machine Status Order: `Draft → Confirmed → In Production → Ready → Delivering → Delivered → Completed → Cancelled`
  - [x] Audit Trail status perubahan pesanan (`order_status_histories`)
  - [x] API List & Filter Order (berdasarkan tanggal, status, customer)
- [x] **Frontend:**
  - [x] Halaman Form Input Order Cepat untuk Sales/CS (`CreateOrderModal`)
  - [x] Halaman Order List dengan filter status, rentang tanggal & pencarian (`OrdersPage`)
  - [x] Halaman Detail Order (ringkasan item, status timeline visual, transisi status, info pengiriman, audit trail) (`OrderDetailModal`)
  - [x] View Kalender Pesanan (Calendar View beban pesanan & porsi harian) (`OrderCalendarView`)

### 1.4 Modul Inventaris Bahan Baku Dasar (MVP)
- [ ] **Backend:**
  - [ ] Migration tabel: `stock_ledgers` (riwayat mutasi stok)
  - [ ] API Pencatatan Mutasi Stok Manual (Stock In, Stock Out, Penyesuaian/Opname)
  - [ ] API Ringkasan Stok Real-Time & Alert Stok Minimum
- [ ] **Frontend:**
  - [ ] Halaman Daftar Stok Bahan Baku & indikator warna (aman / menipis / habis)
  - [ ] Form Input Stok Masuk / Penyesuaian Stok
  - [ ] Halaman Riwayat Mutasi Stok (Stock Ledger)

### 1.5 Modul Keuangan & Invoicing Dasar (MVP)
- [ ] **Backend:**
  - [ ] Migration tabel: `invoices`, `payments`
  - [ ] Generator Nomor Invoice otomatis per tenant
  - [ ] Service Generate PDF Invoice (menggunakan `barryvdh/laravel-dompdf` atau Browsershot)
  - [ ] API Pencatatan Pembayaran Manual (Transfer Bank / Cash, Down Payment & Pelunasan)
  - [ ] Tracking status pembayaran: `Unpaid → Partially Paid → Paid`
- [ ] **Frontend:**
  - [ ] Halaman Detail Invoice & Tombol Download / Print PDF
  - [ ] Modal Input Pembayaran (Nominal, Bukti Transfer, Tanggal Bayar)
  - [ ] Daftar Piutang / Invoice Belum Lunas

### 1.6 Dashboard MVP
- [ ] **Backend:** API Agregasi Metrik Dashboard (Total revenue bulan ini, Jumlah order aktif, Pesanan hari ini, Stok menipis)
- [ ] **Frontend:** Dashboard ringkas dengan kartu metrik & tabel pesanan prioritas hari ini

---

## ⚡ Fase 2: Digitalisasi Penuh & Otomatisasi

Tujuan: Pelanggan dapat memesan mandiri via web portal, pembayaran otomatis dengan payment gateway, otomatisasi perencanaan dapur & pengadaan bahan, PWA kurir dengan mode offline, dan notifikasi WhatsApp resmi.

### 2.1 Portal Pelanggan (Customer-Facing Web)
- [ ] **Backend:**
  - [ ] API Publik Katalog Menu per Tenant (berdasarkan domain/slug tenant)
  - [ ] API Cek Ketersediaan & Kapasitas Dapur pada tanggal yang dipilih
  - [ ] API Checkout Pesanan Mandiri oleh Customer
  - [ ] API Tracking Order Publik (berdasarkan nomor order / resi)
  - [ ] Auth Pelanggan (OTP WhatsApp / Email Magic Link) untuk melihat riwayat order
- [ ] **Frontend (React Customer Portal):**
  - [ ] Landing page tenant & katalog interaktif (Kategori, Paket, Foto)
  - [ ] Alur Pemesanan / Wizard Booking (Pilih tanggal -> Pilih menu -> Input alamat -> Review order)
  - [ ] Halaman Pelacakan Pesanan Real-time
  - [ ] Halaman Riwayat Transaksi & Download Invoice Customer

### 2.2 Integrasi Payment Gateway (Online Payment)
- [ ] **Backend:**
  - [ ] Integrasi SDK Midtrans / Xendit (Snap / Invoice Link / QRIS / VA)
  - [ ] Endpoint Webhook Payment Gateway + Verifikasi Signature
  - [ ] Job otomatis update status invoice & status order menjadi `Confirmed` saat DP terbayar
  - [ ] Mekanisme refund manual/otomatis (jika order dibatalkan)
- [ ] **Frontend:**
  - [ ] Embed pembayaran (Midtrans Snap popup / Redirect payment page)
  - [ ] Halaman Sukses Pembayaran & Notifikasi status instan

### 2.3 Modul Produksi Dapur Otomatis
- [ ] **Backend:**
  - [ ] Migration tabel: `production_plans`, `production_tasks`
  - [ ] Job harian otomatis: Agregasi semua order H-1/H-D menjadi Rencana Produksi
  - [ ] Auto-calculate total kebutuhan bahan baku harian (BOM x jumlah porsi yang harus dimasak)
  - [ ] API Checklist tahapan dapur (`Prep`, `Cooking`, `Packing`, `QC`)
  - [ ] Service Auto-deduct Stok Bahan Baku saat status produksi selesai
  - [ ] Generator Print Label / Nota Produksi per Order Box/Prasmanan
- [ ] **Frontend (Kitchen View):**
  - [ ] Tampilan Dapur (Kitchen Display System / Tablet Friendly)
  - [ ] Checklist persiapan & porsi masak harian
  - [ ] Cetak label kemasan / nota dapur dengan 1 klik

### 2.4 Modul Pengadaan (Procurement) Otomatis
- [ ] **Backend:**
  - [ ] Migration tabel: `suppliers`, `purchase_orders`, `purchase_order_items`
  - [ ] API Master Data Supplier & riwayat harga bahan baku
  - [ ] Logic Auto-suggest Purchase Order (PO): `(Kebutuhan Produksi + Minimum Stok) - Stok Saat Ini`
  - [ ] Workflow Approval PO oleh Owner/Admin
  - [ ] API Goods Receipt (Penerimaan Barang) -> Otomatis update stok & catat harga beli baru
- [ ] **Frontend:**
  - [ ] Halaman Master Supplier
  - [ ] Halaman Pengajuan PO & Rekomendasi Pembelian Otomatis
  - [ ] Form Penerimaan Barang dari Supplier

### 2.5 Modul Pengiriman & Kurir (PWA dengan Offline Mode)
- [ ] **Backend:**
  - [ ] Migration tabel: `deliveries`, `delivery_proofs`
  - [ ] API Penugasan Kurir per Order / Batch Pengiriman
  - [ ] API Endpoint Sinkronisasi Status Pengiriman & Upload Foto Bukti Terima (POD)
  - [ ] Handling idempotency key untuk request sync dari offline mode
- [ ] **Frontend (Kurir PWA):**
  - [ ] Konfigurasi Vite PWA plugin & Service Worker (Workbox)
  - [ ] Penyimpanan lokal data pengiriman hari ini menggunakan IndexedDB (Dexie.js / idb)
  - [ ] Fitur update status `Delivering` / `Delivered` saat offline
  - [ ] Tangkap foto bukti terima (POD) & tanda tangan digital di kanvas secara offline
  - [ ] Background Sync otomatis saat perangkat kembali terhubung ke internet

### 2.6 Integrasi WhatsApp Business API Official
- [ ] **Backend:**
  - [ ] Integrasi Cloud API WhatsApp Meta / BSP Partner (Wablas/Twilio/Zenziva)
  - [ ] Template Message Management (Konfirmasi Order, Tagihan DP/Pelunasan, Notifikasi Pesanan Dikirim, Bukti Terima)
  - [ ] Queue Job asynchronous untuk pengiriman pesan WA agar tidak blocking API
  - [ ] Webhook tracking status pengiriman WA (`sent`, `delivered`, `read`)
- [ ] **Frontend:**
  - [ ] Tampilan konfigurasi template & no. WhatsApp resmi di menu Settings Tenant

---

## 📈 Fase 3: Optimasi, Multi-Cabang & Skalabilitas SaaS

Tujuan: Analitik tingkat lanjut, custom permissions, ekspansi multi-cabang/dapur, optimasi logistik, dan pengelolaan subscription SaaS lengkap.

### 3.1 Analitik Lanjutan & Forecasting
- [ ] **Backend:**
  - [ ] Query agregasi performa menu terlaris, profit margin per menu, dan customer retention
  - [ ] Algoritma prediksi kebutuhan bahan baku berdasarkan tren historis pesanan
  - [ ] Export laporan keuangan lengkap (Laba Rugi, HPP variance, Arus Kas) ke Excel & PDF
- [ ] **Frontend:**
  - [ ] Dashboard analitik interaktif dengan Chart.js / Recharts
  - [ ] Visualisasi tren penjualan & laporan profitabilitas

### 3.2 Custom Roles & Multi-Cabang (Multi-Location)
- [ ] **Backend:**
  - [ ] Migration penambahan `branch_id` / `kitchen_location_id` di entitas order, dapur, dan stok
  - [ ] Dynamic Role & Permission Builder per tenant
  - [ ] Logika transfer stok antar gudang/cabang
- [ ] **Frontend:**
  - [ ] Switcher Cabang/Lokasi Dapur di Header
  - [ ] Matriks Pengaturan Hak Akses (Role/Permission matrix)

### 3.3 Optimasi Rute Pengiriman
- [ ] **Backend:** Integrasi Map Routing API (Google Maps Routes / OpenStreetMap) untuk klasterisasi alamat pengiriman
- [ ] **Frontend:** Tampilan peta pesanan & rute pengantaran kurir harian

### 3.4 Super Admin Panel (SaaS Management & Tiered Billing)
- [ ] **Backend:**
  - [ ] Migration tabel: `subscription_plans`, `tenant_subscriptions`, `tenant_usage_logs`
  - [ ] Middleware pembatasan fitur berdasarkan Tier Plan (Starter, Growth, Pro)
  - [ ] Sistem Recurring Billing / Invoice tagihan langganan SaaS ke tenant
  - [ ] Monitoring kesehatan sistem & metrics penggunaan per tenant
- [ ] **Frontend (Super Admin Portal):**
  - [ ] Dashboard Master SaaS (MRR, Total Tenant Aktif, Churn Rate)
  - [ ] Manajemen Tenant (Aktivasi, Suspend, Upgrade/Downgrade Paket)
  - [ ] Manajemen Paket Langganan & Fitur Matrix

---

## ✅ Quality Assurance & Verification Checklist

- [ ] **Unit Testing Backend:** Testing Service BOM calculation, HPP calculation, Tenant Scoping, dan State Machine Order
- [ ] **API Feature Testing:** Testing endpoint Auth, Order, Payment Webhook, dan Sync Kurir
- [ ] **Frontend Component & Integration Testing:** Testing form validasi, keranjang order, dan offline sync kurir
- [ ] **Security Audit:**
  - [ ] Memastikan tidak ada *tenant data leak* (kebocoran data antar tenant)
  - [ ] Proteksi CSRF, XSS, SQL Injection, dan Rate Limiting pada endpoint publik
  - [ ] Enkripsi payload sensitif & kredensial
- [ ] **Performance & Load Testing:** Testing response time API (< 500ms) dan beban queue saat ratusan order bersamaan
- [ ] **Offline PWA Test:** Simulasi pengiriman kurir pada mode airplane lalu reconnecting

---

*Dokumen checklist ini dapat diperbarui seiring dengan perkembangan kebutuhan sprint tim engineering.*
