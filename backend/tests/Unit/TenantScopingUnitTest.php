<?php

namespace Tests\Unit;

use App\Models\Customer;
use App\Models\Order;
use App\Models\RawMaterial;
use App\Models\Tenant;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantScopingUnitTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create([
            'name' => 'Katering Berkah A',
            'slug' => 'berkah-a',
            'is_active' => true,
        ]);

        $this->tenantB = Tenant::create([
            'name' => 'Katering Sedap B',
            'slug' => 'sedap-b',
            'is_active' => true,
        ]);
    }

    public function test_tenant_context_automatically_applies_scope_and_prevents_leak(): void
    {
        $context = app(TenantContext::class);

        // 1. In context of Tenant A, create customer and raw material
        $context->setTenant($this->tenantA);

        $customerA = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Pelanggan Milik A',
            'phone' => '081111111',
            'type' => 'individual',
        ]);

        $materialA = RawMaterial::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Daging Sapi Premium A',
            'unit' => 'kg',
            'unit_cost' => 120000,
            'current_stock' => 15,
        ]);

        // 2. In context of Tenant B, create customer and raw material
        $context->setTenant($this->tenantB);

        $customerB = Customer::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Pelanggan Milik B',
            'phone' => '082222222',
            'type' => 'corporate',
        ]);

        $materialB = RawMaterial::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Beras Organik B',
            'unit' => 'kg',
            'unit_cost' => 18000,
            'current_stock' => 50,
        ]);

        // 3. Verify Tenant B can ONLY see its own records
        $customersVisibleToB = Customer::all();
        $this->assertCount(1, $customersVisibleToB);
        $this->assertEquals('Pelanggan Milik B', $customersVisibleToB->first()->name);

        $materialsVisibleToB = RawMaterial::all();
        $this->assertCount(1, $materialsVisibleToB);
        $this->assertEquals('Beras Organik B', $materialsVisibleToB->first()->name);

        // 4. Switch context back to Tenant A and verify isolation
        $context->setTenant($this->tenantA);

        $customersVisibleToA = Customer::all();
        $this->assertCount(1, $customersVisibleToA);
        $this->assertEquals('Pelanggan Milik A', $customersVisibleToA->first()->name);

        $materialsVisibleToA = RawMaterial::all();
        $this->assertCount(1, $materialsVisibleToA);
        $this->assertEquals('Daging Sapi Premium A', $materialsVisibleToA->first()->name);
    }
}
