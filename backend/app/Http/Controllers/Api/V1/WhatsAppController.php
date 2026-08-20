<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\WhatsAppLog;
use App\Models\WhatsAppTemplate;
use App\Services\TenantContext;
use App\Services\WhatsAppNotificationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsAppController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext,
        protected WhatsAppNotificationService $waService
    ) {}

    /**
     * Get list of WhatsApp templates for tenant.
     */
    public function templates(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        // Seed defaults if empty
        $this->waService->seedDefaultTemplates($tenant);

        $templates = WhatsAppTemplate::where('tenant_id', $tenant->id)
            ->orderBy('id', 'asc')
            ->get();

        return $this->successResponse($templates, 'Daftar template WhatsApp berhasil diambil.');
    }

    /**
     * Update WhatsApp template body text.
     */
    public function updateTemplate(int $id, Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'body_text' => ['required', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $template = WhatsAppTemplate::where('tenant_id', $tenant->id)->findOrFail($id);
        $template->update($validated);

        return $this->successResponse($template, 'Template WhatsApp berhasil diperbarui.');
    }

    /**
     * Get WhatsApp logs / sent history.
     */
    public function logs(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = WhatsAppLog::with('order')
            ->where('tenant_id', $tenant->id)
            ->orderBy('id', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('template_code') && $request->template_code !== 'all') {
            $query->where('template_code', $request->template_code);
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('recipient_phone', 'like', "%{$search}%")
                  ->orWhere('recipient_name', 'like', "%{$search}%")
                  ->orWhere('message_body', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->input('per_page', 15);
        $paginated = $query->paginate($perPage);

        return $this->paginatedResponse($paginated, 'Riwayat pengiriman WhatsApp berhasil diambil.');
    }

    /**
     * Send manual WhatsApp message to customer.
     */
    public function sendManual(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'recipient_phone' => ['required', 'string'],
            'recipient_name' => ['required', 'string', 'max:100'],
            'message_body' => ['required', 'string'],
            'order_id' => ['nullable', 'integer', 'exists:orders,id'],
        ]);

        $order = null;
        if (!empty($validated['order_id'])) {
            $order = Order::where('tenant_id', $tenant->id)->find($validated['order_id']);
        }

        $log = $this->waService->sendCustomMessage(
            $tenant,
            $validated['recipient_phone'],
            $validated['recipient_name'],
            $validated['message_body'],
            'manual_chat',
            $order
        );

        return $this->successResponse($log, 'Pesan WhatsApp berhasil dikirim.', 201);
    }

    /**
     * Test simulator send.
     */
    public function testSend(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'template_code' => ['required', 'string'],
            'recipient_phone' => ['required', 'string'],
            'recipient_name' => ['required', 'string'],
        ]);

        $sampleVars = [
            'customer_name' => $validated['recipient_name'],
            'order_number' => 'ORD-' . date('Ymd') . '-001',
            'event_type' => 'Prasmanan Pernikahan',
            'delivery_date' => date('d M Y', strtotime('+1 day')),
            'delivery_time' => '11:30 WIB',
            'total_amount' => 'Rp 3.500.000',
            'payment_amount' => 'Rp 1.750.000',
            'payment_method' => 'QRIS Instan',
            'invoice_number' => 'INV-' . date('Ymd') . '-001',
            'payment_status' => 'Dibayar Sebagian (DP 50%)',
            'remaining_amount' => 'Rp 1.750.000',
            'delivery_address' => 'Gedung Kesenian Jakarta, Jl. Pos No. 1',
            'courier_name' => 'Pak Joko',
            'courier_phone' => '08123456789',
            'receiver_name' => $validated['recipient_name'],
            'tracking_url' => url('/track/TRK-SAMPLE-001'),
            'invoice_url' => url('/invoices/1'),
            'tenant_name' => $tenant->name,
        ];

        $log = $this->waService->sendTemplatedMessage(
            $tenant,
            $validated['template_code'],
            $validated['recipient_phone'],
            $validated['recipient_name'],
            $sampleVars
        );

        return $this->successResponse($log, 'Pesan WhatsApp uji coba berhasil dikirim!');
    }

    /**
     * Webhook for WhatsApp BSP / Meta callback status updates.
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        $this->waService->handleStatusWebhook($payload);

        return response()->json(['status' => 'ok']);
    }
}
