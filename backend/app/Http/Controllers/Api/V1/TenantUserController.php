<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTenantUserRequest;
use App\Http\Requests\UpdateTenantUserRequest;
use App\Models\TenantUser;
use App\Models\User;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Tenant Users & Staff', description: 'Endpoint Manajemen Pengguna & Staf Tenant (Owner, Sales, Kitchen, Warehouse, Courier)')]
class TenantUserController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    /**
     * Get list of staff users for active tenant.
     */
    #[OA\Get(
        path: '/tenant/users',
        summary: 'Ambil Daftar Staf Tenant Aktif',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Tenant Users & Staff'],
        parameters: [
            new OA\Parameter(name: 'role', in: 'query', description: 'Filter berdasarkan role (admin, sales, kitchen, warehouse, courier)', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'search', in: 'query', description: 'Cari berdasarkan nama, email, atau no telp', required: false, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Daftar staf berhasil diambil',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string', example: 'Daftar staf tenant berhasil diambil.'),
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();

        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = $tenant->users()->withPivot('role', 'is_active');

        if ($request->has('role') && !empty($request->query('role'))) {
            $query->wherePivot('role', $request->query('role'));
        }

        if ($request->has('search') && !empty($request->query('search'))) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('users.id', 'desc')->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar_url' => $user->avatar_url,
                'role' => $user->pivot->role,
                'is_active' => (bool) $user->pivot->is_active,
                'created_at' => $user->pivot->created_at,
            ];
        });

        return $this->successResponse($users, 'Daftar staf tenant berhasil diambil.');
    }

    /**
     * Store new staff user and link to tenant.
     */
    #[OA\Post(
        path: '/tenant/users',
        summary: 'Tambah Staf Baru ke Tenant',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Tenant Users & Staff'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name', 'email', 'password', 'role'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Dewi Sartika'),
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'dewi@catering.com'),
                    new OA\Property(property: 'password', type: 'string', format: 'password', example: 'password123'),
                    new OA\Property(property: 'role', type: 'string', enum: ['admin', 'sales', 'kitchen', 'warehouse', 'courier'], example: 'sales'),
                    new OA\Property(property: 'phone', type: 'string', example: '081298765432'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Staf baru berhasil ditambahkan'),
            new OA\Response(response: 422, description: 'Validasi form gagal'),
        ]
    )]
    public function store(StoreTenantUserRequest $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();

        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validated();

        $result = DB::transaction(function () use ($tenant, $validated) {
            // Find existing user by email or create new
            $user = User::where('email', $validated['email'])->first();

            if (!$user) {
                $user = User::create([
                    'name' => $validated['name'],
                    'email' => $validated['email'],
                    'password' => Hash::make($validated['password']),
                    'phone' => $validated['phone'] ?? null,
                    'role' => $validated['role'],
                    'current_tenant_id' => $tenant->id,
                ]);
            }

            // Check if already in tenant
            $tenantUser = TenantUser::where('tenant_id', $tenant->id)
                ->where('user_id', $user->id)
                ->first();

            if ($tenantUser) {
                throw new \InvalidArgumentException('User dengan email ini sudah terdaftar di tim catering Anda.');
            }

            // Attach user to tenant with assigned role
            TenantUser::create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'role' => $validated['role'],
                'is_active' => true,
            ]);

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $validated['role'],
                'is_active' => true,
                'created_at' => now(),
            ];
        });

        return $this->successResponse($result, 'Staf baru berhasil ditambahkan.', 201);
    }

    /**
     * Update existing staff user.
     */
    #[OA\Put(
        path: '/tenant/users/{id}',
        summary: 'Update Data Staf Tenant',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Tenant Users & Staff'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Dewi Sartika Update'),
                    new OA\Property(property: 'phone', type: 'string', example: '081299998888'),
                    new OA\Property(property: 'role', type: 'string', enum: ['owner', 'admin', 'sales', 'kitchen', 'warehouse', 'courier'], example: 'kitchen'),
                    new OA\Property(property: 'password', type: 'string', format: 'password', example: 'newpassword123'),
                    new OA\Property(property: 'is_active', type: 'boolean', example: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Data staf berhasil diperbarui'),
            new OA\Response(response: 404, description: 'Staf tidak ditemukan'),
        ]
    )]
    public function update(UpdateTenantUserRequest $request, int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();

        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $tenantUser = TenantUser::where('tenant_id', $tenant->id)->where('user_id', $id)->first();

        if (!$tenantUser) {
            return $this->errorResponse('Staf tidak ditemukan pada tim catering ini.', 404);
        }

        $user = User::find($id);
        if (!$user) {
            return $this->errorResponse('User tidak ditemukan.', 404);
        }

        $validated = $request->validated();

        DB::transaction(function () use ($user, $tenantUser, $validated) {
            if (isset($validated['name'])) $user->name = $validated['name'];
            if (isset($validated['phone'])) $user->phone = $validated['phone'];
            if (!empty($validated['password'])) $user->password = Hash::make($validated['password']);
            $user->save();

            if (isset($validated['role'])) $tenantUser->role = $validated['role'];
            if (isset($validated['is_active'])) $tenantUser->is_active = $validated['is_active'];
            $tenantUser->save();
        });

        return $this->successResponse([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $tenantUser->role,
            'is_active' => (bool) $tenantUser->is_active,
        ], 'Data staf berhasil diperbarui.');
    }

    /**
     * Toggle staff active status.
     */
    #[OA\Patch(
        path: '/tenant/users/{id}/toggle-status',
        summary: 'Toggle Status Aktif/Nonaktif Staf',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Tenant Users & Staff'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Status staf berhasil diubah'),
            new OA\Response(response: 400, description: 'Tidak dapat menonaktifkan akun Owner utama'),
        ]
    )]
    public function toggleStatus(int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();

        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $tenantUser = TenantUser::where('tenant_id', $tenant->id)->where('user_id', $id)->first();

        if (!$tenantUser) {
            return $this->errorResponse('Staf tidak ditemukan pada tim catering ini.', 404);
        }

        // Prevent disabling the owner if it is the only active owner
        if ($tenantUser->role === 'owner' && $tenantUser->is_active) {
            $otherActiveOwners = TenantUser::where('tenant_id', $tenant->id)
                ->where('role', 'owner')
                ->where('is_active', true)
                ->where('user_id', '!=', $id)
                ->count();

            if ($otherActiveOwners === 0) {
                return $this->errorResponse('Tidak dapat menonaktifkan akun Owner utama bisnis.', 400);
            }
        }

        $tenantUser->is_active = !$tenantUser->is_active;
        $tenantUser->save();

        return $this->successResponse([
            'id' => $id,
            'is_active' => (bool) $tenantUser->is_active,
        ], 'Status aktif staf berhasil diperbarui.');
    }

    /**
     * Remove staff from tenant.
     */
    #[OA\Delete(
        path: '/tenant/users/{id}',
        summary: 'Hapus Staf dari Tim Tenant',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Tenant Users & Staff'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Staf berhasil dihapus dari tenant'),
            new OA\Response(response: 400, description: 'Tidak dapat menghapus akun Owner utama'),
        ]
    )]
    public function destroy(int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();

        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $tenantUser = TenantUser::where('tenant_id', $tenant->id)->where('user_id', $id)->first();

        if (!$tenantUser) {
            return $this->errorResponse('Staf tidak ditemukan pada tim catering ini.', 404);
        }

        if ($tenantUser->role === 'owner') {
            return $this->errorResponse('Tidak dapat menghapus akun Owner utama dari bisnis catering.', 400);
        }

        $tenantUser->delete();

        return $this->successResponse(null, 'Staf berhasil dihapus dari tim catering.');
    }
}
