<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->string('name', 255);
            $table->string('contact_person', 255)->nullable()->comment('Nama PIC supplier');
            $table->string('phone', 30)->nullable();
            $table->string('email', 255)->nullable();
            $table->text('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->text('products_supplied')->nullable()->comment('Deskripsi produk/bahan yang disuplai');
            $table->string('payment_terms', 100)->nullable()->comment('Termin pembayaran: NET-30, COD, dll');
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->index(['tenant_id', 'is_active']);
            $table->index(['tenant_id', 'name']);
        });

        // Add supplier_id FK to raw_materials for linking materials to their supplier
        Schema::table('raw_materials', function (Blueprint $table) {
            $table->unsignedBigInteger('supplier_id')->nullable()->after('notes');
            $table->foreign('supplier_id')->references('id')->on('suppliers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('raw_materials', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropColumn('supplier_id');
        });
        Schema::dropIfExists('suppliers');
    }
};
