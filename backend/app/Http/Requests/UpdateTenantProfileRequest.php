<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTenantProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:25'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'business_type' => ['nullable', 'array'],
            'business_type.*' => ['string'],
            'service_areas' => ['nullable', 'array'],
            'service_areas.*' => ['string'],
            'operating_hours' => ['nullable', 'array'],
            'bank_accounts' => ['nullable', 'array'],
            'bank_accounts.*.bank_name' => ['required_with:bank_accounts', 'string'],
            'bank_accounts.*.account_number' => ['required_with:bank_accounts', 'string'],
            'bank_accounts.*.account_name' => ['required_with:bank_accounts', 'string'],
        ];
    }
}
