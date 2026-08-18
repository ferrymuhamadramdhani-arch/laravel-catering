<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 0. Seed Default System Roles (Global)
        $defaultRoles = \App\Services\PermissionRegistry::defaultRolePermissions();
        foreach ($defaultRoles as $slug => $data) {
            \App\Models\Role::firstOrCreate(
                ['slug' => $slug, 'tenant_id' => null],
                [
                    'name' => $data['name'],
                    'slug' => $slug,
                    'description' => $data['description'],
                    'permissions' => $data['permissions'],
                    'is_system' => true,
                ]
            );
        }

        // 1. Buat Sample Tenant Catering
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'berkah-catering'],
            [
                'name' => 'Berkah Catering Nusantara',
                'slug' => 'berkah-catering',
                'phone' => '081234567890',
                'email' => 'kontak@berkahcatering.com',
                'address' => 'Jl. RS Fatmawati No. 45, Cilandak, Jakarta Selatan',
                'subscription_plan' => 'starter',
                'business_type' => ['nasi_kotak', 'prasmanan', 'snack_box'],
                'service_areas' => ['Jakarta Selatan', 'Jakarta Pusat', 'Depok', 'Tangerang Selatan'],
                'operating_hours' => [
                    'open' => '06:00',
                    'close' => '21:00',
                    'days' => ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
                ],
                'bank_accounts' => [
                    [
                        'bank_name' => 'BCA',
                        'account_number' => '8881234567',
                        'account_name' => 'PT Berkah Nusantara Sejahtera',
                    ],
                    [
                        'bank_name' => 'Mandiri',
                        'account_number' => '1370098765432',
                        'account_name' => 'PT Berkah Nusantara Sejahtera',
                    ],
                ],
                'is_active' => true,
                'onboarding_completed' => true,
                'trial_ends_at' => now()->addDays(14),
            ]
        );

        // 2. Buat Akun Owner Utama
        $owner = User::firstOrCreate(
            ['email' => 'owner@cateros.id'],
            [
                'name' => 'Ahmad Fauzi (Owner)',
                'email' => 'owner@cateros.id',
                'password' => Hash::make('password123'),
                'phone' => '081234567890',
                'role' => 'owner',
                'current_tenant_id' => $tenant->id,
            ]
        );

        TenantUser::firstOrCreate(
            ['tenant_id' => $tenant->id, 'user_id' => $owner->id],
            ['role' => 'owner', 'is_active' => true]
        );

        // 3. Buat Staf Sample (Sales/CS, Kitchen Manager, Gudang, Kurir)
        $staffSamples = [
            [
                'name' => 'Rina Melati (Sales & CS)',
                'email' => 'sales@cateros.id',
                'role' => 'sales',
                'phone' => '081298765431',
            ],
            [
                'name' => 'Chef Hendra (Kepala Dapur)',
                'email' => 'kitchen@cateros.id',
                'role' => 'kitchen',
                'phone' => '081298765432',
            ],
            [
                'name' => 'Bambang Sudiro (Staf Gudang)',
                'email' => 'warehouse@cateros.id',
                'role' => 'warehouse',
                'phone' => '081298765433',
            ],
            [
                'name' => 'Joko Santoso (Kurir Antar)',
                'email' => 'courier@cateros.id',
                'role' => 'courier',
                'phone' => '081298765434',
            ],
        ];

        foreach ($staffSamples as $staff) {
            $user = User::firstOrCreate(
                ['email' => $staff['email']],
                [
                    'name' => $staff['name'],
                    'email' => $staff['email'],
                    'password' => Hash::make('password123'),
                    'phone' => $staff['phone'],
                    'role' => $staff['role'],
                    'current_tenant_id' => $tenant->id,
                ]
            );

            TenantUser::firstOrCreate(
                ['tenant_id' => $tenant->id, 'user_id' => $user->id],
                ['role' => $staff['role'], 'is_active' => true]
            );
        }

        // 4. Seed Master Bahan Baku (Raw Materials)
        $materials = [
            ['name' => 'Daging Ayam Fillet Dada', 'code' => 'RM-AYAM-01', 'category' => 'Daging/Unggas', 'unit' => 'kg', 'price' => 48000, 'min' => 10],
            ['name' => 'Beras Ramos Premium', 'code' => 'RM-BERAS-01', 'category' => 'Sembako', 'unit' => 'kg', 'price' => 15000, 'min' => 50],
            ['name' => 'Minyak Goreng Sawit', 'code' => 'RM-MINYAK-01', 'category' => 'Sembako', 'unit' => 'liter', 'price' => 17000, 'min' => 20],
            ['name' => 'Bawang Merah Brebes', 'code' => 'RM-BUMBU-01', 'category' => 'Bumbu & Rempah', 'unit' => 'kg', 'price' => 38000, 'min' => 5],
            ['name' => 'Bawang Putih Kating', 'code' => 'RM-BUMBU-02', 'category' => 'Bumbu & Rempah', 'unit' => 'kg', 'price' => 42000, 'min' => 5],
            ['name' => 'Cabai Merah Keriting', 'code' => 'RM-SAYUR-01', 'category' => 'Sayuran', 'unit' => 'kg', 'price' => 55000, 'min' => 5],
            ['name' => 'Kecap Manis Refill', 'code' => 'RM-BUMBU-03', 'category' => 'Bumbu & Rempah', 'unit' => 'liter', 'price' => 24000, 'min' => 10],
            ['name' => 'Madu Murni Ternak', 'code' => 'RM-BUMBU-04', 'category' => 'Bumbu & Rempah', 'unit' => 'kg', 'price' => 85000, 'min' => 2],
            ['name' => 'Telur Ayam Negeri', 'code' => 'RM-TELUR-01', 'category' => 'Sembako', 'unit' => 'kg', 'price' => 28000, 'min' => 15],
            ['name' => 'Tempe Kedelai Segar', 'code' => 'RM-TEMPE-01', 'category' => 'Bahan Pokok', 'unit' => 'pcs', 'price' => 6000, 'min' => 20],
            ['name' => 'Kotak Nasi Sekat 4 (Kraft Eco)', 'code' => 'RM-KEMAS-01', 'category' => 'Kemasan', 'unit' => 'pcs', 'price' => 2200, 'min' => 100],
            ['name' => 'Sendok & Garpu Plastik Set', 'code' => 'RM-KEMAS-02', 'category' => 'Kemasan', 'unit' => 'pcs', 'price' => 400, 'min' => 200],
        ];

        $materialMap = [];
        foreach ($materials as $m) {
            $created = \App\Models\RawMaterial::firstOrCreate(
                ['tenant_id' => $tenant->id, 'name' => $m['name']],
                [
                    'code' => $m['code'],
                    'category' => $m['category'],
                    'unit' => $m['unit'],
                    'default_purchase_price' => $m['price'],
                    'minimum_stock' => $m['min'],
                    'current_stock' => $m['min'] * 2,
                ]
            );
            $materialMap[$m['name']] = $created;
        }

        // 5. Seed Master Kategori Menu
        $categories = [
            ['name' => 'Olahan Ayam & Unggas', 'slug' => 'ayam-unggas', 'sort_order' => 1],
            ['name' => 'Olahan Daging Sapi', 'slug' => 'daging-sapi', 'sort_order' => 2],
            ['name' => 'Sayuran & Tumisan', 'slug' => 'sayuran-tumisan', 'sort_order' => 3],
            ['name' => 'Lauk Pendamping & Sambal', 'slug' => 'pendamping-sambal', 'sort_order' => 4],
            ['name' => 'Nasi & Karbohidrat', 'slug' => 'nasi-karbo', 'sort_order' => 5],
            ['name' => 'Snack Box & Dessert', 'slug' => 'snack-dessert', 'sort_order' => 6],
        ];

        $categoryMap = [];
        foreach ($categories as $cat) {
            $created = \App\Models\MenuCategory::firstOrCreate(
                ['tenant_id' => $tenant->id, 'slug' => $cat['slug']],
                [
                    'name' => $cat['name'],
                    'sort_order' => $cat['sort_order'],
                ]
            );
            $categoryMap[$cat['slug']] = $created;
        }

        // 6. Seed Master Menu Item & BOM Recipe
        $menuAyamBakar = \App\Models\MenuItem::firstOrCreate(
            ['tenant_id' => $tenant->id, 'slug' => 'ayam-bakar-madu'],
            [
                'menu_category_id' => $categoryMap['ayam-unggas']->id,
                'name' => 'Ayam Bakar Madu Spesial',
                'code' => 'MN-AYAM-01',
                'description' => '1 potong paha/dada ayam bakar dengan olesan madu murni dan bumbu rempah bakar kecap khas Jawa.',
                'selling_price' => 18000,
                'portion_unit' => 'porsi',
                'is_active' => true,
            ]
        );

        // BOM Resep Ayam Bakar Madu (1 porsi = 200g ayam, 20g madu, 30g bumbu kecap, 15ml minyak)
        $bomAyam = [
            ['material' => 'Daging Ayam Fillet Dada', 'qty' => 0.2, 'unit' => 'kg'],
            ['material' => 'Madu Murni Ternak', 'qty' => 0.02, 'unit' => 'kg'],
            ['material' => 'Kecap Manis Refill', 'qty' => 0.03, 'unit' => 'liter'],
            ['material' => 'Bawang Merah Brebes', 'qty' => 0.015, 'unit' => 'kg'],
            ['material' => 'Bawang Putih Kating', 'qty' => 0.01, 'unit' => 'kg'],
            ['material' => 'Minyak Goreng Sawit', 'qty' => 0.02, 'unit' => 'liter'],
        ];

        foreach ($bomAyam as $bom) {
            if (isset($materialMap[$bom['material']])) {
                \App\Models\MenuRecipeBom::firstOrCreate(
                    [
                        'tenant_id' => $tenant->id,
                        'menu_item_id' => $menuAyamBakar->id,
                        'raw_material_id' => $materialMap[$bom['material']]->id,
                    ],
                    [
                        'quantity' => $bom['qty'],
                        'unit' => $bom['unit'],
                    ]
                );
            }
        }

        $menuNasiPutih = \App\Models\MenuItem::firstOrCreate(
            ['tenant_id' => $tenant->id, 'slug' => 'nasi-putih-pulen'],
            [
                'menu_category_id' => $categoryMap['nasi-karbo']->id,
                'name' => 'Nasi Putih Pulen Wangi',
                'code' => 'MN-NASI-01',
                'description' => '1 porsi nasi putih beras ramos dengan taburan bawang goreng.',
                'selling_price' => 5000,
                'portion_unit' => 'porsi',
                'is_active' => true,
            ]
        );

        if (isset($materialMap['Beras Ramos Premium'])) {
            \App\Models\MenuRecipeBom::firstOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'menu_item_id' => $menuNasiPutih->id,
                    'raw_material_id' => $materialMap['Beras Ramos Premium']->id,
                ],
                [
                    'quantity' => 0.15, // 150 gram beras
                    'unit' => 'kg',
                ]
            );
        }

        $menuSambalGoreng = \App\Models\MenuItem::firstOrCreate(
            ['tenant_id' => $tenant->id, 'slug' => 'sambal-goreng-tempe'],
            [
                'menu_category_id' => $categoryMap['pendamping-sambal']->id,
                'name' => 'Sambal Goreng Tempe Kering',
                'code' => 'MN-TEMPE-01',
                'description' => 'Kering tempe manis gurih dengan irisan cabai merah dan kacang.',
                'selling_price' => 6000,
                'portion_unit' => 'porsi',
                'is_active' => true,
            ]
        );

        if (isset($materialMap['Tempe Kedelai Segar'])) {
            \App\Models\MenuRecipeBom::firstOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'menu_item_id' => $menuSambalGoreng->id,
                    'raw_material_id' => $materialMap['Tempe Kedelai Segar']->id,
                ],
                ['quantity' => 0.5, 'unit' => 'pcs']
            );
        }

        // Hitung HPP Menu Items
        $hppCalc = app(\App\Services\HppCalculatorService::class);
        $hppCalc->recalculateMenuItemHpp($menuAyamBakar);
        $hppCalc->recalculateMenuItemHpp($menuNasiPutih);
        $hppCalc->recalculateMenuItemHpp($menuSambalGoreng);

        // 7. Seed Paket Menu Bundling
        $packageNasiKotak = \App\Models\MenuPackage::firstOrCreate(
            ['tenant_id' => $tenant->id, 'slug' => 'paket-nasi-kotak-ayam-bakar-komplit'],
            [
                'name' => 'Paket Nasi Kotak Ayam Bakar Komplit',
                'code' => 'PKG-NK-01',
                'package_type' => 'nasi_kotak',
                'description' => 'Menu catering favorit: Nasi Putih Pulen + Ayam Bakar Madu Spesial + Sambal Goreng Tempe + Kerupuk & Alat Makan.',
                'selling_price' => 32000,
                'min_order_quantity' => 10,
                'is_active' => true,
            ]
        );

        $packageItems = [
            ['menu_item_id' => $menuNasiPutih->id, 'quantity' => 1, 'notes' => 'Porsi standar'],
            ['menu_item_id' => $menuAyamBakar->id, 'quantity' => 1, 'notes' => 'Paha / Dada bakar madu'],
            ['menu_item_id' => $menuSambalGoreng->id, 'quantity' => 1, 'notes' => 'Renyah gurih'],
        ];

        foreach ($packageItems as $pi) {
            \App\Models\MenuPackageItem::firstOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'menu_package_id' => $packageNasiKotak->id,
                    'menu_item_id' => $pi['menu_item_id'],
                ],
                [
                    'quantity' => $pi['quantity'],
                    'notes' => $pi['notes'],
                ]
            );
        }

        $hppCalc->recalculatePackageHpp($packageNasiKotak);
    }
}
