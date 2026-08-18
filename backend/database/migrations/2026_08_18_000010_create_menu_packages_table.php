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
        Schema::create('menu_packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name'); // e.g. Paket Nasi Kotak Ayam Bakar Komplit, Prasmanan Gold 50 Pax, Snack Box Eksekutif
            $table->string('slug');
            $table->string('code')->nullable(); // e.g. PKG-001
            $table->string('package_type')->default('nasi_kotak'); // nasi_kotak, prasmanan, snack_box, tumpeng, custom
            $table->string('image_url')->nullable();
            $table->text('description')->nullable();
            $table->decimal('selling_price', 15, 2)->default(0); // Harga jual paket per box/pax
            $table->decimal('calculated_hpp', 15, 2)->default(0); // Total modal HPP akumulasi dari item-item
            $table->decimal('margin_percentage', 6, 2)->default(0); // Margin laba kotor %
            $table->integer('min_order_quantity')->default(1); // Min order, e.g. 10 box atau 50 pax
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'package_type']);
        });

        Schema::create('menu_package_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('menu_package_id')->constrained('menu_packages')->cascadeOnDelete();
            $table->foreignId('menu_item_id')->constrained('menu_items')->cascadeOnDelete();
            $table->integer('quantity')->default(1); // Jumlah porsi/pcs item ini dalam 1 paket
            $table->string('notes')->nullable(); // e.g. Varian Pedas / Manis
            $table->timestamps();

            $table->index(['tenant_id', 'menu_package_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('menu_package_items');
        Schema::dropIfExists('menu_packages');
    }
};
