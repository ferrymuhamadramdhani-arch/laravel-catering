<?php

namespace App\Services;

class PermissionRegistry
{
    /**
     * Get all available system permissions grouped by business module.
     */
    public static function allGrouped(): array
    {
        return [
            [
                'module' => 'dashboard',
                'label' => 'Dashboard & Ringkasan',
                'description' => 'Akses metrik bisnis, pendapatan, dan kalender',
                'permissions' => [
                    ['key' => 'dashboard.view', 'label' => 'Lihat Dashboard Bisnis', 'description' => 'Melihat ringkasan KPI dan grafik performa'],
                ],
            ],
            [
                'module' => 'menu',
                'label' => 'Menu & Resep (BOM)',
                'description' => 'Kelola item menu, resep bahan baku, dan paket bundling',
                'permissions' => [
                    ['key' => 'menu.view', 'label' => 'Lihat Menu & Resep', 'description' => 'Melihat daftar menu dan resep HPP'],
                    ['key' => 'menu.create', 'label' => 'Tambah Menu Baru', 'description' => 'Membuat menu item dan paket catering baru'],
                    ['key' => 'menu.edit', 'label' => 'Edit Menu & Resep', 'description' => 'Mengubah nama, harga, dan resep BOM menu'],
                    ['key' => 'menu.delete', 'label' => 'Hapus Menu', 'description' => 'Menghapus item menu dan paket'],
                ],
            ],
            [
                'module' => 'orders',
                'label' => 'Pesanan (Order Management)',
                'description' => 'Kelola pesanan masuk, status lifecycle, dan kalender pengiriman',
                'permissions' => [
                    ['key' => 'orders.view', 'label' => 'Lihat Daftar Pesanan', 'description' => 'Melihat daftar dan detail order'],
                    ['key' => 'orders.create', 'label' => 'Input Pesanan Baru', 'description' => 'Membuat pesanan baru untuk pelanggan'],
                    ['key' => 'orders.edit', 'label' => 'Update Status & Data Order', 'description' => 'Mengubah rincian order dan update tahapan status'],
                    ['key' => 'orders.delete', 'label' => 'Batalkan / Hapus Pesanan', 'description' => 'Membatalkan atau menghapus pesanan'],
                ],
            ],
            [
                'module' => 'kitchen',
                'label' => 'Produksi Dapur (Kitchen Display)',
                'description' => 'Perencanaan porsi harian, checklist dapur, dan nota cetak',
                'permissions' => [
                    ['key' => 'kitchen.view', 'label' => 'Lihat Jadwal Dapur', 'description' => 'Melihat porsi dan resep yang harus dimasak'],
                    ['key' => 'kitchen.manage', 'label' => 'Kelola Produksi Dapur', 'description' => 'Update checklist produksi (prep, masak, packing, QC)'],
                ],
            ],
            [
                'module' => 'inventory',
                'label' => 'Bahan Baku & Stok (Gudang)',
                'description' => 'Stok real-time, purchase order, dan stock ledger',
                'permissions' => [
                    ['key' => 'inventory.view', 'label' => 'Lihat Stok Bahan Baku', 'description' => 'Melihat data stok dan riwayat mutasi'],
                    ['key' => 'inventory.manage', 'label' => 'Kelola Mutasi & Opname Stok', 'description' => 'Input stok masuk/keluar, PO supplier, dan opname'],
                ],
            ],
            [
                'module' => 'deliveries',
                'label' => 'Pengiriman & Logistik (Kurir)',
                'description' => 'Penugasan kurir, rute, dan bukti pengantaran POD',
                'permissions' => [
                    ['key' => 'deliveries.view', 'label' => 'Lihat Jadwal Pengiriman', 'description' => 'Melihat daftar order yang harus diantar'],
                    ['key' => 'deliveries.manage', 'label' => 'Update Status Kirim & POD', 'description' => 'Mengubah status pengiriman dan upload foto bukti terima'],
                ],
            ],
            [
                'module' => 'finance',
                'label' => 'Keuangan & Invoicing',
                'description' => 'Pencatatan pembayaran, pembuatan invoice PDF, dan laporan HPP',
                'permissions' => [
                    ['key' => 'finance.view', 'label' => 'Lihat Invoice & Pembayaran', 'description' => 'Melihat riwayat tagihan dan laporan laba rugi'],
                    ['key' => 'finance.manage', 'label' => 'Kelola Invoice & Input Bayar', 'description' => 'Terbitkan invoice PDF dan input pembayaran manual/DP'],
                ],
            ],
            [
                'module' => 'users',
                'label' => 'Manajemen Pengguna (Users)',
                'description' => 'Kelola staf dan akun tim operasional catering',
                'permissions' => [
                    ['key' => 'users.view', 'label' => 'Lihat Daftar Staf', 'description' => 'Melihat anggota tim catering'],
                    ['key' => 'users.create', 'label' => 'Tambah / Undang Staf Baru', 'description' => 'Menambahkan user baru ke tenant'],
                    ['key' => 'users.edit', 'label' => 'Edit Profil & Role Staf', 'description' => 'Mengubah data staf dan posisi role'],
                    ['key' => 'users.delete', 'label' => 'Hapus & Nonaktifkan Staf', 'description' => 'Menonaktifkan atau menghapus akun staf'],
                ],
            ],
            [
                'module' => 'roles',
                'label' => 'Role & Hak Akses (Roles & Permissions)',
                'description' => 'Kelola role dinamis dan matriks hak akses',
                'permissions' => [
                    ['key' => 'roles.view', 'label' => 'Lihat Daftar Role', 'description' => 'Melihat daftar role dan hak aksesnya'],
                    ['key' => 'roles.create', 'label' => 'Buat Custom Role Baru', 'description' => 'Membuat role baru dengan matriks permission custom'],
                    ['key' => 'roles.edit', 'label' => 'Edit Role & Permission', 'description' => 'Mengubah konfigurasi permission pada role'],
                    ['key' => 'roles.delete', 'label' => 'Hapus Custom Role', 'description' => 'Menghapus role yang tidak terpakai'],
                ],
            ],
            [
                'module' => 'settings',
                'label' => 'Pengaturan Bisnis & Onboarding',
                'description' => 'Konfigurasi profil usaha, logo, dan rekening bank',
                'permissions' => [
                    ['key' => 'settings.view', 'label' => 'Lihat Pengaturan Bisnis', 'description' => 'Melihat profil dan preferensi tenant'],
                    ['key' => 'settings.edit', 'label' => 'Ubah Pengaturan Bisnis', 'description' => 'Update data usaha, logo, jam operasional, dan bank'],
                ],
            ],
        ];
    }

