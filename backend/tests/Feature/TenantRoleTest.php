<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantRoleTest extends TestCase
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

        // Create a default system role
        Role::create([
            'name' => 'Administrator',
            'slug' => 'admin',
            'permissions' => ['dashboard.view', 'menu.view', 'orders.view'],
            'is_system' => true,
            'tenant_id' => null,
        ]);
    }

    public function test_can_get_permissions_and_roles_list(): void
    {
        // 1. Get Permissions
        $permRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->getJson('/api/v1/tenant/permissions');

        $permRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => [['module', 'label', 'permissions']]]);

        // 2. Get Roles
        $rolesRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->getJson('/api/v1/tenant/roles');

        $rolesRes->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    public function test_can_create_update_and_delete_custom_role(): void
    {
        // 1. Create Custom Role
        $createRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->postJson('/api/v1/tenant/roles', [
            'name' => 'Supervisor Dapur & CS',
            'description' => 'Mengawasi pesanan dan jadwal dapur',
            'permissions' => ['menu.view', 'menu.create', 'orders.view', 'kitchen.view', 'kitchen.manage'],
        ]);

        $createRes->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Supervisor Dapur & CS')
            ->assertJsonPath('data.is_system', false);

        $roleId = $createRes->json('data.id');

        // 2. Update Custom Role
        $updateRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->putJson("/api/v1/tenant/roles/{$roleId}", [
            'name' => 'Lead Supervisor Dapur',
            'permissions' => ['menu.view', 'kitchen.view', 'kitchen.manage'],
        ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('data.name', 'Lead Supervisor Dapur');

        // 3. Delete Custom Role
        $deleteRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->deleteJson("/api/v1/tenant/roles/{$roleId}");

        $deleteRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('roles', ['id' => $roleId]);
    }

    public function test_cannot_delete_system_role(): void
    {
        $systemRole = Role::where('slug', 'admin')->first();

        $deleteRes = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
            'X-Tenant-ID' => $this->tenant->id,
        ])->deleteJson("/api/v1/tenant/roles/{$systemRole->id}");

        $deleteRes->assertStatus(404); // Scoped out or blocked
    }
}
