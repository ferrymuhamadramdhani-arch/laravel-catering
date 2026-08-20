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
        // 1. Branches / Kitchen Locations Table
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('code', 50)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email', 100)->nullable();
            $table->text('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('pic_name', 100)->nullable();
            $table->boolean('is_main')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
        });

        // 2. Add branch_id to existing operational tables if not exists
        if (Schema::hasTable('orders') && !Schema::hasColumn('orders', 'branch_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->foreignId('branch_id')->nullable()->after('tenant_id')->constrained('branches')->nullOnDelete();
            });
        }

        if (Schema::hasTable('production_plans') && !Schema::hasColumn('production_plans', 'branch_id')) {
            Schema::table('production_plans', function (Blueprint $table) {
                $table->foreignId('branch_id')->nullable()->after('tenant_id')->constrained('branches')->nullOnDelete();
            });
        }

        if (Schema::hasTable('stock_ledgers') && !Schema::hasColumn('stock_ledgers', 'branch_id')) {
            Schema::table('stock_ledgers', function (Blueprint $table) {
                $table->foreignId('branch_id')->nullable()->after('tenant_id')->constrained('branches')->nullOnDelete();
            });
        }

        if (Schema::hasTable('purchase_orders') && !Schema::hasColumn('purchase_orders', 'branch_id')) {
            Schema::table('purchase_orders', function (Blueprint $table) {
                $table->foreignId('branch_id')->nullable()->after('tenant_id')->constrained('branches')->nullOnDelete();
            });
        }

        // 3. Stock Transfers Table (Mutasi Stok Antar Cabang)
        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('transfer_number', 50);
            $table->foreignId('from_branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('to_branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('status', 30)->default('pending'); // pending, in_transit, completed, cancelled
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('transferred_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'transfer_number']);
            $table->index(['tenant_id', 'status']);
        });

        // 4. Stock Transfer Items Table
        Schema::create('stock_transfer_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_transfer_id')->constrained('stock_transfers')->cascadeOnDelete();
            $table->foreignId('raw_material_id')->constrained('raw_materials')->cascadeOnDelete();
            $table->decimal('quantity', 12, 2);
            $table->string('unit', 30)->default('kg');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_transfer_items');
        Schema::dropIfExists('stock_transfers');

        if (Schema::hasTable('purchase_orders') && Schema::hasColumn('purchase_orders', 'branch_id')) {
            Schema::table('purchase_orders', function (Blueprint $table) {
                $table->dropForeign(['branch_id']);
                $table->dropColumn('branch_id');
            });
        }

        if (Schema::hasTable('stock_ledgers') && Schema::hasColumn('stock_ledgers', 'branch_id')) {
            Schema::table('stock_ledgers', function (Blueprint $table) {
                $table->dropForeign(['branch_id']);
                $table->dropColumn('branch_id');
            });
        }

        if (Schema::hasTable('production_plans') && Schema::hasColumn('production_plans', 'branch_id')) {
            Schema::table('production_plans', function (Blueprint $table) {
                $table->dropForeign(['branch_id']);
                $table->dropColumn('branch_id');
            });
        }

        if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'branch_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropForeign(['branch_id']);
                $table->dropColumn('branch_id');
            });
        }

        Schema::dropIfExists('branches');
    }
};
