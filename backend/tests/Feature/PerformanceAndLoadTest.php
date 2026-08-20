<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PerformanceAndLoadTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;
    protected Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'High Volume Catering Co.',
            'slug' => 'high-volume',
            'is_active' => true,
        ]);

        $this->user = User::create([
            'name' => 'Operations Manager',
            'email' => 'ops@highvolume.id',
            'password' => bcrypt('password'),
            'current_tenant_id' => $this->tenant->id,
        ]);

        TenantUser::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->user->id,
            'role' => 'owner',
            'is_active' => true,
        ]);

        app(TenantContext::class)->setTenant($this->tenant);

        $this->customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'PT Mega Korporasi Nusantara',
            'phone' => '08123456789',
            'type' => 'corporate',
        ]);
    }

    /**
     * Test 1: Bulk Order Population & High Volume Aggregation Response Time (< 500ms).
     */
    public function test_analytics_and_order_queries_respond_under_500ms_with_heavy_data(): void
    {
        Sanctum::actingAs($this->user);

        // Populate 100 orders with order items
        $ordersData = [];
        for ($i = 1; $i <= 100; $i++) {
            $ordersData[] = [
                'tenant_id' => $this->tenant->id,
                'customer_id' => $this->customer->id,
                'order_number' => 'ORD-PERF-' . str_pad((string)$i, 4, '0', STR_PAD_LEFT),
                'event_name' => 'Lunch Box Batch #' . $i,
                'delivery_date' => now()->subDays($i % 30)->format('Y-m-d'),
                'delivery_time' => '12:00',
                'status' => $i % 5 === 0 ? 'completed' : 'confirmed',
                'payment_status' => $i % 2 === 0 ? 'paid' : 'unpaid',
                'total_amount' => 1500000.00,
                'down_payment_amount' => 500000.00,
                'created_at' => now()->subDays($i % 30),
                'updated_at' => now()->subDays($i % 30),
            ];
        }

        DB::table('orders')->insert($ordersData);
        $this->assertDatabaseCount('orders', 100);

        // 1. Measure Dashboard Metrics Query Response Time
        $startTime = microtime(true);
        $response = $this->getJson('/api/v1/tenant/dashboard/metrics');
        $durationMs = (microtime(true) - $startTime) * 1000;

        $response->assertStatus(200);
        $this->assertLessThan(500, $durationMs, "Dashboard metrics took {$durationMs}ms, which exceeds 500ms limit!");

        // 2. Measure P&L and Advanced Analytics Query Response Time
        $startAnalytics = microtime(true);
        $resAnalytics = $this->getJson('/api/v1/tenant/analytics/overview');
        $analyticsDurationMs = (microtime(true) - $startAnalytics) * 1000;

        $resAnalytics->assertStatus(200);
        $this->assertLessThan(500, $analyticsDurationMs, "Analytics query took {$analyticsDurationMs}ms, which exceeds 500ms limit!");

        // 3. Measure Financial Report Query Response Time
        $startPnl = microtime(true);
        $resPnl = $this->getJson('/api/v1/tenant/analytics/financial-report');
        $pnlDurationMs = (microtime(true) - $startPnl) * 1000;

        $resPnl->assertStatus(200);
        $this->assertLessThan(500, $pnlDurationMs, "Financial report query took {$pnlDurationMs}ms, which exceeds 500ms limit!");
    }

    /**
     * Test 2: Concurrent Multi-Item Order Creation Stress Test.
     */
    public function test_concurrent_order_creation_throughput(): void
    {
        Sanctum::actingAs($this->user);

        $startBatch = microtime(true);

        // Create 20 sequential orders with items via API
        for ($i = 1; $i <= 20; $i++) {
            $response = $this->postJson('/api/v1/tenant/orders', [
                'customer_id' => $this->customer->id,
                'delivery_date' => now()->addDays($i)->format('Y-m-d'),
                'delivery_time' => '11:00',
                'event_name' => 'Corporate Event #' . $i,
                'items' => [
                    [
                        'item_type' => 'custom',
                        'item_name' => 'Paket Lunch VIP #' . $i,
                        'quantity' => 50,
                        'unit_price' => 35000,
                    ],
                ],
            ]);

            $response->assertStatus(201);
        }

        $totalBatchTime = microtime(true) - $startBatch;

        // 20 orders created in under 3 seconds total (~150ms per order creation)
        $this->assertLessThan(3.0, $totalBatchTime, "20 order creation batch took {$totalBatchTime}s, exceeding 3.0s threshold!");
    }
}
