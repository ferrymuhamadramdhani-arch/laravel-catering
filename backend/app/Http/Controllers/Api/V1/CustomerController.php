<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Master Pelanggan', description: 'Endpoint Manajemen Master Data Pelanggan (CRM Dasar)')]
class CustomerController extends Controller
{
    use ApiResponse;

    public function __construct(protected TenantContext $tenantContext) {}

    /**
     * Get paginated customer list with search & type filter.
     */
    #[OA\Get(
        path: '/tenant/customers',
        summary: 'Daftar Pelanggan',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Pelanggan'],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string', description: 'Cari berdasarkan nama/email/telepon')),
            new OA\Parameter(name: 'type', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['individual', 'corporate'])),
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 10)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Daftar pelanggan berhasil diambil'),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = Customer::query()->orderBy('name', 'asc');

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all')) {
            return $this->successResponse($query->get(), 'Daftar pelanggan berhasil diambil.');
        }

        $perPage = (int) $request->input('per_page', 10);
        $paginated = $query->paginate($perPage);

        return $this->paginatedResponse($paginated, 'Daftar pelanggan berhasil diambil.');
    }

    /**
     * Store new customer.
     */
    #[OA\Post(
        path: '/tenant/customers',
        summary: 'Tambah Pelanggan Baru',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Pelanggan'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'PT. Maju Bersama'),
                    new OA\Property(property: 'type', type: 'string', enum: ['individual', 'corporate'], example: 'corporate'),
                    new OA\Property(property: 'phone', type: 'string', example: '08123456789'),
                    new OA\Property(property: 'email', type: 'string', example: 'hrd@majubersama.co.id'),
                    new OA\Property(property: 'address', type: 'string', example: 'Jl. Sudirman No. 12, Jakarta Pusat'),
                    new OA\Property(property: 'city', type: 'string', example: 'Jakarta Pusat'),
                    new OA\Property(property: 'pic_name', type: 'string', example: 'Budi Santoso'),
                    new OA\Property(property: 'npwp', type: 'string', example: '12.345.678.9-012.345'),
                    new OA\Property(property: 'notes', type: 'string', example: 'Tidak suka pedas, prefer menu halal'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Pelanggan berhasil ditambahkan'),
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
            'name'      => ['required', 'string', 'max:255'],
            'type'      => ['nullable', 'in:individual,corporate'],
            'phone'     => ['nullable', 'string', 'max:30'],
            'email'     => ['nullable', 'email', 'max:255'],
            'address'   => ['nullable', 'string', 'max:1000'],
            'city'      => ['nullable', 'string', 'max:100'],
            'pic_name'  => ['nullable', 'string', 'max:255'],
            'npwp'      => ['nullable', 'string', 'max:30'],
            'notes'     => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $customer = Customer::create([
            'tenant_id' => $tenant->id,
            'name'      => $validated['name'],
            'type'      => $validated['type'] ?? 'individual',
            'phone'     => $validated['phone'] ?? null,
            'email'     => $validated['email'] ?? null,
            'address'   => $validated['address'] ?? null,
            'city'      => $validated['city'] ?? null,
            'pic_name'  => $validated['pic_name'] ?? null,
            'npwp'      => $validated['npwp'] ?? null,
            'notes'     => $validated['notes'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return $this->successResponse($customer, 'Pelanggan berhasil ditambahkan.', 201);
    }

    /**
     * Show customer detail.
     */
    #[OA\Get(
        path: '/tenant/customers/{id}',
        summary: 'Detail Pelanggan',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Pelanggan'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Detail pelanggan berhasil diambil'),
            new OA\Response(response: 404, description: 'Pelanggan tidak ditemukan'),
        ]
    )]
    public function show(int $id): JsonResponse
    {
        $customer = Customer::find($id);
        if (!$customer) {
            return $this->errorResponse('Pelanggan tidak ditemukan.', 404);
        }

        return $this->successResponse($customer, 'Detail pelanggan berhasil diambil.');
    }

    /**
     * Update customer.
     */
    #[OA\Put(
        path: '/tenant/customers/{id}',
        summary: 'Update Data Pelanggan',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Pelanggan'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'PT. Maju Bersama Updated'),
                    new OA\Property(property: 'type', type: 'string', enum: ['individual', 'corporate']),
                    new OA\Property(property: 'phone', type: 'string'),
                    new OA\Property(property: 'email', type: 'string'),
                    new OA\Property(property: 'is_active', type: 'boolean'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Pelanggan berhasil diperbarui'),
            new OA\Response(response: 404, description: 'Pelanggan tidak ditemukan'),
        ]
    )]
    public function update(Request $request, int $id): JsonResponse
    {
        $customer = Customer::find($id);
        if (!$customer) {
            return $this->errorResponse('Pelanggan tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'name'      => ['sometimes', 'required', 'string', 'max:255'],
            'type'      => ['nullable', 'in:individual,corporate'],
            'phone'     => ['nullable', 'string', 'max:30'],
            'email'     => ['nullable', 'email', 'max:255'],
            'address'   => ['nullable', 'string', 'max:1000'],
            'city'      => ['nullable', 'string', 'max:100'],
            'pic_name'  => ['nullable', 'string', 'max:255'],
            'npwp'      => ['nullable', 'string', 'max:30'],
            'notes'     => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $customer->update($validated);

        return $this->successResponse($customer, 'Data pelanggan berhasil diperbarui.');
    }

    /**
     * Delete customer.
     */
    #[OA\Delete(
        path: '/tenant/customers/{id}',
        summary: 'Hapus Pelanggan',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Master Pelanggan'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Pelanggan berhasil dihapus'),
            new OA\Response(response: 404, description: 'Pelanggan tidak ditemukan'),
        ]
    )]
    public function destroy(int $id): JsonResponse
    {
        $customer = Customer::find($id);
        if (!$customer) {
            return $this->errorResponse('Pelanggan tidak ditemukan.', 404);
        }

        $customer->delete();

        return $this->successResponse(null, 'Pelanggan berhasil dihapus.');
    }
}
