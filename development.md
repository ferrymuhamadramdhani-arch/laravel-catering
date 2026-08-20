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
- [x] **Backend:**
  - [x] Migration tabel: `stock_ledgers` (riwayat mutasi stok)
  - [x] API Pencatatan Mutasi Stok Manual (Stock In, Stock Out, Penyesuaian/Opname)
  - [x] API Ringkasan Stok Real-Time & Alert Stok Minimum
- [x] **Frontend:**
  - [x] Halaman Daftar Stok Bahan Baku & indikator warna (aman / menipis / habis)
  - [x] Form Input Stok Masuk / Penyesuaian Stok
  - [x] Halaman Riwayat Mutasi Stok (Stock Ledger)

### 1.5 Modul Keuangan & Invoicing Dasar (MVP)
- [x] **Backend:**
  - [x] Migration tabel: `invoices`, `payments`
  - [x] Generator Nomor Invoice otomatis per tenant (`INV/YYYYMM/0001`)
  - [x] Service Generate & Printable Faktur Invoice (Kop Surat Katering, Bank Transfer, Watermark Status)
  - [x] API Pencatatan Pembayaran Manual (Transfer Bank / Cash / QRIS, Down Payment & Pelunasan)
  - [x] Tracking status pembayaran: `Unpaid → Partially Paid → Paid` (Sinkronisasi otomatis dengan status Order)
- [x] **Frontend:**
  - [x] Halaman Detail Invoice & Tombol Cetak / Print PDF (`InvoiceDetailModal`)
  - [x] Modal Input Pembayaran Bertahap / DP (`RecordPaymentModal`)
  - [x] Daftar Piutang & Faktur Tagihan dengan Kartu Metrik (`InvoicesPage`)

### 1.6 Dashboard MVP
- [x] **Backend:** API Agregasi Metrik Dashboard (`DashboardController@metrics`: Kas masuk bulan ini, Total piutang, Jumlah order aktif, Jadwal pesanan & porsi hari ini, Peringatan stok menipis)
- [x] **Frontend:** Dashboard dinamis dengan kartu KPI metrik real-time, tabel pesanan prioritas hari ini & mendatang (`OrderDetailModal`), alert stok bahan kritis, log pembayaran masuk terbaru, serta tombol aksi cepat (`DashboardPage`)

---

## ⚡ Fase 2: Digitalisasi Penuh & Otomatisasi

Tujuan: Pelanggan dapat memesan mandiri via web portal, pembayaran otomatis dengan payment gateway, otomatisasi perencanaan dapur & pengadaan bahan, PWA kurir dengan mode offline, dan notifikasi WhatsApp resmi.

### 2.1 Portal Pelanggan (Customer-Facing Web)
- [x] **Backend:**
  - [x] API Publik Katalog Menu per Tenant (`PublicCustomerPortalController@catalog` berdasarkan slug tenant)
  - [x] API Cek Ketersediaan & Kapasitas Dapur pada tanggal yang dipilih (`PublicCustomerPortalController@checkCapacity`)
  - [x] API Checkout Pesanan Mandiri oleh Customer & generate resi tracking (`PublicCustomerPortalController@checkout`)
  - [x] API Tracking Order Publik real-time (`PublicCustomerPortalController@trackOrder`)
- [x] **Frontend (React Customer Portal):**
  - [x] Layout Portal Pelanggan publik dengan branding & cart drawer (`CustomerPortalLayout.tsx`)
  - [x] Landing page tenant & katalog interaktif dengan filter kategori & pemilih tanggal (`CustomerLandingPage.tsx`)
  - [x] Alur Pemesanan / Wizard Booking mandiri (`CustomerCheckoutPage.tsx`)
  - [x] Halaman Pelacakan Pesanan Real-time dengan stepper status & kurir (`OrderTrackingPage.tsx`)

### 2.2 Integrasi Payment Gateway (Online Payment)
- [x] **Backend:**
  - [x] Integrasi Service Payment Gateway (`PaymentGatewayService`: Snap Token, QRIS, & Virtual Account BCA, Mandiri, BRI, BNI)
  - [x] Endpoint Webhook Payment Gateway (`PaymentGatewayController@handleWebhook` & auto-reconciliation)
  - [x] Auto-update status invoice (`partially_paid`/`paid`) dan status order menjadi `Confirmed` saat pembayaran masuk
  - [x] Endpoint Sandbox Simulator untuk pengujian instan (`PaymentGatewayController@simulatePayment`)
- [x] **Frontend:**
  - [x] Modal Dialog Pembayaran Online terpadu QRIS & VA (`OnlinePaymentModal.tsx`)
  - [x] Integrasi pembayaran instan pada Checkout Pelanggan, Halaman Lacak Pesanan, dan Pratinjau Faktur Invoice

