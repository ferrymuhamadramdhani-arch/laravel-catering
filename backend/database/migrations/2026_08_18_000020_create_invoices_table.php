<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Invoices Table
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('customer_id');
            $table->string('invoice_number', 50);
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            
            // Types: full (100% tagihan), down_payment (DP), final_settlement (Pelunasan)
            $table->enum('invoice_type', ['full', 'down_payment', 'final_settlement'])->default('full');
            
            // Financial amounts
            $table->decimal('subtotal_amount', 14, 2)->default(0);
            $table->decimal('delivery_fee', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->decimal('paid_amount', 14, 2)->default(0);
            $table->decimal('remaining_amount', 14, 2)->default(0);
            
            // Statuses: unpaid, partially_paid, paid, cancelled
            $table->enum('status', ['unpaid', 'partially_paid', 'paid', 'cancelled'])->default('unpaid');
            
            $table->text('notes')->nullable();
            $table->text('terms_and_conditions')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('restrict');
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

            $table->unique(['tenant_id', 'invoice_number']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'invoice_date']);
            $table->index(['tenant_id', 'due_date']);
            $table->index(['tenant_id', 'order_id']);
            $table->index(['tenant_id', 'customer_id']);
        });

        // 2. Payments Table (Riwayat Transaksi Pembayaran)
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('invoice_id');
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('customer_id');
            $table->string('payment_number', 50);
            $table->date('payment_date');
            $table->decimal('amount', 14, 2);
            
            // Payment methods: bank_transfer, cash, qris, other
            $table->enum('payment_method', ['bank_transfer', 'cash', 'qris', 'other'])->default('bank_transfer');
            $table->string('destination_bank_account', 255)->nullable()->comment('Rekening bank tujuan katering (mis: BCA 8881234567)');
            $table->string('reference_number', 100)->nullable()->comment('No. referensi transfer / no. struk');
            $table->string('proof_image_url', 500)->nullable()->comment('URL foto bukti transfer');
            
            // Payment status: confirmed, pending_verification, rejected
            $table->enum('status', ['confirmed', 'pending_verification', 'rejected'])->default('confirmed');
            
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('received_by')->nullable()->comment('Staf yang mencatat/memverifikasi');
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('cascade');
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('restrict');
            $table->foreign('received_by')->references('id')->on('users')->nullOnDelete();

            $table->unique(['tenant_id', 'payment_number']);
            $table->index(['tenant_id', 'payment_date']);
            $table->index(['tenant_id', 'invoice_id']);
            $table->index(['tenant_id', 'order_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoices');
    }
};
