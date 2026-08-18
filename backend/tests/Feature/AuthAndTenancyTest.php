<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthAndTenancyTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_register_new_tenant_and_owner_account(): void
    {
        $payload = [
            'tenant_name' => 'Berkah Catering Rasa',
            'tenant_slug' => 'berkah-rasa',
            'owner_name' => 'Budi Santoso',
            'email' => 'budi@berkahcatering.com',
            'password' => 'password123',
            'phone' => '08123456789',
        ];

        $response = $this->postJson('/api/v1/auth/register-tenant', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.tenant.slug', 'berkah-rasa')
            ->assertJsonPath('data.user.email', 'budi@berkahcatering.com')
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'user',
                    'tenant',
                    'token',
                ],
            ]);

        $this->assertDatabaseHas('tenants', [
            'slug' => 'berkah-rasa',
            'name' => 'Berkah Catering Rasa',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'budi@berkahcatering.com',
            'role' => 'owner',
        ]);
    }

    public function test_can_login_with_valid_credentials(): void
    {
        $tenant = Tenant::create([
            'name' => 'Sedap Catering',
            'slug' => 'sedap-catering',
            'is_active' => true,
        ]);

        $user = User::create([
            'name' => 'Siti Rahma',
            'email' => 'siti@sedap.com',
            'password' => bcrypt('secret123'),
            'role' => 'owner',
            'current_tenant_id' => $tenant->id,
        ]);

        TenantUser::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => 'owner',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'siti@sedap.com',
            'password' => 'secret123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.email', 'siti@sedap.com');
    }

    public function test_cannot_login_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'wrong@email.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422);
    }

    public function test_can_get_authenticated_user_profile(): void
    {
        $tenant = Tenant::create([
            'name' => 'Nusantara Food',
            'slug' => 'nusantara-food',
            'is_active' => true,
        ]);

        $user = User::create([
            'name' => 'Admin Nusantara',
            'email' => 'admin@nusantara.com',
            'password' => bcrypt('password'),
            'role' => 'owner',
            'current_tenant_id' => $tenant->id,
        ]);

        TenantUser::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => 'owner',
            'is_active' => true,
        ]);

        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-ID' => $tenant->id,
        ])->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.name', 'Admin Nusantara')
            ->assertJsonPath('data.current_tenant.slug', 'nusantara-food');
    }

    public function test_tenant_context_binds_correctly(): void
    {
        $tenant = Tenant::create([
            'name' => 'Test Context Tenant',
            'slug' => 'test-context',
            'is_active' => true,
        ]);

        $tenantContext = app(TenantContext::class);
        $tenantContext->setTenant($tenant);

        $this->assertEquals($tenant->id, $tenantContext->getTenantId());
        $this->assertEquals('test-context', $tenantContext->getTenant()->slug);
        $this->assertTrue($tenantContext->hasTenant());

        $tenantContext->clear();
        $this->assertNull($tenantContext->getTenantId());
        $this->assertFalse($tenantContext->hasTenant());
    }
}
