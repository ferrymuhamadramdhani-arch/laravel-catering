<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\DeliveryArea;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\MenuPackage;
use App\Models\MenuPackageItem;
use App\Models\MenuRecipeBom;
use App\Models\RawMaterial;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\Order;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\HppCalculatorService;
use Illuminate\Database\Seeder;

class MasterDataSeeder extends Seeder
{
    /**
     * Run the database seeds for all Master Data modules.
     */
    public function run(?Tenant $tenant = null): void
    {
        if ($tenant) {
            $this->seedForTenant($tenant);
            return;
        }

        $tenants = Tenant::all();
        if ($tenants->isEmpty()) {
            $defaultTenant = Tenant::create([
                'name' => 'Berkah Catering Nusantara',
                'slug' => 'berkah-catering',
                'phone' => '081234567890',
                'email' => 'kontak@berkahcatering.com',
                'address' => 'Jl. RS Fatmawati No. 45, Cilandak, Jakarta Selatan',
                'subscription_plan' => 'starter',
                'business_type' => ['nasi_kotak', 'prasmanan', 'snack_box'],
                'service_areas' => ['Jakarta Selatan', 'Jakarta Pusat', 'Depok', 'Tangerang Selatan'],
                'is_active' => true,
                'onboarding_completed' => true,
            ]);
            $tenants = collect([$defaultTenant]);
        }

        foreach ($tenants as $t) {
            $this->seedForTenant($t);
        }
    }

