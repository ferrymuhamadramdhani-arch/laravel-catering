<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SuperAdminSaaSTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected Tenant $tenant1;
    protected Tenant $tenant2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdmin = User::create([
            'name' => 'Platform Super Admin',
            'email' => 'admin@cateros.id',
            'password' => bcrypt('password'),
            'role' => 'superadmin',
        ]);

        $this->tenant1 = Tenant::create([
            'name' => 'Berkah Catering Utama',
            'slug' => 'berkah-catering',
            'is_active' => true,
        ]);

        $this->tenant2 = Tenant::create([
            'name' => 'Sedap Wangi Boga',
            'slug' => 'sedap-wangi',
            'is_active' => true,
        ]);
    }

    public function test_can_fetch_saas_metrics_and_mrr(): void
    {
        Sanctum::actingAs($this->superAdmin);

        // 1. Fetch metrics (auto-seeds 3 plans)
        $response = $this->getJson('/api/v1/super-admin/metrics');

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.total_tenants', 2);
        $response->assertJsonPath('data.active_tenants', 2);

        // 3 default plans should be created
        $this->assertDatabaseCount('subscription_plans', 3);

        $growthPlan = SubscriptionPlan::where('slug', 'growth')->first();

        // Attach active subscription to tenant 1
        TenantSubscription::create([
            'tenant_id' => $this->tenant1->id,
            'subscription_plan_id' => $growthPlan->id,
            'status' => 'active',
            'billing_cycle' => 'monthly',
            'current_period_start' => now(),
            'current_period_end' => now()->addMonth(),
        ]);

        // Re-fetch metrics and verify MRR
        $res2 = $this->getJson('/api/v1/super-admin/metrics');
        $res2->assertStatus(200);
        $this->assertEquals(799000.0, (float) $res2->json('data.mrr'));
        $this->assertEquals(799000.0 * 12, (float) $res2->json('data.arr'));
    }

    public function test_can_list_tenants_and_update_status(): void
    {
        Sanctum::actingAs($this->superAdmin);

        // 1. List tenants
        $listRes = $this->getJson('/api/v1/super-admin/tenants?search=Berkah');
        $listRes->assertStatus(200);
        $listRes->assertJsonPath('data.0.name', 'Berkah Catering Utama');

        // 2. Suspend tenant 1
        $suspendRes = $this->patchJson("/api/v1/super-admin/tenants/{$this->tenant1->id}/status", [
            'is_active' => false,
        ]);

        $suspendRes->assertStatus(200);
        $this->assertDatabaseHas('tenants', [
            'id' => $this->tenant1->id,
            'is_active' => false,
        ]);

        // 3. Reactivate tenant 1
        $reactivateRes = $this->patchJson("/api/v1/super-admin/tenants/{$this->tenant1->id}/status", [
            'is_active' => true,
        ]);

        $reactivateRes->assertStatus(200);
        $this->assertDatabaseHas('tenants', [
            'id' => $this->tenant1->id,
            'is_active' => true,
        ]);
    }

    public function test_can_assign_and_upgrade_subscription_plan(): void
    {
        Sanctum::actingAs($this->superAdmin);

        // Trigger plans seeding
        $plansRes = $this->getJson('/api/v1/super-admin/plans');
        $plansRes->assertStatus(200);
        $enterprisePlan = SubscriptionPlan::where('slug', 'enterprise')->first();

        $assignRes = $this->postJson("/api/v1/super-admin/tenants/{$this->tenant2->id}/plan", [
            'subscription_plan_id' => $enterprisePlan->id,
            'billing_cycle' => 'yearly',
        ]);

        $assignRes->assertStatus(200);
        $this->assertDatabaseHas('tenant_subscriptions', [
            'tenant_id' => $this->tenant2->id,
            'subscription_plan_id' => $enterprisePlan->id,
            'status' => 'active',
            'billing_cycle' => 'yearly',
        ]);

        $this->assertDatabaseHas('tenants', [
            'id' => $this->tenant2->id,
            'subscription_plan' => 'enterprise',
        ]);
    }

    public function test_can_update_plan_pricing(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $this->getJson('/api/v1/super-admin/plans');
        $starter = SubscriptionPlan::where('slug', 'starter')->first();

        $updateRes = $this->putJson("/api/v1/super-admin/plans/{$starter->id}", [
            'price_monthly' => 349000,
            'max_orders_per_month' => 200,
        ]);

        $updateRes->assertStatus(200);
        $this->assertDatabaseHas('subscription_plans', [
            'id' => $starter->id,
            'price_monthly' => 349000,
            'max_orders_per_month' => 200,
        ]);
    }
}
