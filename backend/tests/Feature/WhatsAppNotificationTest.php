<?php

namespace Tests\Feature;

use App\Jobs\SendWhatsAppMessageJob;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WhatsAppLog;
use App\Models\WhatsAppTemplate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WhatsAppNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;
    protected Customer $customer;
    protected Order $order;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Berkah Catering Official',
            'slug' => 'berkah-catering',
            'is_active' => true,
        ]);

        $role = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Customer Service Admin',
            'slug' => 'cs-admin',
            'permissions' => ['*'],
        ]);

        $this->user = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Admin WhatsApp',
            'email' => 'cs@test.com',
            'password' => bcrypt('password'),
            'role_id' => $role->id,
        ]);

        $this->customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dr. Hendra Wijaya',
            'phone' => '081234567890',
        ]);

        $this->order = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->customer->id,
            'order_number' => 'ORD-WA-001',
            'event_type' => 'Prasmanan Syukuran',
            'delivery_date' => now()->addDay()->toDateString(),
            'delivery_time' => '12:00',
            'delivery_address' => 'Jl. Kemang Raya No. 10',
            'status' => 'confirmed',
            'total_amount' => 2500000,
        ]);
    }

    public function test_can_fetch_and_update_whatsapp_templates(): void
    {
        Sanctum::actingAs($this->user);

        // 1. Fetch templates (triggers auto-seeding)
        $res = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->getJson('/api/v1/tenant/whatsapp/templates');

        $res->assertStatus(200);
        $res->assertJsonPath('success', true);
        $templates = $res->json('data');
        $this->assertCount(4, $templates);

        $firstTemplate = $templates[0];

        // 2. Update Template body text
        $updateRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->putJson("/api/v1/tenant/whatsapp/templates/{$firstTemplate['id']}", [
                'body_text' => 'Halo {customer_name}, pesanan #{order_number} Anda telah kami terima!',
            ]);

        $updateRes->assertStatus(200);
        $this->assertDatabaseHas('whatsapp_templates', [
            'id' => $firstTemplate['id'],
            'body_text' => 'Halo {customer_name}, pesanan #{order_number} Anda telah kami terima!',
        ]);
    }

    public function test_can_send_test_whatsapp_message(): void
    {
        Sanctum::actingAs($this->user);

        $res = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson('/api/v1/tenant/whatsapp/test', [
                'template_code' => 'order_confirmed',
                'recipient_phone' => '081234567890',
                'recipient_name' => 'Dr. Hendra Wijaya',
            ]);

        $res->assertStatus(200);
        $res->assertJsonPath('success', true);

        // Verify log created with normalized phone (6281234567890)
        $this->assertDatabaseHas('whatsapp_logs', [
            'tenant_id' => $this->tenant->id,
            'recipient_phone' => '6281234567890',
            'recipient_name' => 'Dr. Hendra Wijaya',
            'template_code' => 'order_confirmed',
            'status' => 'sent',
        ]);
    }

    public function test_can_handle_status_webhook(): void
    {
        $log = WhatsAppLog::create([
            'tenant_id' => $this->tenant->id,
            'recipient_phone' => '6281234567890',
            'recipient_name' => 'Dr. Hendra Wijaya',
            'message_body' => 'Test message',
            'provider' => 'meta_cloud',
            'provider_message_id' => 'wamid_123456',
            'status' => 'sent',
        ]);

        $webhookRes = $this->postJson('/api/v1/public/webhooks/whatsapp', [
            'message_id' => 'wamid_123456',
            'status' => 'read',
        ]);

        $webhookRes->assertStatus(200);

        $log->refresh();
        $this->assertEquals('read', $log->status);
        $this->assertNotNull($log->read_at);
    }

    public function test_can_dispatch_whatsapp_queue_job(): void
    {
        Queue::fake();

        SendWhatsAppMessageJob::dispatch(
            $this->tenant,
            'order_confirmed',
            '081234567890',
            'Dr. Hendra Wijaya',
            ['order_number' => 'ORD-001'],
            $this->order
        );

        Queue::assertPushed(SendWhatsAppMessageJob::class, function ($job) {
            return $job->templateCode === 'order_confirmed'
                && $job->recipientPhone === '081234567890';
        });
    }
}
