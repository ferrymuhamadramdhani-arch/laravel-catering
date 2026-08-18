<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MenuPackage;
use App\Models\MenuPackageItem;
use App\Services\HppCalculatorService;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Master Paket Menu (Bundling)', description: 'Endpoint Manajemen Paket Menu, Bundling Item & Total HPP')]
class MenuPackageController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext,
        protected HppCalculatorService $hppCalculator
    ) {}

    /**
     * Get all menu packages with bundled items and HPP.
     */
    #[OA\Get(
        path: '/tenant/menu-packages',
        summary: 'Daftar Paket Menu & Bundling',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Paket Menu (Bundling)'],
        parameters: [
            new OA\Parameter(name: 'package_type', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'is_active', in: 'query', required: false, schema: new OA\Schema(type: 'boolean')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Daftar paket menu berhasil diambil'),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = MenuPackage::with(['packageItems.menuItem.category'])
            ->orderBy('name', 'asc');

        if ($request->filled('package_type') && $request->package_type !== 'all') {
            $query->where('package_type', $request->package_type);
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
            $packages = $query->get();
            return $this->successResponse($packages, 'Daftar paket menu berhasil diambil.');
        }

        $perPage = (int) $request->input('per_page', 10);
        $paginated = $query->paginate($perPage);

        return $this->paginatedResponse($paginated, 'Daftar paket menu berhasil diambil.');
    }

    /**
     * Store new menu package with bundled items.
     */
    #[OA\Post(
        path: '/tenant/menu-packages',
        summary: 'Tambah Paket Menu Baru (Bundling)',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Paket Menu (Bundling)'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name', 'package_type', 'selling_price', 'items'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Paket Nasi Kotak Komplit A'),
                    new OA\Property(property: 'package_type', type: 'string', example: 'nasi_kotak'),
                    new OA\Property(property: 'code', type: 'string', example: 'PKG-NK-01'),
                    new OA\Property(property: 'description', type: 'string', example: 'Nasi Putih + Ayam Bakar + Sambal Goreng Kentang + Sayur + Kerupuk'),
                    new OA\Property(property: 'selling_price', type: 'number', example: 35000),
                    new OA\Property(property: 'min_order_quantity', type: 'integer', example: 10),
                    new OA\Property(
                        property: 'items',
                        type: 'array',
                        items: new OA\Items(
                            properties: [
                                new OA\Property(property: 'menu_item_id', type: 'integer', example: 1),
                                new OA\Property(property: 'quantity', type: 'integer', example: 1),
                                new OA\Property(property: 'notes', type: 'string', example: 'Paha / Dada'),
                            ]
                        )
                    ),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Paket menu berhasil dibuat'),
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
            'package_type' => ['required', 'string', 'max:50'],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'min_order_quantity' => ['nullable', 'integer', 'min:1'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.menu_item_id' => ['required', 'exists:menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        $slug = Str::slug($validated['name']);
        if (MenuPackage::where('slug', $slug)->exists()) {
            $slug .= '-' . Str::random(4);
        }

        $package = MenuPackage::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'slug' => $slug,
            'code' => $validated['code'] ?? null,
            'package_type' => $validated['package_type'],
            'description' => $validated['description'] ?? null,
            'selling_price' => $validated['selling_price'],
            'min_order_quantity' => $validated['min_order_quantity'] ?? 1,
            'is_active' => true,
        ]);

        foreach ($validated['items'] as $item) {
            MenuPackageItem::create([
                'tenant_id' => $tenant->id,
                'menu_package_id' => $package->id,
                'menu_item_id' => $item['menu_item_id'],
                'quantity' => $item['quantity'],
                'notes' => $item['notes'] ?? null,
            ]);
        }

        // Calculate package HPP from items
        $this->hppCalculator->recalculatePackageHpp($package);
        $package->load('packageItems.menuItem.category');

        return $this->successResponse($package, 'Paket menu bundling berhasil dibuat.', 201);
    }

    /**
     * Show menu package detail.
     */
    #[OA\Get(
        path: '/tenant/menu-packages/{id}',
        summary: 'Detail Paket Menu Bundling',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Paket Menu (Bundling)'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Detail paket berhasil diambil'),
            new OA\Response(response: 404, description: 'Paket tidak ditemukan'),
        ]
    )]
    public function show(int $id): JsonResponse
    {
        $package = MenuPackage::with('packageItems.menuItem.category')->find($id);
        if (!$package) {
            return $this->errorResponse('Paket menu tidak ditemukan.', 404);
        }

        return $this->successResponse($package, 'Detail paket menu berhasil diambil.');
    }

    /**
     * Update menu package.
     */
    #[OA\Put(
        path: '/tenant/menu-packages/{id}',
        summary: 'Update Paket Menu & Item Bundling',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Paket Menu (Bundling)'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Paket Nasi Kotak Super Komplit'),
                    new OA\Property(property: 'selling_price', type: 'number', example: 38000),
                    new OA\Property(
                        property: 'items',
                        type: 'array',
                        items: new OA\Items(
                            properties: [
                                new OA\Property(property: 'menu_item_id', type: 'integer', example: 1),
                                new OA\Property(property: 'quantity', type: 'integer', example: 1),
                            ]
                        )
                    ),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Paket menu berhasil diperbarui'),
            new OA\Response(response: 404, description: 'Paket tidak ditemukan'),
        ]
    )]
    public function update(Request $request, int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        $package = MenuPackage::find($id);
        if (!$package) {
            return $this->errorResponse('Paket menu tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'package_type' => ['sometimes', 'required', 'string', 'max:50'],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'selling_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'min_order_quantity' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['sometimes', 'boolean'],
            'items' => ['nullable', 'array', 'min:1'],
            'items.*.menu_item_id' => ['required_with:items', 'exists:menu_items,id'],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        $package->update($validated);

        if ($request->has('items')) {
            MenuPackageItem::where('menu_package_id', $package->id)->delete();

            foreach ($validated['items'] as $item) {
                MenuPackageItem::create([
                    'tenant_id' => $tenant->id,
                    'menu_package_id' => $package->id,
                    'menu_item_id' => $item['menu_item_id'],
                    'quantity' => $item['quantity'],
                    'notes' => $item['notes'] ?? null,
                ]);
            }
        }

        $this->hppCalculator->recalculatePackageHpp($package);
        $package->load('packageItems.menuItem.category');

        return $this->successResponse($package, 'Paket menu berhasil diperbarui.');
    }

    /**
     * Upload photo for menu package.
     */
    #[OA\Post(
        path: '/tenant/menu-packages/{id}/image',
        summary: 'Upload Foto Paket Menu',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Paket Menu (Bundling)'],
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
            new OA\Response(response: 200, description: 'Foto paket berhasil diunggah'),
            new OA\Response(response: 422, description: 'Validasi gambar gagal'),
        ]
    )]
    public function uploadImage(Request $request, int $id): JsonResponse
    {
        $package = MenuPackage::find($id);
        if (!$package) {
            return $this->errorResponse('Paket menu tidak ditemukan.', 404);
        }

        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072'],
        ]);

        $path = $request->file('image')->store("tenants/{$package->tenant_id}/packages", 'public');
        $imageUrl = Storage::url($path);

        $package->image_url = $imageUrl;
        $package->save();

        return $this->successResponse([
            'image_url' => $imageUrl,
        ], 'Foto paket menu berhasil diunggah.');
    }

    /**
     * Delete menu package.
     */
    #[OA\Delete(
        path: '/tenant/menu-packages/{id}',
        summary: 'Hapus Paket Menu',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Paket Menu (Bundling)'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Paket berhasil dihapus'),
            new OA\Response(response: 404, description: 'Paket tidak ditemukan'),
        ]
    )]
    public function destroy(int $id): JsonResponse
    {
        $package = MenuPackage::find($id);
        if (!$package) {
            return $this->errorResponse('Paket menu tidak ditemukan.', 404);
        }

        $package->delete();

        return $this->successResponse(null, 'Paket menu berhasil dihapus.');
    }
}
