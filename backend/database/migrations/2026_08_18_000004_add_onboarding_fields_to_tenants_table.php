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
        Schema::table('tenants', function (Blueprint $table) {
            $table->json('business_type')->nullable()->after('subscription_plan'); // ['nasi_kotak', 'prasmanan', 'wedding', 'tumpeng', 'snack_box', 'corporate']
            $table->json('service_areas')->nullable()->after('business_type'); // ['Jakarta Selatan', 'Jakarta Pusat', 'Depok', dll]
            $table->json('operating_hours')->nullable()->after('service_areas'); // {'open': '07:00', 'close': '20:00', 'days': ['senin', 'selasa', ...]}
            $table->json('bank_accounts')->nullable()->after('operating_hours'); // [{'bank_name': 'BCA', 'account_number': '1234567890', 'account_name': 'PT Catering'}]
            $table->boolean('onboarding_completed')->default(false)->after('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'business_type',
                'service_areas',
                'operating_hours',
                'bank_accounts',
                'onboarding_completed',
            ]);
        });
    }
};
