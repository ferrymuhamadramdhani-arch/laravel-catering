import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../api/axios';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { UserPlus, AlertCircle } from 'lucide-react';

export const RegisterTenantPage: React.FC = () => {
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleTenantNameChange = (name: string) => {
    setTenantName(name);
    // Auto-generate slug from name if not manually edited
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setTenantSlug(slug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/register-tenant', {
        tenant_name: tenantName,
        tenant_slug: tenantSlug,
        owner_name: ownerName,
        email: ownerEmail,
        password: ownerPassword,
        phone: ownerPhone || undefined,
      });

      const { user, token, tenant } = response.data.data;
      login(user, token, tenant);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(
        err.response?.data?.message ||
        'Registrasi gagal. Mohon periksa kembali data yang dimasukkan.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Daftar Tenant Catering
        </h2>
        <p className="text-sm text-slate-500">
          Mulai trial 14 hari gratis tanpa kartu kredit
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          label="Nama Bisnis Catering"
          placeholder="Berkah Catering Nusantara"
          value={tenantName}
          onChange={(e) => handleTenantNameChange(e.target.value)}
          required
        />

        <Input
          label="Subdomain / Slug"
          placeholder="berkah-catering"
          value={tenantSlug}
          onChange={(e) => setTenantSlug(e.target.value)}
          helperText="Alamat web catering Anda di CaterOS (contoh: berkah-catering.cateros.id)"
          required
        />

        <div className="border-t border-slate-100 pt-2" />

        <Input
          label="Nama Pemilik (Owner)"
          placeholder="Ahmad Fauzi"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          required
        />

        <Input
          label="Email Akun Owner"
          type="email"
          placeholder="ahmad@catering.com"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          required
        />

        <Input
          label="No. WhatsApp Bisnis"
          type="tel"
          placeholder="081234567890"
          value={ownerPhone}
          onChange={(e) => setOwnerPhone(e.target.value)}
        />

        <Input
          label="Kata Sandi Akun"
          type="password"
          placeholder="Minimal 8 karakter"
          value={ownerPassword}
          onChange={(e) => setOwnerPassword(e.target.value)}
          required
        />

        <Button type="submit" className="w-full mt-3" isLoading={isLoading}>
          <UserPlus className="w-4 h-4 mr-1" /> Daftar & Buat Workspace
        </Button>
      </form>

      <div className="text-center border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-600">
          Sudah punya akun?{' '}
          <Link
            to="/login"
            className="text-amber-600 font-semibold hover:text-amber-700 hover:underline"
          >
            Masuk ke Akun
          </Link>
        </p>
      </div>
    </div>
  );
};
