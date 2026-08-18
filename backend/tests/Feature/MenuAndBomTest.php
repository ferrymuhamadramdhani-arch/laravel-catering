<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\MenuPackage;
use App\Models\RawMaterial;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MenuAndBomTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $owner;
    protected string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Berkah Catering Utama',
            'slug' => 'berkah-utama',
            'is_active' => true,
            'onboarding_completed' => true,
        ]);

        $this->owner = User::create([
            'name' => 'Owner Berkah',
            'email' => 'owner@berkah.com',
            'password' => bcrypt('password123'),
            'role' => 'owner',
            'current_tenant_id' => $this->tenant->id,
        ]);

        TenantUser::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->owner->id,
            'role' => 'owner',
            'is_active' => true,
        ]);

        $this->token = $this->owner->createToken('test_token')->plainTextToken;
    }

    public function test_can_manage_raw_materials_crud(): void
    {
        // Create raw material
        $createRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->postJson('/api/v1/tenant/raw-materials', [
            'name' => 'Daging Sapi Has Dalam',
            'category' => 'Daging/Sapi',
            'unit' => 'kg',
            'default_purchase_price' => 120000,
            'minimum_stock' => 5,
        ]);

        $createRes->assertStatus(201)
            ->assertJsonPath('data.name', 'Daging Sapi Has Dalam')
            ->assertJsonPath('data.default_purchase_price', '120000.00');

        $matId = $createRes->json('data.id');

        // Update raw material
        $updateRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->putJson("/api/v1/tenant/raw-materials/{$matId}", [
            'default_purchase_price' => 130000,
        ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('data.default_purchase_price', '130000.00');

        // List raw materials
        $listRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->getJson('/api/v1/tenant/raw-materials');

        $listRes->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_can_create_menu_with_bom_and_calculate_hpp(): void
    {
        // 1. Create Raw Material (Ayam: 50.000 / kg)
        $material = RawMaterial::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Ayam Broiler',
            'category' => 'Daging/Unggas',
            'unit' => 'kg',
            'default_purchase_price' => 50000,
        ]);

        // 2. Create Category
        $category = MenuCategory::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Lauk Ayam',
            'slug' => 'lauk-ayam',
        ]);

        // 3. Create Menu Item with BOM (200 gram ayam = 0.2 * 50.000 = Rp 10.000 HPP)
        $createMenuRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->postJson('/api/v1/tenant/menu-items', [
            'name' => 'Ayam Goreng Lengkuas',
            'menu_category_id' => $category->id,
            'selling_price' => 20000,
            'portion_unit' => 'porsi',
            'recipes' => [
                [
                    'raw_material_id' => $material->id,
                    'quantity' => 0.2,
                    'unit' => 'kg',
                ],
            ],
        ]);

        $createMenuRes->assertStatus(201)
            ->assertJsonPath('data.name', 'Ayam Goreng Lengkuas')
            ->assertJsonPath('data.calculated_hpp', '10000.00')
            ->assertJsonPath('data.margin_percentage', '50.00'); // (20.000 - 10.000) / 20.000 = 50%

        $menuId = $createMenuRes->json('data.id');

        // 4. Create Menu Package (Bundling)
        $createPackageRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->postJson('/api/v1/tenant/menu-packages', [
            'name' => 'Paket Hemat Ayam Lengkuas',
            'package_type' => 'nasi_kotak',
            'selling_price' => 25000,
            'items' => [
                [
                    'menu_item_id' => $menuId,
                    'quantity' => 1,
                    'notes' => '1 potong ayam',
                ],
            ],
        ]);

        $createPackageRes->assertStatus(201)
            ->assertJsonPath('data.calculated_hpp', '10000.00')
            ->assertJsonPath('data.margin_percentage', '60.00'); // (25.000 - 10.000) / 25.000 = 60%
    }
}
