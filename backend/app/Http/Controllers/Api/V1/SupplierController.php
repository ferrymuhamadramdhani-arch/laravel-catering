<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Master Supplier', description: 'Endpoint Manajemen Master Data Supplier Bahan Baku')]
class SupplierController extends Controller
{
    use ApiResponse;

    public function __construct(protected TenantContext $tenantContext) {}

    /**
     * Get paginated supplier list with search filter.
     */
    #[OA\Get(
        path: '/tenant/suppliers',
        summary: 'Daftar Supplier',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Supplier'],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string', description: 'Cari berdasarkan nama/kota/kontak')),
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 10)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Daftar supplier berhasil diambil'),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = Supplier::query()->orderBy('name', 'asc');

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%")
                  ->orWhere('contact_person', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('products_supplied', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all')) {
            return $this->successResponse($query->get(), 'Daftar supplier berhasil diambil.');
        }

        $perPage = (int) $request->input('per_page', 10);
        $paginated = $query->paginate($perPage);

        return $this->paginatedResponse($paginated, 'Daftar supplier berhasil diambil.');
    }

    /**
     * Store new supplier.
     */
    #[OA\Post(
        path: '/tenant/suppliers',
        summary: 'Tambah Supplier Baru',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Supplier'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'UD. Pasar Induk Kramat Jati'),
                    new OA\Property(property: 'contact_person', type: 'string', example: 'Pak Rahmat'),
                    new OA\Property(property: 'phone', type: 'string', example: '0812-3456-7890'),
                    new OA\Property(property: 'email', type: 'string', example: 'rahmat@pasarinduk.id'),
                    new OA\Property(property: 'address', type: 'string', example: 'Pasar Induk Kramat Jati Blok A No. 15'),
                    new OA\Property(property: 'city', type: 'string', example: 'Jakarta Timur'),
                    new OA\Property(property: 'products_supplied', type: 'string', example: 'Daging ayam, sapi, kambing segar'),
                    new OA\Property(property: 'payment_terms', type: 'string', example: 'NET-14'),
                    new OA\Property(property: 'notes', type: 'string', example: 'Pengiriman setiap pagi pukul 06.00'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Supplier berhasil ditambahkan'),
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
            'name'              => ['required', 'string', 'max:255'],
            'contact_person'    => ['nullable', 'string', 'max:255'],
            'phone'             => ['nullable', 'string', 'max:30'],
            'email'             => ['nullable', 'email', 'max:255'],
            'address'           => ['nullable', 'string', 'max:1000'],
            'city'              => ['nullable', 'string', 'max:100'],
            'products_supplied' => ['nullable', 'string', 'max:2000'],
            'payment_terms'     => ['nullable', 'string', 'max:100'],
            'notes'             => ['nullable', 'string', 'max:1000'],
            'is_active'         => ['nullable', 'boolean'],
        ]);

        $supplier = Supplier::create([
            'tenant_id'         => $tenant->id,
            'name'              => $validated['name'],
            'contact_person'    => $validated['contact_person'] ?? null,
            'phone'             => $validated['phone'] ?? null,
            'email'             => $validated['email'] ?? null,
            'address'           => $validated['address'] ?? null,
            'city'              => $validated['city'] ?? null,
            'products_supplied' => $validated['products_supplied'] ?? null,
            'payment_terms'     => $validated['payment_terms'] ?? null,
            'notes'             => $validated['notes'] ?? null,
            'is_active'         => $validated['is_active'] ?? true,
        ]);

        return $this->successResponse($supplier, 'Supplier berhasil ditambahkan.', 201);
    }

    /**
     * Show supplier detail.
     */
    #[OA\Get(
        path: '/tenant/suppliers/{id}',
        summary: 'Detail Supplier',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Supplier'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Detail supplier berhasil diambil'),
            new OA\Response(response: 404, description: 'Supplier tidak ditemukan'),
        ]
    )]
    public function show(int $id): JsonResponse
    {
        $supplier = Supplier::with('rawMaterials')->find($id);
        if (!$supplier) {
            return $this->errorResponse('Supplier tidak ditemukan.', 404);
        }

        return $this->successResponse($supplier, 'Detail supplier berhasil diambil.');
    }

    /**
     * Update supplier.
     */
    #[OA\Put(
        path: '/tenant/suppliers/{id}',
        summary: 'Update Data Supplier',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Supplier'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string'),
                    new OA\Property(property: 'phone', type: 'string'),
                    new OA\Property(property: 'payment_terms', type: 'string'),
                    new OA\Property(property: 'is_active', type: 'boolean'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Supplier berhasil diperbarui'),
            new OA\Response(response: 404, description: 'Supplier tidak ditemukan'),
        ]
    )]
    public function update(Request $request, int $id): JsonResponse
    {
        $supplier = Supplier::find($id);
        if (!$supplier) {
            return $this->errorResponse('Supplier tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'name'              => ['sometimes', 'required', 'string', 'max:255'],
            'contact_person'    => ['nullable', 'string', 'max:255'],
            'phone'             => ['nullable', 'string', 'max:30'],
            'email'             => ['nullable', 'email', 'max:255'],
            'address'           => ['nullable', 'string', 'max:1000'],
            'city'              => ['nullable', 'string', 'max:100'],
            'products_supplied' => ['nullable', 'string', 'max:2000'],
            'payment_terms'     => ['nullable', 'string', 'max:100'],
            'notes'             => ['nullable', 'string', 'max:1000'],
            'is_active'         => ['nullable', 'boolean'],
        ]);

        $supplier->update($validated);

        return $this->successResponse($supplier, 'Data supplier berhasil diperbarui.');
    }

    /**
     * Delete supplier.
     */
    #[OA\Delete(
        path: '/tenant/suppliers/{id}',
        summary: 'Hapus Supplier',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Supplier'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Supplier berhasil dihapus'),
            new OA\Response(response: 400, description: 'Supplier masih digunakan oleh bahan baku'),
            new OA\Response(response: 404, description: 'Supplier tidak ditemukan'),
        ]
    )]
    public function destroy(int $id): JsonResponse
    {
        $supplier = Supplier::find($id);
        if (!$supplier) {
            return $this->errorResponse('Supplier tidak ditemukan.', 404);
        }

        $materialsCount = $supplier->rawMaterials()->count();
        if ($materialsCount > 0) {
            return $this->errorResponse(
                "Supplier ini tidak dapat dihapus karena masih terhubung dengan {$materialsCount} bahan baku. Putuskan relasi bahan baku terlebih dahulu.",
                400
            );
        }

        $supplier->delete();

        return $this->successResponse(null, 'Supplier berhasil dihapus.');
    }
}
