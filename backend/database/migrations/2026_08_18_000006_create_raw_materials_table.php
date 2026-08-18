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
        Schema::create('raw_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name'); // e.g. Daging Ayam Fillet, Beras Ramos, Bawang Merah
            $table->string('code')->nullable(); // e.g. RM-001
            $table->string('category')->default('Bahan Pokok'); // Bumbu, Daging/Unggas, Ikan/Seafood, Sayuran, Sembako, Kemasan, Minuman
            $table->string('unit')->default('kg'); // kg, gram, liter, ml, pcs, butir, ikat, sachet, kaleng, box
            $table->decimal('default_purchase_price', 15, 2)->default(0); // Harga beli standar per unit
            $table->decimal('minimum_stock', 12, 2)->default(0); // Batas peringatan stok menipis
            $table->decimal('current_stock', 12, 2)->default(0); // Stok aktual saat ini
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('raw_materials');
    }
};