    /**
     * Get all valid permission keys as a flat list.
     */
    public static function allKeys(): array
    {
        $keys = [];
        foreach (self::allGrouped() as $group) {
            foreach ($group['permissions'] as $perm) {
                $keys[] = $perm['key'];
            }
        }
        return $keys;
    }

    /**
     * Get default permissions for built-in system roles.
     */
    public static function defaultRolePermissions(): array
    {
        $allKeys = self::allKeys();

        return [
            'owner' => [
                'name' => 'Pemilik Bisnis (Owner)',
                'description' => 'Akses penuh ke seluruh modul, fitur bisnis, keuangan, dan pengaturan sistem.',
                'permissions' => $allKeys,
            ],
            'admin' => [
                'name' => 'Administrator',
                'description' => 'Akses operasional penuh ke semua modul dan manajemen staf.',
                'permissions' => array_values(array_diff($allKeys, ['roles.delete'])),
            ],
            'sales' => [
                'name' => 'Sales & Customer Service',
                'description' => 'Fokus pada penerimaan pesanan, input order, katalog menu, dan komunikasi pelanggan.',
                'permissions' => [
                    'dashboard.view',
                    'menu.view',
                    'orders.view',
                    'orders.create',
                    'orders.edit',
                    'finance.view',
                ],
            ],
            'kitchen' => [
                'name' => 'Kepala Dapur (Kitchen Manager)',
                'description' => 'Melihat jadwal masak, resep BOM, dan mengelola tahapan produksi dapur.',
                'permissions' => [
                    'dashboard.view',
                    'menu.view',
                    'orders.view',
                    'kitchen.view',
                    'kitchen.manage',
                    'inventory.view',
                ],
            ],
            'warehouse' => [
                'name' => 'Staff Gudang (Procurement)',
                'description' => 'Kelola stok bahan baku, mutasi masuk/keluar, dan pembelian dari supplier.',
                'permissions' => [
                    'dashboard.view',
                    'inventory.view',
                    'inventory.manage',
                    'kitchen.view',
                ],
            ],
            'courier' => [
                'name' => 'Kurir / Tim Pengiriman',
                'description' => 'Akses daftar pesanan yang ditugaskan, rute, dan upload bukti terima (POD).',
                'permissions' => [
                    'deliveries.view',
                    'deliveries.manage',
                ],
            ],
        ];
    }
}
