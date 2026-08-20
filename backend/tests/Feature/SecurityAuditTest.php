<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\RawMaterial;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SecurityAuditTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $userA;
    protected User $userB;
    protected Order $orderA;
    protected Invoice $invoiceA;
    protected RawMaterial $materialA;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create Tenant A & User A
        $this->tenantA = Tenant::create([
            'name' => 'Katering Primarasa A',
            'slug' => 'primarasa-a',
            'is_active' => true,
        ]);

        $this->userA = User::create([
            'name' => 'Owner Tenant A',
            'email' => 'owner.a@primarasa.id',
            'password' => bcrypt('password'),
            'current_tenant_id' => $this->tenantA->id,
        ]);

        TenantUser::create([
            'tenant_id' => $this->tenantA->id,
            'user_id' => $this->userA->id,
            'role' => 'owner',
            'is_active' => true,
        ]);

        // 2. Create Tenant B & User B
        $this->tenantB = Tenant::create([
            'name' => 'Katering Lezat B',
            'slug' => 'lezat-b',
            'is_active' => true,
        ]);

        $this->userB = User::create([
            'name' => 'Owner Tenant B',
            'email' => 'owner.b@lezat.id',
            'password' => bcrypt('password'),
            'current_tenant_id' => $this->tenantB->id,
        ]);

        TenantUser::create([
            'tenant_id' => $this->tenantB->id,
            'user_id' => $this->userB->id,
            'role' => 'owner',
            'is_active' => true,
        ]);

        // 3. Create Sample Data for Tenant A
        app(TenantContext::class)->setTenant($this->tenantA);

        $customerA = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Klien Rahasia Tenant A',
            'phone' => '0812999999',
            'type' => 'corporate',
        ]);

        $this->orderA = Order::create([
            'tenant_id' => $this->tenantA->id,
            'customer_id' => $customerA->id,
            'order_number' => 'ORD-PRIMARASA-001',
            'event_name' => 'Pesta Tertutup A',
            'delivery_date' => now()->addDays(3)->format('Y-m-d'),
            'status' => 'confirmed',
            'total_amount' => 15000000,
        ]);

        $this->invoiceA = Invoice::create([
            'tenant_id' => $this->tenantA->id,
            'order_id' => $this->orderA->id,
            'customer_id' => $customerA->id,
            'invoice_number' => 'INV-PRIMARASA-001',
            'invoice_type' => 'full',
            'invoice_date' => now()->format('Y-m-d'),
            'total_amount' => 15000000,
            'remaining_amount' => 15000000,
            'status' => 'unpaid',
        ]);

        $this->materialA = RawMaterial::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Bumbu Rahasia Katering A',
            'unit' => 'kg',
            'unit_cost' => 500000,
            'current_stock' => 10,
        ]);
    }

    /**
     * Test 1: Cross-Tenant Data Leak Prevention (Isolation Audit).
     */
    public function test_cross_tenant_access_is_completely_blocked_with_404(): void
    {
        // Act as User B (Tenant B)
        Sanctum::actingAs($this->userB);

        // 1. Attempt to view Tenant A's order by ID
        $resOrder = $this->getJson("/api/v1/tenant/orders/{$this->orderA->id}");
        $resOrder->assertStatus(404);

        // 2. Attempt to tamper / update status of Tenant A's order
        $resUpdate = $this->patchJson("/api/v1/tenant/orders/{$this->orderA->id}/status", [
            'status' => 'cancelled',
            'notes' => 'Hacked by Tenant B',
        ]);
        $resUpdate->assertStatus(404);

        // 3. Attempt to view Tenant A's invoice
        $resInvoice = $this->getJson("/api/v1/tenant/invoices/{$this->invoiceA->id}");
        $resInvoice->assertStatus(404);

        // 4. Attempt to view Tenant A's raw material
        $resMaterial = $this->getJson("/api/v1/tenant/raw-materials/{$this->materialA->id}");
        $resMaterial->assertStatus(404);

        // 5. Verify in DB that Tenant A's order is still confirmed & unaffected
        $this->assertDatabaseHas('orders', [
            'id' => $this->orderA->id,
            'status' => 'confirmed',
            'tenant_id' => $this->tenantA->id,
        ]);
    }

    /**
     * Test 2: SQL Injection Immunity via Eloquent Parameterized Queries.
     */
    public function test_sql_injection_payloads_in_search_and_filters_are_handled_safely(): void
    {
        Sanctum::actingAs($this->userA);

        $maliciousQueries = [
            "' OR '1'='1",
            "'; DROP TABLE orders; --",
            "1' UNION SELECT null, null, null, null --",
            "admin'--",
        ];

        foreach ($maliciousQueries as $payload) {
            $response = $this->getJson("/api/v1/tenant/orders?search=" . urlencode($payload));
            $response->assertStatus(200);
            $response->assertJsonPath('success', true);
            // Must return empty or safe filtered collection, no 500 error or syntax exception
            $this->assertEmpty($response->json('data'));
        }

        // Verify database table 'orders' is intact
        $this->assertDatabaseCount('orders', 1);
    }

    /**
     * Test 3: XSS Payload Persistence Safety.
     */
    public function test_xss_scripts_in_order_creation_are_persisted_safely(): void
    {
        Sanctum::actingAs($this->userA);

        $customerA = Customer::first();
        $xssPayload = '<script>alert("XSS Attack!");</script>';

        $res = $this->postJson('/api/v1/tenant/orders', [
            'customer_id' => $customerA->id,
            'delivery_date' => now()->addDays(4)->format('Y-m-d'),
            'delivery_time' => '12:00',
            'event_name' => $xssPayload,
            'notes' => 'Catatan: ' . $xssPayload,
            'items' => [
                [
                    'item_type' => 'custom',
                    'item_name' => 'Nasi Box Custom',
                    'quantity' => 20,
                    'unit_price' => 25000,
                ],
            ],
        ]);

        $res->assertStatus(201);
        $this->assertDatabaseHas('orders', [
            'tenant_id' => $this->tenantA->id,
            'event_name' => $xssPayload,
        ]);
    }
}
