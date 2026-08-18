<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateTenantProfileRequest;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Tenant Profile & Onboarding', description: 'Endpoint Manajemen Profil Bisnis & Wizard Onboarding Tenant')]
class TenantProfileController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    /**
     * Get active tenant business profile.
     */
    #[OA\Get(
        path: '/tenant/profile',
        summary: 'Ambil Profil Bisnis Tenant Aktif',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Tenant Profile & Onboarding'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Profil tenant berhasil diambil',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string', example: 'Profil tenant berhasil diambil.'),
                        new OA\Property(property: 'data', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'Tenant tidak ditemukan'),
        ]
    )]
    public function show(): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();

        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        return $this->successResponse($tenant, 'Profil tenant berhasil diambil.');
    }

    /**
     * Update active tenant business profile & setup wizard data.
     */
    #[OA\Put(
        path: '/tenant/profile',
        summary: 'Update Profil Bisnis Tenant (Setup Wizard)',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Tenant Profile & Onboarding'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Berkah Catering Nusantara'),
                    new OA\Property(property: 'phone', type: 'string', example: '081234567890'),
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'kontak@berkah.com'),
                    new OA\Property(property: 'address', type: 'string', example: 'Jl. Melati No. 45, Jakarta Selatan'),
                    new OA\Property(
                        property: 'business_type',
                        type: 'array',
                        items: new OA\Items(type: 'string'),
                        example: ['nasi_kotak', 'prasmanan', 'snack_box']
                    ),
                    new OA\Property(
                        property: 'service_areas',
                        type: 'array',
                        items: new OA\Items(type: 'string'),
                        example: ['Jakarta Selatan', 'Jakarta Pusat', 'Depok']
                    ),
                    new OA\Property(
                        property: 'operating_hours',
                        type: 'object',
                        example: ['open' => '07:00', 'close' => '21:00', 'days' => ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']]
                    ),
                    new OA\Property(
                        property: 'bank_accounts',
                        type: 'array',
                        items: new OA\Items(
                            type: 'object',
                            properties: [
                                new OA\Property(property: 'bank_name', type: 'string', example: 'BCA'),
                                new OA\Property(property: 'account_number', type: 'string', example: '1234567890'),
                                new OA\Property(property: 'account_name', type: 'string', example: 'PT Berkah Catering'),
                            ]
                        )
                    ),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Profil tenant berhasil diperbarui'),
            new OA\Response(response: 422, description: 'Validasi form gagal'),
        ]
    )]
    public function update(UpdateTenantProfileRequest $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();

        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validated();
        $tenant->update($validated);

        return $this->successResponse($tenant->fresh(), 'Profil bisnis tenant berhasil diperbarui.');
    }

    /**
     * Upload tenant business logo.
     */
    #[OA\Post(
        path: '/tenant/logo',
        summary: 'Upload Logo Bisnis Catering',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Tenant Profile & Onboarding'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    required: ['logo'],
                    properties: [
                        new OA\Property(property: 'logo', type: 'string', format: 'binary')
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Logo berhasil diupload'),
            new OA\Response(response: 422, description: 'File tidak valid'),
        ]
    )]
    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => ['required', 'image', 'mimes:jpeg,png,jpg,webp,svg', 'max:2048'], // max 2MB
        ]);

        $tenant = $this->tenantContext->getTenant();

        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $file = $request->file('logo');
        $path = $file->store("tenants/{$tenant->id}/branding", 'public');
        $logoUrl = Storage::url($path);

        $tenant->update(['logo_url' => $logoUrl]);

        return $this->successResponse([
            'logo_url' => $logoUrl,
            'tenant' => $tenant->fresh(),
        ], 'Logo tenant berhasil diupload.');
    }

    /**
     * Mark onboarding wizard as completed.
     */
    #[OA\Post(
        path: '/tenant/complete-onboarding',
        summary: 'Selesaikan Wizard Onboarding Tenant',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Tenant Profile & Onboarding'],
        responses: [
            new OA\Response(response: 200, description: 'Onboarding berhasil diselesaikan'),
        ]
    )]
    public function completeOnboarding(): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();

        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $tenant->update(['onboarding_completed' => true]);

        return $this->successResponse($tenant->fresh(), 'Onboarding profil catering berhasil diselesaikan.');
    }
}
