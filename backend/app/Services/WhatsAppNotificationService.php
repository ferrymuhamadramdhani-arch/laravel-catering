<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Tenant;
use App\Models\WhatsAppLog;
use App\Models\WhatsAppTemplate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WhatsAppNotificationService
{
    /**
     * Seed default catering templates for a tenant if not existing.
     */
    public function seedDefaultTemplates(Tenant $tenant): void
    {
        $defaults = [
            [
                'name' => 'Konfirmasi Pesanan Baru',
                'code' => 'order_confirmed',
                'category' => 'TRANSACTIONAL',
                'body_text' => "Halo *{customer_name}*,\n\nPesanan katering Anda *#{order_number}* untuk acara *{event_type}* pada *{delivery_date}* pukul *{delivery_time}* telah berhasil dikonfirmasi!\n\n💰 Total Tagihan: *{total_amount}*\n📍 Alamat Kirim: {delivery_address}\n\n🔍 Lacak pesanan secara live di:\n{tracking_url}\n\nTerima kasih telah mempercayai *{tenant_name}*! 🙏",
                'variables' => ['customer_name', 'order_number', 'event_type', 'delivery_date', 'delivery_time', 'total_amount', 'delivery_address', 'tracking_url', 'tenant_name'],
            ],
            [
                'name' => 'Kuitansi Pembayaran Masuk',
                'code' => 'payment_received',
                'category' => 'TRANSACTIONAL',
                'body_text' => "Halo *{customer_name}*,\n\nPembayaran sebesar *{payment_amount}* via *{payment_method}* untuk Faktur *#{invoice_number}* (Pesanan *#{order_number}*) telah kami terima dengan sukses.\n\n📊 Status Tagihan: *{payment_status}*\n💳 Sisa Tagihan: *{remaining_amount}*\n\n📄 Lihat Faktur Resmi:\n{invoice_url}\n\nTerima kasih, *{tenant_name}*.",
                'variables' => ['customer_name', 'payment_amount', 'payment_method', 'invoice_number', 'order_number', 'payment_status', 'remaining_amount', 'invoice_url', 'tenant_name'],
            ],
            [
                'name' => 'Notifikasi Pesanan Sedang Dikirim',
                'code' => 'delivery_dispatched',
                'category' => 'TRANSACTIONAL',
                'body_text' => "🚗 *Pesanan Sedang Dikirim!*\n\nHalo *{customer_name}*, pesanan Anda *#{order_number}* sedang dalam perjalanan menuju lokasi acara.\n\n🛵 Kurir: *{courier_name}* ({courier_phone})\n⏰ Target Tiba: *{delivery_time}*\n📍 Alamat Tujuan: {delivery_address}\n\n🔍 Lacak pengiriman langsung di:\n{tracking_url}",
                'variables' => ['customer_name', 'order_number', 'courier_name', 'courier_phone', 'delivery_time', 'delivery_address', 'tracking_url', 'tenant_name'],
            ],
            [
                'name' => 'Bukti Serah Terima Pesanan (POD Selesai)',
                'code' => 'delivery_completed',
                'category' => 'TRANSACTIONAL',
                'body_text' => "🎉 *Pesanan Telah Tiba & Diserahterimakan!*\n\nHalo *{customer_name}*, pesanan katering *#{order_number}* telah berhasil diterima di lokasi oleh *{receiver_name}*.\n\n📸 Lihat Foto & Tanda Tangan Bukti Terima:\n{tracking_url}\n\nSelamat menikmati hidangan kami. Semoga acara berjalan lancar dan berkesan!\n\nSalam hangat,\n*{tenant_name}*",
                'variables' => ['customer_name', 'order_number', 'receiver_name', 'tracking_url', 'tenant_name'],
            ],
        ];

        foreach ($defaults as $tmpl) {
            WhatsAppTemplate::firstOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'code' => $tmpl['code'],
                ],
                [
                    'name' => $tmpl['name'],
                    'category' => $tmpl['category'],
                    'body_text' => $tmpl['body_text'],
                    'variables' => $tmpl['variables'],
                    'is_active' => true,
                ]
            );
        }
    }

    /**
     * Normalize Indonesian phone numbers: 0812 -> 62812, +62812 -> 62812
     */
    public function normalizePhoneNumber(string $phone): string
    {
        $cleaned = preg_replace('/[^0-9]/', '', $phone);
        if (str_starts_with($cleaned, '0')) {
            return '62' . substr($cleaned, 1);
        }
        if (str_starts_with($cleaned, '8')) {
            return '62' . $cleaned;
        }
        return $cleaned;
    }

    /**
     * Send templated WhatsApp notification.
     */
    public function sendTemplatedMessage(
        Tenant $tenant,
        string $templateCode,
        string $recipientPhone,
        string $recipientName,
        array $variables,
        ?Order $order = null
    ): WhatsAppLog {
        // Ensure default templates exist
        $this->seedDefaultTemplates($tenant);

        $template = WhatsAppTemplate::where('tenant_id', $tenant->id)
            ->where('code', $templateCode)
            ->first();

        $body = $template ? $template->body_text : "Notifikasi Pesanan #{order_number}";

        // Add tenant name if not provided
        if (!isset($variables['tenant_name'])) {
            $variables['tenant_name'] = $tenant->name;
        }

        // Replace placeholders
        foreach ($variables as $key => $val) {
            $body = str_replace('{' . $key . '}', (string) $val, $body);
        }

        return $this->sendCustomMessage(
            $tenant,
            $recipientPhone,
            $recipientName,
            $body,
            $templateCode,
            $order
        );
    }

    /**
     * Send custom WhatsApp message via Provider / Cloud API Simulator.
     */
    public function sendCustomMessage(
        Tenant $tenant,
        string $recipientPhone,
        string $recipientName,
        string $messageBody,
        ?string $templateCode = null,
        ?Order $order = null
    ): WhatsAppLog {
        $normalizedPhone = $this->normalizePhoneNumber($recipientPhone);
        $provider = config('services.whatsapp.provider', 'simulator');
        $msgId = 'wam_' . Str::random(16);

        $status = 'sent';
        $errorMessage = null;

        // If configured for Meta Cloud API or Wablas
        if ($provider === 'meta_cloud') {
            try {
                $token = config('services.whatsapp.meta_token');
                $phoneNumberId = config('services.whatsapp.meta_phone_number_id');

                if ($token && $phoneNumberId) {
                    $response = Http::withToken($token)->post("https://graph.facebook.com/v19.0/{$phoneNumberId}/messages", [
                        'messaging_product' => 'whatsapp',
                        'to' => $normalizedPhone,
                        'type' => 'text',
                        'text' => ['body' => $messageBody],
                    ]);

                    if ($response->successful()) {
                        $msgId = $response->json('messages.0.id') ?? $msgId;
                        $status = 'sent';
                    } else {
                        $status = 'failed';
                        $errorMessage = $response->body();
                    }
                }
            } catch (\Exception $e) {
                $status = 'failed';
                $errorMessage = $e->getMessage();
            }
        } elseif ($provider === 'wablas') {
            try {
                $domain = config('services.whatsapp.wablas_domain', 'https://jakarta.wablas.com');
                $apiKey = config('services.whatsapp.wablas_token');

                if ($apiKey) {
                    $response = Http::withHeaders(['Authorization' => $apiKey])->post("{$domain}/api/send-message", [
                        'phone' => $normalizedPhone,
                        'message' => $messageBody,
                    ]);

                    if ($response->successful()) {
                        $msgId = $response->json('data.id') ?? $msgId;
                        $status = 'sent';
                    } else {
                        $status = 'failed';
                        $errorMessage = $response->body();
                    }
                }
            } catch (\Exception $e) {
                $status = 'failed';
                $errorMessage = $e->getMessage();
            }
        }

        // Record WhatsApp Log
        return WhatsAppLog::create([
            'tenant_id' => $tenant->id,
            'order_id' => $order?->id,
            'recipient_phone' => $normalizedPhone,
            'recipient_name' => $recipientName,
            'template_code' => $templateCode,
            'message_body' => $messageBody,
            'provider' => $provider,
            'provider_message_id' => $msgId,
            'status' => $status,
            'error_message' => $errorMessage,
            'sent_at' => now(),
            'delivered_at' => $status === 'sent' ? now()->addSeconds(2) : null,
        ]);
    }

    /**
     * Handle incoming webhook status update from WhatsApp BSP / Meta.
     */
    public function handleStatusWebhook(array $payload): ?WhatsAppLog
    {
        $msgId = $payload['message_id'] ?? $payload['id'] ?? null;
        $status = $payload['status'] ?? null; // sent, delivered, read, failed

        if (!$msgId || !$status) {
            return null;
        }

        $log = WhatsAppLog::where('provider_message_id', $msgId)->first();
        if (!$log) {
            return null;
        }

        $log->status = $status;
        if ($status === 'delivered' && !$log->delivered_at) {
            $log->delivered_at = now();
        } elseif ($status === 'read' && !$log->read_at) {
            $log->read_at = now();
        }
        $log->save();

        return $log;
    }
}
