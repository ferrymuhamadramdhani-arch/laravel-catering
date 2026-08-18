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
        Schema::create('menu_recipes_bom', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('menu_item_id')->constrained('menu_items')->cascadeOnDelete();
            $table->foreignId('raw_material_id')->constrained('raw_materials')->cascadeOnDelete();
            $table->decimal('quantity', 12, 4)->default(0); // Takaran bahan baku per 1 porsi menu
            $table->string('unit')->default('gram'); // Unit takaran resep (gram, kg, ml, liter, pcs, sdm, sdt)
            $table->decimal('cost_per_unit', 15, 4)->default(0); // Biaya per satuan takaran saat kalkulasi
            $table->decimal('subtotal_cost', 15, 2)->default(0); // Subtotal HPP bahan ini (quantity * cost_per_unit)
            $table->timestamps();

            $table->index(['tenant_id', 'menu_item_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('menu_recipes_bom');
    }
};