### 2.3 Modul Produksi Dapur Otomatis
- [x] **Backend:**
  - [x] Migration tabel: `production_plans`, `production_tasks`
  - [x] Agregasi harian otomatis: Agregasi semua order H-1/H-D menjadi Rencana Produksi
  - [x] Auto-calculate total kebutuhan bahan baku harian (BOM x jumlah porsi yang harus dimasak)
  - [x] API Checklist tahapan dapur (`Prep`, `Cooking`, `Packing`, `QC`)
  - [x] Service Auto-deduct Stok Bahan Baku saat status produksi selesai
  - [x] Generator Print Label / Nota Produksi per Order Box/Prasmanan
- [x] **Frontend (Kitchen View):**
  - [x] Tampilan Dapur (Kitchen Display System / Tablet Friendly) (`/kitchen`)
  - [x] Checklist persiapan & porsi masak harian (KDS Kanban)
  - [x] Cetak label kemasan / nota dapur dengan 1 klik (`KitchenLabelModal.tsx`)

### 2.4 Modul Pengadaan (Procurement) Otomatis
- [x] **Backend:**
  - [x] Migration tabel: `suppliers`, `purchase_orders`, `purchase_order_items`
  - [x] API Master Data Supplier & riwayat harga bahan baku
  - [x] Logic Auto-suggest Purchase Order (PO): `(Kebutuhan Produksi + Minimum Stok) - Stok Saat Ini`
  - [x] Workflow Approval PO oleh Owner/Admin
  - [x] API Goods Receipt (Penerimaan Barang) -> Otomatis update stok & catat harga beli baru
- [x] **Frontend:**
  - [x] Halaman Master Supplier
  - [x] Halaman Pengajuan PO & Rekomendasi Pembelian Otomatis (`AutoSuggestPoModal.tsx`)
  - [x] Form Penerimaan Barang dari Supplier (`GoodsReceiptModal.tsx`)

### 2.5 Modul Pengiriman & Kurir (PWA dengan Offline Mode)
- [x] **Backend:**
  - [x] Migration tabel: `deliveries`, `delivery_proofs`
  - [x] API Penugasan Kurir per Order / Batch Pengiriman (`DeliveryService@assignDelivery`)
  - [x] API Endpoint Sinkronisasi Status Pengiriman & Upload Foto Bukti Terima (POD) (`DeliveryService@submitProofOfDelivery`)
  - [x] Handling offline sync & idempotency untuk request sync dari offline mode (`DeliveryService@syncOfflineDeliveries`)
- [x] **Frontend (Kurir PWA):**
  - [x] Tampilan Dashboard Dispatch Admin & Mode Kurir Mobile PWA (`DeliveriesPage.tsx`)
  - [x] Penyimpanan lokal offline queue dengan `localStorage` & status online/offline detector
  - [x] Fitur update status `Dispatched` / `Arrived` / `Delivered` saat offline
  - [x] Tangkap foto bukti terima (POD) & tanda tangan digital di kanvas secara offline (`ProofOfDeliveryModal.tsx`)
  - [x] Background Sync otomatis saat perangkat kembali terhubung ke internet (`window.addEventListener('online')`)

### 2.6 Integrasi WhatsApp Business API Official
- [x] **Backend:**
  - [x] Integrasi Cloud API WhatsApp Meta / BSP Partner (Wablas/Meta Cloud/Simulator) (`WhatsAppNotificationService.php`)
  - [x] Template Message Management (Konfirmasi Order, Tagihan DP/Pelunasan, Notifikasi Pesanan Dikirim, Bukti Terima POD)
  - [x] Queue Job asynchronous untuk pengiriman pesan WA agar non-blocking API (`SendWhatsAppMessageJob.php`)
  - [x] Webhook tracking status pengiriman WA (`sent`, `delivered`, `read`) (`WhatsAppController@handleWebhook`)
- [x] **Frontend:**
  - [x] Tampilan konfigurasi template pesan otomatis dengan editor variabel & live bubble preview (`WhatsAppSettingsPage.tsx`)
  - [x] Simulator pengujian kirim pesan ke nomor WhatsApp tujuan
  - [x] Riwayat & log pengiriman WhatsApp lengkap dengan status badge delivered/read

---

## 📈 Fase 3: Optimasi, Multi-Cabang & Skalabilitas SaaS

Tujuan: Analitik tingkat lanjut, custom permissions, ekspansi multi-cabang/dapur, optimasi logistik, dan pengelolaan subscription SaaS lengkap.

### 3.1 Analitik Lanjutan & Forecasting
- [x] **Backend:**
  - [x] Query agregasi performa menu terlaris, profit margin per menu, dan customer retention (`AnalyticsService.php`)
  - [x] Algoritma prediksi kebutuhan bahan baku berdasarkan tren historis pesanan (*Demand Forecasting*)
  - [x] Export laporan keuangan lengkap (Laporan Laba Rugi / Income Statement, HPP variance, Arus Kas) ke CSV/Excel (`AnalyticsController@exportCsv`)
