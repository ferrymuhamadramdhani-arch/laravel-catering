<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('whatsapp_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('code', 50); // order_confirmed, payment_received, delivery_dispatched, delivery_completed
            $table->string('category', 50)->default('TRANSACTIONAL');
            $table->text('body_text');
            $table->json('variables')->nullable(); // list of placeholder keys
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'code']);
        });

        Schema::create('whatsapp_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->string('recipient_phone', 30);
            $table->string('recipient_name', 100)->nullable();
            $table->string('template_code', 50)->nullable();
            $table->text('message_body');
            $table->string('provider', 50)->default('meta_cloud'); // meta_cloud, wablas, twilio, simulator
            $table->string('provider_message_id', 100)->nullable();
            $table->string('status', 30)->default('queued'); // queued, sent, delivered, read, failed
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'recipient_phone']);
            $table->index(['provider_message_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_logs');
        Schema::dropIfExists('whatsapp_templates');
    }
};
