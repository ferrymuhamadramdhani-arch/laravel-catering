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
        Schema::table('orders', function (Blueprint $table) {
            $table->string('tracking_code', 50)->nullable()->after('order_number');
            $table->string('payment_gateway_provider', 30)->nullable()->after('payment_status'); // midtrans, xendit, manual
            $table->string('payment_gateway_ref', 100)->nullable()->after('payment_gateway_provider');
            $table->string('snap_token', 255)->nullable()->after('payment_gateway_ref');
            $table->string('customer_ip', 45)->nullable()->after('notes');
            
            $table->index(['tenant_id', 'tracking_code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'tracking_code']);
            $table->dropColumn([
                'tracking_code',
                'payment_gateway_provider',
                'payment_gateway_ref',
                'snap_token',
                'customer_ip',
            ]);
        });
    }
};