- [x] **Frontend:**
  - [x] Dashboard analitik interaktif & laporan laba rugi (`AnalyticsDashboardPage.tsx` di `/analytics`)
  - [x] Visualisasi tren penjualan harian, analisis profitabilitas menu, CRM pelanggan VIP, dan proyeksi bahan baku 7-30 hari ke depan

### 3.2 Custom Roles & Multi-Cabang (Multi-Location)
- [x] **Backend:**
  - [x] Migration tabel `branches`, `stock_transfers`, `stock_transfer_items`, dan `branch_id` di orders, produksi, dan ledgers
  - [x] Dynamic Role & Permission Builder per tenant (`TenantRoleController.php`)
  - [x] Logika transfer stok antar gudang/cabang otomatis potong/tambah stok dengan stock ledger (`StockTransferService.php`)
- [x] **Frontend:**
  - [x] Switcher Cabang/Lokasi Dapur di Header & Manajemen Cabang Dapur Satelit (`BranchesPage.tsx` di `/branches`)
  - [x] Manajemen Mutasi & Transfer Stok Bahan Baku Antar Cabang (`StockTransferPage.tsx` di `/inventory/transfers`)
  - [x] Matriks Pengaturan Hak Akses (Role/Permission matrix) (`RoleManagementPage.tsx` di `/roles`)

### 3.3 Optimasi Rute Pengiriman
- [x] **Backend:**
  - [x] Algoritma klasterisasi & pengurutan titik singgah (*Multi-Stop Waypoint Sequencing*) dari dapur asal ke pelanggan (`DeliveryRouteOptimizationService.php`)
  - [x] Estimasi kalkulasi jarak (km) dan durasi tempuh (menit) rute logistik katering
  - [x] Generator tautan navigasi Google Maps Multi-Stop Directions dengan parameter origin & waypoints
  - [x] API Batch penugasan rute sekaligus ke kurir dan armada kendaraan (`DeliveryRouteController@batchAssign`)
- [x] **Frontend:**
  - [x] Halaman Peta & Optimasi Rute Pengantaran Kurir (`DeliveryRouteMapPage.tsx` di `/deliveries/routes`)
  - [x] Timeline urutan stop pengiriman teroptimasi (Stop #1, #2, #3...) dengan kontak pemesan dan jam target tiba
  - [x] Tombol 1-klik buka navigasi GPS di Google Maps dan modal penugasan kurir serentak

### 3.4 Super Admin Panel (SaaS Management & Tiered Billing)
- [x] **Backend:**
  - [x] Migration tabel `subscription_plans`, `tenant_subscriptions`, dan `tenant_usage_logs`
  - [x] Skema paket langganan bertingkat (*Starter Rp 299rb, Growth Rp 799rb, Enterprise Pro Rp 1.999rb*)
  - [x] Kalkulasi Monthly Recurring Revenue (MRR), ARR, dan tata kelola akun tenant (`SuperAdminService.php`)
  - [x] API Super Admin untuk aktivasi/suspend tenant dan upgrade paket langganan (`SuperAdminController.php`)
- [x] **Frontend (Super Admin Portal):**
  - [x] Dashboard Master SaaS dengan visualisasi MRR, GMV, dan kesehatan infrastruktur sistem (`SuperAdminDashboardPage.tsx` di `/super-admin`)
  - [x] Manajemen Tenant (Pencarian, Aktivasi/Suspend, Modal Ganti Paket Langganan)
  - [x] Manajemen Paket Harga & Matrix Limitasi Kuota (Pesanan, Cabang Dapur, Akun Staf)

---

## ✅ Quality Assurance & Verification Checklist

- [x] **Unit Testing Backend:** Testing Service BOM calculation, HPP calculation, Tenant Scoping, dan State Machine Order (`BOMAndHppCalculationUnitTest.php`, `OrderStateMachineUnitTest.php`, `TenantScopingUnitTest.php`)
- [x] **API Feature Testing:** Testing endpoint Auth, Order, Payment Webhook, Delivery Routes, dan Sync Kurir (20 Feature Test Suites)
- [x] **Frontend Component & Integration Testing:** Form validasi, keranjang order checkout, invoice payment modal, dan offline sync kurir
- [x] **Security Audit:**
  - [x] Memastikan tidak ada *tenant data leak* / isolasi data multi-tenant total (`SecurityAuditTest.php`)
  - [x] Proteksi SQL Injection immunity via PDO binding & sanitasi payload XSS
  - [x] Enkripsi payload sensitif & kredensial
- [x] **Performance & Load Testing:** Pengujian response time API agregasi (< 500ms) dan throughput pembuatan order serentak (`PerformanceAndLoadTest.php`)
- [x] **Offline PWA Test:** Simulasi pengiriman kurir pada mode offline / airplane mode dan auto-sync saat online (`OfflineDeliveryRecord`, IndexedDB replay)

---

*Dokumen checklist ini dapat diperbarui seiring dengan perkembangan kebutuhan sprint tim engineering.*
