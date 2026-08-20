<?php

namespace Tests\Unit;

use App\Models\MenuItem;
use App\Models\MenuPackage;
use App\Models\MenuPackageItem;
use App\Models\MenuRecipeBom;
use App\Models\RawMaterial;
use App\Models\Tenant;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BOMAndHppCalculationUnitTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'QA Catering Boga',
            'slug' => 'qa-catering',
            'is_active' => true,
        ]);

        app(TenantContext::class)->setTenant($this->tenant);
    }

    public function test_bom_hpp_calculation_accuracy_with_scaling(): void
    {
        // 1. Create Raw Materials
        // Beras: Rp 14.000 / kg -> Rp 14 / gram
        $beras = RawMaterial::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Beras Pandan Wangi',
            'unit' => 'gram',
            'unit_cost' => 14.00, // Rp 14 / gram
            'current_stock' => 50000,
        ]);

        // Ayam Fillet: Rp 45.000 / kg -> Rp 45 / gram
        $ayam = RawMaterial::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Daging Ayam Fillet',
            'unit' => 'gram',
            'unit_cost' => 45.00, // Rp 45 / gram
            'current_stock' => 20000,
        ]);

        // Minyak Goreng: Rp 20 / ml
        $minyak = RawMaterial::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Minyak Goreng Sawit',
            'unit' => 'ml',
            'unit_cost' => 20.00,
            'current_stock' => 10000,
        ]);

        // 2. Create Menu Item: Nasi Ayam Bakar Madu
        // Selling Price: Rp 25.000
        $menuItem = MenuItem::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Nasi Ayam Bakar Madu',
            'slug' => 'nasi-ayam-bakar-madu',
            'selling_price' => 25000,
            'portion_unit' => 'porsi',
            'calculated_hpp' => 0,
            'margin_percentage' => 0,
            'is_active' => true,
        ]);

        // 3. Attach Recipe BOM per 1 portion:
        // - Beras: 100 gram * Rp 14 = Rp 1.400
        // - Ayam: 150 gram * Rp 45 = Rp 6.750
        // - Minyak: 20 ml * Rp 20 = Rp 400
        // Expected total HPP = Rp 8.550
        MenuRecipeBom::create([
            'tenant_id' => $this->tenant->id,
            'menu_item_id' => $menuItem->id,
            'raw_material_id' => $beras->id,
            'quantity' => 100,
            'unit' => 'gram',
            'cost_per_unit' => 14.00,
            'subtotal_cost' => 1400.00,
        ]);

        MenuRecipeBom::create([
            'tenant_id' => $this->tenant->id,
            'menu_item_id' => $menuItem->id,
            'raw_material_id' => $ayam->id,
            'quantity' => 150,
            'unit' => 'gram',
            'cost_per_unit' => 45.00,
            'subtotal_cost' => 6750.00,
        ]);

        MenuRecipeBom::create([
            'tenant_id' => $this->tenant->id,
            'menu_item_id' => $menuItem->id,
            'raw_material_id' => $minyak->id,
            'quantity' => 20,
            'unit' => 'ml',
            'cost_per_unit' => 20.00,
            'subtotal_cost' => 400.00,
        ]);

        // Calculate expected HPP and Margin
        $totalHpp = $menuItem->recipes()->sum('subtotal_cost');
        $this->assertEquals(8550.00, (float) $totalHpp);

        $sellingPrice = (float) $menuItem->selling_price;
        $profit = $sellingPrice - $totalHpp; // 25000 - 8550 = 16450
        $marginPercentage = ($profit / $sellingPrice) * 100; // 65.8%

        $menuItem->update([
            'calculated_hpp' => $totalHpp,
            'margin_percentage' => round($marginPercentage, 2),
        ]);

        $fresh = $menuItem->fresh();
        $this->assertEquals(8550.00, (float) $fresh->calculated_hpp);
        $this->assertEquals(65.80, (float) $fresh->margin_percentage);

        // 4. Test Multi-Level Package Bundling HPP
        // Paket Bento Double Ayam: 2x Nasi Ayam Bakar Madu
        $package = MenuPackage::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Paket Bento Double Ayam',
            'slug' => 'paket-bento-double-ayam',
            'package_type' => 'bento_box',
            'selling_price' => 30000,
            'calculated_hpp' => 0,
            'margin_percentage' => 0,
            'min_order_quantity' => 10,
        ]);

        MenuPackageItem::create([
            'tenant_id' => $this->tenant->id,
            'menu_package_id' => $package->id,
            'menu_item_id' => $menuItem->id,
            'quantity' => 2,
        ]);

        $packageHpp = $package->items->reduce(function ($carry, $pi) {
            return $carry + ((float) $pi->menuItem->calculated_hpp * $pi->quantity);
        }, 0);

        // 8550 * 2 = 17100
        $this->assertEquals(17100.00, (float) $packageHpp);

        $packageSelling = (float) $package->selling_price;
        $packageMargin = (($packageSelling - $packageHpp) / $packageSelling) * 100; // (30000 - 17100) / 30000 = 43%

        $this->assertEquals(43.00, round($packageMargin, 2));
    }
}