    public function seedForTenant(Tenant $tenant): void
    {
        // =========================================================================
        // 1. MASTER SUPPLIERS (Pemasok Bahan Baku)
        // =========================================================================
        $suppliersData = [
            [
                'name' => 'PT. Unggas Segar Perkasa',
                'contact_person' => 'H. Rahmat Hidayat',
                'phone' => '081288776655',
                'email' => 'order@unggasgar.co.id',
                'address' => 'Pasar Induk Kramat Jati Blok A1 No. 12',
                'city' => 'Jakarta Timur',
                'notes' => 'Pemasok utama ayam potong segar, fillet dada/paha, dan telur ayam negeri.',
            ],
            [
                'name' => 'CV. Beras Ramos Nusantara',
                'contact_person' => 'Ibu Sri Wahyuni',
                'phone' => '081399887766',
                'email' => 'berasnusantara@gmail.com',
                'address' => 'Jl. Pergudangan Daan Mogot Km. 14',
                'city' => 'Jakarta Barat',
                'notes' => 'Pemasok beras ramos premium, beras pandan wangi, dan ketan putih.',
            ],
            [
                'name' => 'PD. Hasil Bumi & Bumbu Rempah',
                'contact_person' => 'Pak Joko Widodo',
                'phone' => '081122334455',
                'email' => 'rempahpasar@yahoo.com',
                'address' => 'Kawasan Pasar Senen Los B No. 45',
                'city' => 'Jakarta Pusat',
                'notes' => 'Pemasok aneka bawang, cabai, jahe, lengkuas, serai, dan minyak goreng curah/kemasan.',
            ],
            [
                'name' => 'PT. Kemasan Nusantara Eco',
                'contact_person' => 'Andi Pratama',
                'phone' => '081566778899',
                'email' => 'sales@kemasannusantara.com',
                'address' => 'Jl. Industri Raya No. 88, Cikarang',
                'city' => 'Bekasi',
                'notes' => 'Pemasok box catering kraft sekat 4, box bento, mika snack, dan sendok set.',
            ],
            [
                'name' => 'UD. Daging Sapi Halal Berkah',
                'contact_person' => 'Bang Umar',
                'phone' => '081911223344',
                'email' => 'dagingsapiberkah@gmail.com',
                'address' => 'RPH Cakung Kaveling 15',
                'city' => 'Jakarta Timur',
                'notes' => 'Pemasok daging sapi segar has dalam (tenderloin), sandung lamur, dan tetelan.',
            ],
        ];

        $supplierMap = [];
        foreach ($suppliersData as $sup) {
            $created = Supplier::firstOrCreate(
                ['tenant_id' => $tenant->id, 'name' => $sup['name']],
                array_merge($sup, ['is_active' => true])
            );
            $supplierMap[$sup['name']] = $created;
        }

        // =========================================================================
        // 2. MASTER BAHAN BAKU (Raw Materials)
        // =========================================================================
        $materialsData = [
            // Daging & Unggas
            ['name' => 'Daging Ayam Fillet Dada', 'code' => 'RM-AYAM-01', 'category' => 'Daging/Unggas', 'unit' => 'kg', 'price' => 48000, 'min' => 15, 'curr' => 45, 'supplier' => 'PT. Unggas Segar Perkasa'],
            ['name' => 'Ayam Broiler Utuh Potong 8', 'code' => 'RM-AYAM-02', 'category' => 'Daging/Unggas', 'unit' => 'ekor', 'price' => 38000, 'min' => 20, 'curr' => 50, 'supplier' => 'PT. Unggas Segar Perkasa'],
            ['name' => 'Daging Sapi Has Dalam', 'code' => 'RM-SAPI-01', 'category' => 'Daging/Unggas', 'unit' => 'kg', 'price' => 135000, 'min' => 10, 'curr' => 25, 'supplier' => 'UD. Daging Sapi Halal Berkah'],
            ['name' => 'Daging Sapi Sandung Lamur', 'code' => 'RM-SAPI-02', 'category' => 'Daging/Unggas', 'unit' => 'kg', 'price' => 95000, 'min' => 10, 'curr' => 20, 'supplier' => 'UD. Daging Sapi Halal Berkah'],
            
            // Sembako & Pokok
            ['name' => 'Beras Ramos Premium', 'code' => 'RM-BERAS-01', 'category' => 'Sembako', 'unit' => 'kg', 'price' => 15000, 'min' => 50, 'curr' => 150, 'supplier' => 'CV. Beras Ramos Nusantara'],
            ['name' => 'Beras Pandan Wangi Super', 'code' => 'RM-BERAS-02', 'category' => 'Sembako', 'unit' => 'kg', 'price' => 18000, 'min' => 30, 'curr' => 80, 'supplier' => 'CV. Beras Ramos Nusantara'],
            ['name' => 'Minyak Goreng Sawit', 'code' => 'RM-MINYAK-01', 'category' => 'Sembako', 'unit' => 'liter', 'price' => 17000, 'min' => 25, 'curr' => 60, 'supplier' => 'PD. Hasil Bumi & Bumbu Rempah'],
            ['name' => 'Telur Ayam Negeri', 'code' => 'RM-TELUR-01', 'category' => 'Sembako', 'unit' => 'kg', 'price' => 28000, 'min' => 15, 'curr' => 35, 'supplier' => 'PT. Unggas Segar Perkasa'],
            ['name' => 'Tempe Kedelai Segar', 'code' => 'RM-TEMPE-01', 'category' => 'Bahan Pokok', 'unit' => 'pcs', 'price' => 6000, 'min' => 20, 'curr' => 40, 'supplier' => 'PD. Hasil Bumi & Bumbu Rempah'],
            ['name' => 'Tahu Putih Sutra', 'code' => 'RM-TAHU-01', 'category' => 'Bahan Pokok', 'unit' => 'pcs', 'price' => 5000, 'min' => 20, 'curr' => 30, 'supplier' => 'PD. Hasil Bumi & Bumbu Rempah'],
            
            // Bumbu & Rempah
            ['name' => 'Bawang Merah Brebes', 'code' => 'RM-BUMBU-01', 'category' => 'Bumbu & Rempah', 'unit' => 'kg', 'price' => 38000, 'min' => 8, 'curr' => 20, 'supplier' => 'PD. Hasil Bumi & Bumbu Rempah'],
            ['name' => 'Bawang Putih Kating', 'code' => 'RM-BUMBU-02', 'category' => 'Bumbu & Rempah', 'unit' => 'kg', 'price' => 42000, 'min' => 8, 'curr' => 18, 'supplier' => 'PD. Hasil Bumi & Bumbu Rempah'],
            ['name' => 'Cabai Merah Keriting', 'code' => 'RM-SAYUR-01', 'category' => 'Sayuran', 'unit' => 'kg', 'price' => 55000, 'min' => 5, 'curr' => 12, 'supplier' => 'PD. Hasil Bumi & Bumbu Rempah'],
            ['name' => 'Cabai Rawit Merah', 'code' => 'RM-SAYUR-02', 'category' => 'Sayuran', 'unit' => 'kg', 'price' => 65000, 'min' => 4, 'curr' => 10, 'supplier' => 'PD. Hasil Bumi & Bumbu Rempah'],
            ['name' => 'Kecap Manis Refill', 'code' => 'RM-BUMBU-03', 'category' => 'Bumbu & Rempah', 'unit' => 'liter', 'price' => 24000, 'min' => 10, 'curr' => 30, 'supplier' => 'PD. Hasil Bumi & Bumbu Rempah'],
            ['name' => 'Madu Murni Ternak', 'code' => 'RM-BUMBU-04', 'category' => 'Bumbu & Rempah', 'unit' => 'kg', 'price' => 85000, 'min' => 3, 'curr' => 8, 'supplier' => 'PD. Hasil Bumi & Bumbu Rempah'],
            ['name' => 'Santan Kelapa Murni', 'code' => 'RM-BUMBU-05', 'category' => 'Bumbu & Rempah', 'unit' => 'liter', 'price' => 22000, 'min' => 10, 'curr' => 25, 'supplier' => 'PD. Hasil Bumi & Bumbu Rempah'],
            ['name' => 'Kacang Panjang Segar', 'code' => 'RM-SAYUR-03', 'category' => 'Sayuran', 'unit' => 'kg', 'price' => 16000, 'min' => 5, 'curr' => 15, 'supplier' => 'PD. Hasil Bumi & Bumbu Rempah'],
            ['name' => 'Wortel Brastagi', 'code' => 'RM-SAYUR-04', 'category' => 'Sayuran', 'unit' => 'kg', 'price' => 14000, 'min' => 5, 'curr' => 16, 'supplier' => 'PD. Hasil Bumi & Bumbu Rempah'],
            ['name' => 'Buncis Muda Segar', 'code' => 'RM-SAYUR-05', 'category' => 'Sayuran', 'unit' => 'kg', 'price' => 18000, 'min' => 4, 'curr' => 12, 'supplier' => 'PD. Hasil Bumi & Bumbu Rempah'],

            // Kemasan Catering
            ['name' => 'Kotak Nasi Sekat 4 (Kraft Eco)', 'code' => 'RM-KEMAS-01', 'category' => 'Kemasan', 'unit' => 'pcs', 'price' => 2200, 'min' => 100, 'curr' => 450, 'supplier' => 'PT. Kemasan Nusantara Eco'],
            ['name' => 'Kotak Nasi Bento Sekat 5 Eksklusif', 'code' => 'RM-KEMAS-02', 'category' => 'Kemasan', 'unit' => 'pcs', 'price' => 3500, 'min' => 100, 'curr' => 300, 'supplier' => 'PT. Kemasan Nusantara Eco'],
            ['name' => 'Kotak Snack Box Motif Batik', 'code' => 'RM-KEMAS-03', 'category' => 'Kemasan', 'unit' => 'pcs', 'price' => 1200, 'min' => 100, 'curr' => 500, 'supplier' => 'PT. Kemasan Nusantara Eco'],
            ['name' => 'Sendok & Garpu Plastik Set + Tisu + Tusuk Gigi', 'code' => 'RM-KEMAS-04', 'category' => 'Kemasan', 'unit' => 'pcs', 'price' => 450, 'min' => 200, 'curr' => 800, 'supplier' => 'PT. Kemasan Nusantara Eco'],
        ];

        $materialMap = [];
        foreach ($materialsData as $m) {
            $supp = $supplierMap[$m['supplier']] ?? null;
            $created = RawMaterial::firstOrCreate(
                ['tenant_id' => $tenant->id, 'name' => $m['name']],
                [
                    'code' => $m['code'],
                    'category' => $m['category'],
                    'unit' => $m['unit'],
                    'default_purchase_price' => $m['price'],
                    'minimum_stock' => $m['min'],
                    'current_stock' => $m['curr'],
                    'supplier_id' => $supp?->id,
                ]
            );
            $materialMap[$m['name']] = $created;
        }

        // =========================================================================
        // 3. MASTER KATEGORI MENU
        // =========================================================================
        $categoriesData = [
            ['name' => 'Olahan Ayam & Unggas', 'slug' => 'ayam-unggas', 'sort_order' => 1, 'desc' => 'Menu hidangan olahan ayam bakar, goreng rempah, kalasan, gulai, dll.'],
            ['name' => 'Olahan Daging Sapi', 'slug' => 'daging-sapi', 'sort_order' => 2, 'desc' => 'Rendang daging sapi padang, empal gentong, semur, dan lada hitam.'],
            ['name' => 'Olahan Ikan & Seafood', 'slug' => 'ikan-seafood', 'sort_order' => 3, 'desc' => 'Ikan gurame asam manis, fillet dori krispi, udang balado petai.'],
            ['name' => 'Sayuran & Tumisan', 'slug' => 'sayuran-tumisan', 'sort_order' => 4, 'desc' => 'Capcay kuah/goreng, tumis buncis daging cincang, urap sayur kelapa.'],
            ['name' => 'Lauk Pendamping & Sambal', 'slug' => 'pendamping-sambal', 'sort_order' => 5, 'desc' => 'Sambal goreng ati ampela, tempe orek manis, perkedel kentang, telur balado.'],
            ['name' => 'Nasi & Karbohidrat', 'slug' => 'nasi-karbo', 'sort_order' => 6, 'desc' => 'Nasi putih pulen, nasi uduk gurih, nasi kuning tumpeng, nasi kebuli.'],
            ['name' => 'Snack Box & Kue Tradisional', 'slug' => 'snack-dessert', 'sort_order' => 7, 'desc' => 'Lemper ayam, risoles mayo, pie buah mini, puding cup, kue sus vanila.'],
            ['name' => 'Minuman & Segaran', 'slug' => 'minuman-segaran', 'sort_order' => 8, 'desc' => 'Air mineral cup/botol, es kopyor sintetis, jus jeruk murni, teh manis.'],
        ];

        $categoryMap = [];
        foreach ($categoriesData as $cat) {
            $created = MenuCategory::firstOrCreate(
                ['tenant_id' => $tenant->id, 'slug' => $cat['slug']],
                [
                    'name' => $cat['name'],
                    'description' => $cat['desc'],
                    'sort_order' => $cat['sort_order'],
                ]
            );
            $categoryMap[$cat['slug']] = $created;
        }

        // =========================================================================
        // 4. MASTER MENU ITEM & RESEP BOM
        // =========================================================================
        $menuItemsData = [
            [
                'category_slug' => 'ayam-unggas',
                'name' => 'Ayam Bakar Madu Spesial',
                'slug' => 'ayam-bakar-madu',
                'code' => 'MN-AYAM-01',
                'description' => '1 potong paha/dada ayam bakar dengan olesan madu murni dan bumbu rempah bakar kecap khas Jawa.',
                'selling_price' => 18000,
                'unit' => 'porsi',
                'bom' => [
                    ['material' => 'Daging Ayam Fillet Dada', 'qty' => 0.2, 'unit' => 'kg'],
                    ['material' => 'Madu Murni Ternak', 'qty' => 0.02, 'unit' => 'kg'],
                    ['material' => 'Kecap Manis Refill', 'qty' => 0.03, 'unit' => 'liter'],
                    ['material' => 'Bawang Merah Brebes', 'qty' => 0.015, 'unit' => 'kg'],
                    ['material' => 'Bawang Putih Kating', 'qty' => 0.01, 'unit' => 'kg'],
                    ['material' => 'Minyak Goreng Sawit', 'qty' => 0.02, 'unit' => 'liter'],
                ],
            ],
            [
                'category_slug' => 'ayam-unggas',
                'name' => 'Ayam Goreng Lengkuas Rempah',
                'slug' => 'ayam-goreng-lengkuas',
                'code' => 'MN-AYAM-02',
                'description' => 'Ayam goreng gurih bertabur serundeng lengkuas kering renyah dan wangi aroma rempah nusantara.',
                'selling_price' => 17000,
                'unit' => 'porsi',
                'bom' => [
                    ['material' => 'Daging Ayam Fillet Dada', 'qty' => 0.2, 'unit' => 'kg'],
                    ['material' => 'Bawang Putih Kating', 'qty' => 0.015, 'unit' => 'kg'],
                    ['material' => 'Bawang Merah Brebes', 'qty' => 0.01, 'unit' => 'kg'],
                    ['material' => 'Minyak Goreng Sawit', 'qty' => 0.03, 'unit' => 'liter'],
                ],
            ],
            [
                'category_slug' => 'daging-sapi',
                'name' => 'Rendang Daging Sapi Padang Asli',
                'slug' => 'rendang-daging-sapi',
                'code' => 'MN-SAPI-01',
                'description' => 'Potongan daging sapi has dalam empuk dimasak perlahan dengan santan kelapa kental dan rempah minang 8 jam.',
                'selling_price' => 25000,
                'unit' => 'porsi',
                'bom' => [
                    ['material' => 'Daging Sapi Has Dalam', 'qty' => 0.12, 'unit' => 'kg'],
                    ['material' => 'Santan Kelapa Murni', 'qty' => 0.15, 'unit' => 'liter'],
                    ['material' => 'Cabai Merah Keriting', 'qty' => 0.02, 'unit' => 'kg'],
                    ['material' => 'Bawang Merah Brebes', 'qty' => 0.015, 'unit' => 'kg'],
                    ['material' => 'Bawang Putih Kating', 'qty' => 0.01, 'unit' => 'kg'],
                ],
            ],
            [
                'category_slug' => 'daging-sapi',
                'name' => 'Daging Sapi Lada Hitam (Blackpepper)',
                'slug' => 'sapi-lada-hitam',
                'code' => 'MN-SAPI-02',
                'description' => 'Irisan daging sapi empuk ditumis dengan saus lada hitam pekat, paprika, dan irisan bawang bombay.',
                'selling_price' => 23000,
                'unit' => 'porsi',
                'bom' => [
                    ['material' => 'Daging Sapi Has Dalam', 'qty' => 0.1, 'unit' => 'kg'],
                    ['material' => 'Bawang Putih Kating', 'qty' => 0.01, 'unit' => 'kg'],
                    ['material' => 'Minyak Goreng Sawit', 'qty' => 0.02, 'unit' => 'liter'],
                    ['material' => 'Kecap Manis Refill', 'qty' => 0.02, 'unit' => 'liter'],
                ],
            ],
            [
                'category_slug' => 'nasi-karbo',
                'name' => 'Nasi Putih Pulen Wangi',
                'slug' => 'nasi-putih-pulen',
                'code' => 'MN-NASI-01',
                'description' => '1 porsi nasi putih beras ramos dengan taburan bawang goreng.',
                'selling_price' => 5000,
                'unit' => 'porsi',
                'bom' => [
                    ['material' => 'Beras Ramos Premium', 'qty' => 0.15, 'unit' => 'kg'],
                ],
            ],
            [
                'category_slug' => 'nasi-karbo',
                'name' => 'Nasi Kuning Gurih Rempah',
                'slug' => 'nasi-kuning-gurih',
                'code' => 'MN-NASI-02',
                'description' => 'Nasi kuning masak santan dan kunyit dengan aroma daun jeruk dan serai.',
                'selling_price' => 6000,
                'unit' => 'porsi',
                'bom' => [
                    ['material' => 'Beras Pandan Wangi Super', 'qty' => 0.15, 'unit' => 'kg'],
                    ['material' => 'Santan Kelapa Murni', 'qty' => 0.05, 'unit' => 'liter'],
                ],
            ],
            [
                'category_slug' => 'sayuran-tumisan',
                'name' => 'Tumis Buncis Wortel Jagung Manis',
                'slug' => 'tumis-buncis-wortel',
                'code' => 'MN-SAYUR-01',
                'description' => 'Tumisan sayur segar buncis muda dan wortel manis dengan bawang putih cincang gurih.',
                'selling_price' => 6000,
                'unit' => 'porsi',
                'bom' => [
                    ['material' => 'Buncis Muda Segar', 'qty' => 0.08, 'unit' => 'kg'],
                    ['material' => 'Wortel Brastagi', 'qty' => 0.05, 'unit' => 'kg'],
                    ['material' => 'Bawang Putih Kating', 'qty' => 0.01, 'unit' => 'kg'],
                    ['material' => 'Minyak Goreng Sawit', 'qty' => 0.01, 'unit' => 'liter'],
                ],
            ],
            [
                'category_slug' => 'pendamping-sambal',
                'name' => 'Sambal Goreng Tempe Kering Renyah',
                'slug' => 'sambal-goreng-tempe',
                'code' => 'MN-TEMPE-01',
                'description' => 'Kering tempe manis gurih dengan irisan cabai merah dan kacang.',
                'selling_price' => 6000,
                'unit' => 'porsi',
                'bom' => [
                    ['material' => 'Tempe Kedelai Segar', 'qty' => 0.5, 'unit' => 'pcs'],
                    ['material' => 'Cabai Merah Keriting', 'qty' => 0.015, 'unit' => 'kg'],
                    ['material' => 'Kecap Manis Refill', 'qty' => 0.015, 'unit' => 'liter'],
                    ['material' => 'Minyak Goreng Sawit', 'qty' => 0.02, 'unit' => 'liter'],
                ],
            ],
            [
                'category_slug' => 'pendamping-sambal',
                'name' => 'Telur Balado Merah Padang',
                'slug' => 'telur-balado-padang',
                'code' => 'MN-TELUR-01',
                'description' => '1 butir telur rebus digoreng berkulit disiram bumbu cabai balado pedas manis gurih.',
                'selling_price' => 7000,
                'unit' => 'porsi',
                'bom' => [
                    ['material' => 'Telur Ayam Negeri', 'qty' => 0.07, 'unit' => 'kg'],
                    ['material' => 'Cabai Merah Keriting', 'qty' => 0.02, 'unit' => 'kg'],
                    ['material' => 'Bawang Merah Brebes', 'qty' => 0.01, 'unit' => 'kg'],
                    ['material' => 'Minyak Goreng Sawit', 'qty' => 0.015, 'unit' => 'liter'],
                ],
            ],
        ];

        $hppCalc = app(HppCalculatorService::class);
        $menuItemMap = [];

        foreach ($menuItemsData as $m) {
            $category = $categoryMap[$m['category_slug']] ?? null;
            if (!$category) continue;

            $menuItem = MenuItem::firstOrCreate(
                ['tenant_id' => $tenant->id, 'slug' => $m['slug']],
                [
                    'menu_category_id' => $category->id,
                    'name' => $m['name'],
                    'code' => $m['code'],
                    'description' => $m['description'],
                    'selling_price' => $m['selling_price'],
                    'portion_unit' => $m['unit'],
                    'is_active' => true,
                ]
            );

            // Seed BOM
            foreach ($m['bom'] as $bomItem) {
                if (isset($materialMap[$bomItem['material']])) {
                    MenuRecipeBom::firstOrCreate(
                        [
                            'tenant_id' => $tenant->id,
                            'menu_item_id' => $menuItem->id,
                            'raw_material_id' => $materialMap[$bomItem['material']]->id,
                        ],
                        [
                            'quantity' => $bomItem['qty'],
                            'unit' => $bomItem['unit'],
                        ]
                    );
                }
            }

            // Recalculate HPP
            $hppCalc->recalculateMenuItemHpp($menuItem);
            $menuItemMap[$m['slug']] = $menuItem;
        }

        // =========================================================================
        // 5. MASTER PAKET MENU & BUNDLING
        // =========================================================================
        $packagesData = [
            [
                'name' => 'Paket Nasi Kotak Ayam Bakar Komplit',
                'slug' => 'paket-nasi-kotak-ayam-bakar-komplit',
                'code' => 'PKG-NK-01',
                'type' => 'nasi_kotak',
                'desc' => 'Nasi Putih Pulen + Ayam Bakar Madu Spesial + Sambal Goreng Tempe + Tumis Buncis Wortel + Kerupuk & Alat Makan.',
                'price' => 32000,
                'min_qty' => 10,
                'items' => [
                    ['slug' => 'nasi-putih-pulen', 'qty' => 1, 'notes' => 'Porsi nasi pulen'],
                    ['slug' => 'ayam-bakar-madu', 'qty' => 1, 'notes' => 'Paha / Dada bakar madu'],
                    ['slug' => 'sambal-goreng-tempe', 'qty' => 1, 'notes' => 'Orek tempe kering'],
                    ['slug' => 'tumis-buncis-wortel', 'qty' => 1, 'notes' => 'Sayuran segar'],
                ],
            ],
            [
                'name' => 'Paket Nasi Kotak Rendang Sapi Premium',
                'slug' => 'paket-nasi-kotak-rendang-sapi-premium',
                'code' => 'PKG-NK-02',
                'type' => 'nasi_kotak',
                'desc' => 'Nasi Putih Pulen + Rendang Daging Sapi Padang Asli + Telur Balado + Tumis Buncis + Sambal Ijo & Kerupuk Udang.',
                'price' => 45000,
                'min_qty' => 10,
                'items' => [
                    ['slug' => 'nasi-putih-pulen', 'qty' => 1, 'notes' => 'Porsi nasi pulen'],
                    ['slug' => 'rendang-daging-sapi', 'qty' => 1, 'notes' => '1 potong rendang sapi empuk'],
                    ['slug' => 'telur-balado-padang', 'qty' => 1, 'notes' => '1 butir telur balado'],
                    ['slug' => 'tumis-buncis-wortel', 'qty' => 1, 'notes' => 'Sayur tumis'],
                ],
            ],
            [
                'name' => 'Paket Nasi Kuning Tumpeng Mini Nusantara',
                'slug' => 'paket-nasi-kuning-tumpeng-mini',
                'code' => 'PKG-NK-03',
                'type' => 'nasi_kotak',
                'desc' => 'Nasi Kuning Gurih + Ayam Goreng Lengkuas + Telur Balado + Kering Tempe + Timun & Sambal Bajak.',
                'price' => 36000,
                'min_qty' => 15,
                'items' => [
                    ['slug' => 'nasi-kuning-gurih', 'qty' => 1, 'notes' => 'Nasi kuning tumpeng'],
                    ['slug' => 'ayam-goreng-lengkuas', 'qty' => 1, 'notes' => 'Ayam rempah lengkuas'],
                    ['slug' => 'telur-balado-padang', 'qty' => 1, 'notes' => 'Telur balado'],
                    ['slug' => 'sambal-goreng-tempe', 'qty' => 1, 'notes' => 'Tempe kering renyah'],
                ],
            ],
            [
                'name' => 'Paket Prasmanan Hajatan Syukuran (Per Pax)',
                'slug' => 'paket-prasmanan-hajatan-syukuran',
                'code' => 'PKG-PRS-01',
                'type' => 'prasmanan',
                'desc' => 'Nasi Putih + Daging Sapi Lada Hitam + Ayam Bakar Madu + Tumis Buncis + Sambal Tempe + Kerupuk & Meja Buffet.',
                'price' => 55000,
                'min_qty' => 50,
                'items' => [
                    ['slug' => 'nasi-putih-pulen', 'qty' => 1, 'notes' => 'Nasi putih buffet'],
                    ['slug' => 'sapi-lada-hitam', 'qty' => 1, 'notes' => 'Daging lada hitam'],
                    ['slug' => 'ayam-bakar-madu', 'qty' => 1, 'notes' => 'Ayam bakar'],
                    ['slug' => 'tumis-buncis-wortel', 'qty' => 1, 'notes' => 'Sayuran'],
                    ['slug' => 'sambal-goreng-tempe', 'qty' => 1, 'notes' => 'Lauk pendamping'],
                ],
            ],
        ];

        foreach ($packagesData as $pkg) {
            $createdPkg = MenuPackage::firstOrCreate(
                ['tenant_id' => $tenant->id, 'slug' => $pkg['slug']],
                [
                    'name' => $pkg['name'],
                    'code' => $pkg['code'],
                    'package_type' => $pkg['type'],
                    'description' => $pkg['desc'],
                    'selling_price' => $pkg['price'],
                    'min_order_quantity' => $pkg['min_qty'],
                    'is_active' => true,
                ]
            );

            foreach ($pkg['items'] as $pItem) {
                if (isset($menuItemMap[$pItem['slug']])) {
                    MenuPackageItem::firstOrCreate(
                        [
                            'tenant_id' => $tenant->id,
                            'menu_package_id' => $createdPkg->id,
                            'menu_item_id' => $menuItemMap[$pItem['slug']]->id,
                        ],
                        [
                            'quantity' => $pItem['qty'],
                            'notes' => $pItem['notes'],
                        ]
                    );
                }
            }

            $hppCalc->recalculatePackageHpp($createdPkg);
        }

        // =========================================================================
        // 6. MASTER PELANGGAN (Customers - Individu & Korporat)
        // =========================================================================
        $customersData = [
            [
                'name' => 'Bapak Ir. Bambang Hermanto',
                'type' => 'individual',
                'pic_name' => null,
                'phone' => '081298765401',
                'email' => 'bambang.hermanto@gmail.com',
                'address' => 'Jl. Kemang Timur No. 24, Mampang Prapatan',
                'city' => 'Jakarta Selatan',
                'notes' => 'Pelanggan langganan arisan keluarga & syukuran bulanan.',
            ],
            [
                'name' => 'Ibu Ratna Kumalasari, M.Pd.',
                'type' => 'individual',
                'pic_name' => null,
                'phone' => '081377889902',
                'email' => 'ratna.kumalasari@yahoo.com',
                'address' => 'Komplek Pondok Indah Kaveling 8B',
                'city' => 'Jakarta Selatan',
                'notes' => 'Suka request rasa rempah tidak terlalu pedas untuk anak-anak.',
            ],
            [
                'name' => 'PT. Telkom Indonesia (Divisi Regional II)',
                'type' => 'corporate',
                'pic_name' => 'Rahmat Hidayat (Procurement)',
                'phone' => '0215241234',
                'email' => 'procurement.reg2@telkom.co.id',
                'address' => 'Gedung Grha Merah Putih Lt. 5, Jl. Gatot Subroto Kav. 52',
                'city' => 'Jakarta Selatan',
                'npwp' => '01.234.567.8-012.000',
                'notes' => 'Order rutin makan siang training staf (100 - 300 box per event), term of payment 14 hari.',
            ],
            [
                'name' => 'Bank Mandiri (Cabang Fatmawati)',
                'type' => 'corporate',
                'pic_name' => 'Siti Nurhaliza (General Affairs)',
                'phone' => '0217654321',
                'email' => 'ga.fatmawati@bankmandiri.co.id',
                'address' => 'Jl. RS Fatmawati No. 12, Cilandak Barat',
                'city' => 'Jakarta Selatan',
                'notes' => 'Langganan snack box meeting mingguan setiap hari Selasa dan Kamis.',
            ],
            [
                'name' => 'Fakultas Ilmu Komputer Universitas Indonesia',
                'type' => 'corporate',
                'pic_name' => 'Dra. Endang Wulandari',
                'phone' => '0217863419',
                'email' => 'sekretariat@cs.ui.co.id',
                'address' => 'Kampus Baru UI Depok',
                'city' => 'Depok',
                'notes' => 'Katering seminar nasional, workshop teknologi, dan wisuda mahasiswa.',
            ],
            [
                'name' => 'PT. Dentsu Aegis Media Network',
                'type' => 'corporate',
                'pic_name' => 'Kevin Sanjaya (HR Operations)',
                'phone' => '02129881122',
                'email' => 'hrd@dentsu.co.id',
                'address' => 'Menara Astra Lt. 33, Jl. Jend. Sudirman Kav. 5-6',
                'city' => 'Jakarta Pusat',
                'notes' => 'Katering syukuran shooting iklan & gathering agensi.',
            ],
        ];

        foreach ($customersData as $cust) {
            Customer::firstOrCreate(
                ['tenant_id' => $tenant->id, 'name' => $cust['name']],
                array_merge($cust, ['is_active' => true])
            );
        }

        // =========================================================================
        // 7. MASTER AREA PENGIRIMAN & ONGKIR (Delivery Areas)
        // =========================================================================
        $deliveryAreasData = [
            [
                'name' => 'Zona 1 - Cilandak, Fatmawati & Lebak Bulus',
                'city' => 'Jakarta Selatan',
                'district' => 'Cilandak & Kebayoran Lama',
                'delivery_fee' => 15000,
                'min_order_amount' => 100000,
                'estimated_delivery_minutes' => 25,
                'notes' => 'Area terdekat dapur utama. Pengantaran menggunakan motor roda dua atau van katering.',
            ],
            [
                'name' => 'Zona 2 - Kemang, Kebayoran Baru, Blok M & Senopati',
                'city' => 'Jakarta Selatan',
                'district' => 'Kebayoran Baru & Mampang',
                'delivery_fee' => 25000,
                'min_order_amount' => 150000,
                'estimated_delivery_minutes' => 40,
                'notes' => 'Area residensial dan perkantoran Jakarta Selatan.',
            ],
            [
                'name' => 'Zona 3 - Sudirman, Kuningan, Gatot Subroto & Thamrin',
                'city' => 'Jakarta Pusat',
                'district' => 'Setiabudi & Tanah Abang',
                'delivery_fee' => 35000,
                'min_order_amount' => 250000,
                'estimated_delivery_minutes' => 50,
                'notes' => 'Pusat perkantoran korporat BUMN dan Multinasional.',
            ],
            [
                'name' => 'Zona 4 - Jagakarsa, Pasar Minggu & Depok Margonda',
                'city' => 'Depok',
                'district' => 'Beji & Sukmajaya',
                'delivery_fee' => 30000,
                'min_order_amount' => 200000,
                'estimated_delivery_minutes' => 45,
                'notes' => 'Area perbatasan kampus UI Depok dan pemukiman.',
            ],
            [
                'name' => 'Zona 5 - Bintaro Jaya & BSD City',
                'city' => 'Tangerang Selatan',
                'district' => 'Pondok Aren & Serpong',
                'delivery_fee' => 45000,
                'min_order_amount' => 300000,
                'estimated_delivery_minutes' => 60,
                'notes' => 'Area Tangerang Selatan via jalan tol JORR.',
            ],
        ];

        foreach ($deliveryAreasData as $da) {
            DeliveryArea::firstOrCreate(
                ['tenant_id' => $tenant->id, 'name' => $da['name']],
                array_merge($da, ['is_active' => true])
            );
        }

        // =========================================================================
        // 8. SAMPLE ORDERS, INVOICES & PAYMENTS
        // =========================================================================
        $customerTelkom = Customer::where('tenant_id', $tenant->id)->where('name', 'like', '%Telkom%')->first();
        $customerMandiri = Customer::where('tenant_id', $tenant->id)->where('name', 'like', '%Mandiri%')->first();
        $customerBambang = Customer::where('tenant_id', $tenant->id)->where('name', 'like', '%Bambang%')->first();

        $pkgAyam = MenuPackage::where('tenant_id', $tenant->id)->where('slug', 'paket-nasi-kotak-ayam-bakar-komplit')->first();
        $pkgKuning = MenuPackage::where('tenant_id', $tenant->id)->where('slug', 'paket-nasi-kuning-tumpeng-mini')->first();
        $pkgPrasmanan = MenuPackage::where('tenant_id', $tenant->id)->where('slug', 'paket-prasmanan-hajatan-syukuran')->first();

        $areaJaksel = DeliveryArea::where('tenant_id', $tenant->id)->first();
        $financeService = app(\App\Services\FinanceService::class);
        $user = \App\Models\User::where('current_tenant_id', $tenant->id)->first() ?? \App\Models\User::first();

        if ($customerTelkom && $pkgAyam && $user) {
            $order1 = Order::firstOrCreate(
                ['tenant_id' => $tenant->id, 'order_number' => 'ORD-' . $tenant->id . '-202608-001'],
                [
                    'customer_id' => $customerTelkom->id,
                    'event_name' => 'Lunch Training Karyawan Telkom Regional II',
                    'event_type' => 'Nasi Kotak',
                    'delivery_date' => now()->addDays(3)->toDateString(),
                    'delivery_time' => '11:30',
                    'delivery_area_id' => $areaJaksel?->id,
                    'delivery_address' => 'Gedung Grha Merah Putih Lt. 5, Jl. Gatot Subroto Kav. 52',
                    'recipient_name' => 'Pak Rahmat',
                    'recipient_phone' => '081299887711',
                    'subtotal_amount' => 3200000,
                    'delivery_fee' => 35000,
                    'discount_amount' => 0,
                    'tax_amount' => 0,
                    'total_amount' => 3235000,
                    'total_hpp' => 1850000,
                    'down_payment_amount' => 1500000,
                    'payment_status' => 'partially_paid',
                    'status' => 'in_production',
                    'notes' => 'Tolong pisahkan sambal untuk 20 box.',
                    'created_by' => $user->id,
                ]
            );

            // Seed Item
            \App\Models\OrderItem::firstOrCreate(
                ['order_id' => $order1->id, 'item_name' => $pkgAyam->name],
                [
                    'item_type' => 'menu_package',
                    'menu_package_id' => $pkgAyam->id,
                    'quantity' => 100,
                    'portion_unit' => 'box',
                    'unit_price' => 32000,
                    'subtotal_price' => 3200000,
                    'unit_hpp' => 18500,
                    'subtotal_hpp' => 1850000,
                ]
            );

            // Seed Invoice 1
            $inv1 = Invoice::firstOrCreate(
                ['tenant_id' => $tenant->id, 'invoice_number' => 'INV/' . now()->format('Ym') . '/0001'],
                [
                    'order_id' => $order1->id,
                    'customer_id' => $customerTelkom->id,
                    'invoice_date' => now()->subDays(2)->toDateString(),
                    'due_date' => now()->addDays(5)->toDateString(),
                    'invoice_type' => 'full',
                    'subtotal_amount' => 3200000,
                    'delivery_fee' => 35000,
                    'discount_amount' => 0,
                    'tax_amount' => 0,
                    'total_amount' => 3235000,
                    'paid_amount' => 1500000,
                    'remaining_amount' => 1735000,
                    'status' => 'partially_paid',
                    'notes' => 'Pembayaran DP 50% diterima. Sisa pelunasan H+3 setelah acara.',
                    'created_by' => $user->id,
                ]
            );

            // Seed Payment DP
            Payment::firstOrCreate(
                ['tenant_id' => $tenant->id, 'payment_number' => 'PAY/' . now()->format('Ym') . '/0001'],
                [
                    'invoice_id' => $inv1->id,
                    'order_id' => $order1->id,
                    'customer_id' => $customerTelkom->id,
                    'payment_date' => now()->subDays(2)->toDateString(),
                    'amount' => 1500000,
                    'payment_method' => 'bank_transfer',
                    'destination_bank_account' => 'BCA 8881234567 - PT Berkah Nusantara',
                    'reference_number' => 'TRX-BCA-TELKOM-01',
                    'status' => 'confirmed',
                    'notes' => 'Transfer DP via Corporate Bank Transfer',
                    'received_by' => $user->id,
                ]
            );
        }

        if ($customerMandiri && $pkgKuning && $user) {
            $order2 = Order::firstOrCreate(
                ['tenant_id' => $tenant->id, 'order_number' => 'ORD-' . $tenant->id . '-202608-002'],
                [
                    'customer_id' => $customerMandiri->id,
                    'event_name' => 'Syukuran Ulang Tahun Bank Mandiri Fatmawati',
                    'event_type' => 'Nasi Kotak',
                    'delivery_date' => now()->subDay()->toDateString(),
                    'delivery_time' => '09:00',
                    'delivery_area_id' => $areaJaksel?->id,
                    'delivery_address' => 'Jl. RS Fatmawati No. 12, Cilandak Barat',
                    'recipient_name' => 'Ibu Siti Nurhaliza',
                    'recipient_phone' => '081388990022',
                    'subtotal_amount' => 1800000,
                    'delivery_fee' => 15000,
                    'discount_amount' => 0,
                    'tax_amount' => 0,
                    'total_amount' => 1815000,
                    'total_hpp' => 950000,
                    'down_payment_amount' => 1815000,
                    'payment_status' => 'paid',
                    'status' => 'completed',
                    'notes' => 'Kemasan dihias pita kuning Mandiri.',
                    'created_by' => $user->id,
                ]
            );

            // Seed Item
            \App\Models\OrderItem::firstOrCreate(
                ['order_id' => $order2->id, 'item_name' => $pkgKuning->name],
                [
                    'item_type' => 'menu_package',
                    'menu_package_id' => $pkgKuning->id,
                    'quantity' => 50,
                    'portion_unit' => 'box',
                    'unit_price' => 36000,
                    'subtotal_price' => 1800000,
                    'unit_hpp' => 19000,
                    'subtotal_hpp' => 950000,
                ]
            );

            // Seed Invoice 2 (Lunas)
            $inv2 = Invoice::firstOrCreate(
                ['tenant_id' => $tenant->id, 'invoice_number' => 'INV/' . now()->format('Ym') . '/0002'],
                [
                    'order_id' => $order2->id,
                    'customer_id' => $customerMandiri->id,
                    'invoice_date' => now()->subDays(3)->toDateString(),
                    'due_date' => now()->subDay()->toDateString(),
                    'invoice_type' => 'full',
                    'subtotal_amount' => 1800000,
                    'delivery_fee' => 15000,
                    'discount_amount' => 0,
                    'tax_amount' => 0,
                    'total_amount' => 1815000,
                    'paid_amount' => 1815000,
                    'remaining_amount' => 0,
                    'status' => 'paid',
                    'notes' => 'Lunas 100% sebelum pengiriman.',
                    'created_by' => $user->id,
                ]
            );

            // Seed Payment
            Payment::firstOrCreate(
                ['tenant_id' => $tenant->id, 'payment_number' => 'PAY/' . now()->format('Ym') . '/0002'],
                [
                    'invoice_id' => $inv2->id,
                    'order_id' => $order2->id,
                    'customer_id' => $customerMandiri->id,
                    'payment_date' => now()->subDays(3)->toDateString(),
                    'amount' => 1815000,
                    'payment_method' => 'bank_transfer',
                    'destination_bank_account' => 'Mandiri 1370098765432 - PT Berkah Nusantara',
                    'reference_number' => 'TRX-MDR-MANDIRI-02',
                    'status' => 'confirmed',
                    'notes' => 'Pelunasan transfer Mandiri Online',
                    'received_by' => $user->id,
                ]
            );
        }

        if ($customerBambang && $pkgPrasmanan && $user) {
            $order3 = Order::firstOrCreate(
                ['tenant_id' => $tenant->id, 'order_number' => 'ORD-' . $tenant->id . '-202608-003'],
                [
                    'customer_id' => $customerBambang->id,
                    'event_name' => 'Syukuran Rumah Baru & Doa Bersama',
                    'event_type' => 'Prasmanan',
                    'delivery_date' => now()->addDays(5)->toDateString(),
                    'delivery_time' => '17:00',
                    'delivery_area_id' => $areaJaksel?->id,
                    'delivery_address' => 'Jl. Kemang Timur No. 24, Mampang Prapatan',
                    'recipient_name' => 'Bpk. Bambang Hermanto',
                    'recipient_phone' => '081298765401',
                    'subtotal_amount' => 2750000,
                    'delivery_fee' => 25000,
                    'discount_amount' => 0,
                    'tax_amount' => 0,
                    'total_amount' => 2775000,
                    'total_hpp' => 1500000,
                    'down_payment_amount' => 0,
                    'payment_status' => 'unpaid',
                    'status' => 'confirmed',
                    'notes' => 'Setting meja prasmanan pk 15:30 sudah siap.',
                    'created_by' => $user->id,
                ]
            );

            // Seed Item
            \App\Models\OrderItem::firstOrCreate(
                ['order_id' => $order3->id, 'item_name' => $pkgPrasmanan->name],
                [
                    'item_type' => 'menu_package',
                    'menu_package_id' => $pkgPrasmanan->id,
                    'quantity' => 50,
                    'portion_unit' => 'pax',
                    'unit_price' => 55000,
                    'subtotal_price' => 2750000,
                    'unit_hpp' => 30000,
                    'subtotal_hpp' => 1500000,
                ]
            );

            // Seed Invoice 3 (Unpaid)
            Invoice::firstOrCreate(
                ['tenant_id' => $tenant->id, 'invoice_number' => 'INV/' . now()->format('Ym') . '/0003'],
                [
                    'order_id' => $order3->id,
                    'customer_id' => $customerBambang->id,
                    'invoice_date' => now()->toDateString(),
                    'due_date' => now()->addDays(4)->toDateString(),
                    'invoice_type' => 'full',
                    'subtotal_amount' => 2750000,
                    'delivery_fee' => 25000,
                    'discount_amount' => 0,
                    'tax_amount' => 0,
                    'total_amount' => 2775000,
                    'paid_amount' => 0,
                    'remaining_amount' => 2775000,
                    'status' => 'unpaid',
                    'notes' => 'Menunggu transfer DP 50% sebelum tanggal produksi.',
                    'created_by' => $user->id,
                ]
            );
        }
    }
}
