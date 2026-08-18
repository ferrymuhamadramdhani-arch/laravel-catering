<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\TenantUser;
use App\Services\PermissionRegistry;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Tenant Roles & Permissions', description: 'Endpoint Manajemen Role Dinamis & Matriks Hak Akses')]
class TenantRoleController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    /**
     * Get master list of all permissions grouped by module.
     */
    #[OA\Get(
        path: '/tenant/permissions',
        summary: 'Ambil Katalog Master Hak Akses (Grouped by Module)',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Tenant Roles & Permissions'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Daftar permissions berhasil diambil',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
        ]
    )]
    public function permissions(): JsonResponse
    {
        $grouped = PermissionRegistry::allGrouped();
        return $this->successResponse($grouped, 'Katalog hak akses berhasil diambil.');
    }

    /**
     * Get list of all roles available for active tenant.
     */
    #[OA\Get(
        path: '/tenant/roles',
        summary: 'Ambil Daftar Role (System Default + Custom Tenant)',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Tenant Roles & Permissions'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Daftar role berhasil diambil',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
        ]
    )]
    public function index(): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();

        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        // Get system roles (tenant_id = null) + custom tenant roles (tenant_id = $tenant->id)
        $roles = Role::query()
            ->where(function ($q) use ($tenant) {
                $q->where('is_system', true)->whereNull('tenant_id');
                $q->orWhere('tenant_id', $tenant->id);
            })
            ->orderBy('is_system', 'desc')
            ->orderBy('id', 'asc')
            ->get();

        // Calculate staff user counts for each role
        $userCountsByRole = TenantUser::query()
            ->where('tenant_id', $tenant->id)
            ->selectRaw('role, count(*) as count')
            ->groupBy('role')
            ->pluck('count', 'role');

        $result = $roles->map(function (Role $role) use ($userCountsByRole) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'slug' => $role->slug,
                'description' => $role->description,
                'permissions' => $role->permissions ?? [],
                'permissions_count' => count($role->permissions ?? []),
                'is_system' => (bool) $role->is_system,
                'users_count' => $userCountsByRole->get($role->slug, 0),
                'created_at' => $role->created_at,
            ];
        });

        return $this->successResponse($result, 'Daftar role berhasil diambil.');
    }

    /**
     * Create new dynamic custom role for active tenant.
     */
    #[OA\Post(
        path: '/tenant/roles',
        summary: 'Buat Custom Role Baru',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Tenant Roles & Permissions'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name', 'permissions'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Supervisor Dapur & CS'),
                    new OA\Property(property: 'description', type: 'string', example: 'Mengawasi pesanan masuk dan operasional dapur'),
                    new OA\Property(
                        property: 'permissions',
                        type: 'array',
                        items: new OA\Items(type: 'string'),
                        example: ['menu.view', 'menu.create', 'orders.view', 'orders.create', 'kitchen.view', 'kitchen.manage']
                    ),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Role baru berhasil dibuat'),
            new OA\Response(response: 422, description: 'Validasi gagal'),
        ]
    )]
    public function store(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();

        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'permissions' => ['required', 'array', 'min:1'],
            'permissions.*' => ['string'],
        ]);

        $slug = Str::slug($validated['name']);

        // Check if slug conflicts with existing system role or tenant role
        $existing = Role::where(function ($q) use ($tenant) {
            $q->whereNull('tenant_id')->orWhere('tenant_id', $tenant->id);
        })->where('slug', $slug)->first();

        if ($existing) {
            $slug = $slug . '-' . Str::random(4);
        }

        $role = Role::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'permissions' => array_values(array_unique($validated['permissions'])),
            'is_system' => false,
        ]);

        return $this->successResponse([
            'id' => $role->id,
            'name' => $role->name,
            'slug' => $role->slug,
            'description' => $role->description,
            'permissions' => $role->permissions,
            'is_system' => false,
            'users_count' => 0,
        ], 'Custom role berhasil dibuat.', 201);
    }

    /**
     * Show single role detail.
     */
    #[OA\Get(
        path: '/tenant/roles/{id}',
        summary: 'Detail Role & Permissions',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Tenant Roles & Permissions'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Detail role berhasil diambil'),
            new OA\Response(response: 404, description: 'Role tidak ditemukan'),
        ]
    )]
    public function show(int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();

        $role = Role::where(function ($q) use ($tenant) {
            $q->where('is_system', true)->whereNull('tenant_id');
            if ($tenant) $q->orWhere('tenant_id', $tenant->id);
        })->find($id);

        if (!$role) {
            return $this->errorResponse('Role tidak ditemukan.', 404);
        }

        $usersCount = $tenant
            ? TenantUser::where('tenant_id', $tenant->id)->where('role', $role->slug)->count()
            : 0;

        return $this->successResponse([
            'id' => $role->id,
            'name' => $role->name,
            'slug' => $role->slug,
            'description' => $role->description,
            'permissions' => $role->permissions ?? [],
            'is_system' => (bool) $role->is_system,
            'users_count' => $usersCount,
        ], 'Detail role berhasil diambil.');
    }

    /**
     * Update custom role permissions and metadata.
     */
    #[OA\Put(
        path: '/tenant/roles/{id}',
        summary: 'Update Custom Role & Hak Akses',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Tenant Roles & Permissions'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Supervisor CS & Dapur (Updated)'),
                    new OA\Property(property: 'description', type: 'string', example: 'Deskripsi tugas terbaru'),
                    new OA\Property(
                        property: 'permissions',
                        type: 'array',
                        items: new OA\Items(type: 'string'),
                        example: ['menu.view', 'orders.view', 'kitchen.view']
                    ),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Role berhasil diperbarui'),
            new OA\Response(response: 400, description: 'System role tidak dapat diubah'),
            new OA\Response(response: 404, description: 'Role tidak ditemukan'),
        ]
    )]
    public function update(Request $request, int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();

        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $role = Role::where('tenant_id', $tenant->id)->find($id);

        if (!$role) {
            return $this->errorResponse('Role tidak ditemukan atau merupakan system role bawaan yang dilindungi.', 404);
        }

        if ($role->is_system) {
            return $this->errorResponse('Role sistem bawaan tidak dapat dimodifikasi langsung.', 400);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'permissions' => ['sometimes', 'required', 'array', 'min:1'],
            'permissions.*' => ['string'],
        ]);

        if (isset($validated['name'])) {
            $role->name = $validated['name'];
        }
        if (isset($validated['description'])) {
            $role->description = $validated['description'];
        }
        if (isset($validated['permissions'])) {
            $role->permissions = array_values(array_unique($validated['permissions']));
        }
        $role->save();

        return $this->successResponse([
            'id' => $role->id,
            'name' => $role->name,
            'slug' => $role->slug,
            'description' => $role->description,
            'permissions' => $role->permissions,
            'is_system' => false,
        ], 'Role berhasil diperbarui.');
    }

    /**
     * Delete custom role.
     */
    #[OA\Delete(
        path: '/tenant/roles/{id}',
        summary: 'Hapus Custom Role',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Tenant Roles & Permissions'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Role berhasil dihapus'),
            new OA\Response(response: 400, description: 'Tidak dapat menghapus role yang sedang dipakai atau system role'),
            new OA\Response(response: 404, description: 'Role tidak ditemukan'),
        ]
    )]
    public function destroy(int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();

        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $role = Role::where('tenant_id', $tenant->id)->find($id);

        if (!$role) {
            return $this->errorResponse('Role tidak ditemukan atau merupakan system role yang dilindungi.', 404);
        }

        if ($role->is_system) {
            return $this->errorResponse('Role bawaan sistem tidak dapat dihapus.', 400);
        }

        // Check if any staff user is currently using this role
        $usersUsingRole = TenantUser::where('tenant_id', $tenant->id)
            ->where('role', $role->slug)
            ->count();

        if ($usersUsingRole > 0) {
            return $this->errorResponse("Role ini sedang digunakan oleh {$usersUsingRole} staf. Mohon pindahkan staf ke role lain sebelum menghapus role ini.", 400);
        }

        $role->delete();

        return $this->successResponse(null, 'Custom role berhasil dihapus.');
    }
}
