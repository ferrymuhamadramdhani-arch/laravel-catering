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
        Schema::create('couriers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('phone');
            $table->string('license_type')->default('SIM C'); // SIM C, SIM A, SIM B1
            $table->string('license_number')->nullable();
            $table->string('vehicle_type_preference')->default('motorcycle'); // motorcycle, car, van, truck
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
        });

        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // e.g. "GranMax Blind Van 01", "Honda Vario Box 02"
            $table->string('vehicle_type')->default('van'); // motorcycle, car, van, truck
            $table->string('license_plate'); // e.g. "B 1234 ABC"
            $table->unsignedInteger('max_capacity_box')->default(100); // Max box/portions
            $table->boolean('is_active')->default(true);
            $table->string('condition_status')->default('good'); // good, maintenance, repairing
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
        });

        // Add courier_id and vehicle_id to deliveries table if not present
        Schema::table('deliveries', function (Blueprint $table) {
            $table->foreignId('courier_id')->nullable()->after('delivery_area_id')->constrained('couriers')->nullOnDelete();
            $table->foreignId('vehicle_id')->nullable()->after('courier_id')->constrained('vehicles')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropForeign(['courier_id']);
            $table->dropForeign(['vehicle_id']);
            $table->dropColumn(['courier_id', 'vehicle_id']);
        });

        Schema::dropIfExists('vehicles');
        Schema::dropIfExists('couriers');
    }
};
