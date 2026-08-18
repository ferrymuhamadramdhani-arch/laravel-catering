<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MenuRecipeBom;
use App\Models\RawMaterial;
use App\Services\HppCalculatorService;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Master Bahan Baku', description: 'Endpoint Manajemen Master Bahan Baku & Satuan')]
class RawMaterialController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext,
        protected HppCalculatorService $hppCalculator
    ) {}

    /**
     * Get all raw materials with search and category filter.
     */
    #[OA\Get(
        path: '/tenant/raw-materials',
        summary: 'Daftar Master Bahan Baku',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Bahan Baku'],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'category', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Daftar bahan baku berhasil diambil'),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = RawMaterial::query()->orderBy('name', 'asc');

        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%");
            });
        }

        $materials = $query->get();

        return $this->successResponse($materials, 'Daftar bahan baku berhasil diambil.');
    }

    /**
     * Store new raw material.
     */
    #[OA\Post(
        path: '/tenant/raw-materials',
        summary: 'Tambah Bahan Baku Baru',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Bahan Baku'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name', 'unit', 'default_purchase_price'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Daging Ayam Fillet Dada'),
                    new OA\Property(property: 'code', type: 'string', example: 'RM-AYAM-01'),
                    new OA\Property(property: 'category', type: 'string', example: 'Daging/Unggas'),
                    new OA\Property(property: 'unit', type: 'string', example: 'kg'),
                    new OA\Property(property: 'default_purchase_price', type: 'number', example: 45000),
                    new OA\Property(property: 'minimum_stock', type: 'number', example: 5),
                    new OA\Property(property: 'notes', type: 'string', example: 'Supplier Pasar Induk'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Bahan baku berhasil ditambahkan'),
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
            'code' => ['nullable', 'string', 'max:50'],
            'category' => ['required', 'string', 'max:100'],
            'unit' => ['required', 'string', 'max:50'],
            'default_purchase_price' => ['required', 'numeric', 'min:0'],
            'minimum_stock' => ['nullable', 'numeric', 'min:0'],
            'current_stock' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $material = RawMaterial::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'code' => $validated['code'] ?? null,
            'category' => $validated['category'] ?? 'Bahan Pokok',
            'unit' => strtolower($validated['unit']),
            'default_purchase_price' => $validated['default_purchase_price'],
            'minimum_stock' => $validated['minimum_stock'] ?? 0,
            'current_stock' => $validated['current_stock'] ?? 0,
            'notes' => $validated['notes'] ?? null,
        ]);

        return $this->successResponse($material, 'Bahan baku berhasil ditambahkan.', 201);
    }

    /**
     * Show raw material detail.
     */
    #[OA\Get(
        path: '/tenant/raw-materials/{id}',
        summary: 'Detail Bahan Baku',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Bahan Baku'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Detail bahan baku berhasil diambil'),
            new OA\Response(response: 404, description: 'Bahan baku tidak ditemukan'),
        ]
    )]
    public function show(int $id): JsonResponse
    {
        $material = RawMaterial::find($id);
        if (!$material) {
            return $this->errorResponse('Bahan baku tidak ditemukan.', 404);
        }

        return $this->successResponse($material, 'Detail bahan baku berhasil diambil.');
    }

    /**
     * Update raw material.
     */
    #[OA\Put(
        path: '/tenant/raw-materials/{id}',
        summary: 'Update Bahan Baku & Harga Beli',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Bahan Baku'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Daging Ayam Fillet Paha'),
                    new OA\Property(property: 'category', type: 'string', example: 'Daging/Unggas'),
                    new OA\Property(property: 'unit', type: 'string', example: 'kg'),
                    new OA\Property(property: 'default_purchase_price', type: 'number', example: 48000),
                    new OA\Property(property: 'minimum_stock', type: 'number', example: 10),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Bahan baku berhasil diperbarui'),
            new OA\Response(response: 404, description: 'Bahan baku tidak ditemukan'),
        ]
    )]
    public function update(Request $request, int $id): JsonResponse
    {
        $material = RawMaterial::find($id);
        if (!$material) {
            return $this->errorResponse('Bahan baku tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'category' => ['sometimes', 'required', 'string', 'max:100'],
            'unit' => ['sometimes', 'required', 'string', 'max:50'],
            'default_purchase_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'minimum_stock' => ['nullable', 'numeric', 'min:0'],
            'current_stock' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $priceChanged = isset($validated['default_purchase_price']) &&
            (float) $validated['default_purchase_price'] !== (float) $material->default_purchase_price;

        $material->update($validated);

        // Auto recalculate all menus that use this raw material if purchase price changed
        if ($priceChanged) {
            $this->hppCalculator->recalculateForRawMaterial($material->id);
        }

        return $this->successResponse($material, 'Bahan baku berhasil diperbarui.');
    }

    /**
     * Delete raw material.
     */
    #[OA\Delete(
        path: '/tenant/raw-materials/{id}',
        summary: 'Hapus Bahan Baku',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Bahan Baku'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Bahan baku berhasil dihapus'),
            new OA\Response(response: 400, description: 'Bahan baku sedang digunakan dalam resep BOM'),
            new OA\Response(response: 404, description: 'Bahan baku tidak ditemukan'),
        ]
    )]
    public function destroy(int $id): JsonResponse
    {
        $material = RawMaterial::find($id);
        if (!$material) {
            return $this->errorResponse('Bahan baku tidak ditemukan.', 404);
        }

        $usedInRecipesCount = MenuRecipeBom::where('raw_material_id', $id)->count();
        if ($usedInRecipesCount > 0) {
            return $this->errorResponse("Bahan baku ini tidak dapat dihapus karena sedang digunakan dalam {$usedInRecipesCount} resep menu.", 400);
        }

        $material->delete();

        return $this->successResponse(null, 'Bahan baku berhasil dihapus.');
    }
}
