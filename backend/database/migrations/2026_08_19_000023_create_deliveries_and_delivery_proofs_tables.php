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
        Schema::create('deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('delivery_number', 50)->unique();
            $table->string('delivery_batch_code', 50)->nullable();
            $table->foreignId('delivery_area_id')->nullable()->constrained('delivery_areas')->nullOnDelete();
            $table->string('courier_name', 100);
            $table->string('courier_phone', 30)->nullable();
            $table->string('vehicle_type', 30)->default('motorcycle'); // motorcycle, car, van, truck
            $table->string('vehicle_plate_number', 30)->nullable();
            $table->text('destination_address')->nullable();
            $table->string('recipient_name', 100)->nullable();
            $table->string('recipient_phone', 30)->nullable();
            $table->string('delivery_time_target', 30)->nullable();
            $table->string('status', 30)->default('assigned'); // assigned, dispatched, arrived, delivered, failed
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'delivery_batch_code']);
        });

        Schema::create('delivery_proofs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('delivery_id')->constrained('deliveries')->cascadeOnDelete();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('receiver_name', 100);
            $table->text('photo_url')->nullable();
            $table->text('signature_data')->nullable(); // Base64 data / SVG signature
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'delivery_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_proofs');
        Schema::dropIfExists('deliveries');
    }
};
