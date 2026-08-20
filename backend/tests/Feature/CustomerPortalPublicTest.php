<?php

namespace Tests\Feature;

use App\Models\DeliveryArea;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\MenuPackage;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerPortalPublicTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected MenuCategory $category;
    protected MenuItem $menuItem;
    protected MenuPackage $package;
    protected DeliveryArea $deliveryArea;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Berkah Catering Nusantara',
            'slug' => 'berkah-catering',
            'phone' => '081234567890',
            'email' => 'kontak@berkah.com',
            'is_active' => true,
        ]);

        $this->category = MenuCategory::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Nasi Kotak Premium',
            'slug' => 'nasi-kotak-premium',
            'is_active' => true,
        ]);

        $this->menuItem = MenuItem::create([
            'tenant_id' => $this->tenant->id,
            'menu_category_id' => $this->category->id,
            'name' => 'Ayam Bakar Madu',
            'slug' => 'ayam-bakar-madu',
            'selling_price' => 25000,
            'calculated_hpp' => 14000,
            'is_active' => true,
        ]);

        $this->package = MenuPackage::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Paket Nasi Kotak Komplit',
            'slug' => 'paket-nasi-kotak-komplit',
            'package_type' => 'box',
            'selling_price' => 35000,
            'calculated_hpp' => 19000,
            'is_active' => true,
        ]);

        $this->deliveryArea = DeliveryArea::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Jakarta Selatan',
            'city' => 'Jakarta Selatan',
            'delivery_fee' => 20000,
            'min_order_amount' => 100000,
            'is_active' => true,
        ]);
    }

    public function test_can_get_public_catalog(): void
    {
        $response = $this->getJson("/api/v1/public/tenant/{$this->tenant->slug}/catalog");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.tenant.name', 'Berkah Catering Nusantara')
            ->assertJsonPath('data.packages.0.name', 'Paket Nasi Kotak Komplit')
            ->assertJsonPath('data.delivery_areas.0.name', 'Jakarta Selatan');
    }

    public function test_can_check_kitchen_capacity(): void
    {
        $response = $this->postJson("/api/v1/public/tenant/{$this->tenant->slug}/check-capacity", [
            'delivery_date' => now()->addDays(2)->toDateString(),
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_available', true);
    }

    public function test_can_checkout_order_publicly(): void
    {
        $checkoutData = [
            'customer_name' => 'Ibu Ratna Paramitha',
            'customer_phone' => '081298765432',
            'customer_email' => 'ratna@gmail.com',
            'event_name' => 'Arisan Keluarga Besar',
            'event_type' => 'Nasi Kotak',
            'delivery_date' => now()->addDays(3)->toDateString(),
            'delivery_time' => '11:00',
            'delivery_area_id' => $this->deliveryArea->id,
            'delivery_address' => 'Jl. RS Fatmawati No. 50, Cilandak',
            'items' => [
                [
                    'item_type' => 'menu_package',
                    'item_id' => $this->package->id,
                    'quantity' => 50,
                    'notes' => 'Sambal dipisah',
                ],
            ],
            'notes' => 'Harap tepat waktu pk 11:00.',
        ];

        $response = $this->postJson("/api/v1/public/tenant/{$this->tenant->slug}/checkout", $checkoutData);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'order' => ['id', 'order_number', 'total_amount'],
                    'tracking_code',
                    'invoice' => ['id', 'invoice_number'],
                ],
            ]);

        $trackingCode = $response->json('data.tracking_code');

        // Test Track Order
        $trackResponse = $this->getJson("/api/v1/public/orders/track/{$trackingCode}");
        $trackResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.customer.name', 'Ibu Ratna Paramitha')
            ->assertJsonPath('data.status', 'confirmed');
    }
}
