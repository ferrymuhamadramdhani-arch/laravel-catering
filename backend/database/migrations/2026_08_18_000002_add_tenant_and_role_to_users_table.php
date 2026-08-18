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
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone')->nullable()->after('email');
            $table->string('avatar_url')->nullable()->after('phone');
            $table->string('role')->default('owner')->after('avatar_url'); // owner, admin, sales, kitchen, warehouse, courier, customer
            $table->foreignId('current_tenant_id')->nullable()->after('role')->constrained('tenants')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['current_tenant_id']);
            $table->dropColumn(['phone', 'avatar_url', 'role', 'current_tenant_id']);
        });
    }
};
