<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('customer_id');
            $table->string('order_number', 50);
            $table->string('event_name', 255)->nullable()->comment('Nama acara, mis: Lunch Kantor, Wedding');
            $table->string('event_type', 100)->default('Nasi Kotak')->comment('Tipe layanan: Nasi Kotak, Prasmanan, Snack Box, Wedding, dll');
            $table->date('delivery_date');
            $table->time('delivery_time')->nullable();
            $table->unsignedBigInteger('delivery_area_id')->nullable();
            $table->text('delivery_address')->nullable();
            $table->string('recipient_name', 255)->nullable();
            $table->string('recipient_phone', 50)->nullable();
            
            // Financial amounts
            $table->decimal('subtotal_amount', 14, 2)->default(0);
            $table->decimal('delivery_fee', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->decimal('total_hpp', 14, 2)->default(0)->comment('Total estimasi HPP bahan baku');
            $table->decimal('down_payment_amount', 14, 2)->default(0);
            
            // Statuses
            $table->enum('payment_status', ['unpaid', 'partially_paid', 'paid'])->default('unpaid');
            $table->enum('status', [
                'draft',
                'confirmed',
                'in_production',
                'ready',
                'delivering',
                'delivered',
                'completed',
                'cancelled'
            ])->default('draft');
            
            $table->text('cancellation_reason')->nullable();
            $table->text('notes')->nullable()->comment('Catatan umum pesanan');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('restrict');
            $table->foreign('delivery_area_id')->references('id')->on('delivery_areas')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

            $table->unique(['tenant_id', 'order_number']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'delivery_date']);
            $table->index(['tenant_id', 'customer_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
