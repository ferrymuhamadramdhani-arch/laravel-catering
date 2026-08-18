<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\MenuRecipeBom;
use App\Models\RawMaterial;
use App\Services\HppCalculatorService;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Master Item Menu & Resep (BOM)', description: 'Endpoint Manajemen Item Menu, Resep Bahan Baku & Kalkulasi HPP')]
class MenuItemController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext,
        protected HppCalculatorService $hppCalculator
    ) {}

    /**
     * Get all menu items with category and recipes BOM.
     */
    #[OA\Get(
        path: '/tenant/menu-items',
        summary: 'Daftar Item Menu & HPP',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Item Menu & Resep (BOM)'],
        parameters: [
            new OA\Parameter(name: 'category_id', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'is_active', in: 'query', required: false, schema: new OA\Schema(type: 'boolean')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Daftar menu berhasil diambil'),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = MenuItem::with(['category', 'recipes.rawMaterial'])
            ->orderBy('name', 'asc');

        if ($request->filled('category_id') && $request->category_id !== 'all') {
            $query->where('menu_category_id', $request->category_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all')) {
            $items = $query->get();
            return $this->successResponse($items, 'Daftar item menu berhasil diambil.');
        }

        $perPage = (int) $request->input('per_page', 10);
        $paginated = $query->paginate($perPage);

        return $this->paginatedResponse($paginated, 'Daftar item menu berhasil diambil.');
    }

    /**
     * Store new menu item with optional initial BOM recipe.
     */
    #[OA\Post(
        path: '/tenant/menu-items',
        summary: 'Tambah Item Menu Baru & Resep BOM',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Item Menu & Resep (BOM)'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name', 'selling_price'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Ayam Bakar Madu Spesial'),
                    new OA\Property(property: 'menu_category_id', type: 'integer', example: 1),
                    new OA\Property(property: 'code', type: 'string', example: 'MN-AYAM-01'),
                    new OA\Property(property: 'description', type: 'string', example: 'Ayam bakar dengan bumbu madu dan rempah pilihan'),
                    new OA\Property(property: 'selling_price', type: 'number', example: 25000),
                    new OA\Property(property: 'portion_unit', type: 'string', example: 'porsi'),
                    new OA\Property(
                        property: 'recipes',
                        type: 'array',
                        items: new OA\Items(
                            properties: [
                                new OA\Property(property: 'raw_material_id', type: 'integer', example: 1),
                                new OA\Property(property: 'quantity', type: 'number', example: 200),
                                new OA\Property(property: 'unit', type: 'string', example: 'gram'),
                            ]
                        )
                    ),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Menu item berhasil dibuat'),
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
            'name' => ['required', 'string', 'max:255'],
            'menu_category_id' => ['nullable', 'exists:menu_categories,id'],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'portion_unit' => ['nullable', 'string', 'max:50'],
            'recipes' => ['nullable', 'array'],
            'recipes.*.raw_material_id' => ['required_with:recipes', 'exists:raw_materials,id'],
            'recipes.*.quantity' => ['required_with:recipes', 'numeric', 'min:0.0001'],
            'recipes.*.unit' => ['required_with:recipes', 'string', 'max:50'],
        ]);

        $slug = Str::slug($validated['name']);
        if (MenuItem::where('slug', $slug)->exists()) {
            $slug .= '-' . Str::random(4);
        }

        $menuItem = MenuItem::create([
            'tenant_id' => $tenant->id,
            'menu_category_id' => $validated['menu_category_id'] ?? null,
            'name' => $validated['name'],
            'slug' => $slug,
            'code' => $validated['code'] ?? null,
            'description' => $validated['description'] ?? null,
            'selling_price' => $validated['selling_price'],
            'portion_unit' => $validated['portion_unit'] ?? 'porsi',
            'is_active' => true,
        ]);

        // Insert BOM recipes if provided
        if (!empty($validated['recipes'])) {
            foreach ($validated['recipes'] as $recipeItem) {
                MenuRecipeBom::create([
                    'tenant_id' => $tenant->id,
                    'menu_item_id' => $menuItem->id,
                    'raw_material_id' => $recipeItem['raw_material_id'],
                    'quantity' => $recipeItem['quantity'],
                    'unit' => strtolower($recipeItem['unit']),
                ]);
            }
        }

        // Calculate and save HPP automatically
        $this->hppCalculator->recalculateMenuItemHpp($menuItem);

        $menuItem->load(['category', 'recipes.rawMaterial']);

        return $this->successResponse($menuItem, 'Item menu & resep berhasil ditambahkan.', 201);
    }

    /**
     * Show menu item detail with BOM recipes.
     */
    #[OA\Get(
        path: '/tenant/menu-items/{id}',
        summary: 'Detail Item Menu & Resep BOM',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Item Menu & Resep (BOM)'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Detail menu berhasil diambil'),
            new OA\Response(response: 404, description: 'Menu tidak ditemukan'),
        ]
    )]
    public function show(int $id): JsonResponse
    {
        $menuItem = MenuItem::with(['category', 'recipes.rawMaterial'])->find($id);
        if (!$menuItem) {
            return $this->errorResponse('Item menu tidak ditemukan.', 404);
        }

        return $this->successResponse($menuItem, 'Detail item menu berhasil diambil.');
    }

    /**
     * Update menu item and sync BOM recipes.
     */
    #[OA\Put(
        path: '/tenant/menu-items/{id}',
        summary: 'Update Item Menu & Resep BOM',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Item Menu & Resep (BOM)'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Ayam Bakar Madu Super Pedas'),
                    new OA\Property(property: 'selling_price', type: 'number', example: 27000),
                    new OA\Property(
                        property: 'recipes',
                        type: 'array',
                        items: new OA\Items(
                            properties: [
                                new OA\Property(property: 'raw_material_id', type: 'integer', example: 1),
                                new OA\Property(property: 'quantity', type: 'number', example: 250),
                                new OA\Property(property: 'unit', type: 'string', example: 'gram'),
                            ]
                        )
                    ),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Menu berhasil diperbarui'),
            new OA\Response(response: 404, description: 'Menu tidak ditemukan'),
        ]
    )]
    public function update(Request $request, int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        $menuItem = MenuItem::find($id);

        if (!$menuItem) {
            return $this->errorResponse('Item menu tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'menu_category_id' => ['nullable', 'exists:menu_categories,id'],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'selling_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'portion_unit' => ['nullable', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
            'recipes' => ['nullable', 'array'],
            'recipes.*.raw_material_id' => ['required_with:recipes', 'exists:raw_materials,id'],
            'recipes.*.quantity' => ['required_with:recipes', 'numeric', 'min:0.0001'],
            'recipes.*.unit' => ['required_with:recipes', 'string', 'max:50'],
        ]);

        $menuItem->update($validated);

        // Sync BOM recipes if recipes payload is explicitly supplied
        if ($request->has('recipes')) {
            MenuRecipeBom::where('menu_item_id', $menuItem->id)->delete();

            if (!empty($validated['recipes'])) {
                foreach ($validated['recipes'] as $recipeItem) {
                    MenuRecipeBom::create([
                        'tenant_id' => $tenant->id,
                        'menu_item_id' => $menuItem->id,
                        'raw_material_id' => $recipeItem['raw_material_id'],
                        'quantity' => $recipeItem['quantity'],
                        'unit' => strtolower($recipeItem['unit']),
                    ]);
                }
            }
        }

        // Recalculate HPP
        $this->hppCalculator->recalculateMenuItemHpp($menuItem);
        $menuItem->load(['category', 'recipes.rawMaterial']);

        return $this->successResponse($menuItem, 'Item menu & resep berhasil diperbarui.');
    }

    /**
     * Upload photo for menu item.
     */
    #[OA\Post(
        path: '/tenant/menu-items/{id}/image',
        summary: 'Upload Foto Item Menu',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Item Menu & Resep (BOM)'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    properties: [
                        new OA\Property(property: 'image', type: 'string', format: 'binary'),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Foto berhasil diunggah'),
            new OA\Response(response: 422, description: 'Validasi gambar gagal'),
        ]
    )]
    public function uploadImage(Request $request, int $id): JsonResponse
    {
        $menuItem = MenuItem::find($id);
        if (!$menuItem) {
            return $this->errorResponse('Item menu tidak ditemukan.', 404);
        }

        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072'],
        ]);

        $path = $request->file('image')->store("tenants/{$menuItem->tenant_id}/menu-items", 'public');
        $imageUrl = Storage::url($path);

        $menuItem->image_url = $imageUrl;
        $menuItem->save();

        return $this->successResponse([
            'image_url' => $imageUrl,
        ], 'Foto menu berhasil diunggah.');
    }

    /**
     * Delete menu item.
     */
    #[OA\Delete(
        path: '/tenant/menu-items/{id}',
        summary: 'Hapus Item Menu',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Item Menu & Resep (BOM)'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Menu berhasil dihapus'),
            new OA\Response(response: 404, description: 'Menu tidak ditemukan'),
        ]
    )]
    public function destroy(int $id): JsonResponse
    {
        $menuItem = MenuItem::find($id);
        if (!$menuItem) {
            return $this->errorResponse('Item menu tidak ditemukan.', 404);
        }

        $menuItem->delete();

        return $this->successResponse(null, 'Item menu berhasil dihapus.');
    }
}
