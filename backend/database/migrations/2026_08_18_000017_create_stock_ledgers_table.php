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
        Schema::create('stock_ledgers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('raw_material_id')->constrained('raw_materials')->cascadeOnDelete();
            
            // Movement Type: in (penerimaan/belanja), out (pemakaian/rusak/expired), adjustment (koreksi opname)
            $table->enum('type', ['in', 'out', 'adjustment']);
            
            $table->decimal('quantity', 12, 2); // Kuantitas perubahan stok (selalu positif di ledger, jenis aksi ditentukan oleh type)
            $table->decimal('stock_before', 12, 2); // Saldo stok sebelum mutasi
            $table->decimal('stock_after', 12, 2); // Saldo stok setelah mutasi
            
            $table->decimal('unit_cost', 15, 2)->nullable(); // Biaya / harga beli per unit
            $table->decimal('total_cost', 15, 2)->nullable(); // Total nominal nilai mutasi
            
            // Reference type: manual, purchase_receipt, order_usage, stock_opname, waste_damage, expired
            $table->string('reference_type')->default('manual');
            $table->unsignedBigInteger('reference_id')->nullable();
            
            $table->text('notes')->nullable(); // Keterangan, nama supplier, no. invoice/nota, alasan opname
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'raw_material_id']);
            $table->index(['tenant_id', 'type']);
            $table->index(['tenant_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_ledgers');
    }
};
