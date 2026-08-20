<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Master Kategori Menu', description: 'Endpoint Manajemen Kategori Menu Makanan & Minuman')]
class MenuCategoryController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    /**
     * Get all menu categories for active tenant.
     */
    #[OA\Get(
        path: '/tenant/menu-categories',
        summary: 'Daftar Kategori Menu',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Kategori Menu'],
        responses: [
            new OA\Response(response: 200, description: 'Daftar kategori berhasil diambil'),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = MenuCategory::withCount('menuItems')
            ->orderBy('sort_order', 'asc')
            ->orderBy('name', 'asc');

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all')) {
            return $this->successResponse($query->get(), 'Daftar kategori menu berhasil diambil.');
        }

        $perPage = (int) $request->input('per_page', 10);
        $paginated = $query->paginate($perPage);

        return $this->paginatedResponse($paginated, 'Daftar kategori menu berhasil diambil.');
    }

    /**
     * Store new menu category.
     */
    #[OA\Post(
        path: '/tenant/menu-categories',
        summary: 'Tambah Kategori Menu Baru',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Kategori Menu'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Lauk Utama Ayam & Bebek'),
                    new OA\Property(property: 'description', type: 'string', example: 'Aneka olahan lauk ayam dan bebek bakar/goreng'),
                    new OA\Property(property: 'sort_order', type: 'integer', example: 1),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Kategori menu berhasil dibuat'),
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
            'description' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $slug = Str::slug($validated['name']);
        if (MenuCategory::where('slug', $slug)->exists()) {
            $slug .= '-' . Str::random(4);
        }

        $category = MenuCategory::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return $this->successResponse($category, 'Kategori menu berhasil ditambahkan.', 201);
    }

    /**
     * Update menu category.
     */
    #[OA\Put(
        path: '/tenant/menu-categories/{id}',
        summary: 'Update Kategori Menu',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Kategori Menu'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Lauk Utama Ayam & Unggas'),
                    new OA\Property(property: 'description', type: 'string', example: 'Update deskripsi kategori'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Kategori berhasil diperbarui'),
            new OA\Response(response: 404, description: 'Kategori tidak ditemukan'),
        ]
    )]
    public function update(Request $request, int $id): JsonResponse
    {
        $category = MenuCategory::find($id);
        if (!$category) {
            return $this->errorResponse('Kategori tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $category->update($validated);

        return $this->successResponse($category, 'Kategori berhasil diperbarui.');
    }

    /**
     * Delete menu category.
     */
    #[OA\Delete(
        path: '/tenant/menu-categories/{id}',
        summary: 'Hapus Kategori Menu',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Kategori Menu'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Kategori berhasil dihapus'),
            new OA\Response(response: 400, description: 'Kategori masih berisi menu item'),
            new OA\Response(response: 404, description: 'Kategori tidak ditemukan'),
        ]
    )]
    public function destroy(int $id): JsonResponse
    {
        $category = MenuCategory::withCount('menuItems')->find($id);
        if (!$category) {
            return $this->errorResponse('Kategori tidak ditemukan.', 404);
        }

        if ($category->menu_items_count > 0) {
            return $this->errorResponse("Kategori ini tidak dapat dihapus karena masih memuat {$category->menu_items_count} item menu.", 400);
        }

        $category->delete();

        return $this->successResponse(null, 'Kategori berhasil dihapus.');
    }
}
