<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->enum('item_type', ['menu_package', 'menu_item', 'custom'])->default('menu_item');
            $table->unsignedBigInteger('menu_package_id')->nullable();
            $table->unsignedBigInteger('menu_item_id')->nullable();
            $table->string('item_name', 255)->comment('Snapshot nama paket/item saat diorder');
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('unit_hpp', 12, 2)->default(0)->comment('Snapshot HPP modal per porsi');
            $table->integer('quantity')->default(1);
            $table->decimal('subtotal_price', 14, 2)->default(0);
            $table->decimal('subtotal_hpp', 14, 2)->default(0);
            $table->string('portion_unit', 50)->default('pax');
            $table->text('notes')->nullable()->comment('Catatan koki / preferensi per item');
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->foreign('menu_package_id')->references('id')->on('menu_packages')->nullOnDelete();
            $table->foreign('menu_item_id')->references('id')->on('menu_items')->nullOnDelete();
            
            $table->index(['order_id', 'item_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
