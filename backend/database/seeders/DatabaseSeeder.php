<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 0. Seed Default System Roles (Global)
        $defaultRoles = \App\Services\PermissionRegistry::defaultRolePermissions();
        foreach ($defaultRoles as $slug => $data) {
            \App\Models\Role::firstOrCreate(
                ['slug' => $slug, 'tenant_id' => null],
                [
                    'name' => $data['name'],
                    'slug' => $slug,
                    'description' => $data['description'],
                    'permissions' => $data['permissions'],
                    'is_system' => true,
                ]
            );
        }

        // 1. Buat Sample Tenant Catering
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'berkah-catering'],
            [
                'name' => 'Berkah Catering Nusantara',
                'slug' => 'berkah-catering',
                'phone' => '081234567890',
                'email' => 'kontak@berkahcatering.com',
                'address' => 'Jl. RS Fatmawati No. 45, Cilandak, Jakarta Selatan',
                'subscription_plan' => 'starter',
                'business_type' => ['nasi_kotak', 'prasmanan', 'snack_box'],
                'service_areas' => ['Jakarta Selatan', 'Jakarta Pusat', 'Depok', 'Tangerang Selatan'],
                'operating_hours' => [
                    'open' => '06:00',
                    'close' => '21:00',
                    'days' => ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
                ],
                'bank_accounts' => [
                    [
                        'bank_name' => 'BCA',
                        'account_number' => '8881234567',
                        'account_name' => 'PT Berkah Nusantara Sejahtera',
                    ],
                    [
                        'bank_name' => 'Mandiri',
                        'account_number' => '1370098765432',
                        'account_name' => 'PT Berkah Nusantara Sejahtera',
                    ],
                ],
                'is_active' => true,
                'onboarding_completed' => true,
                'trial_ends_at' => now()->addDays(14),
            ]
        );

        // 2. Buat Akun Owner Utama
        $owner = User::firstOrCreate(
            ['email' => 'owner@cateros.id'],
            [
                'name' => 'Ahmad Fauzi (Owner)',
                'email' => 'owner@cateros.id',
                'password' => Hash::make('password123'),
                'phone' => '081234567890',
                'role' => 'owner',
                'current_tenant_id' => $tenant->id,
            ]
        );

        TenantUser::firstOrCreate(
            ['tenant_id' => $tenant->id, 'user_id' => $owner->id],
            ['role' => 'owner', 'is_active' => true]
        );

        // 3. Buat Staf Sample (Sales/CS, Kitchen Manager, Gudang, Kurir)
        $staffSamples = [
            [
                'name' => 'Rina Melati (Sales & CS)',
                'email' => 'sales@cateros.id',
                'role' => 'sales',
                'phone' => '081298765431',
            ],
            [
                'name' => 'Chef Hendra (Kepala Dapur)',
                'email' => 'kitchen@cateros.id',
                'role' => 'kitchen',
                'phone' => '081298765432',
            ],
            [
                'name' => 'Bambang Sudiro (Staf Gudang)',
                'email' => 'warehouse@cateros.id',
                'role' => 'warehouse',
                'phone' => '081298765433',
            ],
            [
                'name' => 'Joko Santoso (Kurir Antar)',
                'email' => 'courier@cateros.id',
                'role' => 'courier',
                'phone' => '081298765434',
            ],
        ];

        foreach ($staffSamples as $staff) {
            $user = User::firstOrCreate(
                ['email' => $staff['email']],
                [
                    'name' => $staff['name'],
                    'email' => $staff['email'],
                    'password' => Hash::make('password123'),
                    'phone' => $staff['phone'],
                    'role' => $staff['role'],
                    'current_tenant_id' => $tenant->id,
                ]
            );

            TenantUser::firstOrCreate(
                ['tenant_id' => $tenant->id, 'user_id' => $user->id],
                ['role' => $staff['role'], 'is_active' => true]
            );
        }
    }
}
