<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DeliveryArea;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Master Area Pengiriman', description: 'Endpoint Manajemen Zona & Area Layanan Pengiriman')]
class DeliveryAreaController extends Controller
{
    use ApiResponse;

    public function __construct(protected TenantContext $tenantContext) {}

    /**
     * Get paginated delivery areas.
     */
    #[OA\Get(
        path: '/tenant/delivery-areas',
        summary: 'Daftar Area Pengiriman',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Area Pengiriman'],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string', description: 'Cari berdasarkan nama/kota/kecamatan')),
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 10)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Daftar area pengiriman berhasil diambil'),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = DeliveryArea::query()->orderBy('city', 'asc')->orderBy('name', 'asc');

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%")
                  ->orWhere('district', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all')) {
            return $this->successResponse($query->where('is_active', true)->get(), 'Daftar area pengiriman berhasil diambil.');
        }

        $perPage = (int) $request->input('per_page', 10);
        $paginated = $query->paginate($perPage);

        return $this->paginatedResponse($paginated, 'Daftar area pengiriman berhasil diambil.');
    }

    /**
     * Store new delivery area.
     */
    #[OA\Post(
        path: '/tenant/delivery-areas',
        summary: 'Tambah Area Pengiriman Baru',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Area Pengiriman'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Kebayoran Baru'),
                    new OA\Property(property: 'city', type: 'string', example: 'Jakarta Selatan'),
                    new OA\Property(property: 'district', type: 'string', example: 'Kebayoran Baru'),
                    new OA\Property(property: 'postal_code', type: 'string', example: '12110'),
                    new OA\Property(property: 'delivery_fee', type: 'number', example: 25000),
                    new OA\Property(property: 'min_order_amount', type: 'number', example: 500000),
                    new OA\Property(property: 'estimated_delivery_minutes', type: 'integer', example: 45),
                    new OA\Property(property: 'notes', type: 'string', example: 'Perlu 1 jam persiapan sebelum kirim'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Area pengiriman berhasil ditambahkan'),
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
            'name'                          => ['required', 'string', 'max:255'],
            'city'                          => ['nullable', 'string', 'max:100'],
            'district'                      => ['nullable', 'string', 'max:100'],
            'postal_code'                   => ['nullable', 'string', 'max:10'],
            'delivery_fee'                  => ['nullable', 'numeric', 'min:0'],
            'min_order_amount'              => ['nullable', 'numeric', 'min:0'],
            'estimated_delivery_minutes'    => ['nullable', 'integer', 'min:0'],
            'notes'                         => ['nullable', 'string', 'max:1000'],
            'is_active'                     => ['nullable', 'boolean'],
        ]);

        $area = DeliveryArea::create([
            'tenant_id'                     => $tenant->id,
            'name'                          => $validated['name'],
            'city'                          => $validated['city'] ?? null,
            'district'                      => $validated['district'] ?? null,
            'postal_code'                   => $validated['postal_code'] ?? null,
            'delivery_fee'                  => $validated['delivery_fee'] ?? 0,
            'min_order_amount'              => $validated['min_order_amount'] ?? 0,
            'estimated_delivery_minutes'    => $validated['estimated_delivery_minutes'] ?? null,
            'notes'                         => $validated['notes'] ?? null,
            'is_active'                     => $validated['is_active'] ?? true,
        ]);

        return $this->successResponse($area, 'Area pengiriman berhasil ditambahkan.', 201);
    }

    /**
     * Show delivery area detail.
     */
    #[OA\Get(
        path: '/tenant/delivery-areas/{id}',
        summary: 'Detail Area Pengiriman',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Area Pengiriman'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Detail area pengiriman berhasil diambil'),
            new OA\Response(response: 404, description: 'Area pengiriman tidak ditemukan'),
        ]
    )]
    public function show(int $id): JsonResponse
    {
        $area = DeliveryArea::find($id);
        if (!$area) {
            return $this->errorResponse('Area pengiriman tidak ditemukan.', 404);
        }

        return $this->successResponse($area, 'Detail area pengiriman berhasil diambil.');
    }

    /**
     * Update delivery area.
     */
    #[OA\Put(
        path: '/tenant/delivery-areas/{id}',
        summary: 'Update Area Pengiriman',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Area Pengiriman'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string'),
                    new OA\Property(property: 'delivery_fee', type: 'number'),
                    new OA\Property(property: 'min_order_amount', type: 'number'),
                    new OA\Property(property: 'is_active', type: 'boolean'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Area pengiriman berhasil diperbarui'),
            new OA\Response(response: 404, description: 'Area pengiriman tidak ditemukan'),
        ]
    )]
    public function update(Request $request, int $id): JsonResponse
    {
        $area = DeliveryArea::find($id);
        if (!$area) {
            return $this->errorResponse('Area pengiriman tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'name'                          => ['sometimes', 'required', 'string', 'max:255'],
            'city'                          => ['nullable', 'string', 'max:100'],
            'district'                      => ['nullable', 'string', 'max:100'],
            'postal_code'                   => ['nullable', 'string', 'max:10'],
            'delivery_fee'                  => ['nullable', 'numeric', 'min:0'],
            'min_order_amount'              => ['nullable', 'numeric', 'min:0'],
            'estimated_delivery_minutes'    => ['nullable', 'integer', 'min:0'],
            'notes'                         => ['nullable', 'string', 'max:1000'],
            'is_active'                     => ['nullable', 'boolean'],
        ]);

        $area->update($validated);

        return $this->successResponse($area, 'Area pengiriman berhasil diperbarui.');
    }

    /**
     * Delete delivery area.
     */
    #[OA\Delete(
        path: '/tenant/delivery-areas/{id}',
        summary: 'Hapus Area Pengiriman',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Area Pengiriman'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Area pengiriman berhasil dihapus'),
            new OA\Response(response: 404, description: 'Area pengiriman tidak ditemukan'),
        ]
    )]
    public function destroy(int $id): JsonResponse
    {
        $area = DeliveryArea::find($id);
        if (!$area) {
            return $this->errorResponse('Area pengiriman tidak ditemukan.', 404);
        }

        $area->delete();

        return $this->successResponse(null, 'Area pengiriman berhasil dihapus.');
    }
}
