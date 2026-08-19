<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_areas', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->string('name', 255)->comment('Nama zona/area, mis: Jakarta Selatan, Depok Kota');
            $table->string('city', 100)->nullable()->comment('Kota/Kabupaten');
            $table->string('district', 100)->nullable()->comment('Kecamatan / Kelurahan');
            $table->string('postal_code', 10)->nullable();
            $table->decimal('delivery_fee', 12, 2)->default(0)->comment('Ongkos kirim standar ke area ini');
            $table->decimal('min_order_amount', 14, 2)->default(0)->comment('Minimum order untuk area ini');
            $table->integer('estimated_delivery_minutes')->nullable()->comment('Estimasi waktu pengiriman dalam menit');
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->index(['tenant_id', 'is_active']);
            $table->index(['tenant_id', 'city']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_areas');
    }
};
