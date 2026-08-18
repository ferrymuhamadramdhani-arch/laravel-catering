<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantOnboardingAndStaffTest extends TestCase
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
            'onboarding_completed' => false,
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

    public function test_can_get_and_update_tenant_profile_wizard(): void
    {
        // 1. Get Profile
        $getResponse = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->getJson('/api/v1/tenant/profile');

        $getResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.slug', 'berkah-utama');

        // 2. Update Profile & Wizard data
        $payload = [
            'name' => 'Berkah Catering Nusantara Updated',
            'phone' => '081234567890',
            'address' => 'Jl. Kebon Jeruk No. 12, Jakarta Barat',
            'business_type' => ['nasi_kotak', 'prasmanan', 'snack_box'],
            'service_areas' => ['Jakarta Barat', 'Jakarta Selatan', 'Tangerang'],
            'operating_hours' => [
                'open' => '06:00',
                'close' => '21:00',
                'days' => ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
            ],
            'bank_accounts' => [
                [
                    'bank_name' => 'BCA',
                    'account_number' => '8881234567',
                    'account_name' => 'PT Berkah Nusantara',
                ],
            ],
        ];

        $updateResponse = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->putJson('/api/v1/tenant/profile', $payload);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Berkah Catering Nusantara Updated')
            ->assertJsonPath('data.business_type.0', 'nasi_kotak');

        // 3. Complete Onboarding
        $completeResponse = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->postJson('/api/v1/tenant/complete-onboarding');

        $completeResponse->assertStatus(200)
            ->assertJsonPath('data.onboarding_completed', true);

        $this->assertDatabaseHas('tenants', [
            'id' => $this->tenant->id,
            'onboarding_completed' => true,
        ]);
    }

    public function test_can_manage_tenant_staff_crud(): void
    {
        // 1. Create new staff (Sales)
        $storeResponse = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->postJson('/api/v1/tenant/users', [
            'name' => 'Dewi Staff Sales',
            'email' => 'dewi.sales@berkah.com',
            'password' => 'salespass123',
            'role' => 'sales',
            'phone' => '081987654321',
        ]);

        $storeResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.role', 'sales');

        $staffId = $storeResponse->json('data.id');

        // 2. List staff
        $listResponse = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->getJson('/api/v1/tenant/users');

        $listResponse->assertStatus(200)
            ->assertJsonCount(2, 'data'); // Owner + Dewi

        // 3. Update staff
        $updateResponse = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->putJson("/api/v1/tenant/users/{$staffId}", [
            'name' => 'Dewi Sartika Head of Sales',
            'role' => 'admin',
        ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('data.name', 'Dewi Sartika Head of Sales')
            ->assertJsonPath('data.role', 'admin');

        // 4. Toggle active status
        $toggleResponse = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->patchJson("/api/v1/tenant/users/{$staffId}/toggle-status");

        $toggleResponse->assertStatus(200)
            ->assertJsonPath('data.is_active', false);

        // 5. Delete staff
        $deleteResponse = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->deleteJson("/api/v1/tenant/users/{$staffId}");

        $deleteResponse->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('tenant_users', [
            'tenant_id' => $this->tenant->id,
            'user_id' => $staffId,
        ]);
    }

    public function test_cannot_delete_primary_owner(): void
    {
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->deleteJson("/api/v1/tenant/users/{$this->owner->id}");

        $response->assertStatus(400);
    }
}
