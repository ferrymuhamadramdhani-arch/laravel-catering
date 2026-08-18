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
        Schema::create('menu_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('menu_category_id')->nullable()->constrained('menu_categories')->nullOnDelete();
            $table->string('name'); // e.g. Ayam Bakar Madu Pedas, Sapi Lada Hitam, Sayur Asem Betawi
            $table->string('slug');
            $table->string('code')->nullable(); // e.g. MN-001
            $table->string('image_url')->nullable();
            $table->text('description')->nullable();
            $table->decimal('selling_price', 15, 2)->default(0); // Harga jual per porsi
            $table->decimal('calculated_hpp', 15, 2)->default(0); // Total HPP dari BOM
            $table->decimal('margin_percentage', 6, 2)->default(0); // Margin laba kotor %
            $table->string('portion_unit')->default('porsi'); // porsi, pcs, mangkok, cup
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'menu_category_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('menu_items');
    }
};
